import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, safeLog } from "@/lib/security/http";
import { issueOAuthState, setOAuthState } from "@/lib/security/oauth-state";

const SCOPES = "user_profile,user_media";

export async function GET(request: NextRequest) {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;
    const appId = process.env.INSTAGRAM_APP_ID;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!appId || !siteUrl) {
        return NextResponse.json({ error: "Instagram connection is unavailable" }, { status: 503 });
    }

    try {
        const state = await issueOAuthState("instagram", auth.sub);
        const redirectUri = `${siteUrl}/api/auth/instagram/callback`;
        const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(SCOPES)}&response_type=code&state=${state}`;
        const response = NextResponse.redirect(authUrl);
        setOAuthState(response, state);
        return response;
    } catch {
        safeLog("oauth.instagram.start", request, "state_storage_failed");
        return NextResponse.json({ error: "Instagram connection is unavailable" }, { status: 503 });
    }
}
