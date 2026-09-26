import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const sanity = vi.hoisted(() => ({ fetch: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/sanity", () => ({ writeClient: sanity }));

import { POST } from "@/app/api/admin/login/route";

const origin = "https://shop.example";
function loginRequest(password = "wrong") {
    return new NextRequest(`${origin}/api/admin/login`, {
        method: "POST",
        headers: { origin, "x-vercel-forwarded-for": "203.0.113.42" },
        body: JSON.stringify({ email: "admin@example.com", password }),
    });
}

describe("administrator login route security", () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        process.env.NEXT_PUBLIC_SITE_URL = origin;
        process.env.AUTH_SESSION_SECRET = `base64:${Buffer.alloc(32, 8).toString("base64")}`;
        process.env.ADMIN_EMAIL = "admin@example.com";
        process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash("correct-password", 4);
        sanity.create.mockResolvedValue({});
        sanity.fetch.mockResolvedValue({ count: 0, oldest: null });
    });

    it("audits failed and successful attempts without credential fields", async () => {
        expect((await POST(loginRequest())).status).toBe(401);
        expect((await POST(loginRequest("correct-password"))).status).toBe(200);
        expect(sanity.create.mock.calls.map(([event]) => event.outcome)).toEqual([
            "failed",
            "succeeded",
        ]);
        for (const [event] of sanity.create.mock.calls) {
            expect(event).not.toHaveProperty("password");
            expect(event).not.toHaveProperty("email");
            expect(event).not.toHaveProperty("passwordHash");
            expect(event).not.toHaveProperty("token");
        }
    });

    it("returns a generic 429 with Retry-After and audits a blocked attempt", async () => {
        sanity.fetch.mockResolvedValue({ count: 5, oldest: new Date().toISOString() });
        const response = await POST(loginRequest("correct-password"));

        expect(response.status).toBe(429);
        expect(response.headers.get("Retry-After")).toMatch(/^\d+$/);
        expect(await response.json()).toEqual({
            success: false,
            error: "Login could not be completed",
        });
        expect(sanity.create).toHaveBeenCalledWith(
            expect.objectContaining({ outcome: "rate_limited" })
        );
        expect(response.headers.get("set-cookie")).toBeNull();
    });

    it("fails closed when the shared audit store is unavailable", async () => {
        sanity.fetch.mockRejectedValue(new Error("unavailable"));
        const response = await POST(loginRequest("correct-password"));
        expect(response.status).toBe(503);
        expect(response.headers.get("set-cookie")).toBeNull();
    });
});
