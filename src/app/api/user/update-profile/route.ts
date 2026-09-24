import { writeClient } from "@/lib/sanity";
import { NextRequest, NextResponse } from "next/server";
import { requireCustomer, safeLog, validateMutationOrigin } from "@/lib/security/http";
import { canonicalPhone } from "@/lib/security/customer-identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
        const name = String(body.name || "").trim();
        const email = String(body.email || "")
            .trim()
            .toLowerCase();

        if (!phone || phone.length < 10) {
            return NextResponse.json({ error: "Valid phone number is required." }, { status: 400 });
        }

        if (!name) {
            return NextResponse.json({ error: "Customer name is required." }, { status: 400 });
        }

        if (email && !email.includes("@")) {
            return NextResponse.json(
                { error: "Please enter a valid email address." },
                { status: 400 }
            );
        }

        const account = await writeClient.fetch(
            `*[_type == "customerAccount" && _id == $accountId && canonicalPhone == $canonical]
    | order(updatedAt desc, _updatedAt desc)[0]{
      _id
    }`,
            { accountId: session.sub, canonical: phone }
        );

        if (!account?._id) {
            return NextResponse.json({ error: "Customer account not found." }, { status: 404 });
        }

        await writeClient
            .patch(account._id)
            .set({
                name,
                email,
                updatedAt: new Date().toISOString(),
            })
            .commit();

        return NextResponse.json({
            ok: true,
            message: "Profile updated successfully.",
            profile: {
                name,
                email,
            },
        });
    } catch {
        safeLog("customer.profile.update", req, "data_update_failed");

        return NextResponse.json({ error: "Unable to update profile." }, { status: 500 });
    }
}
