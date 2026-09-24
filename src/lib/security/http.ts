import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { sessionFromRequest } from "./session";

export function correlationId(request: Request) {
    return request.headers.get("x-request-id")?.slice(0, 80) || crypto.randomUUID();
}

export function safeLog(operation: string, request: Request, category: string) {
    console.error(JSON.stringify({ operation, correlationId: correlationId(request), category }));
}

export function publicError(message = "Request could not be completed", status = 500) {
    return NextResponse.json({ success: false, error: message }, { status });
}

export function requireCustomer(request: NextRequest) {
    const session = sessionFromRequest(request, "customer");
    return session || publicError("Authentication required", 401);
}

export function requireAdmin(request: NextRequest) {
    const session = sessionFromRequest(request, "admin");
    return session || publicError("Administrator authentication required", 401);
}

export function validateMutationOrigin(request: Request) {
    const origin = request.headers.get("origin");
    const allowed = [
        process.env.NEXT_PUBLIC_SITE_URL,
        ...(process.env.ADMIN_ALLOWED_ORIGINS || "").split(","),
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    ].filter(Boolean) as string[];
    if (!origin || allowed.length === 0) return false;
    try {
        return allowed.some((value) => new URL(origin).origin === new URL(value.trim()).origin);
    } catch {
        return false;
    }
}

export function requireAdminMutation(request: NextRequest) {
    const admin = requireAdmin(request);
    if (admin instanceof NextResponse) return admin;
    return validateMutationOrigin(request) ? admin : publicError("Invalid request origin", 403);
}
