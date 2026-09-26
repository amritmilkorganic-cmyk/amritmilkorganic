import crypto from "crypto";

export const AUDIT_SAMPLE_LIMIT = 25;

export type AuditRecord = {
    _id?: unknown;
    recordType?: unknown;
    issue?: unknown;
    amount?: unknown;
    paymentMethod?: unknown;
    paymentStatus?: unknown;
    fulfillmentStatus?: unknown;
    occurredAt?: unknown;
};

export type SafeAuditRecord = {
    maskedId: string;
    recordType: "order" | "subscription" | "transaction" | "unknown";
    issue: string;
    amount?: number;
    paymentMethod?: "cod" | "online" | "unknown";
    paymentStatus?: string;
    fulfillmentStatus?: string;
    occurredAt?: string;
};

const safeRecordTypes = new Set(["order", "subscription", "transaction"]);
const safePaymentMethods = new Set(["cod", "online"]);
const safeStatuses = /^[a-z][a-z0-9_-]{0,31}$/;
const safeIssues = /^[a-z][a-z0-9_-]{0,63}$/;

function auditKey() {
    const secret = process.env.AUTH_SESSION_SECRET;
    if (!secret) throw new Error("Operations audit masking key is unavailable");
    return secret;
}

export function maskAuditIdentifier(value: unknown) {
    return crypto
        .createHmac("sha256", auditKey())
        .update(String(value ?? "missing"))
        .digest("hex")
        .slice(0, 20);
}

function safeEnum(value: unknown) {
    return typeof value === "string" && safeStatuses.test(value) ? value : undefined;
}

/** Convert datastore-only audit rows to the complete, strict public allowlist. */
export function sanitizeAuditRecord(record: AuditRecord): SafeAuditRecord {
    const recordType =
        typeof record.recordType === "string" && safeRecordTypes.has(record.recordType)
            ? (record.recordType as SafeAuditRecord["recordType"])
            : "unknown";
    const paymentMethod =
        typeof record.paymentMethod === "string" && safePaymentMethods.has(record.paymentMethod)
            ? (record.paymentMethod as SafeAuditRecord["paymentMethod"])
            : record.paymentMethod === undefined
              ? undefined
              : "unknown";
    const issue =
        typeof record.issue === "string" && safeIssues.test(record.issue)
            ? record.issue
            : "unclassified_data_issue";
    const amount =
        typeof record.amount === "number" && Number.isFinite(record.amount)
            ? record.amount
            : undefined;
    const occurredAt =
        typeof record.occurredAt === "string" && Number.isFinite(Date.parse(record.occurredAt))
            ? new Date(record.occurredAt).toISOString()
            : undefined;

    return {
        maskedId: maskAuditIdentifier(`${recordType}:${String(record._id ?? "missing")}`),
        recordType,
        issue,
        ...(amount === undefined ? {} : { amount }),
        ...(paymentMethod === undefined ? {} : { paymentMethod }),
        ...(safeEnum(record.paymentStatus)
            ? { paymentStatus: safeEnum(record.paymentStatus) }
            : {}),
        ...(safeEnum(record.fulfillmentStatus)
            ? { fulfillmentStatus: safeEnum(record.fulfillmentStatus) }
            : {}),
        ...(occurredAt ? { occurredAt } : {}),
    };
}

export function sanitizeAuditSamples(value: unknown, limit = AUDIT_SAMPLE_LIMIT) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
            .filter(([key, rows]) => safeIssues.test(key) && Array.isArray(rows))
            .map(([key, rows]) => [
                key,
                (rows as AuditRecord[]).slice(0, limit).map(sanitizeAuditRecord),
            ])
    );
}
