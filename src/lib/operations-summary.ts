export const OPERATIONS_TIME_ZONE = "Asia/Kolkata";
export const EXCEPTION_LIMIT = 50;
export const AUDIT_SAMPLE_LIMIT = 25;

export type MetricConfidence = "database-derived" | "incomplete" | "external-reconciliation";

export const KPI_DEFINITIONS = [
    {
        key: "ordersToday",
        label: "Orders today",
        source: "Sanity order documents",
        definition:
            "Count of orders whose Sanity _createdAt falls within the current Kolkata calendar day.",
        window: "Today, 00:00 inclusive to tomorrow 00:00 exclusive in Asia/Kolkata.",
        confidence: "database-derived",
    },
    {
        key: "ordersLast7Days",
        label: "Orders — last 7 days",
        source: "Sanity order documents",
        definition:
            "Count of orders created today or during the six preceding Kolkata calendar days.",
        window: "Seven Kolkata calendar days, ending at tomorrow 00:00 exclusive.",
        confidence: "database-derived",
    },
    {
        key: "grossOrderValue",
        label: "Gross order value",
        source: "Sanity order.total",
        definition:
            "Sum of stored total for every order in the seven-day window, regardless of payment or fulfillment status.",
        window: "Same seven Kolkata calendar days as Orders — last 7 days.",
        confidence: "incomplete",
    },
    {
        key: "onlinePaidValue",
        label: "Online paid value",
        source: "Sanity order.total, paymentMethod, and paymentStatus",
        definition:
            "Sum of stored total where paymentMethod is ccavenue and paymentStatus is success. This is an application record, not settlement confirmation.",
        window: "Same seven Kolkata calendar days as Orders — last 7 days.",
        confidence: "external-reconciliation",
    },
    {
        key: "codPendingValue",
        label: "Historical COD pending value",
        source: "Sanity order.total, paymentMethod, and paymentStatus",
        definition:
            "All-time sum of stored total for COD orders whose paymentStatus remains pending, including historical records.",
        window: "All records; no date filter.",
        confidence: "incomplete",
    },
    {
        key: "pendingPaymentCount",
        label: "Pending payments",
        source: "Sanity order.paymentStatus",
        definition:
            "All orders whose stored paymentStatus is pending, across COD and online methods.",
        window: "All records; no date filter.",
        confidence: "incomplete",
    },
    {
        key: "failedPaymentCount",
        label: "Failed payments",
        source: "Sanity order.paymentStatus",
        definition: "All orders whose stored paymentStatus is failed, across payment methods.",
        window: "All records; no date filter.",
        confidence: "incomplete",
    },
    {
        key: "fulfillment",
        label: "Orders by fulfillment status",
        source: "Sanity order.orderStatus",
        definition:
            "All orders grouped into pending, processing, shipped, delivered, cancelled, or unclassified stored status.",
        window: "All records; no date filter.",
        confidence: "database-derived",
    },
    {
        key: "activeSubscriptions",
        label: "Active subscriptions",
        source: "Sanity subscription.status",
        definition: "Count of subscription documents whose stored status is active.",
        window: "Current all-record snapshot.",
        confidence: "incomplete",
    },
    {
        key: "pausedSubscriptions",
        label: "Paused subscriptions",
        source: "Sanity subscription.status",
        definition: "Count of subscription documents whose stored status is paused.",
        window: "Current all-record snapshot.",
        confidence: "incomplete",
    },
    {
        key: "deliveriesDueToday",
        label: "Deliveries due today",
        source: "Sanity subscription.status and plan.nextDelivery",
        definition:
            "Active subscriptions with nextDelivery during the current Kolkata calendar day; missing schedules are excluded.",
        window: "Today, 00:00 inclusive to tomorrow 00:00 exclusive in Asia/Kolkata.",
        confidence: "incomplete",
    },
    {
        key: "deliveriesDueTomorrow",
        label: "Deliveries due tomorrow",
        source: "Sanity subscription.status and plan.nextDelivery",
        definition:
            "Active subscriptions with nextDelivery during the next Kolkata calendar day; missing schedules are excluded.",
        window: "Tomorrow 00:00 inclusive to the following day 00:00 exclusive in Asia/Kolkata.",
        confidence: "incomplete",
    },
    {
        key: "unownedOrders",
        label: "Orders missing canonical ownership",
        source: "Sanity order.customerAccount",
        definition:
            "Count of orders without a customerAccount reference. Includes intentional guest and unmigrated historical records.",
        window: "All records; no date filter.",
        confidence: "incomplete",
    },
    {
        key: "unownedSubscriptions",
        label: "Subscriptions missing canonical ownership",
        source: "Sanity subscription.customerAccount",
        definition: "Count of subscriptions without a customerAccount reference.",
        window: "All records; no date filter.",
        confidence: "incomplete",
    },
] satisfies Array<{
    key: string;
    label: string;
    source: string;
    definition: string;
    window: string;
    confidence: MetricConfidence;
}>;

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
  "exceptions": {
    "onlinePaymentsPending24Hours": *[_type == "order" && paymentMethod == "ccavenue" && paymentStatus == "pending" && _createdAt < $pendingBefore] | order(_createdAt asc)[0...$limit]{_id, orderNumber, total, paymentStatus, orderStatus, _createdAt},
    "failedOnlinePayments": *[_type == "order" && paymentMethod == "ccavenue" && paymentStatus == "failed"] | order(_createdAt desc)[0...$limit]{_id, orderNumber, total, paymentStatus, orderStatus, _createdAt},
    "paidOrdersNotProcessing": *[_type == "order" && paymentStatus == "success" && (!defined(orderStatus) || orderStatus == "pending")] | order(_createdAt asc)[0...$limit]{_id, orderNumber, total, paymentStatus, orderStatus, _createdAt},
    "deliveredCodPaymentPending": *[_type == "order" && paymentMethod == "cod" && paymentStatus == "pending" && orderStatus == "delivered"] | order(_createdAt asc)[0...$limit]{_id, orderNumber, total, paymentStatus, orderStatus, _createdAt},
    "activeSubscriptionsMissingNextDelivery": *[_type == "subscription" && status == "active" && !defined(plan.nextDelivery)] | order(_createdAt asc)[0...$limit]{_id, subscriptionId, status, "nextDelivery": plan.nextDelivery, _createdAt},
    "overdueSubscriptionDeliveries": *[_type == "subscription" && status == "active" && plan.nextDelivery < $todayStart] | order(plan.nextDelivery asc)[0...$limit]{_id, subscriptionId, status, "nextDelivery": plan.nextDelivery, _createdAt},
    "paidSubscriptionOrdersWithoutSubscription": *[_type == "order" && paymentMethod == "ccavenue" && paymentStatus == "success" && defined(trackingId) && items[].title match ["*one_time*", "*trial_5day*", "*monthly_30day*"] && count(*[_type == "subscription" && ccavenueData.subscriptionRefNo == ^.trackingId]) == 0] | order(_createdAt desc)[0...$limit]{_id, orderNumber, total, trackingId, _createdAt},
    "ambiguousOrUnownedCustomers": *[
      (_type == "customerAccount" && (!defined(canonicalPhone) || count(*[_type == "customerAccount" && canonicalPhone == ^.canonicalPhone]) > 1)) ||
      (_type in ["order", "subscription"] && !defined(customerAccount._ref))
    ] | order(_createdAt asc)[0...$limit]{_id, "recordType": _type, orderNumber, subscriptionId, _createdAt}
  },
  "quality": {
    "counts": {
      "duplicateOrderNumbers": count(*[_type == "order" && defined(orderNumber) && count(*[_type == "order" && orderNumber == ^.orderNumber]) > 1]),
      "duplicateTransactionIds": count(*[_type == "order" && defined(trackingId) && trackingId != "" && count(*[_type == "order" && trackingId == ^.trackingId]) > 1]),
      "successfulOnlineMissingTransaction": count(*[_type == "order" && paymentMethod == "ccavenue" && paymentStatus == "success" && (!defined(trackingId) || trackingId == "")]),
      "onlinePending24Hours": count(*[_type == "order" && paymentMethod == "ccavenue" && paymentStatus == "pending" && _createdAt < $pendingBefore]),
      "invalidAmounts": count(*[_type == "order" && (!defined(total) || total < 0 || !defined(subtotal) || subtotal < 0 || defined(deliveryFee) && deliveryFee < 0 || defined(discount) && discount < 0)]),
      "invalidDates": count(*[_type == "subscription" && (defined(createdAt) && dateTime(createdAt) == null || defined(updatedAt) && dateTime(updatedAt) == null || defined(plan.startDate) && dateTime(plan.startDate) == null || defined(plan.endDate) && dateTime(plan.endDate) == null || defined(plan.nextDelivery) && dateTime(plan.nextDelivery) == null)]),
      "invalidPaymentStatuses": count(*[_type == "order" && !(paymentStatus in ["pending", "success", "failed"])]),
      "invalidFulfillmentStatuses": count(*[_type == "order" && !(orderStatus in ["pending", "processing", "shipped", "delivered", "cancelled"])]),
      "orderTotalDiscrepancies": count(*[_type == "order" && defined(total) && defined(subtotal) && (total - (subtotal + coalesce(deliveryFee, 0) - coalesce(discount, 0)) > 0.01 || (subtotal + coalesce(deliveryFee, 0) - coalesce(discount, 0)) - total > 0.01)]),
      "unownedOrders": count(*[_type == "order" && !defined(customerAccount._ref)]),
      "unownedSubscriptions": count(*[_type == "subscription" && !defined(customerAccount._ref)]),
      "subscriptionsMissingSchedule": count(*[_type == "subscription" && status == "active" && (!defined(plan.frequency) || !defined(plan.startDate) || !defined(plan.nextDelivery))]),
      "subscriptionsMissingRequiredFields": count(*[_type == "subscription" && (!defined(subscriptionId) || !defined(customer.name) || !defined(customer.phone) || !defined(product.productId) || !defined(product.quantity) || !defined(product.price) || !defined(status) || !defined(paymentMethod))])
    },
    "samples": {
      "duplicateOrderNumbers": *[_type == "order" && defined(orderNumber) && count(*[_type == "order" && orderNumber == ^.orderNumber]) > 1] | order(orderNumber asc)[0...$auditLimit]{_id, orderNumber, paymentStatus, orderStatus, _createdAt},
      "duplicateTransactionIds": *[_type == "order" && defined(trackingId) && trackingId != "" && count(*[_type == "order" && trackingId == ^.trackingId]) > 1] | order(trackingId asc)[0...$auditLimit]{_id, orderNumber, trackingId, paymentStatus, _createdAt},
      "successfulOnlineMissingTransaction": *[_type == "order" && paymentMethod == "ccavenue" && paymentStatus == "success" && (!defined(trackingId) || trackingId == "")] | order(_createdAt asc)[0...$auditLimit]{_id, orderNumber, paymentStatus, orderStatus, total, _createdAt},
      "onlinePending24Hours": *[_type == "order" && paymentMethod == "ccavenue" && paymentStatus == "pending" && _createdAt < $pendingBefore] | order(_createdAt asc)[0...$auditLimit]{_id, orderNumber, paymentStatus, orderStatus, total, _createdAt},
      "invalidAmounts": *[_type == "order" && (!defined(total) || total < 0 || !defined(subtotal) || subtotal < 0 || defined(deliveryFee) && deliveryFee < 0 || defined(discount) && discount < 0)] | order(_createdAt asc)[0...$auditLimit]{_id, orderNumber, total, subtotal, deliveryFee, discount, _createdAt},
      "invalidDates": *[_type == "subscription" && (defined(createdAt) && dateTime(createdAt) == null || defined(updatedAt) && dateTime(updatedAt) == null || defined(plan.startDate) && dateTime(plan.startDate) == null || defined(plan.endDate) && dateTime(plan.endDate) == null || defined(plan.nextDelivery) && dateTime(plan.nextDelivery) == null)] | order(_createdAt asc)[0...$auditLimit]{_id, subscriptionId, createdAt, updatedAt, "startDate": plan.startDate, "endDate": plan.endDate, "nextDelivery": plan.nextDelivery, _createdAt},
      "invalidPaymentStatuses": *[_type == "order" && !(paymentStatus in ["pending", "success", "failed"])] | order(_createdAt asc)[0...$auditLimit]{_id, orderNumber, paymentStatus, _createdAt},
      "invalidFulfillmentStatuses": *[_type == "order" && !(orderStatus in ["pending", "processing", "shipped", "delivered", "cancelled"])] | order(_createdAt asc)[0...$auditLimit]{_id, orderNumber, orderStatus, _createdAt},
      "orderTotalDiscrepancies": *[_type == "order" && defined(total) && defined(subtotal) && (total - (subtotal + coalesce(deliveryFee, 0) - coalesce(discount, 0)) > 0.01 || (subtotal + coalesce(deliveryFee, 0) - coalesce(discount, 0)) - total > 0.01)] | order(_createdAt asc)[0...$auditLimit]{_id, orderNumber, total, subtotal, deliveryFee, discount, _createdAt},
      "unownedOrders": *[_type == "order" && !defined(customerAccount._ref)] | order(_createdAt asc)[0...$auditLimit]{_id, orderNumber, paymentMethod, paymentStatus, _createdAt},
      "unownedSubscriptions": *[_type == "subscription" && !defined(customerAccount._ref)] | order(_createdAt asc)[0...$auditLimit]{_id, subscriptionId, status, paymentMethod, _createdAt},
      "subscriptionsMissingSchedule": *[_type == "subscription" && status == "active" && (!defined(plan.frequency) || !defined(plan.startDate) || !defined(plan.nextDelivery))] | order(_createdAt asc)[0...$auditLimit]{_id, subscriptionId, status, "frequency": plan.frequency, "startDate": plan.startDate, "nextDelivery": plan.nextDelivery, _createdAt},
      "subscriptionsMissingRequiredFields": *[_type == "subscription" && (!defined(subscriptionId) || !defined(customer.name) || !defined(customer.phone) || !defined(product.productId) || !defined(product.quantity) || !defined(product.price) || !defined(status) || !defined(paymentMethod))] | order(_createdAt asc)[0...$auditLimit]{_id, subscriptionId, status, paymentMethod, _createdAt}
    },
    "populations": {
      "historicalCodOrders": count(*[_type == "order" && paymentMethod == "cod"]),
      "onlinePaymentOrders": count(*[_type == "order" && paymentMethod == "ccavenue"])
    }
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
