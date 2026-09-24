/**
 * CCAvenue Payment Response Handler
 * Receives encrypted response from CCAvenue and processes payment status
 */

import { decrypt, parseResponse } from "@/lib/ccavenue";
import { sendOrderNotifications } from "@/lib/notifications";
import { updateOrderPaymentStatus } from "@/lib/sanity-orders";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const encryptedResponse = formData.get("encResp") as string;

        if (!encryptedResponse) {
            return NextResponse.redirect(
                new URL("/checkout?status=error&message=no_response", req.url),
                { status: 303 }
            );
        }

        const workingKey = process.env.CCAVENUE_WORKING_KEY?.trim();

        if (!workingKey) {
            console.error(JSON.stringify({ operation: "ccavenue.callback", category: "configuration_unavailable" }));
            return NextResponse.redirect(
                new URL("/checkout?status=error&message=config_error", req.url),
                { status: 303 }
            );
        }

        const decryptedData = decrypt(encryptedResponse, workingKey);
        const responseParams = parseResponse(decryptedData);

        const { order_id, tracking_id, order_status } = responseParams;

        if (order_status === "Success") {
            let paymentTotal: number | null = null;

            try {
                if (process.env.SANITY_WRITE_TOKEN) {
                    const updatedOrder = await updateOrderPaymentStatus(
                        order_id,
                        "success",
                        tracking_id
                    );

                    if (updatedOrder) {
                        paymentTotal = updatedOrder.total || null;

                        await sendOrderNotifications({
                            orderNumber: updatedOrder.orderNumber,
                            customerName: updatedOrder.customerName,
                            email: updatedOrder.email,
                            phone: updatedOrder.phone,
                            total: updatedOrder.total,
                            paymentMethod: "online",
                            items: updatedOrder.items.map((item: any) => ({
                                title: item.title,
                                quantity: item.quantity,
                                price: item.price,
                            })),
                            address: updatedOrder.address,
                            city: updatedOrder.city,
                            state: updatedOrder.state,
                            pincode: updatedOrder.pincode,
                        });
                    }
                } else {
                    console.error(JSON.stringify({ operation: "ccavenue.order.update", category: "configuration_unavailable" }));
                }
            } catch {
                console.error(JSON.stringify({ operation: "ccavenue.order.update", category: "data_update_failed" }));
            }

            const successUrl = new URL("/checkout/success", req.url);
            successUrl.searchParams.set("order_id", order_id || "");
            successUrl.searchParams.set("tracking_id", tracking_id || "");

            if (paymentTotal) {
                successUrl.searchParams.set("value", String(paymentTotal));
            }

            return NextResponse.redirect(successUrl, {
                status: 303,
                headers: { "Cache-Control": "no-store, max-age=0" },
            });
        } else if (order_status === "Aborted") {
            const cancelUrl = new URL("/checkout", req.url);
            cancelUrl.searchParams.set("status", "cancelled");
            cancelUrl.searchParams.set("message", "Payment was cancelled");

            return NextResponse.redirect(cancelUrl, {
                status: 303,
                headers: { "Cache-Control": "no-store, max-age=0" },
            });
        } else {
            try {
                await updateOrderPaymentStatus(order_id, "failed");
            } catch {
                console.error(JSON.stringify({ operation: "ccavenue.order.update", category: "data_update_failed" }));
            }

            const failureUrl = new URL("/checkout", req.url);
            failureUrl.searchParams.set("status", "failed");
            failureUrl.searchParams.set("message", "payment_failed");
            failureUrl.searchParams.set("order_id", order_id || "");

            return NextResponse.redirect(failureUrl, {
                status: 303,
                headers: { "Cache-Control": "no-store, max-age=0" },
            });
        }
    } catch {
        console.error(JSON.stringify({ operation: "ccavenue.callback", category: "processing_failed" }));
        return NextResponse.redirect(
            new URL("/checkout?status=error&message=processing_error", req.url)
        );
    }
}

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const encryptedResponse = searchParams.get("encResp");

    if (encryptedResponse) {
        return NextResponse.redirect(
            new URL("/checkout?status=error&message=invalid_method", req.url)
        );
    }

    return NextResponse.redirect(new URL("/checkout", req.url));
}
