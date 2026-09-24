import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { writeClient } from "@/lib/sanity";

export const OAUTH_STATE_COOKIE = "amrit_oauth_state";
const OAUTH_STATE_TTL_SECONDS = 600;

function digest(value: string) {
    return crypto.createHash("sha256").update(value).digest("hex");
}

export async function issueOAuthState(provider: "google" | "instagram", adminSubject: string) {
    const nonce = crypto.randomBytes(32).toString("base64url");
    const nonceHash = digest(nonce);
    await writeClient.create({
        _id: `oauthNonce.${nonceHash}`,
        _type: "oauthNonce",
        nonceHash,
        provider,
        adminSubjectHash: digest(adminSubject),
        expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_SECONDS * 1000).toISOString(),
        createdAt: new Date().toISOString(),
    });
    return nonce;
}

export function setOAuthState(response: NextResponse, nonce: string) {
    response.cookies.set(OAUTH_STATE_COOKIE, nonce, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/api/auth/",
        maxAge: OAUTH_STATE_TTL_SECONDS,
    });
}

export function clearOAuthState(response: NextResponse) {
    response.cookies.set(OAUTH_STATE_COOKIE, "", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/api/auth/",
        maxAge: 0,
    });
    return response;
}

export async function consumeOAuthState(
    request: NextRequest,
    response: NextResponse,
    provider: "google" | "instagram",
    adminSubject: string
) {
    const supplied = request.nextUrl.searchParams.get("state") || "";
    const stored = request.cookies.get(OAUTH_STATE_COOKIE)?.value || "";
    clearOAuthState(response);
    const suppliedBytes = Buffer.from(supplied);
    const storedBytes = Buffer.from(stored);
    if (
        suppliedBytes.length === 0 ||
        suppliedBytes.length !== storedBytes.length ||
        !crypto.timingSafeEqual(suppliedBytes, storedBytes)
    ) {
        return false;
    }

    const nonceHash = digest(supplied);
    const document = await writeClient.fetch(
        `*[_type == "oauthNonce" && _id == $id][0]{_id, _rev, provider, adminSubjectHash, expiresAt, usedAt}`,
        { id: `oauthNonce.${nonceHash}` }
    );
    if (
        !document ||
        document.usedAt ||
        document.provider !== provider ||
        document.adminSubjectHash !== digest(adminSubject) ||
        Date.parse(document.expiresAt) <= Date.now()
    ) {
        return false;
    }

    try {
        await writeClient
            .patch(document._id)
            .ifRevisionId(document._rev)
            .set({ usedAt: new Date().toISOString() })
            .commit();
        return true;
    } catch {
        // A competing callback consumed the same revision first.
        return false;
    }
}
