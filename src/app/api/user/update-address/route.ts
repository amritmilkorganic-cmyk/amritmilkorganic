import { writeClient } from "@/lib/sanity";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function cleanPhoneNumber(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const phone = cleanPhoneNumber(String(body.phone || ""));
    const address = String(body.address || "").trim();
    const city = String(body.city || "").trim();
    const state = String(body.state || "").trim();
    const pincode = String(body.pincode || "").trim();

    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { error: "Valid phone number is required." },
        { status: 400 }
      );
    }

    const account = await writeClient.fetch(
      `*[_type == "customerAccount" && phone match $phoneMatch][0]{ _id }`,
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
        address,
        city,
        state,
        pincode,
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return NextResponse.json({
      ok: true,
      message: "Address updated successfully.",
      address: {
        address,
        city,
        state,
        pincode,
      },
    });
  } catch (error) {
    console.error("Update address error:", error);

    return NextResponse.json(
      { error: "Unable to update address." },
      { status: 500 }
    );
  }
}