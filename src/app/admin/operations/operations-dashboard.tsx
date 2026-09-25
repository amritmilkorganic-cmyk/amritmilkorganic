"use client";

import { useCallback, useEffect, useState } from "react";

type QueueRecord = {
    _id: string;
    recordType?: string;
    orderNumber?: string;
    subscriptionId?: string;
    customerName?: string;
    name?: string;
    phone?: string;
    total?: number;
    paymentStatus?: string;
    orderStatus?: string;
    nextDelivery?: string;
    _createdAt?: string;
};

type Summary = {
    asOf: string;
    timeZone: string;
    exceptionLimit: number;
    kpis: {
        ordersToday: number;
        ordersLast7Days: number;
        grossOrderValue: number;
        onlinePaidValue: number;
        codPendingValue: number;
        pendingPaymentCount: number;
        failedPaymentCount: number;
        fulfillment: Record<string, number>;
        activeSubscriptions: number;
        pausedSubscriptions: number;
        deliveriesDueToday: number;
        deliveriesDueTomorrow: number;
        unownedOrders: number;
        unownedSubscriptions: number;
    };
    exceptions: Record<string, QueueRecord[]>;
};

const currency = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
});

const queueLabels: Record<string, string> = {
    onlinePaymentsPending24Hours: "Online payments pending beyond 24 hours",
    failedOnlinePayments: "Failed online payments",
    paidOrdersNotProcessing: "Paid orders not being processed or fulfilled",
    deliveredCodPaymentPending: "Delivered COD orders still payment-pending",
    activeSubscriptionsMissingNextDelivery: "Active subscriptions missing nextDelivery",
    overdueSubscriptionDeliveries: "Overdue subscription deliveries",
    paidSubscriptionOrdersWithoutSubscription:
        "Paid subscription orders without a corresponding subscription",
    ambiguousOrUnownedCustomers: "Ambiguous or unowned customer records",
};

function displayDate(value: string | undefined, timeZone: string) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone,
    }).format(new Date(value));
}

function Metric({ label, value, note }: { label: string; value: string | number; note?: string }) {
    return (
        <div className="rounded-xl border border-amber-900/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <p className="text-sm text-stone-600 dark:text-stone-300">{label}</p>
            <p className="mt-2 text-2xl font-bold text-stone-900 dark:text-white">{value}</p>
            {note && <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{note}</p>}
        </div>
    );
}

