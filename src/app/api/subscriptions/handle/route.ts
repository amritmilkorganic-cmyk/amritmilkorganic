/**
 * Subscription Payment Response Handler
 * Processes CCAvenue callback for recurring payments
 */

import { decrypt, parseResponse } from "@/lib/ccavenue";
import { writeClient } from "@/lib/sanity";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WORKING_KEY = "7E11E36439A6169B00EB122F6155B84A".trim();

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

        console.log("[Subscription] CCAvenue Response:", {
            orderId: responseParams.order_id,
            rawStatus: responseParams.order_status,
            normalizedStatus: orderStatus,
            statusMessage: responseParams.status_message,
            failureMessage: responseParams.failure_message,
            amount: responseParams.amount,
        });

        if (isSuccess) {
            const subscription = {
                _type: "subscription",
                subscriptionId: responseParams.order_id,

                customer: {
                    name: responseParams.billing_name || "",
                    email: responseParams.billing_email || "",
                    phone: responseParams.billing_tel || "",
                    address: `${responseParams.billing_address || ""}, ${
                        responseParams.billing_city || ""
                    }, ${responseParams.billing_zip || ""}`,
                },

                product: {
                    productId: responseParams.merchant_param2 || "unknown",
                    name: responseParams.merchant_param4 || "Product Name",
                    quantity: 1,
                    price: parseFloat(responseParams.amount || "0"),
                },

                plan: {
                    planType: responseParams.merchant_param3 || "one_time",
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
                console.log(`[Subscription] Created ${responseParams.order_id}`);
            } catch (sanityError) {
                console.error("[Subscription] Sanity create failed:", sanityError);
            }

            return NextResponse.redirect(
                new URL(`/subscription/success?id=${responseParams.order_id}`, req.url),
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