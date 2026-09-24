import { writeClient } from "@/lib/sanity";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
    createSessionToken,
    sessionConfigurationValid,
    setSessionCookie,
} from "@/lib/security/session";
import { safeLog, validateMutationOrigin } from "@/lib/security/http";
import { canonicalPhone, findUniqueCustomerAccount } from "@/lib/security/customer-identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function legacyHashPassword(password: string) {
    return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(req: NextRequest) {
    if (!validateMutationOrigin(req))
        return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    if (!sessionConfigurationValid())
        return NextResponse.json({ error: "Login is temporarily unavailable" }, { status: 503 });
    try {
        const body = await req.json();

        const phone = String(body.phone || "");
        const password = String(body.password || "");

        if (!phone || !password) {
            return NextResponse.json({ error: "Phone and password are required" }, { status: 400 });
        }

        const cleanPhone = canonicalPhone(phone);
        const result = await findUniqueCustomerAccount(
            writeClient,
            cleanPhone,
            "_id, name, phone, canonicalPhone, email, passwordHash, isActive"
        );
        if (result.ambiguous) {
            return NextResponse.json({ error: "Login requires account support" }, { status: 409 });
        }
        const account = result.account;

        if (!account) {
            return NextResponse.json(
                {
                    error: "Account not found. Please contact the Amrit team.",
                },
                { status: 404 }
            );
        }

        if (account.isActive === false) {
            return NextResponse.json(
                {
                    error: "Account is inactive. Please contact the Amrit team.",
                },
                { status: 403 }
            );
        }

        if (!account.passwordHash) {
            return NextResponse.json(
                {
                    error: "Password is not set for this account.",
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
            passwordValid = await bcrypt.compare(password, account.passwordHash);
        } else {
            const oldHash = legacyHashPassword(password);

            passwordValid = oldHash === account.passwordHash;

            // Automatically upgrade old SHA-256 password to bcrypt
            // after the customer successfully logs in.
            if (passwordValid) {
                const newPasswordHash = await bcrypt.hash(password, 12);

                await writeClient
                    .patch(account._id)
                    .set({
                        passwordHash: newPasswordHash,
                        updatedAt: new Date().toISOString(),
                    })
                    .commit();
            }
        }

        if (!passwordValid) {
            return NextResponse.json({ error: "Invalid password." }, { status: 401 });
        }

        if (account.canonicalPhone !== cleanPhone) {
            await writeClient.patch(account._id).set({ canonicalPhone: cleanPhone }).commit();
        }

        const token = createSessionToken({ sub: account._id, role: "customer", phone: cleanPhone });
        if (!token) {
            return NextResponse.json(
                { error: "Login is temporarily unavailable" },
                { status: 503 }
            );
        }
        const response = NextResponse.json({
            ok: true,

            customer: {
                id: account._id,
                name: account.name,
                phone: account.phone,
                email: account.email,
            },
        });
        setSessionCookie(response, "customer", token);
        return response;
    } catch {
        safeLog("customer.login", req, "authentication_failed");

        return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }
}
