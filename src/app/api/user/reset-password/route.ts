import { writeClient } from "@/lib/sanity";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function hashToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const token = String(body.token || "").trim();
        const password = String(body.password || "");

        if (!token || !password) {
            return NextResponse.json(
                { error: "Reset token and password are required." },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "Password must be at least 8 characters." },
                { status: 400 }
            );
        }

        const resetTokenHash = hashToken(token);

        const account = await writeClient.fetch(
            `*[
                _type == "customerAccount" &&
                resetTokenHash == $resetTokenHash
            ][0] {
                _id,
                resetTokenExpiresAt,
                isActive
            }`,
            { resetTokenHash }
        );

        if (!account || account.isActive === false) {
            return NextResponse.json(
                { error: "Invalid or expired reset link." },
                { status: 400 }
            );
        }

        const expiresAt = account.resetTokenExpiresAt
            ? new Date(account.resetTokenExpiresAt).getTime()
            : 0;

        if (!expiresAt || Date.now() > expiresAt) {
            return NextResponse.json(
                { error: "Invalid or expired reset link." },
                { status: 400 }
            );
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await writeClient
            .patch(account._id)
            .set({
                passwordHash,
                updatedAt: new Date().toISOString(),
            })
            .unset(["resetTokenHash", "resetTokenExpiresAt"])
            .commit();

        return NextResponse.json({
            ok: true,
            message: "Password has been reset successfully.",
        });
    } catch (error) {
        console.error("Reset password error:", error);

        return NextResponse.json(
            { error: "Unable to reset password." },
            { status: 500 }
        );
    }
}