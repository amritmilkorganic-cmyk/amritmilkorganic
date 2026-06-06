import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";

export const dynamic = "force-dynamic";

/**
 * Sanity Revalidation Webhook
 * Safer version to reduce unnecessary ISR writes on Vercel.
 */
export async function POST(req: NextRequest) {
    try {
        const secret =
            process.env.SANITY_REVALIDATE_SECRET ||
            process.env.REVALIDATION_SECRET;

        if (!secret) {
            console.error("[Sanity Revalidate] No secret configured");
            return new Response("No secret configured", { status: 500 });
        }

        const { body, isValidSignature } = await parseBody(req, secret);

        if (!isValidSignature) {
            console.error("[Sanity Revalidate] Invalid signature");
            return new Response("Invalid signature", { status: 401 });
        }

        if (!body?._type) {
            return new Response("Bad Request", { status: 400 });
        }

        const bodyAny = body as any;
        const type = bodyAny._type;
        const slug = bodyAny.slug?.current;

        console.log(
            `[Sanity Revalidate] Revalidating type: ${type}${
                slug ? ` (slug: ${slug})` : ""
            }`
        );

        // Revalidate specific content type
        revalidateTag(type);

        // Revalidate specific document slug where available
        if (slug) {
            revalidateTag(`${type}:${slug}`);
        }

        // Revalidate only relevant paths
        if (type === "product") {
            revalidatePath("/products");

            if (slug) {
                revalidatePath(`/products/${slug}`);
            }

            revalidatePath("/");
        }

        if (type === "instagramPost") {
            revalidatePath("/");
        }

        if (type === "googleReview") {
            revalidatePath("/");
        }

        if (type === "post" || type === "blog") {
            revalidatePath("/blog");

            if (slug) {
                revalidatePath(`/blog/${slug}`);
            }

            revalidatePath("/");
        }

        if (type === "siteSettings") {
            revalidatePath("/");
            revalidatePath("/", "layout");
        }

        return NextResponse.json({
            revalidated: true,
            type,
            slug: slug || null,
            timestamp: new Date().toISOString(),
        });
    } catch (err: any) {
        console.error("[Sanity Revalidate] Error:", err.message);
        return new Response(err.message, { status: 500 });
    }
}