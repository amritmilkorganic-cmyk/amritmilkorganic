import { NextRequest, NextResponse } from "next/server";
import { validateMutationOrigin } from "@/lib/security/http";
import { clearSessionCookie } from "@/lib/security/session";

export async function POST(request: NextRequest) {
    if (!validateMutationOrigin(request))
        return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response, "customer");
    return response;
}
