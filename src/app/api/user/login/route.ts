import { writeClient } from "@/lib/sanity";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanPhoneNumber(phone: string) {
    return phone.replace(/\D/g, "").slice(-10);
}

function legacyHashPassword(password: string) {
    return crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const phone = String(body.phone || "");
        const password = String(body.password || "");

        if (!phone || !password) {
            return NextResponse.json(
                { error: "Phone and password are required" },
                { status: 400 }
            );
        }

        const cleanPhone = cleanPhoneNumber(phone);

        const account = await writeClient.fetch(
            `*[
                _type == "customerAccount" &&
                phone match $phoneMatch
            ][0] {
                _id,
                name,
                phone,
                email,
                passwordHash,
                isActive
            }`,
            {
                phoneMatch: `*${cleanPhone}*`,
            }
        );

        if (!account) {
            return NextResponse.json(
                {
                    error:
                        "Account not found. Please contact the Amrit team.",
                },
                { status: 404 }
            );
        }

        if (account.isActive === false) {
            return NextResponse.json(
                {
                    error:
                        "Account is inactive. Please contact the Amrit team.",
                },
                { status: 403 }
            );
        }

        if (!account.passwordHash) {
            return NextResponse.json(
                {
                    error:
                        "Password is not set for this account.",
                },
                { status: 401 }
            );
        }

        let passwordValid = false;

        const isBcryptHash =
            account.passwordHash.startsWith("$2a$") ||
            account.passwordHash.startsWith("$2b$") ||
            account.passwordHash.startsWith("$2y$");

        if (isBcryptHash) {
            passwordValid = await bcrypt.compare(
                password,
                account.passwordHash
            );
        } else {
            const oldHash = legacyHashPassword(password);

            passwordValid =
                oldHash === account.passwordHash;

            // Automatically upgrade old SHA-256 password to bcrypt
            // after the customer successfully logs in.
            if (passwordValid) {
                const newPasswordHash = await bcrypt.hash(
                    password,
                    12
                );

                await writeClient
                    .patch(account._id)
                    .set({
                        passwordHash: newPasswordHash,
                        updatedAt: new Date().toISOString(),
                    })
                    .commit();

                console.log(
                    `Password security upgraded for account ${account._id}`
                );
            }
        }

        if (!passwordValid) {
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