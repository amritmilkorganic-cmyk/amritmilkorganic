import { NextRequest, NextResponse } from "next/server";
import { requireAdminMutation } from "@/lib/security/http";
import { clearSessionCookie } from "@/lib/security/session";

export async function POST(request: NextRequest) {
    const auth = requireAdminMutation(request);
    if (auth instanceof NextResponse) return auth;
    const response = NextResponse.json({ success: true });
    clearSessionCookie(response, "admin");
    return response;
}
