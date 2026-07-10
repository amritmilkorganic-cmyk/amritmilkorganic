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

function isGoodName(name: any): boolean {
  const n = String(name || "").trim().toLowerCase();

  return (
    !!n &&
    n.length > 2 &&
    !["mr", "mr.", "mrs", "mrs.", "ms", "ms."].includes(n)
  );
}

function pickBestName(orders: any[], subscriptions: any[]) {
  const subName = subscriptions.find((s) =>
    isGoodName(s?.customer?.name)
  )?.customer?.name;

  if (subName) return subName;

  const orderName = orders.find((o) =>
    isGoodName(o?.customerName)
  )?.customerName;

  if (orderName) return orderName;

  return "Guest Member";
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

    const account = await writeClient.fetch(
      `*[_type == "customerAccount" && phone match $phoneMatch]
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
      { phoneMatch: `*${cleanPhone}*` }
    );

    const orders = await writeClient.fetch(
      `*[_type == "order" && phone match $phoneMatch]
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
      { phoneMatch: `*${cleanPhone}*` }
    );

    const subscriptions = await writeClient.fetch(
      `*[_type == "subscription" && customer.phone match $phoneMatch]
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
        phone: account?.phone || source.phone || phone,
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
  } catch (error) {
    console.error("Profile fetch error:", error);

    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}