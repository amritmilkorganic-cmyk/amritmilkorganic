import { describe, expect, it } from "vitest";
import {
    getOperationsBoundaries,
    normalizeOperationsSummary,
    OPERATIONS_TIME_ZONE,
    EXCEPTION_LIMIT,
    operationsSummaryQuery,
} from "@/lib/operations-summary";

describe("operations summary calculations", () => {
    it("uses deterministic Asia/Kolkata calendar boundaries", () => {
        expect(OPERATIONS_TIME_ZONE).toBe("Asia/Kolkata");
        expect(getOperationsBoundaries(new Date("2026-09-25T20:00:00.000Z"))).toEqual({
            todayStart: "2026-09-25T18:30:00.000Z",
            tomorrowStart: "2026-09-26T18:30:00.000Z",
            dayAfterTomorrowStart: "2026-09-27T18:30:00.000Z",
            sevenDayStart: "2026-09-19T18:30:00.000Z",
            pendingBefore: "2026-09-24T20:00:00.000Z",
        });
    });

    it("keeps exact midnight records in one deterministic day", () => {
        const boundaries = getOperationsBoundaries(new Date("2026-01-01T18:30:00.000Z"));
        expect(boundaries.todayStart).toBe("2026-01-01T18:30:00.000Z");
        expect(boundaries.tomorrowStart).toBe("2026-01-02T18:30:00.000Z");
        expect(boundaries.sevenDayStart).toBe("2025-12-26T18:30:00.000Z");
    });

    it("normalizes empty aggregate sums to zero without changing counts", () => {
        expect(
            normalizeOperationsSummary({
                kpis: { ordersToday: 0, grossOrderValue: null, onlinePaidValue: null },
                exceptions: { failedOnlinePayments: [] },
            })
        ).toEqual({
            kpis: { ordersToday: 0, grossOrderValue: 0, onlinePaidValue: 0 },
            exceptions: { failedOnlinePayments: [] },
        });
    });

    it("caps audit samples and keeps COD and online history separate", () => {
        expect(EXCEPTION_LIMIT).toBe(25);
        expect(operationsSummaryQuery).toContain('"historicalOnlineOrderCount"');
        expect(operationsSummaryQuery).toContain('"historicalCodOrderCount"');
        expect(operationsSummaryQuery).toContain("[0...$limit]");
    });

    it("queries every Phase 3.3A data-accuracy condition", () => {
        for (const condition of [
            "duplicateOrderIds",
            "duplicateTransactionIds",
            "successfulOnlineMissingTransactionId",
            "onlinePaymentsPending24Hours",
            "invalidAmounts",
            "invalidDates",
            "invalidPaymentStatuses",
            "invalidFulfillmentStatuses",
            "orderTotalDiscrepancies",
            "missingCanonicalCustomerOwnership",
            "missingSubscriptionScheduleOrFields",
        ]) {
            expect(operationsSummaryQuery).toContain(`"${condition}"`);
        }
    });
});
