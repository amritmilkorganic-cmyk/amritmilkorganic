import { writeClient } from "@/lib/sanity";
import { sendPasswordResetEmail } from "@/lib/notifications";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanPhoneNumber(phone: string) {
    return phone.replace(/\D/g, "").slice(-10);
}

function hashToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const identifier = String(body.identifier || "").trim();

        if (!identifier) {
            return NextResponse.json(
                { error: "Phone number or email is required." },
                { status: 400 }
            );
        }

        const cleanPhone = cleanPhoneNumber(identifier);
        const isEmail = identifier.includes("@");

        const account = await writeClient.fetch(
            `*[
                _type == "customerAccount" &&
                (
                    email == $email ||
                    phone match $phoneMatch
                )
            ][0] {
                _id,
                name,
                phone,
                email,
                isActive
            }`,
            {
                email: isEmail ? identifier.toLowerCase() : "",
                phoneMatch: cleanPhone ? `*${cleanPhone}*` : "__NO_PHONE_MATCH__",
            }
        );

        // Security: do not reveal whether the account exists.
        if (!account || !account.email || account.isActive === false) {
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
        console.error("Forgot password error:", error);

        return NextResponse.json(
            { error: "Unable to process password reset request." },
            { status: 500 }
        );
    }
}