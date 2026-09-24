import { writeClient } from "@/lib/sanity";
import { NextRequest, NextResponse } from "next/server";
import { requireCustomer, safeLog } from "@/lib/security/http";
import { canonicalPhone, findUniqueCustomerAccount } from "@/lib/security/customer-identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeNumber(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function isGoodName(name: any): boolean {
    const n = String(name || "")
        .trim()
        .toLowerCase();

    return !!n && n.length > 2 && !["mr", "mr.", "mrs", "mrs.", "ms", "ms."].includes(n);
}

function pickBestName(orders: any[], subscriptions: any[]) {
    const subName = subscriptions.find((s) => isGoodName(s?.customer?.name))?.customer?.name;

    if (subName) return subName;

    const orderName = orders.find((o) => isGoodName(o?.customerName))?.customerName;

    if (orderName) return orderName;

    return "Guest Member";
}

export async function GET(req: NextRequest) {
    try {
        const session = requireCustomer(req);
        if (session instanceof NextResponse) return session;
        const cleanPhone = canonicalPhone(session.phone);
        if (!cleanPhone)
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });

        const account = await writeClient.fetch(
            `*[_type == "customerAccount" && _id == $accountId && canonicalPhone == $canonical]
        | order(updatedAt desc, _updatedAt desc)[0]{
          _id,
          name,
          email,
          phone,
          address,
          city,
          state,
          pincode,
          isActive
        }`,
            { accountId: session.sub, canonical: cleanPhone }
        );

        if (!account || account.isActive === false) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const ownerLookup = await findUniqueCustomerAccount(writeClient, cleanPhone);
        if (ownerLookup.ambiguous || ownerLookup.account?._id !== session.sub) {
            return NextResponse.json({ error: "Customer records require support" }, { status: 409 });
        }

        const ownedOrders = await writeClient.fetch(
            `*[_type == "order" && customerAccount._ref == $accountId]
        | order(_createdAt desc) {
          _id,
          orderNumber,
          customerName,
          email,
          phone,
          address,
          city,
          state,
          orderStatus,
          paymentMethod,
          paymentStatus,
          trackingId,
          total,
          items,
          createdAt,
          _createdAt
        }`,
            { accountId: session.sub }
        );

        const legacyOrders = await writeClient.fetch(
            `*[_type == "order" && !defined(customerAccount)] | order(_createdAt desc)`,
            {}
        );
        const orders = [...ownedOrders, ...legacyOrders.filter((order: any) => canonicalPhone(order.phone) === cleanPhone)]
            .filter((order, index, all) => all.findIndex((item) => item._id === order._id) === index)
            .sort((a, b) => String(b.createdAt || b._createdAt).localeCompare(String(a.createdAt || a._createdAt)));

        const ownedSubscriptions = await writeClient.fetch(
            `*[_type == "subscription" && customerAccount._ref == $accountId]
        | order(_createdAt desc) {
          _id,
          subscriptionId,
          status,
          product,
          planType,
          plan,
          paymentMethod,
          deliveryInstructions,
          customer,
          createdAt,
          _createdAt
        }`,
            { accountId: session.sub }
        );
        const legacySubscriptions = await writeClient.fetch(
            `*[_type == "subscription" && !defined(customerAccount)] | order(_createdAt desc)`,
            {}
        );
        const subscriptions = [
            ...ownedSubscriptions,
            ...legacySubscriptions.filter(
                (subscription: any) => canonicalPhone(subscription.customer?.phone) === cleanPhone
            ),
        ]
            .filter((subscription, index, all) =>
                all.findIndex((item) => item._id === subscription._id) === index
            )
            .sort((a, b) => String(b.createdAt || b._createdAt).localeCompare(String(a.createdAt || a._createdAt)));

        const latestOrder = orders?.[0];
        const latestSubscription = subscriptions?.[0];

        const totalSpent = orders.reduce(
            (sum: number, order: any) => sum + safeNumber(order.total),
            0
        );

        const activeSubscriptions = subscriptions.filter(
            (sub: any) => String(sub.status).toLowerCase() === "active"
        ).length;

        let tier = "Bronze Start";

        if (totalSpent > 15000) {
            tier = "Platinum Elite";
        } else if (totalSpent > 5000) {
            tier = "Gold Member";
        }

        const source = latestSubscription?.customer || latestOrder || {};
        const bestName = pickBestName(orders, subscriptions);

        return NextResponse.json({
            exists: !!account || orders.length > 0 || subscriptions.length > 0,

            profile: {
                name: account?.name || bestName,
                email: account?.email || source.email || "",
                phone: account?.phone || source.phone || cleanPhone,
                address: account?.address || source.address || "",
                city: account?.city || source.city || "",
                state: account?.state || source.state || "",
                pincode: account?.pincode || "",
                tier,
                totalSpent,
                activeSubscriptions,
                impactPoints: Math.floor(totalSpent * 0.1),
            },

            orders: orders.map((order: any) => ({
                id: order._id,
                orderNumber: order.orderNumber,
                date: order.createdAt || order._createdAt,
                status: order.orderStatus || "processing",
                paymentStatus: order.paymentStatus || "pending",
                paymentMethod: order.paymentMethod || "",
                trackingId: order.trackingId || "",
                total: safeNumber(order.total),
                items: order.items || [],
            })),

            subscriptions: subscriptions.map((sub: any) => ({
                id: sub._id,
                subscriptionId: sub.subscriptionId,
                status: sub.status,
                product: sub.product,
                planType: sub.planType,
                plan: sub.plan,
                paymentMethod: sub.paymentMethod,
                deliveryInstructions: sub.deliveryInstructions,
                createdAt: sub.createdAt || sub._createdAt,
            })),
        });
    } catch {
        safeLog("customer.profile.read", req, "data_access_failed");

        return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }
}
