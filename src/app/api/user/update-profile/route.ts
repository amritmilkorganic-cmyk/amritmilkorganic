import { writeClient } from "@/lib/sanity";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanPhoneNumber(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const phone = cleanPhoneNumber(String(body.phone || ""));
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();

    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { error: "Valid phone number is required." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Customer name is required." },
        { status: 400 }
      );
    }

    if (email && !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const account = await writeClient.fetch(
  `*[_type == "customerAccount" && phone match $phoneMatch]
    | order(updatedAt desc, _updatedAt desc)[0]{
      _id
    }`,
  { phoneMatch: `*${phone}*` }
);

    if (!account?._id) {
      return NextResponse.json(
        { error: "Customer account not found." },
        { status: 404 }
      );
    }

    await writeClient
      .patch(account._id)
      .set({
        name,
        email,
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return NextResponse.json({
      ok: true,
      message: "Profile updated successfully.",
      profile: {
        name,
        email,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return NextResponse.json(
      { error: "Unable to update profile." },
      { status: 500 }
    );
  }
}