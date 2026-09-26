export const OPERATIONS_TIME_ZONE = "Asia/Kolkata";
import { AUDIT_SAMPLE_LIMIT } from "@/lib/operations-audit";

export const EXCEPTION_LIMIT = AUDIT_SAMPLE_LIMIT;

export type OperationsBoundaries = {
    todayStart: string;
    tomorrowStart: string;
    dayAfterTomorrowStart: string;
    sevenDayStart: string;
    pendingBefore: string;
};

export function getOperationsBoundaries(now: Date): OperationsBoundaries {
    // Asia/Kolkata has used the fixed UTC+05:30 offset since 1945 and has no DST.
    const kolkataOffsetMilliseconds = 330 * 60 * 1000;
    const local = new Date(now.getTime() + kolkataOffsetMilliseconds);
    const localMidnightAsUtc = Date.UTC(
        local.getUTCFullYear(),
        local.getUTCMonth(),
        local.getUTCDate()
    );
    const instant = (localDateMilliseconds: number) =>
        new Date(localDateMilliseconds - kolkataOffsetMilliseconds).toISOString();

    return {
        todayStart: instant(localMidnightAsUtc),
        tomorrowStart: instant(localMidnightAsUtc + 24 * 60 * 60 * 1000),
        dayAfterTomorrowStart: instant(localMidnightAsUtc + 2 * 24 * 60 * 60 * 1000),
        sevenDayStart: instant(localMidnightAsUtc - 6 * 24 * 60 * 60 * 1000),
        pendingBefore: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    };
}

