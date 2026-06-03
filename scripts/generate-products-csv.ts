import { getProducts } from "../src/lib/fetchProducts";
import * as fs from "fs";
import * as path from "path";

const DOMAIN = "https://amritmilkorganic.com";
const BRAND = "Amrit Milk";
const CONDITION = "new";

function escapeCSV(val: any): string {
    if (!val) return "";
    return String(val)
        .replace(/"/g, '""')
        .replace(/\t/g, " ")
        .replace(/\n/g, " ")
        .replace(/\r/g, "");
}

function cleanPrice(price: any): string {
    const value = String(price || "0")
        .replace("₹", "")
        .replace(",", "")
        .trim();

    const numberValue = parseFloat(value) || 0;
    return `${Math.round(numberValue)} INR`;
}

function getImageUrl(image: string): string {
    if (!image) return `${DOMAIN}/assets/img/amrit-logo-transparent.png`;
    if (image.startsWith("http")) return image;
    return `${DOMAIN}${image}`;
}

async function generateCSV() {
    const products = await getProducts();

    const headers = [
        "id",
        "title",
        "description",
        "availability",
        "availability date",
        "expiration date",
        "link",
        "mobile link",
        "image link",
        "price",
        "sale price",
        "sale price effective date",
        "identifier exists",
        "gtin",
        "mpn",
        "brand",
        "product highlight",
        "product detail",
        "additional image link",
        "condition",
        "adult",
        "color",
        "size",
        "size type",
        "size system",
        "gender",
        "material",
        "pattern",
        "age group",
        "multipack",
        "is bundle",
        "unit pricing measure",
        "unit pricing base measure",
        "energy efficiency class",
        "min energy efficiency class",
        "min energy efficiency class",
        "item group id",
        "sell on google quantity",
    ];

    const rows = products.map((p: any) => {
        const id = p.sku || p.id || p.slug;
        const title = p.title || "Amrit Milk Organic Product";
        const description = `${p.description || ""} ${
            p.highlights?.join(". ") || ""
        }`.substring(0, 5000);

        const link = `${DOMAIN}/products/${p.slug}`;
        const image_link = getImageUrl(p.image);
        const price = cleanPrice(p.price);

        const columns = new Array(38).fill("");

        columns[0] = escapeCSV(id);
        columns[1] = escapeCSV(title);
        columns[2] = escapeCSV(description);
        columns[3] = "in stock";
        columns[6] = escapeCSV(link);
        columns[8] = escapeCSV(image_link);
        columns[9] = escapeCSV(price);
        columns[12] = "no";
        columns[15] = BRAND;
        columns[19] = CONDITION;
        columns[20] = "no";

        return columns.join("\t");
    });

    const tsvContent = [headers.join("\t"), ...rows].join("\n");
    const outputPath = path.join(
        process.cwd(),
        "public",
        "products_merchant_center.csv"
    );

    fs.writeFileSync(outputPath, tsvContent);

    console.log(`✅ Generated ${products.length} products`);
    console.log(`✅ File generated successfully at ${outputPath}`);
}

generateCSV().catch((error) => {
    console.error("❌ Failed to generate Merchant Center feed:", error);
    process.exit(1);
});