/**
 * Subscription Payment Response Handler
 * Processes CCAvenue callback for subscription/prepaid payments
 */

import { decrypt, parseResponse } from "@/lib/ccavenue";
import { writeClient } from "@/lib/sanity";
import {
    createOrder,
    updateOrderPaymentStatus,
} from "@/lib/sanity-orders";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WORKING_KEY = "7E11E36439A6169B00EB122F6155B84A".trim();

function safeNumber(value: any): number {
    const n = parseFloat(String(value || "0").replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : 0;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const encResponse = formData.get("encResp") as string;

        if (!encResponse) {
            console.error("[Subscription] No encrypted response from CCAvenue");

            return NextResponse.redirect(
                new URL("/subscription/failed?reason=no_response", req.url),
                303
            );
        }

        const decrypted = decrypt(encResponse, WORKING_KEY);
        const responseParams = parseResponse(decrypted);

        const orderStatus = String(responseParams.order_status || "")
            .trim()
            .toLowerCase();

        const isSuccess = orderStatus === "success";
        const amount = safeNumber(responseParams.amount);
        const subscriptionId = responseParams.order_id || `SUB-${Date.now()}`;

        console.log("[Subscription] CCAvenue Response:", {
            orderId: subscriptionId,
            rawStatus: responseParams.order_status,
            normalizedStatus: orderStatus,
            statusMessage: responseParams.status_message,
            failureMessage: responseParams.failure_message,
            amount: responseParams.amount,
            trackingId: responseParams.tracking_id,
        });

        if (isSuccess) {
            const customerName = responseParams.billing_name || "Customer Name";
            const email = responseParams.billing_email || "";
            const phone = responseParams.billing_tel || "";
            const address = responseParams.billing_address || "";
            const city = responseParams.billing_city || "";
            const state = responseParams.billing_state || "";
            const pincode = responseParams.billing_zip || "";

            const productId = responseParams.merchant_param2 || "unknown";
            const planType = responseParams.merchant_param3 || "one_time";
            const productName =
                responseParams.merchant_param4 || "Subscription Product";

            const subscription = {
                _type: "subscription",
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
                    subscriptionRefNo: responseParams.tracking_id || "",
                    mandateId: "N/A",
                    cardToken: responseParams.card_name || "",
                },

                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            try {
                await writeClient.create(subscription);
                console.log(`[Subscription] Created ${subscriptionId}`);
            } catch (sanityError) {
                console.error(
                    "[Subscription] Sanity subscription create failed:",
                    sanityError
                );
            }

            try {
                const { orderNumber } = await createOrder({
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

                await updateOrderPaymentStatus(
                    orderNumber,
                    "success",
                    responseParams.tracking_id
                );

                console.log(
                    `[Subscription] Linked normal order created and marked paid: ${orderNumber} for ${subscriptionId}`
                );
            } catch (orderError) {
                console.error(
                    "[Subscription] Normal order create/update failed:",
                    orderError
                );
            }

            return NextResponse.redirect(
                new URL(`/subscription/success?id=${subscriptionId}`, req.url),
                303
            );
        }

        console.error("[Subscription] Payment failed:", {
            order_status: responseParams.order_status,
            status_message: responseParams.status_message,
            failure_message: responseParams.failure_message,
        });

        return NextResponse.redirect(
            new URL(
                `/subscription/failed?reason=${encodeURIComponent(
                    responseParams.failure_message ||
                        responseParams.status_message ||
                        responseParams.order_status ||
                        "payment_failed"
                )}`,
                req.url
            ),
            303
        );
    } catch (error: any) {
        console.error("[Subscription] Handler error:", error);

        return NextResponse.redirect(
            new URL("/subscription/failed?reason=server_error", req.url),
            303
        );
    }
}