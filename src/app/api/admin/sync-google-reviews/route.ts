import { syncGoogleReviewsToSanity } from "@/lib/services/google";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminMutation } from "@/lib/security/http";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const auth = requireAdminMutation(request);
    if (auth instanceof NextResponse) return auth;
    try {
        const results = await syncGoogleReviewsToSanity();

        // Trigger revalidation for the UI
        revalidateTag("googleReview");

        return NextResponse.json({
            success: true,
            message: "Google Reviews sync completed successfully",
            stats: results,
        });
    } catch {
        return NextResponse.json({ success: false, error: "Google sync failed" }, { status: 500 });
    }
}