export const operationsSummaryQuery = `{
  "kpis": {
    "ordersToday": count(*[_type == "order" && _createdAt >= $todayStart && _createdAt < $tomorrowStart]),
    "ordersLast7Days": count(*[_type == "order" && _createdAt >= $sevenDayStart && _createdAt < $tomorrowStart]),
    "grossOrderValue": math::sum(*[_type == "order" && _createdAt >= $sevenDayStart && _createdAt < $tomorrowStart].total),
    "onlinePaidValue": math::sum(*[_type == "order" && _createdAt >= $sevenDayStart && _createdAt < $tomorrowStart && paymentMethod == "ccavenue" && paymentStatus == "success"].total),
    "historicalOnlineOrderCount": count(*[_type == "order" && paymentMethod == "ccavenue"]),
    "historicalOnlineValue": math::sum(*[_type == "order" && paymentMethod == "ccavenue"].total),
    "historicalCodOrderCount": count(*[_type == "order" && paymentMethod == "cod"]),
    "historicalCodValue": math::sum(*[_type == "order" && paymentMethod == "cod"].total),
    "codPendingValue": math::sum(*[_type == "order" && paymentMethod == "cod" && paymentStatus == "pending"].total),
    "pendingPaymentCount": count(*[_type == "order" && paymentStatus == "pending"]),
    "failedPaymentCount": count(*[_type == "order" && paymentStatus == "failed"]),
    "fulfillment": {
      "pending": count(*[_type == "order" && orderStatus == "pending"]),
      "processing": count(*[_type == "order" && orderStatus == "processing"]),
      "shipped": count(*[_type == "order" && orderStatus == "shipped"]),
      "delivered": count(*[_type == "order" && orderStatus == "delivered"]),
      "cancelled": count(*[_type == "order" && orderStatus == "cancelled"]),
      "unclassified": count(*[_type == "order" && !(orderStatus in ["pending", "processing", "shipped", "delivered", "cancelled"])])
    },
    "activeSubscriptions": count(*[_type == "subscription" && status == "active"]),
    "pausedSubscriptions": count(*[_type == "subscription" && status == "paused"]),
    "deliveriesDueToday": count(*[_type == "subscription" && status == "active" && plan.nextDelivery >= $todayStart && plan.nextDelivery < $tomorrowStart]),
    "deliveriesDueTomorrow": count(*[_type == "subscription" && status == "active" && plan.nextDelivery >= $tomorrowStart && plan.nextDelivery < $dayAfterTomorrowStart]),
    "unownedOrders": count(*[_type == "order" && !defined(customerAccount._ref)]),
    "unownedSubscriptions": count(*[_type == "subscription" && !defined(customerAccount._ref)])
  },
  "auditCounts": {
    "duplicateOrderIds": count(*[_type == "order" && defined(orderNumber) && count(*[_type == "order" && orderNumber == ^.orderNumber]) > 1]),
    "duplicateTransactionIds": count(*[_type == "order" && defined(trackingId) && count(*[_type == "order" && trackingId == ^.trackingId]) > 1]),
    "successfulOnlineMissingTransactionId": count(*[_type == "order" && paymentMethod == "ccavenue" && paymentStatus == "success" && !defined(trackingId)]),
    "onlinePaymentsPending24Hours": count(*[_type == "order" && paymentMethod == "ccavenue" && paymentStatus == "pending" && _createdAt < $pendingBefore]),
    "invalidAmounts": count(*[_type == "order" && (!defined(total) || total < 0 || !defined(subtotal) || subtotal < 0 || deliveryFee < 0 || discount < 0)]),
    "invalidDates": count(*[(_type == "order" && !defined(_createdAt)) || (_type == "subscription" && defined(plan.nextDelivery) && !defined(dateTime(plan.nextDelivery)))]),
    "invalidPaymentStatuses": count(*[_type == "order" && !(paymentStatus in ["pending", "success", "failed"])]),
    "invalidFulfillmentStatuses": count(*[_type == "order" && !(orderStatus in ["pending", "processing", "shipped", "delivered", "cancelled"])]),
    "orderTotalDiscrepancies": count(*[_type == "order" && defined(total) && defined(subtotal) && (total > subtotal + coalesce(deliveryFee, 0) - coalesce(discount, 0) + 0.01 || total < subtotal + coalesce(deliveryFee, 0) - coalesce(discount, 0) - 0.01)]),
    "missingCanonicalCustomerOwnership": count(*[_type in ["order", "subscription"] && !defined(customerAccount._ref)]),
    "missingSubscriptionScheduleOrFields": count(*[_type == "subscription" && (!defined(subscriptionId) || !defined(status) || !defined(paymentMethod) || !defined(product.quantity) || !defined(product.price) || (status == "active" && (!defined(plan.frequency) || !defined(plan.startDate) || !defined(plan.nextDelivery))))])
  },
  "auditSamples": {
    "duplicate_order_id": *[_type == "order" && defined(orderNumber) && count(*[_type == "order" && orderNumber == ^.orderNumber]) > 1] | order(_createdAt asc)[0...$limit]{_id, "recordType":"order", "issue":"duplicate_order_id", "amount":total, "paymentMethod":select(paymentMethod=="ccavenue"=>"online",paymentMethod), paymentStatus, "fulfillmentStatus":orderStatus, "occurredAt":_createdAt},
    "duplicate_transaction_id": *[_type == "order" && defined(trackingId) && count(*[_type == "order" && trackingId == ^.trackingId]) > 1] | order(_createdAt asc)[0...$limit]{_id, "recordType":"transaction", "issue":"duplicate_transaction_id", "amount":total, "paymentMethod":"online", paymentStatus, "occurredAt":_createdAt},
    "successful_online_missing_transaction_id": *[_type == "order" && paymentMethod == "ccavenue" && paymentStatus == "success" && !defined(trackingId)] | order(_createdAt asc)[0...$limit]{_id, "recordType":"transaction", "issue":"successful_online_missing_transaction_id", "amount":total, "paymentMethod":"online", paymentStatus, "occurredAt":_createdAt},
    "online_payment_pending_over_24_hours": *[_type == "order" && paymentMethod == "ccavenue" && paymentStatus == "pending" && _createdAt < $pendingBefore] | order(_createdAt asc)[0...$limit]{_id, "recordType":"transaction", "issue":"online_payment_pending_over_24_hours", "amount":total, "paymentMethod":"online", paymentStatus, "occurredAt":_createdAt},
    "invalid_amount": *[_type == "order" && (!defined(total) || total < 0 || !defined(subtotal) || subtotal < 0 || deliveryFee < 0 || discount < 0)] | order(_createdAt asc)[0...$limit]{_id, "recordType":"order", "issue":"invalid_amount", "amount":total, "paymentMethod":select(paymentMethod=="ccavenue"=>"online",paymentMethod), paymentStatus, "fulfillmentStatus":orderStatus, "occurredAt":_createdAt},
    "invalid_date": *[(_type == "order" && !defined(_createdAt)) || (_type == "subscription" && defined(plan.nextDelivery) && !defined(dateTime(plan.nextDelivery)))] | order(_createdAt asc)[0...$limit]{_id, "recordType":_type, "issue":"invalid_date", "occurredAt":_createdAt},
    "invalid_payment_status": *[_type == "order" && !(paymentStatus in ["pending", "success", "failed"])] | order(_createdAt asc)[0...$limit]{_id, "recordType":"order", "issue":"invalid_payment_status", "amount":total, "paymentMethod":select(paymentMethod=="ccavenue"=>"online",paymentMethod), paymentStatus, "fulfillmentStatus":orderStatus, "occurredAt":_createdAt},
    "invalid_fulfillment_status": *[_type == "order" && !(orderStatus in ["pending", "processing", "shipped", "delivered", "cancelled"])] | order(_createdAt asc)[0...$limit]{_id, "recordType":"order", "issue":"invalid_fulfillment_status", "amount":total, "paymentMethod":select(paymentMethod=="ccavenue"=>"online",paymentMethod), paymentStatus, "fulfillmentStatus":orderStatus, "occurredAt":_createdAt},
    "order_total_discrepancy": *[_type == "order" && defined(total) && defined(subtotal) && (total > subtotal + coalesce(deliveryFee, 0) - coalesce(discount, 0) + 0.01 || total < subtotal + coalesce(deliveryFee, 0) - coalesce(discount, 0) - 0.01)] | order(_createdAt asc)[0...$limit]{_id, "recordType":"order", "issue":"order_total_discrepancy", "amount":total, "paymentMethod":select(paymentMethod=="ccavenue"=>"online",paymentMethod), paymentStatus, "fulfillmentStatus":orderStatus, "occurredAt":_createdAt},
    "missing_canonical_customer_ownership": *[_type in ["order", "subscription"] && !defined(customerAccount._ref)] | order(_createdAt asc)[0...$limit]{_id, "recordType":_type, "issue":"missing_canonical_customer_ownership", "occurredAt":_createdAt},
    "missing_subscription_schedule_or_fields": *[_type == "subscription" && (!defined(subscriptionId) || !defined(status) || !defined(paymentMethod) || !defined(product.quantity) || !defined(product.price) || (status == "active" && (!defined(plan.frequency) || !defined(plan.startDate) || !defined(plan.nextDelivery))))] | order(_createdAt asc)[0...$limit]{_id, "recordType":"subscription", "issue":"missing_subscription_schedule_or_fields", "paymentMethod":select(paymentMethod=="ccavenue_recurring"=>"online",paymentMethod), "occurredAt":_createdAt}
  }
}`;

export function normalizeOperationsSummary<T extends { kpis?: Record<string, unknown> }>(
    value: T
): T {
    if (!value?.kpis) return value;
    return {
        ...value,
        kpis: Object.fromEntries(Object.entries(value.kpis).map(([key, item]) => [key, item ?? 0])),
    };
}
