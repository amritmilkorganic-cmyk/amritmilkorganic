import { client } from "@/lib/sanity";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/http";

export async function GET(request: NextRequest) {
    const auth = requireAdmin(request);
    if (auth instanceof NextResponse) return auth;
    try {
        const query = `*[_type == "siteSettings"][0]{
            instagramAccessToken,
            instagramTokenExpiry,
            googleAccessToken,
            googleTokenExpiry
        }`;

        const settings = await client.fetch(query);

        const status = {
            instagram: !!settings?.instagramAccessToken,
            google: !!settings?.googleAccessToken,
            instagramExpiry: settings?.instagramTokenExpiry || null,
            googleExpiry: settings?.googleTokenExpiry || null,
        };

        return NextResponse.json({ success: true, status });
    } catch {
        console.error(JSON.stringify({ operation: "admin.settings.read", category: "data_access_failed" }));
        return NextResponse.json(
            { success: false, error: "Failed to fetch settings" },
            { status: 500 }
        );
    }
}
