import { beforeEach, describe, expect, it } from "vitest";
import { sanitizeAuditRecord, sanitizeRecordGroups } from "@/lib/operations-audit";

describe("operations audit masking", () => {
    beforeEach(() => {
        process.env.AUTH_SESSION_SECRET = "a-secure-test-secret-that-is-more-than-thirty-two-bytes";
    });

    it("replaces identifiers and drops personal and secret fields", () => {
        const result = sanitizeAuditRecord({
            _id: "document-secret",
            orderNumber: "ORDER-123",
            trackingId: "TRACK-456",
            subscriptionId: "SUB-789",
            customerName: "Private Person",
            email: "private@example.test",
            phone: "9999999999",
            address: "Private address",
            cardToken: "secret-token",
            paymentStatus: "success",
            total: 42,
        });

        expect(result).toMatchObject({
            recordKey: expect.stringMatching(/^[a-f0-9]{12}$/),
            maskedOrderId: expect.stringMatching(/^order-[a-f0-9]{12}$/),
            maskedTransactionId: expect.stringMatching(/^txn-[a-f0-9]{12}$/),
            maskedSubscriptionId: expect.stringMatching(/^subscription-[a-f0-9]{12}$/),
            paymentStatus: "success",
            total: 42,
        });
        const serialized = JSON.stringify(result);
        for (const secret of [
            "document-secret",
            "ORDER-123",
            "TRACK-456",
            "SUB-789",
            "Private Person",
            "private@example.test",
            "9999999999",
            "Private address",
            "secret-token",
        ]) {
            expect(serialized).not.toContain(secret);
        }
    });

    it("sanitizes every capped result group", () => {
        expect(
            sanitizeRecordGroups({ duplicates: [{ _id: "one", orderNumber: "ORDER" }] })
        ).toEqual({
            duplicates: [expect.objectContaining({ maskedOrderId: expect.any(String) })],
        });
    });
});
