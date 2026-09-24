/**
 * Subscription Creation API
 * Initiates recurring payment with CCAvenue
 */

import { encrypt, CCAVENUE_URLS, buildRequestData } from "@/lib/ccavenue";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const {
            productId,
            productName,
            variant,
            quantity,
            price,
            planType,
            customerName,
            customerEmail,
            customerPhone,
            billingAddress,
            billingCity,
            billingState,
            billingZip,
            startDate, // YYYY-MM-DD format
        } = body;

        // Validate
        if (!productId || !customerName || !customerEmail || !customerPhone || !planType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Use same CCAvenue credentials
        const merchantId = process.env.CCAVENUE_MERCHANT_ID?.trim();
        const accessCode = process.env.CCAVENUE_ACCESS_CODE?.trim();
        const workingKey = process.env.CCAVENUE_WORKING_KEY?.trim();

        if (!merchantId || !accessCode || !workingKey) {
            console.error(JSON.stringify({ operation: "subscription.create", category: "configuration_unavailable" }));
            return NextResponse.json({ error: "Payment service is unavailable" }, { status: 503 });
        }

        const redirectUrl = "https://www.amritmilkorganic.com/api/subscriptions/handle";
        const cancelUrl = "https://www.amritmilkorganic.com/api/subscriptions/handle";

        // Generate subscription ID
        const subscriptionId = `SUB-${Date.now()}-${productId.slice(0, 8)}`;
        const amount = price * quantity;

        // Build recurring payment request
        const requestData = buildRequestData({
            orderId: subscriptionId,
            amount: amount,
            merchantId,
            redirectUrl,
            cancelUrl,
            customerName,
            customerEmail,
            customerPhone,
            billingAddress: billingAddress || "",
            billingCity: billingCity || "",
            billingState: billingState || "",
            billingZip: billingZip || "",
        });

        // Add plan metadata as custom parameters
        const params = new URLSearchParams(requestData);
        params.set("merchant_param1", "milk_plan"); // Type
        params.set("merchant_param2", productId); // Product ID
        params.set("merchant_param3", planType); // Plan Type (one_time, trial_5day, monthly_30day)
        params.set("merchant_param4", productName); // Product Name

        // Encrypt for CCAvenue
        const encryptedData = encrypt(params.toString(), workingKey);

        const isTestMode = process.env.CCAVENUE_TEST_MODE === "true";
        const ccavenueUrl = isTestMode ? CCAVENUE_URLS.test : CCAVENUE_URLS.production;

        // Return encrypted data for client-side form submission
        return NextResponse.json({
            success: true,
            subscriptionId,
            encryptedData,
            accessCode,
            ccavenueUrl,
            metadata: {
                productId,
                productName,
                variant,
                quantity,
                planType,
                totalAmount: amount,
            },
        });
    } catch {
        console.error(
            JSON.stringify({ operation: "subscription.create", category: "operation_failed" })
        );
        return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
    }
}
