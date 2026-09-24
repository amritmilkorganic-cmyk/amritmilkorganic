import { writeClient } from "@/lib/sanity";
import { NextRequest, NextResponse } from "next/server";
import { requireCustomer, safeLog, validateMutationOrigin } from "@/lib/security/http";
import { canonicalPhone } from "@/lib/security/customer-identity";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const session = requireCustomer(req);
        if (session instanceof NextResponse) return session;
        if (!validateMutationOrigin(req))
            return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
        const body = await req.json();

        const phone = canonicalPhone(session.phone);
        if (body.phone && canonicalPhone(body.phone) !== phone)
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        const address = String(body.address || "").trim();
        const city = String(body.city || "").trim();
        const state = String(body.state || "").trim();
        const pincode = String(body.pincode || "").trim();

        if (!phone || phone.length < 10) {
            return NextResponse.json({ error: "Valid phone number is required." }, { status: 400 });
        }

        const account = await writeClient.fetch(
            `*[_type == "customerAccount" && _id == $accountId && canonicalPhone == $canonical][0]{ _id }`,
            { accountId: session.sub, canonical: phone }
        );

        if (!account?._id) {
            return NextResponse.json({ error: "Customer account not found." }, { status: 404 });
        }

        await writeClient
            .patch(account._id)
            .set({
                address,
                city,
                state,
                pincode,
                updatedAt: new Date().toISOString(),
            })
            .commit();

        return NextResponse.json({
            ok: true,
            message: "Address updated successfully.",
            address: {
                address,
                city,
                state,
                pincode,
            },
        });
    } catch {
        safeLog("customer.address.update", req, "data_update_failed");

        return NextResponse.json({ error: "Unable to update address." }, { status: 500 });
    }
}
