import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/lib/sanity", () => ({ client: { fetch: mocks.fetch } }));

import { GET } from "@/app/api/admin/operations-summary/route";
import { createSessionToken } from "@/lib/security/session";

function request(token?: string) {
    return new NextRequest("https://shop.example/api/admin/operations-summary", {
        headers: token ? { cookie: `amrit_admin_session=${token}` } : undefined,
    });
}

describe("admin operations summary route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.AUTH_SESSION_SECRET = "a-secure-test-secret-that-is-more-than-thirty-two-bytes";
        mocks.fetch.mockResolvedValue({
            kpis: { ordersToday: 0, grossOrderValue: null },
            auditCounts: { duplicateOrderIds: 1 },
            auditSamples: {
                duplicate_order_id: [
                    {
                        _id: "raw-document-id",
                        recordType: "order",
                        issue: "duplicate_order_id",
                        amount: 42,
                        orderNumber: "raw-order-id",
                        customerName: "Private Person",
                    },
                ],
            },
        });
    });

    it("rejects requests without an administrator session", async () => {
        const response = await GET(request());
        expect(response.status).toBe(401);
        expect(mocks.fetch).not.toHaveBeenCalled();
    });

    it("rejects a valid customer session", async () => {
        const token = createSessionToken({ sub: "customer-1", role: "customer" });
        const response = await GET(request(token || undefined));
        expect(response.status).toBe(401);
        expect(mocks.fetch).not.toHaveBeenCalled();
    });

    it("returns an empty, read-only snapshot to an administrator", async () => {
        const token = createSessionToken({ sub: "operator", role: "admin" });
        const response = await GET(request(token || undefined));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toMatchObject({
            success: true,
            timeZone: "Asia/Kolkata",
            exceptionLimit: 25,
            kpis: { ordersToday: 0, grossOrderValue: 0 },
            auditCounts: { duplicateOrderIds: 1 },
        });
        expect(body.auditSamples.duplicate_order_id[0]).toMatchObject({
            maskedId: expect.stringMatching(/^[a-f0-9]{20}$/),
            recordType: "order",
            issue: "duplicate_order_id",
            amount: 42,
        });
        expect(JSON.stringify(body)).not.toMatch(
            /raw-document-id|raw-order-id|Private Person|customerName|orderNumber/
        );
        expect(mocks.fetch).toHaveBeenCalledOnce();
        expect(mocks.fetch.mock.calls[0][1]).toMatchObject({ limit: 25 });
    });
});
