import { syncInstagramToSanity } from "@/lib/services/instagram";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminMutation } from "@/lib/security/http";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const auth = requireAdminMutation(request);
    if (auth instanceof NextResponse) return auth;
    try {
        // In a real app, add authentication check here
        // const authHeader = request.headers.get('authorization');
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const results = await syncInstagramToSanity();

        // Trigger revalidation for the UI
        revalidateTag("instagramPost");

        return NextResponse.json({
            success: true,
            message: "Sync completed successfully",
            stats: results,
        });
    } catch {
        return NextResponse.json(
            { success: false, error: "Instagram sync failed" },
            { status: 500 }
        );
    }
}
