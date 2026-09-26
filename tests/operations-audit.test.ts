import { beforeEach, describe, expect, it } from "vitest";
import {
    AUDIT_SAMPLE_LIMIT,
    maskAuditIdentifier,
    sanitizeAuditRecord,
    sanitizeAuditSamples,
} from "@/lib/operations-audit";

describe("operations audit response safety", () => {
    beforeEach(() => {
        process.env.AUTH_SESSION_SECRET = "a-secure-test-secret-that-is-more-than-thirty-two-bytes";
    });

    it("HMAC-masks stable identifiers without exposing their value", () => {
        const masked = maskAuditIdentifier("order:raw-order-id");
        expect(masked).toMatch(/^[a-f0-9]{20}$/);
        expect(masked).toBe(maskAuditIdentifier("order:raw-order-id"));
        expect(masked).not.toContain("raw-order-id");
    });

    it("returns only explicitly allowlisted fields", () => {
        const result = sanitizeAuditRecord({
            _id: "document-secret",
            recordType: "order",
            issue: "invalid_amount",
            amount: -1,
            paymentMethod: "online",
            paymentStatus: "failed",
            fulfillmentStatus: "pending",
            occurredAt: "2026-09-26T00:00:00Z",
            name: "Private Name",
            email: "private@example.com",
            phone: "9999999999",
            address: "Private address",
            orderNumber: "ORDER-1",
            trackingId: "TRACK-1",
            token: "secret",
        } as never);

        expect(Object.keys(result).sort()).toEqual([
            "amount",
            "fulfillmentStatus",
            "issue",
            "maskedId",
            "occurredAt",
            "paymentMethod",
            "paymentStatus",
            "recordType",
        ]);
        expect(JSON.stringify(result)).not.toMatch(
            /Private|private@example|999999|ORDER-1|TRACK-1|document-secret|secret/
        );
    });

    it("hard-limits every sample queue to 25 records", () => {
        const rows = Array.from({ length: 40 }, (_, index) => ({
            _id: `id-${index}`,
            recordType: "order",
            issue: "duplicate_order_id",
        }));
        const samples = sanitizeAuditSamples({ duplicate_order_id: rows });
        expect(samples.duplicate_order_id).toHaveLength(AUDIT_SAMPLE_LIMIT);
    });
});
