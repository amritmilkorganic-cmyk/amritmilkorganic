import { writeClient } from "@/lib/sanity";
import { sendPasswordResetEmail } from "@/lib/notifications";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { findUniqueCustomerAccount } from "@/lib/security/customer-identity";
import { validateMutationOrigin } from "@/lib/security/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function hashToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
    if (!validateMutationOrigin(req)) {
        return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }
    try {
        const body = await req.json();
        const identifier = String(body.identifier || "").trim();

        if (!identifier) {
            return NextResponse.json(
                { error: "Phone number or email is required." },
                { status: 400 }
            );
        }

        const isEmail = identifier.includes("@");
        let account = null;
        let ambiguous = false;
        if (isEmail) {
            const matches = await writeClient.fetch(
                `*[_type == "customerAccount" && email == $email]{_id, name, phone, email, isActive}`,
                { email: identifier.toLowerCase() }
            );
            account = matches.length === 1 ? matches[0] : null;
            ambiguous = matches.length > 1;
        } else {
            const result = await findUniqueCustomerAccount(
                writeClient,
                identifier,
                "_id, name, phone, email, isActive"
            );
            account = result.account;
            ambiguous = result.ambiguous;
        }

        // Security: do not reveal whether the account exists.
        if (ambiguous || !account || !account.email || account.isActive === false) {
            return NextResponse.json({
                ok: true,
                message:
                    "If an active account exists, a password reset email has been sent.",
            });
        }

        const rawToken = crypto.randomBytes(32).toString("hex");
        const resetTokenHash = hashToken(rawToken);

        const expiresAt = new Date(
            Date.now() + 1000 * 60 * 30
        ).toISOString();

        await writeClient
            .patch(account._id)
            .set({
                resetTokenHash,
                resetTokenExpiresAt: expiresAt,
                updatedAt: new Date().toISOString(),
            })
            .commit();

        const baseUrl =
            process.env.NEXT_PUBLIC_SITE_URL ||
            process.env.SITE_URL ||
            "https://www.amritmilkorganic.com";

        const resetUrl =
            `${baseUrl}/account/reset-password?token=${rawToken}`;

        await sendPasswordResetEmail(
            account.email,
            account.name || "Amrit Member",
            resetUrl
        );

        return NextResponse.json({
            ok: true,
            message:
                "If an active account exists, a password reset email has been sent.",
        });
    } catch (error) {
        console.error(JSON.stringify({ operation: "customer.password.forgot", category: "operation_failed" }));

        return NextResponse.json(
            { error: "Unable to process password reset request." },
            { status: 500 }
        );
    }
}
