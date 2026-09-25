export const OPERATIONS_TIME_ZONE = "Asia/Kolkata";
export const EXCEPTION_LIMIT = 50;

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
    "onlinePaymentsPending24Hours": *[_type == "order" && paymentMethod == "ccavenue" && paymentStatus == "pending" && _createdAt < $pendingBefore] | order(_createdAt asc)[0...$limit]{_id, orderNumber, customerName, total, paymentStatus, orderStatus, _createdAt},
    "failedOnlinePayments": *[_type == "order" && paymentMethod == "ccavenue" && paymentStatus == "failed"] | order(_createdAt desc)[0...$limit]{_id, orderNumber, customerName, total, paymentStatus, orderStatus, _createdAt},
    "paidOrdersNotProcessing": *[_type == "order" && paymentStatus == "success" && (!defined(orderStatus) || orderStatus == "pending")] | order(_createdAt asc)[0...$limit]{_id, orderNumber, customerName, total, paymentStatus, orderStatus, _createdAt},
    "deliveredCodPaymentPending": *[_type == "order" && paymentMethod == "cod" && paymentStatus == "pending" && orderStatus == "delivered"] | order(_createdAt asc)[0...$limit]{_id, orderNumber, customerName, total, paymentStatus, orderStatus, _createdAt},
    "activeSubscriptionsMissingNextDelivery": *[_type == "subscription" && status == "active" && !defined(plan.nextDelivery)] | order(_createdAt asc)[0...$limit]{_id, subscriptionId, "customerName": customer.name, status, "nextDelivery": plan.nextDelivery, _createdAt},
    "overdueSubscriptionDeliveries": *[_type == "subscription" && status == "active" && plan.nextDelivery < $todayStart] | order(plan.nextDelivery asc)[0...$limit]{_id, subscriptionId, "customerName": customer.name, status, "nextDelivery": plan.nextDelivery, _createdAt},
    "paidSubscriptionOrdersWithoutSubscription": *[_type == "order" && paymentMethod == "ccavenue" && paymentStatus == "success" && defined(trackingId) && items[].title match ["*one_time*", "*trial_5day*", "*monthly_30day*"] && count(*[_type == "subscription" && ccavenueData.subscriptionRefNo == ^.trackingId]) == 0] | order(_createdAt desc)[0...$limit]{_id, orderNumber, customerName, total, trackingId, _createdAt},
    "ambiguousOrUnownedCustomers": *[
      (_type == "customerAccount" && (!defined(canonicalPhone) || count(*[_type == "customerAccount" && canonicalPhone == ^.canonicalPhone]) > 1)) ||
      (_type in ["order", "subscription"] && !defined(customerAccount._ref))
    ] | order(_createdAt asc)[0...$limit]{_id, "recordType": _type, "name": coalesce(name, customerName, customer.name), "phone": coalesce(phone, customer.phone), canonicalPhone, _createdAt}
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
