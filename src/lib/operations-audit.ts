import crypto from "crypto";

type SourceRecord = Record<string, unknown>;

const SAFE_FIELDS = [
    "recordType",
    "total",
    "subtotal",
    "deliveryFee",
    "discount",
    "paymentMethod",
    "paymentStatus",
    "orderStatus",
    "status",
    "frequency",
    "startDate",
    "endDate",
    "nextDelivery",
    "createdAt",
    "updatedAt",
    "_createdAt",
] as const;

function identifierDigest(value: unknown) {
    if (typeof value !== "string" || !value) return undefined;
    const secret = process.env.AUTH_SESSION_SECRET;
    if (!secret) throw new Error("Operations audit masking key is unavailable");
    return crypto.createHmac("sha256", secret).update(value).digest("hex").slice(0, 12);
}

export function sanitizeAuditRecord(record: SourceRecord) {
    const safe: SourceRecord = {
        recordKey: identifierDigest(record._id) || "unknown",
    };
    const orderDigest = identifierDigest(record.orderNumber);
    const transactionDigest = identifierDigest(record.trackingId);
    const subscriptionDigest = identifierDigest(record.subscriptionId);
    if (orderDigest) safe.maskedOrderId = `order-${orderDigest}`;
    if (transactionDigest) safe.maskedTransactionId = `txn-${transactionDigest}`;
    if (subscriptionDigest) safe.maskedSubscriptionId = `subscription-${subscriptionDigest}`;
    for (const field of SAFE_FIELDS) {
        if (record[field] !== undefined && record[field] !== null) safe[field] = record[field];
    }
    return safe;
}

export function sanitizeRecordGroups(groups: unknown) {
    if (!groups || typeof groups !== "object") return {};
    return Object.fromEntries(
        Object.entries(groups as Record<string, unknown>).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.map((record) => sanitizeAuditRecord(record)) : [],
        ])
    );
}
