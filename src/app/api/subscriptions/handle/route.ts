/**
 * Subscription Payment Response Handler
 * Processes CCAvenue callback for subscription/prepaid payments
 */

import { decrypt, parseResponse } from "@/lib/ccavenue";
import { writeClient } from "@/lib/sanity";
import { createOrder, updateOrderPaymentStatus } from "@/lib/sanity-orders";
import { NextRequest, NextResponse } from "next/server";
import { findUniqueCustomerAccount } from "@/lib/security/customer-identity";

export const dynamic = "force-dynamic";

function safeNumber(value: any): number {
    const n = parseFloat(String(value || "0").replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : 0;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const encResponse = formData.get("encResp") as string;

        if (!encResponse) {
            return NextResponse.redirect(
                new URL("/subscription/failed?reason=no_response", req.url),
                303
            );
        }

        const workingKey = process.env.CCAVENUE_WORKING_KEY?.trim();

        if (!workingKey) {
            console.error(JSON.stringify({ operation: "subscription.callback", category: "configuration_unavailable" }));
            return NextResponse.redirect(
                new URL("/subscription/failed?reason=config_error", req.url),
                303
            );
        }

        const decrypted = decrypt(encResponse, workingKey);
        const responseParams = parseResponse(decrypted);

        const orderStatus = String(responseParams.order_status || "")
            .trim()
            .toLowerCase();

        const isSuccess = orderStatus === "success";
        const amount = safeNumber(responseParams.amount);
        const subscriptionId = responseParams.order_id || `SUB-${Date.now()}`;
        const trackingId = responseParams.tracking_id || "";

        if (isSuccess) {
            const customerName = responseParams.billing_name || "Customer Name";
            const email = responseParams.billing_email || "";
            const phone = responseParams.billing_tel || "";
            const address = responseParams.billing_address || "";
            const city = responseParams.billing_city || "";
            const state = responseParams.billing_state || "";
            const pincode = responseParams.billing_zip || "";
            const customerLookup = await findUniqueCustomerAccount(writeClient, phone);
            const customerAccountId = customerLookup.ambiguous
                ? undefined
                : customerLookup.account?._id;

            const productId = responseParams.merchant_param2 || "unknown";
            const planType = responseParams.merchant_param3 || "one_time";
            const productName = responseParams.merchant_param4 || "Subscription Product";

            const subscription = {
                _type: "subscription",
                ...(customerAccountId && {
                    customerAccount: { _type: "reference", _ref: customerAccountId },
                }),
                subscriptionId,
                customer: {
                    name: customerName,
                    email,
                    phone,
                    address: `${address}, ${city}, ${pincode}`,
                },
                product: {
                    productId,
                    name: productName,
                    quantity: 1,
                    price: amount,
                },
                plan: {
                    planType,
                    startDate: new Date().toISOString().split("T")[0],
                    nextDelivery: new Date(Date.now() + 86400000).toISOString(),
                },
                status: "active",
                paymentMethod: "prepaid_one_time",
                ccavenueData: {
                    subscriptionRefNo: trackingId,
                    mandateId: "N/A",
                    cardToken: responseParams.card_name || "",
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            try {
                await writeClient.create(subscription);
            } catch {
                console.error(JSON.stringify({ operation: "subscription.record.create", category: "data_update_failed" }));
            }

            try {
                const { orderNumber } = await createOrder({
                    customerAccountId,
                    customerName,
                    email,
                    phone,
                    address,
                    city,
                    state,
                    pincode,
                    items: [
                        {
                            title: `${productName} (${planType})`,
                            quantity: 1,
                            price: `₹${amount}`,
                        },
                    ],
                    subtotal: amount,
                    deliveryFee: 0,
                    discount: 0,
                    couponCode: "",
                    total: amount,
                    paymentMethod: "ccavenue",
                });

                await updateOrderPaymentStatus(orderNumber, "success", trackingId);

            } catch {
                console.error(JSON.stringify({ operation: "subscription.order.create", category: "data_update_failed" }));
            }

            const successUrl = new URL("/subscription/success", req.url);
            successUrl.searchParams.set("id", subscriptionId);
            successUrl.searchParams.set("tracking_id", trackingId);
            successUrl.searchParams.set("value", String(amount));

            return NextResponse.redirect(successUrl, 303);
        }

        return NextResponse.redirect(
            new URL(
                "/subscription/failed?reason=payment_failed",
                req.url
            ),
            303
        );
    } catch {
        console.error(JSON.stringify({ operation: "subscription.callback", category: "processing_failed" }));

        return NextResponse.redirect(
            new URL("/subscription/failed?reason=server_error", req.url),
            303
        );
    }
}
