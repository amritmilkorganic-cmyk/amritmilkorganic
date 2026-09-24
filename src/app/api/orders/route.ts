/**
* Orders API Route
* Creates orders in Sanity and sends notifications
*/

import { sendOrderNotifications } from "@/lib/notifications";
import { createOrder } from "@/lib/sanity-orders";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/security/http";
import { findUniqueCustomerAccount } from "@/lib/security/customer-identity";
import { writeClient } from "@/lib/sanity";

const prisma = new PrismaClient();

// Validation schema for new orders
const orderSchema = z.object({
customerName: z.string().min(1, "Name is required"),
email: z.string().email("Invalid email").optional().or(z.literal("")),
phone: z.string().min(10, "Phone must be at least 10 digits"),
address: z.string().min(1, "Address is required"),
city: z.string().min(1, "City is required"),
state: z.string().optional().default(""),
pincode: z.string().min(5, "Pincode is required"),
items: z.array(
z.object({
id: z.string().optional(),
title: z.string(),
price: z.string(),
quantity: z.number(),
image: z.string().optional(),
slug: z.string().optional(),
})
),
subtotal: z.number(),
deliveryFee: z.number().optional().default(0),
discount: z.number().optional().default(0),
couponCode: z.string().optional(),
total: z.number(),
paymentMethod: z.enum(["cod", "ccavenue"]),
});

/**
* POST - Create new order
*/
export async function POST(req: NextRequest) {
try {
const body = await req.json();

const validationResult = orderSchema.safeParse(body);

if (!validationResult.success) {
return NextResponse.json(
{
success: false,
error: "Validation failed",
details: validationResult.error.flatten().fieldErrors,
},
{ status: 400 }
);
}

if (!process.env.SANITY_WRITE_TOKEN) {
console.error(JSON.stringify({ operation: "order.create", category: "configuration_unavailable" }));
return NextResponse.json(
{
success: false,
error: "Order service is unavailable.",
},
{ status: 500 }
);
}

const data = validationResult.data;

const customerLookup = await findUniqueCustomerAccount(writeClient, data.phone);

if (data.couponCode) {
try {
await prisma.coupon.update({
where: { code: data.couponCode },
data: {
usageCount: { increment: 1 },
},
});
} catch {
console.warn(JSON.stringify({ operation: "order.coupon.increment", category: "data_update_failed" }));
}
}

const { orderNumber, id } = await createOrder({
customerAccountId: customerLookup.ambiguous ? undefined : customerLookup.account?._id,
customerName: data.customerName,
email: data.email || "",
phone: data.phone,
address: data.address,
city: data.city,
state: data.state || "",
pincode: data.pincode,
items: data.items.map((item) => ({
title: item.title,
quantity: item.quantity,
price: item.price,
})),
subtotal: data.subtotal,
deliveryFee: data.deliveryFee || 0,
discount: data.discount,
couponCode: data.couponCode,
total: data.total,
paymentMethod: data.paymentMethod,
});


// Send notifications for COD immediately
if (data.paymentMethod === "cod") {

try {
await sendOrderNotifications({
orderNumber,
customerName: data.customerName,
email: data.email || "",
phone: data.phone,
total: data.total,
paymentMethod: data.paymentMethod,
items: data.items.map((item) => ({
title: item.title,
quantity: item.quantity,
price: item.price,
})),
address: data.address,
city: data.city,
state: data.state,
pincode: data.pincode,
});

} catch {
console.error(JSON.stringify({ operation: "order.notification", category: "delivery_failed" }));
}
}

return NextResponse.json({
success: true,
order: {
id,
orderNumber,
total: data.total,
paymentMethod: data.paymentMethod,
},
});
} catch {
console.error(JSON.stringify({ operation: "order.create", category: "operation_failed" }));

return NextResponse.json(
{
success: false,
error: "Failed to create order",
},
{ status: 500 }
);
}
}

/**
* GET - List orders (for Admin UI)
*/
export async function GET(req: NextRequest) {
const auth = requireAdmin(req);
if (auth instanceof NextResponse) return auth;
try {
const { getOrders } = await import("@/lib/sanity-orders");
const orders = await getOrders(50);

return NextResponse.json({
success: true,
orders,
});
} catch {
console.error(JSON.stringify({ operation: "admin.orders.list", category: "data_access_failed" }));
return NextResponse.json(
{ success: false, error: "Failed to fetch orders" },
{ status: 500 }
);
}
}
