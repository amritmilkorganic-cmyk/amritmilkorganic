import { NextRequest, NextResponse } from "next/server";
import { requireAdminMutation } from "@/lib/security/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const auth = requireAdminMutation(req);
    if (auth instanceof NextResponse) return auth;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
        return NextResponse.json({ error: "Email test is unavailable" }, { status: 503 });
    }

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: "Amrit Milk <onboarding@resend.dev>",
                to: ["amritmilkorganic@amritmilk.in"],
                subject: `Test Email Connection ${new Date().toISOString()}`,
                html: `<h1> It Works!</h1><p>Email system is operational.</p>`,
            }),
        });

        if (!response.ok) {
            return NextResponse.json({ success: false, error: "Email test failed" }, { status: 502 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false, error: "Email test failed" }, { status: 500 });
    }
}
