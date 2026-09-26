import { client } from "@/lib/sanity";
import { requireAdmin, safeLog } from "@/lib/security/http";
import {
    EXCEPTION_LIMIT,
    AUDIT_SAMPLE_LIMIT,
    KPI_DEFINITIONS,
    getOperationsBoundaries,
    normalizeOperationsSummary,
    OPERATIONS_TIME_ZONE,
    operationsSummaryQuery,
} from "@/lib/operations-summary";
import { sanitizeRecordGroups } from "@/lib/operations-audit";
import { NextRequest, NextResponse } from "next/server";

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
            auditLimit: AUDIT_SAMPLE_LIMIT,
        });
        const normalized = normalizeOperationsSummary(result);
        return NextResponse.json({
            success: true,
            asOf: now.toISOString(),
            timeZone: OPERATIONS_TIME_ZONE,
            exceptionLimit: EXCEPTION_LIMIT,
            auditSampleLimit: AUDIT_SAMPLE_LIMIT,
            window: boundaries,
            definitions: KPI_DEFINITIONS,
            ...normalized,
            exceptions: sanitizeRecordGroups(normalized.exceptions),
            quality: normalized.quality
                ? {
                      ...normalized.quality,
                      samples: sanitizeRecordGroups(normalized.quality.samples),
                  }
                : undefined,
        });
    } catch {
        safeLog("admin.operations_summary.read", request, "data_access_failed");
        return NextResponse.json(
            { success: false, error: "Failed to load operations summary" },
            { status: 500 }
        );
    }
}
