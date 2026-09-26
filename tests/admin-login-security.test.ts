import { beforeEach, describe, expect, it, vi } from "vitest";

const sanity = vi.hoisted(() => ({ fetch: vi.fn(), create: vi.fn() }));

vi.mock("@/lib/sanity", () => ({ writeClient: sanity }));

import {
    ADMIN_LOGIN_LIMIT,
    adminLoginIdentity,
    adminLoginRateLimit,
    recordAdminLogin,
} from "@/lib/security/admin-login";

describe("administrator login security", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.AUTH_SESSION_SECRET = `base64:${Buffer.alloc(32, 7).toString("base64")}`;
    });

    it("uses stable keyed digests instead of retaining the email or client address", () => {
        const request = new Request("https://shop.example/api/admin/login", {
            headers: { "x-vercel-forwarded-for": "203.0.113.42" },
        });
        const identity = adminLoginIdentity(request, " Admin@Example.COM ");

        expect(identity.ipHash).toMatch(/^[a-f0-9]{64}$/);
        expect(identity.principalHash).toMatch(/^[a-f0-9]{64}$/);
        expect(JSON.stringify(identity)).not.toContain("203.0.113.42");
        expect(JSON.stringify(identity)).not.toContain("admin@example.com");
        expect(adminLoginIdentity(request, "admin@example.com")).toEqual(identity);
    });

    it("blocks at the configured threshold and calculates Retry-After", async () => {
        const now = new Date("2026-09-26T12:15:00.000Z");
        sanity.fetch.mockResolvedValue({
            count: ADMIN_LOGIN_LIMIT,
            oldest: "2026-09-26T12:10:00.000Z",
        });

        await expect(
            adminLoginRateLimit({ ipHash: "ip", principalHash: "principal" }, now)
        ).resolves.toEqual({ limited: true, retryAfter: 600 });
        expect(sanity.fetch).toHaveBeenCalledWith(
            expect.stringContaining('outcome in ["failed", "rate_limited"]'),
            expect.objectContaining({ since: "2026-09-26T12:00:00.000Z" })
        );
    });

    it("records only the outcome, time, and pseudonymous identifiers", async () => {
        sanity.create.mockResolvedValue({});
        await recordAdminLogin(
            { ipHash: "ip-digest", principalHash: "principal-digest" },
            "failed",
            new Date("2026-09-26T12:00:00.000Z")
        );

        expect(sanity.create).toHaveBeenCalledWith({
            _type: "adminLoginAudit",
            outcome: "failed",
            occurredAt: "2026-09-26T12:00:00.000Z",
            ipHash: "ip-digest",
            principalHash: "principal-digest",
        });
    });
});
