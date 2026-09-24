import { products } from "@/lib/products";
import fs from "fs";
import mime from "mime";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminMutation } from "@/lib/security/http";
import { writeClient as client } from "@/lib/sanity";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const auth = requireAdminMutation(request);
    if (auth instanceof NextResponse) return auth;
    const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN;
    if (!token) {
        return NextResponse.json(
            { error: "Seeding is unavailable" },
            { status: 503 }
        );
    }

    const log: string[] = [];

    try {
        for (const product of products) {
            const documentId = `product-${product.slug}`;

            // Upload Image if present
            let imageAssetId = null;
            if (product.image && product.image.startsWith("/")) {
                const imagePath = path.join(process.cwd(), "public", product.image);
                if (fs.existsSync(imagePath)) {
                    const fileBuffer = fs.readFileSync(imagePath);
                    const asset = await client.assets.upload("image", fileBuffer, {
                        filename: path.basename(imagePath),
                        contentType: mime.getType(imagePath) || "image/png",
                    });
                    imageAssetId = asset._id;
                }
            }

            const doc = {
                _id: documentId,
                _type: "product",
                title: product.title,
                slug: { _type: "slug", current: product.slug },
                price: parseFloat(product.price.toString().replace(/[^0-9.]/g, "")),
                description: product.description,
                category: product.category,
                sku: product.sku,
                image: imageAssetId
                    ? {
                          _type: "image",
                          asset: { _type: "reference", _ref: imageAssetId },
                      }
                    : undefined,
            };

            await client.createOrReplace(doc);
            log.push(`Synced: ${product.title}`);
        }

        return NextResponse.json({ success: true, count: products.length, log });
    } catch {
        return NextResponse.json({ success: false, error: "Seeding failed" }, { status: 500 });
    }
}
