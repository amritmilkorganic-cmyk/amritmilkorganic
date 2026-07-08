import { writeClient } from "@/lib/sanity";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanPhoneNumber(phone: string) {
    return phone.replace(/\D/g, "").slice(-10);
}

function safeNumber(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const phone = searchParams.get("phone");

        if (!phone) {
            return NextResponse.json(
                { error: "Phone number is required" },
                { status: 400 }
            );
        }

        const cleanPhone = cleanPhoneNumber(phone);

        const orders = await writeClient.fetch(
            `*[_type == "order" && phone match $phoneMatch] | order(createdAt desc) {
                _id,
                orderNumber,
                customerName,
                email,
                phone,
                address,
                city,
                state,
                orderStatus,
                paymentStatus,
                total,
                items,
                createdAt
            }`,
            { phoneMatch: `*${cleanPhone}*` }
        );

        const subscriptions = await writeClient.fetch(
            `*[_type == "subscription" && customer.phone match $phoneMatch] | order(createdAt desc) {
                _id,
                subscriptionId,
                status,
                product,
                plan,
                customer,
                createdAt
            }`,
            { phoneMatch: `*${cleanPhone}*` }
        );

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
        if (totalSpent > 15000) tier = "Platinum Elite";
        else if (totalSpent > 5000) tier = "Gold Member";
        else if (totalSpent > 0) tier = "Bronze Start";

        const source = latestOrder || latestSubscription?.customer || {};

        return NextResponse.json({
            exists: orders.length > 0 || subscriptions.length > 0,
            profile: {
                name: source.customerName || source.name || "Guest Member",
                email: source.email || "",
                phone: source.phone || phone,
                address: source.address || "",
                city: source.city || "",
                state: source.state || "",
                tier,
                totalSpent,
                activeSubscriptions,
                impactPoints: Math.floor(totalSpent * 0.1),
            },
            orders: orders.map((order: any) => ({
                id: order._id,
                orderNumber: order.orderNumber,
                date: order.createdAt,
                status: order.orderStatus || order.paymentStatus || "processing",
                total: safeNumber(order.total),
                items: order.items || [],
            })),
            subscriptions: subscriptions.map((sub: any) => ({
                id: sub._id,
                subscriptionId: sub.subscriptionId,
                status: sub.status,
                product: sub.product,
                plan: sub.plan,
                createdAt: sub.createdAt,
            })),
        });
    } catch (error) {
        console.error("Profile fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch profile" },
            { status: 500 }
        );
    }
}