import { client } from "@/lib/sanity";
import { requireAdmin, safeLog } from "@/lib/security/http";
import {
    EXCEPTION_LIMIT,
    getOperationsBoundaries,
    normalizeOperationsSummary,
    OPERATIONS_TIME_ZONE,
    operationsSummaryQuery,
} from "@/lib/operations-summary";
import { NextRequest, NextResponse } from "next/server";
import { sanitizeAuditSamples } from "@/lib/operations-audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const now = new Date();
    const boundaries = getOperationsBoundaries(now);

    try {
        const result = await client.fetch(operationsSummaryQuery, {
            ...boundaries,
            limit: EXCEPTION_LIMIT,
        });
        const normalized = normalizeOperationsSummary(result);
        return NextResponse.json({
            success: true,
            asOf: now.toISOString(),
            timeZone: OPERATIONS_TIME_ZONE,
            exceptionLimit: EXCEPTION_LIMIT,
            window: boundaries,
            ...normalized,
            auditSamples: sanitizeAuditSamples(normalized.auditSamples, EXCEPTION_LIMIT),
        });
    } catch {
        safeLog("admin.operations_summary.read", request, "data_access_failed");
        return NextResponse.json(
            { success: false, error: "Failed to load operations summary" },
            { status: 500 }
        );
    }
}
