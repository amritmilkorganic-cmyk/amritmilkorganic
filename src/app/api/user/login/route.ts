import { writeClient } from "@/lib/sanity";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanPhoneNumber(phone: string) {
    return phone.replace(/\D/g, "").slice(-10);
}

function hashPassword(password: string) {
    return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const phone = body.phone || "";
        const password = body.password || "";

        if (!phone || !password) {
            return NextResponse.json(
                { error: "Phone and password are required" },
                { status: 400 }
            );
        }

        const cleanPhone = cleanPhoneNumber(phone);
        const passwordHash = hashPassword(password);

        const account = await writeClient.fetch(
            `*[_type == "customerAccount" && phone match $phoneMatch][0] {
                _id,
                name,
                phone,
                email,
                passwordHash,
                isActive
            }`,
            { phoneMatch: `*${cleanPhone}*` }
        );

        if (!account) {
            return NextResponse.json(
                { error: "Account not found. Please contact Amrit team." },
                { status: 404 }
            );
        }

        if (account.isActive === false) {
            return NextResponse.json(
                { error: "Account is inactive. Please contact Amrit team." },
                { status: 403 }
            );
        }

        if (account.passwordHash !== passwordHash) {
            return NextResponse.json(
                { error: "Invalid password." },
                { status: 401 }
            );
        }

        return NextResponse.json({
            ok: true,
            customer: {
                id: account._id,
                name: account.name,
                phone: account.phone,
                email: account.email,
            },
        });
    } catch (error) {
        console.error("Customer login error:", error);
        return NextResponse.json(
            { error: "Login failed" },
            { status: 500 }
        );
    }
}