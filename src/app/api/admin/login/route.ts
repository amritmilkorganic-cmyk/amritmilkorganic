import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import {
    createSessionToken,
    sessionConfigurationValid,
    setSessionCookie,
} from "@/lib/security/session";
import { publicError, safeLog, validateMutationOrigin } from "@/lib/security/http";

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
        const valid =
            suppliedEmail === email &&
            (await bcrypt.compare(String(body.password || ""), passwordHash));
        if (!valid) return publicError("Invalid administrator credentials", 401);
        const token = createSessionToken({ sub: email, role: "admin" });
        if (!token) return publicError("Administrator login is unavailable", 503);
        const response = NextResponse.json({ success: true });
        setSessionCookie(response, "admin", token);
        return response;
    } catch {
        safeLog("admin.login", request, "authentication_failed");
        return publicError("Login could not be completed", 500);
    }
}
