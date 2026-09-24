import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, safeLog } from "@/lib/security/http";
import { issueOAuthState, setOAuthState } from "@/lib/security/oauth-state";

const SCOPES = ["https://www.googleapis.com/auth/business.manage", "email", "profile"].join(" ");

export async function GET(request: NextRequest) {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!clientId || !siteUrl) {
        return NextResponse.json({ error: "Google connection is unavailable" }, { status: 503 });
    }

    // access_type=offline is required to get a refresh token
    // prompt=consent forces the consent screen to ensure we get a refresh token every time
    try {
        const state = await issueOAuthState("google", auth.sub);
        const redirectUri = `${siteUrl}/api/auth/google/callback`;
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(SCOPES)}&access_type=offline&prompt=consent&state=${state}`;
        const response = NextResponse.redirect(authUrl);
        setOAuthState(response, state);
        return response;
    } catch {
        safeLog("oauth.google.start", request, "state_storage_failed");
        return NextResponse.json({ error: "Google connection is unavailable" }, { status: 503 });
    }
}