export default function OperationsDashboard() {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetch("/api/admin/operations-summary", { cache: "no-store" });
            if (response.status === 401) {
                window.location.assign("/admin/login");
                return;
            }
            const body = await response.json();
            if (!response.ok || !body.success) throw new Error(body.error || "Unable to load data");
            setSummary(body);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Unable to load data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    return (
        <main className="min-h-screen bg-creme px-4 py-10 text-stone-900 dark:bg-midnight dark:text-white">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="mb-2 text-sm font-bold uppercase tracking-widest text-amber-700 dark:text-gold">
                            Read-only operational view.
                        </p>
                        <h1 className="text-3xl font-bold md:text-4xl">Operations Dashboard</h1>
                        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                            All dates use Asia/Kolkata. No actions can be performed from this page.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void load()}
                        disabled={loading}
                        className="rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
                    >
                        {loading ? "Loading…" : "Refresh"}
                    </button>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800"
                    >
                        {error}
                    </div>
                )}
                {loading && !summary && (
                    <p className="py-16 text-center">Loading operational data…</p>
                )}

                {summary && (
                    <>
                        <p className="mb-4 text-xs text-stone-500 dark:text-stone-400">
                            Snapshot: {displayDate(summary.asOf, summary.timeZone)} (
                            {summary.timeZone})
                        </p>
                        <section aria-labelledby="kpis-heading">
                            <h2 id="kpis-heading" className="mb-4 text-2xl font-bold">
                                Key indicators
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <Metric label="Orders today" value={summary.kpis.ordersToday} />
                                <Metric
                                    label="Orders — last 7 days"
                                    value={summary.kpis.ordersLast7Days}
                                    note="Today plus six preceding Kolkata calendar days"
                                />
                                <Metric
                                    label="Gross order value"
                                    value={currency.format(summary.kpis.grossOrderValue)}
                                    note="All orders created in the last 7 days"
                                />
                                <Metric
                                    label="Online paid value"
                                    value={currency.format(summary.kpis.onlinePaidValue)}
                                    note="Successful CCAvenue orders in the last 7 days"
                                />
                                <Metric
                                    label="COD pending value"
                                    value={currency.format(summary.kpis.codPendingValue)}
                                    note="All-time delivered or undelivered COD receivables"
                                />
                                <Metric
                                    label="Pending payments"
                                    value={summary.kpis.pendingPaymentCount}
                                />
                                <Metric
                                    label="Failed payments"
                                    value={summary.kpis.failedPaymentCount}
                                />
                                <Metric
                                    label="Active subscriptions"
                                    value={summary.kpis.activeSubscriptions}
                                />
                                <Metric
                                    label="Paused subscriptions"
                                    value={summary.kpis.pausedSubscriptions}
                                />
                                <Metric
                                    label="Deliveries due today"
                                    value={summary.kpis.deliveriesDueToday}
                                />
                                <Metric
                                    label="Deliveries due tomorrow"
                                    value={summary.kpis.deliveriesDueTomorrow}
                                />
                                <Metric
                                    label="Unowned orders"
                                    value={summary.kpis.unownedOrders}
                                    note="Includes guests and unmigrated historical records"
                                />
                                <Metric
                                    label="Unowned subscriptions"
                                    value={summary.kpis.unownedSubscriptions}
                                    note="Includes guests and unmigrated historical records"
                                />
                            </div>
                        </section>

                        <section className="mt-10" aria-labelledby="fulfillment-heading">
                            <h2 id="fulfillment-heading" className="mb-4 text-2xl font-bold">
                                Orders by fulfillment status
                            </h2>
                            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                                {Object.entries(summary.kpis.fulfillment).map(([status, count]) => (
                                    <Metric
                                        key={status}
                                        label={status.replace(/^./, (letter) =>
                                            letter.toUpperCase()
                                        )}
                                        value={count}
                                    />
                                ))}
                            </div>
                        </section>

                        <section className="mt-10" aria-labelledby="exceptions-heading">
                            <h2 id="exceptions-heading" className="text-2xl font-bold">
                                Exception queues
                            </h2>
                            <p className="mb-5 mt-1 text-sm text-stone-600 dark:text-stone-300">
                                Each queue is limited to {summary.exceptionLimit} records. Counts
                                shown here are queue rows, not uncapped totals.
                            </p>
                            <div className="space-y-5">
                                {Object.entries(queueLabels).map(([key, label]) => {
                                    const records = summary.exceptions[key] || [];
                                    return (
                                        <details
                                            key={key}
                                            className="overflow-hidden rounded-xl border border-amber-900/10 bg-white dark:border-white/10 dark:bg-slate-900"
                                            open={records.length > 0}
                                        >
                                            <summary className="cursor-pointer px-5 py-4 font-semibold">
                                                {label}{" "}
                                                <span className="ml-2 rounded-full bg-stone-100 px-2 py-1 text-xs dark:bg-slate-700">
                                                    {records.length}
                                                    {records.length === summary.exceptionLimit
                                                        ? "+"
                                                        : ""}
                                                </span>
                                            </summary>
                                            {records.length === 0 ? (
                                                <p className="border-t px-5 py-5 text-sm text-stone-500 dark:border-white/10 dark:text-stone-400">
                                                    No exceptions found.
                                                </p>
                                            ) : (
                                                <div className="overflow-x-auto border-t dark:border-white/10">
                                                    <table className="w-full min-w-[700px] text-left text-sm">
                                                        <thead className="bg-stone-50 dark:bg-slate-800">
                                                            <tr>
                                                                <th className="px-4 py-3">
                                                                    Record
                                                                </th>
                                                                <th className="px-4 py-3">
                                                                    Customer
                                                                </th>
                                                                <th className="px-4 py-3">
                                                                    Value / status
                                                                </th>
                                                                <th className="px-4 py-3">
                                                                    Relevant date
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {records.map((record) => (
                                                                <tr
                                                                    key={record._id}
                                                                    className="border-t dark:border-white/10"
                                                                >
                                                                    <td className="px-4 py-3 font-medium">
                                                                        {record.orderNumber ||
                                                                            record.subscriptionId ||
                                                                            `${record.recordType || "record"} · ${record._id.slice(0, 10)}`}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        {record.customerName ||
                                                                            record.name ||
                                                                            record.phone ||
                                                                            "—"}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        {typeof record.total ===
                                                                        "number"
                                                                            ? currency.format(
                                                                                  record.total
                                                                              )
                                                                            : record.orderStatus ||
                                                                                record.paymentStatus ||
                                                                                record.nextDelivery
                                                                              ? "Review"
                                                                              : "—"}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        {displayDate(
                                                                            record.nextDelivery ||
                                                                                record._createdAt,
                                                                            summary.timeZone
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </details>
                                    );
                                })}
                            </div>
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}
