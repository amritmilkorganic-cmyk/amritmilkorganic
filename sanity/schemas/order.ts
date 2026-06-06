import { defineField, defineType } from "sanity";

export default defineType({
    name: "order",
    title: "Orders",
    type: "document",
    fields: [
        defineField({
            name: "orderNumber",
            title: "Order Number",
            type: "string",
            validation: (Rule) => Rule.required(),
            readOnly: true,
        }),
        defineField({
            name: "customerName",
            title: "Customer Name",
            type: "string",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "email",
            title: "Email",
            type: "string",
        }),
        defineField({
            name: "phone",
            title: "Phone",
            type: "string",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "address",
            title: "Shipping Address",
            type: "text",
            rows: 3,
        }),
        defineField({
            name: "city",
            title: "City",
            type: "string",
        }),
        defineField({
            name: "state",
            title: "State",
            type: "string",
        }),
        defineField({
            name: "pincode",
            title: "Pincode",
            type: "string",
        }),
        defineField({
            name: "items",
            title: "Order Items",
            type: "array",
            of: [
                {
                    type: "object",
                    fields: [
                        { name: "title", title: "Product", type: "string" },
                        { name: "quantity", title: "Qty", type: "number" },
                        { name: "price", title: "Price", type: "string" },
                    ],
                    preview: {
                        select: { title: "title", quantity: "quantity", price: "price" },
                        prepare({ title, quantity, price }) {
                            return { title: `${title} × ${quantity}`, subtitle: price };
                        },
                    },
                },
            ],
        }),
        defineField({
            name: "subtotal",
            title: "Subtotal",
            type: "number",
        }),
        defineField({
            name: "deliveryFee",
            title: "Delivery Fee",
            type: "number",
            initialValue: 0,
        }),
        defineField({
            name: "couponCode",
            title: "Coupon Code",
            type: "string",
            description: "Coupon code applied by customer, if any.",
        }),
        defineField({
            name: "discount",
            title: "Discount",
            type: "number",
            initialValue: 0,
            description: "Discount amount applied on this order.",
        }),
        defineField({
            name: "total",
            title: "Total Amount",
            type: "number",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "paymentMethod",
            title: "Payment Method",
            type: "string",
            options: {
                list: [
                    { title: "Cash on Delivery", value: "cod" },
                    { title: "CCAvenue (Online)", value: "ccavenue" },
                ],
                layout: "radio",
            },
        }),
        defineField({
            name: "paymentStatus",
            title: "Payment Status",
            type: "string",
            options: {
                list: [
                    { title: "⏳ Pending", value: "pending" },
                    { title: "✅ Paid", value: "success" },
                    { title: "❌ Failed", value: "failed" },
                ],
                layout: "radio",
            },
            initialValue: "pending",
        }),
        defineField({
            name: "orderStatus",
            title: "Order Status",
            type: "string",
            options: {
                list: [
                    { title: "🆕 Pending", value: "pending" },
                    { title: "📦 Processing", value: "processing" },
                    { title: "🚚 Shipped", value: "shipped" },
                    { title: "✅ Delivered", value: "delivered" },
                    { title: "❌ Cancelled", value: "cancelled" },
                ],
            },
            initialValue: "pending",
        }),
        defineField({
            name: "trackingId",
            title: "Payment Tracking ID",
            type: "string",
            description: "CCAvenue transaction tracking ID",
        }),
        defineField({
            name: "notes",
            title: "Order Notes",
            type: "text",
            rows: 2,
            description: "Internal notes (not visible to customer)",
        }),
    ],
    orderings: [
        {
            title: "Newest First",
            name: "createdAtDesc",
            by: [{ field: "_createdAt", direction: "desc" }],
        },
    ],
    preview: {
        select: {
            orderNumber: "orderNumber",
            customer: "customerName",
            total: "total",
            status: "orderStatus",
            paymentStatus: "paymentStatus",
        },
        prepare({
            orderNumber,
            customer,
            total,
            status,
            paymentStatus,
        }: {
            orderNumber?: string;
            customer?: string;
            total?: number;
            status?: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
            paymentStatus?: string;
        }) {
            const statusEmojiMap: Record<
                "pending" | "processing" | "shipped" | "delivered" | "cancelled",
                string
            > = {
                pending: "🆕",
                processing: "📦",
                shipped: "🚚",
                delivered: "✅",
                cancelled: "❌",
            };

            const statusEmoji = status ? (statusEmojiMap[status] ?? "❓") : "❓";

            const paymentEmoji =
                paymentStatus === "success" ? "💰" : paymentStatus === "failed" ? "⚠️" : "⏳";

            return {
                title: `${orderNumber} - ${customer}`,
                subtitle: `${statusEmoji} ${status} | ${paymentEmoji} ₹${total}`,
            };
        },
    },
});