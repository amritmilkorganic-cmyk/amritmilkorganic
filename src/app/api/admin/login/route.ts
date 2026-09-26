import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import {
    createSessionToken,
    sessionConfigurationValid,
    setSessionCookie,
} from "@/lib/security/session";
import { publicError, safeLog, validateMutationOrigin } from "@/lib/security/http";
import {
    adminLoginIdentity,
    adminLoginRateLimit,
    recordAdminLogin,
} from "@/lib/security/admin-login";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    if (!validateMutationOrigin(request)) return publicError("Invalid request origin", 403);
    if (!sessionConfigurationValid()) return publicError("Administrator login is unavailable", 503);
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;
    if (!email || !passwordHash) return publicError("Administrator login is unavailable", 503);
    try {
        const body = await request.json();
        const suppliedEmail = String(body.email || "")
            .trim()
            .toLowerCase();
        const identity = adminLoginIdentity(request, suppliedEmail);
        const rateLimit = await adminLoginRateLimit(identity);
        if (rateLimit.limited) {
            await recordAdminLogin(identity, "rate_limited");
            safeLog("admin.login", request, "rate_limited");
            const response = publicError("Login could not be completed", 429);
            response.headers.set("Retry-After", String(rateLimit.retryAfter));
            return response;
        }
        const valid =
            suppliedEmail === email &&
            (await bcrypt.compare(String(body.password || ""), passwordHash));
        if (!valid) {
            await recordAdminLogin(identity, "failed");
            safeLog("admin.login", request, "authentication_failed");
            return publicError("Invalid administrator credentials", 401);
        }
        const token = createSessionToken({ sub: email, role: "admin" });
        if (!token) return publicError("Administrator login is unavailable", 503);
        await recordAdminLogin(identity, "succeeded");
        safeLog("admin.login", request, "authentication_succeeded");
        const response = NextResponse.json({ success: true });
        setSessionCookie(response, "admin", token);
        return response;
    } catch {
        safeLog("admin.login", request, "login_unavailable");
        return publicError("Login could not be completed", 503);
    }
}
