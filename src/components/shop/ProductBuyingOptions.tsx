"use client";

import { useState, useEffect } from "react";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
import { SubscriptionPlanSelector } from "@/components/shop/SubscriptionPlanSelector";
import { ShareButton } from "@/components/shop/ShareButton";
import { MapPin, Truck } from "lucide-react";

interface Variant {
    title: string;
    price: number | string;
    regularPrice?: number | string;
    sku?: string;
    subscription?: boolean;
}

interface ProductBuyingOptionsProps {
    product: {
        id: string;
        title: string;
        price: number | string;
        regularPrice?: number | string;
        image: string;
        slug: string;
        category: string;
        description: string;
        sku?: string;
        variants?: Variant[];
        subscription?: boolean;
    };
}

export function ProductBuyingOptions({ product }: ProductBuyingOptionsProps) {
    const [buyMode, setBuyMode] = useState<"subscription" | "onetime">("subscription");
    const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

    const [customerName, setCustomerName] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");

    useEffect(() => {
        if (product.variants && product.variants.length > 0) {
            setSelectedVariant(product.variants[0]);
        }
    }, [product]);

    const getPriceValue = (price: string | number | undefined) => {
        if (!price) return 0;
        if (typeof price === "number") return price;
        return parseInt(String(price).replace(/[^0-9.]/g, "") || "0");
    };

    const currentPrice = selectedVariant
        ? getPriceValue(selectedVariant.price)
        : getPriceValue(product.price);

    const currentRegularPrice = selectedVariant
        ? getPriceValue(selectedVariant.regularPrice)
        : getPriceValue(product.regularPrice);

    const currentSku = selectedVariant ? selectedVariant.sku : product.sku;

    const currentTitle = selectedVariant
        ? `${product.title} - ${selectedVariant.title}`
        : product.title;

    const handleSubscribe = async (planId: string, totalAmount: number) => {
        const cleanName = customerName.trim();
        const cleanEmail = customerEmail.trim();
        const cleanPhone = customerPhone.trim();

        if (!cleanName || !cleanEmail || !cleanPhone) {
            alert("Please enter your name, email and mobile number before subscribing.");
            return;
        }

        if (cleanPhone.length < 10) {
            alert("Please enter a valid mobile number.");
            return;
        }

        try {
            const response = await fetch("/api/subscriptions/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: product.id,
                    productName: currentTitle,
                    quantity: 1,
                    price: totalAmount,
                    planType: planId,
                    customerName: cleanName,
                    customerEmail: cleanEmail,
                    customerPhone: cleanPhone,
                    startDate: new Date().toISOString().split("T")[0],
                }),
            });

            const data = await response.json();

            if (data.success) {
                const form = document.createElement("form");
                form.method = "POST";
                form.action = data.ccavenueUrl;

                const encDataInput = document.createElement("input");
                encDataInput.name = "encRequest";
                encDataInput.value = data.encryptedData;
                form.appendChild(encDataInput);

                const accessCodeInput = document.createElement("input");
                accessCodeInput.name = "access_code";
                accessCodeInput.value = data.accessCode;
                form.appendChild(accessCodeInput);

                document.body.appendChild(form);
                form.submit();
            } else {
                alert("Failed to initiate payment: " + (data.error || "Unknown error"));
            }
        } catch (error) {
            console.error("Payment error:", error);
            alert("An error occurred. Please try again.");
        }
    };

    const isMilkProduct =
        product.category === "Dairy" &&
        product.slug.includes("milk") &&
        !product.slug.includes("colostrum");

    const isSubscriptionEligible =
        isMilkProduct &&
        (selectedVariant?.subscription === true ||
            (selectedVariant?.subscription !== false && product.subscription === true));

    useEffect(() => {
        if (isSubscriptionEligible) {
            setBuyMode("subscription");
        } else {
            setBuyMode("onetime");
        }
    }, [isSubscriptionEligible]);

    return (
        <div className="space-y-6">
            <div className="flex items-baseline gap-4 pb-4 border-b border-theme-light/30">
                <p className="text-4xl md:text-5xl font-bold text-theme-accent">₹{currentPrice}</p>

                {!!currentRegularPrice && currentRegularPrice > currentPrice && (
                    <p className="text-xl text-theme-muted line-through font-light">
                        ₹{currentRegularPrice}
                    </p>
                )}

                {isMilkProduct && (
                    <span className="text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md">
                        per litre
                    </span>
                )}
            </div>

            {isMilkProduct && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl">
                    <MapPin className="w-5 h-5 text-terracotta dark:text-gold flex-shrink-0" />
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                        <span className="font-black">Daily Milk Delivery</span> — Available in
                        Lucknow only 📍
                    </p>
                </div>
            )}

            {product.variants && product.variants.length > 0 && (
                <div className="space-y-3 pt-2">
                    <span className="text-sm font-bold text-theme-primary uppercase tracking-wider">
                        Select Size / Weight
                    </span>

                    {product.variants.length === 1 ? (
                        <div className="inline-flex items-center px-4 py-2 rounded-lg bg-theme-elevated border border-theme-accent/50 text-theme-primary font-medium">
                            <span className="text-theme-muted mr-2 font-normal">Pack Size:</span>
                            {product.variants[0].title}
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {product.variants.map((variant, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedVariant(variant)}
                                    className={`px-6 py-3 rounded-lg border text-base font-semibold transition-all shadow-sm ${
                                        selectedVariant?.title === variant.title
                                            ? "bg-[#4a2c2a] text-white border-[#4a2c2a] shadow-md ring-2 ring-[#4a2c2a]/20"
                                            : "bg-white text-gray-900 border-gray-300 hover:border-[#4a2c2a] hover:text-[#4a2c2a]"
                                    }`}
                                >
                                    {variant.title}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {isSubscriptionEligible ? (
                <div className="space-y-4 pt-2">
                    <div className="flex rounded-xl border border-terracotta/30 dark:border-gold/30 overflow-hidden">
                        <button
                            onClick={() => setBuyMode("subscription")}
                            className={`flex-1 py-3 px-4 text-sm font-bold transition-all ${
                                buyMode === "subscription"
                                    ? "bg-terracotta dark:bg-gold text-white"
                                    : "bg-transparent text-terracotta dark:text-gold hover:bg-terracotta/10 dark:hover:bg-gold/10"
                            }`}
                        >
                            🥛 Subscribe & Save
                        </button>

                        <button
                            onClick={() => setBuyMode("onetime")}
                            className={`flex-1 py-3 px-4 text-sm font-bold transition-all border-l border-terracotta/30 dark:border-gold/30 ${
                                buyMode === "onetime"
                                    ? "bg-terracotta dark:bg-gold text-white"
                                    : "bg-transparent text-terracotta dark:text-gold hover:bg-terracotta/10 dark:hover:bg-gold/10"
                            }`}
                        >
                            🛒 One-Time Buy
                        </button>
                    </div>

                    {buyMode === "subscription" ? (
                        <div className="w-full space-y-4 p-4 border border-terracotta/30 dark:border-gold/30 rounded-xl bg-terracotta/5 dark:bg-gold/5">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-serif font-bold text-terracotta dark:text-gold text-lg">
                                    Subscribe & Save
                                </h3>
                                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-bold">
                                    Best Value
                                </span>
                            </div>

                            {isMilkProduct && (
                                <p className="text-sm text-espresso/70 dark:text-ivory/70">
                                    Fresh A2 milk delivered daily to your door at{" "}
                                    <span className="font-bold text-terracotta dark:text-gold">
                                        ₹100/L
                                    </span>
                                </p>
                            )}

                            <div className="space-y-3 p-4 rounded-xl bg-white/70 dark:bg-midnight/40 border border-terracotta/20 dark:border-gold/20">
                                <p className="text-sm font-bold text-theme-primary">
                                    Enter customer details for subscription
                                </p>

                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Full Name"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-midnight text-sm outline-none focus:border-terracotta dark:focus:border-gold"
                                />

                                <input
                                    type="email"
                                    value={customerEmail}
                                    onChange={(e) => setCustomerEmail(e.target.value)}
                                    placeholder="Email Address"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-midnight text-sm outline-none focus:border-terracotta dark:focus:border-gold"
                                />

                                <input
                                    type="tel"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="Mobile Number"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-midnight text-sm outline-none focus:border-terracotta dark:focus:border-gold"
                                />
                            </div>

                            <SubscriptionPlanSelector
                                productId={product.id}
                                productName={currentTitle}
                                onSelectPlan={handleSubscribe}
                            />
                        </div>
                    ) : (
                        <div className="w-full space-y-4">
                            {isMilkProduct && (
                                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700/50">
                                    <Truck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                    <p className="text-sm text-blue-900 dark:text-blue-200">
                                        One-time purchase:{" "}
                                        <span className="font-bold">₹149 + delivery charges</span>
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-4">
                                <AddToCartButton
                                    id={product.id}
                                    title={currentTitle}
                                    price={String(currentPrice)}
                                    image={product.image}
                                    slug={product.slug}
                                    category={product.category}
                                    description={product.description}
                                    sku={currentSku}
                                />
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-wrap gap-4 pt-4">
                    <AddToCartButton
                        id={product.id}
                        title={currentTitle}
                        price={String(currentPrice)}
                        image={product.image}
                        slug={product.slug}
                        category={product.category}
                        description={product.description}
                        sku={currentSku}
                    />
                </div>
            )}

            <div className="flex flex-wrap gap-4">
                <ShareButton
                    title={currentTitle}
                    text={product.description}
                    url={`https://amritmilkorganic.com/products/${product.slug}`}
                />
            </div>
        </div>
    );
}