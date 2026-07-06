import { products as staticProducts } from "./products";
import { client, projectId } from "./sanity";
import { getWordPressProducts, getWordPressProductBySlug } from "./wordpress/products";

const USE_WORDPRESS = process.env.NEXT_PUBLIC_USE_WORDPRESS === "true";

const FALLBACK_IMAGE = "/assets/img/amrit-logo-transparent.png";

const productQuery = `*[_type == "product"] | order(_createdAt desc) {
  "id": _id,
  title,
  "price": price,
  "regularPrice": regularPrice,
  "image": image.asset->url,
  category,
  description,
  "slug": slug.current,
  sku,
  subscription,
  featured,
  badge,
  highlights,
  ingredients,
  benefits,
  howToUse,
  "longDescription": longDescription,
  variants
}`;

function formatPrice(price: any): string {
  if (typeof price === "number") return `₹${price}`;
  if (typeof price === "string" && !price.startsWith("₹")) return `₹${price}`;
  return String(price || "₹0");
}

function normalizeProduct(p: any, localMatch?: any) {
  return {
    ...(localMatch || {}),
    ...(p || {}),
    title: p?.title || localMatch?.title,
    image: p?.image || localMatch?.image || FALLBACK_IMAGE,
    highlights: p?.highlights || localMatch?.highlights || [],
    ingredients: p?.ingredients || localMatch?.ingredients || [],
    benefits: p?.benefits || localMatch?.benefits || [],
    howToUse: p?.howToUse || localMatch?.howToUse || [],
    variants: p?.variants || localMatch?.variants || [],
    price: formatPrice(p?.price || localMatch?.price),
    regularPrice:
      p?.regularPrice || localMatch?.regularPrice
        ? formatPrice(p?.regularPrice || localMatch?.regularPrice)
        : undefined,
  };
}

export async function getProducts(): Promise<any[]> {
  try {
    if (USE_WORDPRESS) {
      console.log("[fetchProducts] Fetching from WordPress...");
      const wpProducts = await getWordPressProducts();
      if (wpProducts.length > 0) return wpProducts;
    }

    if (!projectId) {
      console.log("[fetchProducts] No Sanity project ID, using static products");
      return staticProducts.map((p: any) => normalizeProduct(p));
    }

    const sanityProducts = await client.fetch(productQuery, {}, {
      next: { revalidate: 60, tags: ["product", "all"] },
    });

    if (sanityProducts && sanityProducts.length > 0) {
      console.log(`[fetchProducts] Loaded ${sanityProducts.length} products from Sanity`);
      return sanityProducts.map((p: any) => normalizeProduct(p));
    }

    console.log("[fetchProducts] No Sanity products found, using static fallback");
    return staticProducts.map((p: any) => normalizeProduct(p));
  } catch (error) {
    console.error("Error fetching products from Sanity:", error);
    return staticProducts.map((p: any) => normalizeProduct(p));
  }
}

export async function getProductBySlug(slug: string): Promise<any | null> {
  try {
    if (USE_WORDPRESS) {
      const wpProduct = await getWordPressProductBySlug(slug);
      if (wpProduct) return normalizeProduct(wpProduct);
    }

    const localMatch = staticProducts.find((p) => p.slug === slug);

    if (!projectId) {
      return localMatch ? normalizeProduct(localMatch) : null;
    }

    const query = `*[_type == "product" && slug.current == $slug][0] {
      "id": _id,
      title,
      "price": price,
      "regularPrice": regularPrice,
      "image": image.asset->url,
      category,
      description,
      "slug": slug.current,
      sku,
      subscription,
      featured,
      badge,
      highlights,
      ingredients,
      benefits,
      howToUse,
      "longDescription": longDescription,
      variants
    }`;

    const product = await client.fetch(query, { slug }, {
      next: { revalidate: 60, tags: ["product", `product:${slug}`, "all"] },
    });

    const result = product || localMatch || null;

    if (!result) return null;

    return normalizeProduct(result, localMatch);
  } catch (error) {
    console.error(`Error fetching product ${slug} from Sanity:`, error);
    const localMatch = staticProducts.find((p) => p.slug === slug);
    return localMatch ? normalizeProduct(localMatch) : null;
  }
}