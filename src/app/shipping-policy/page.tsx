"use client";

import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import {
    Clock,
    HelpCircle,
    Mail,
    MapPin,
    Package,
    Truck,
} from "lucide-react";

export default function ShippingPolicyPage() {
    const lastUpdated = "June 06, 2026";

    return (
        <main className="bg-creme dark:bg-midnight min-h-screen transition-colors duration-500">
            <section className="relative py-32 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-radial from-gold/5 via-transparent to-transparent" />
                <div className="relative z-10 text-center max-w-4xl px-6">
                    <span className="text-gold font-bold uppercase tracking-[0.3em] mb-4 block">
                        Delivery Policy
                    </span>
                    <h1 className="text-5xl md:text-7xl font-serif font-bold text-espresso dark:text-ivory mb-6">
                        Shipping & Delivery Policy
                    </h1>
                    <p className="text-xl text-espresso-light dark:text-ivory/80 max-w-2xl mx-auto">
                        Clear delivery timelines, shipping charges, service areas, and product-wise
                        shipping availability for Amrit Milk Organic.
                    </p>
                    <p className="text-sm text-espresso-muted dark:text-ivory/60 mt-4">
                        Last Updated: {lastUpdated}
                    </p>
                </div>
            </section>

            <Section>
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white dark:bg-midnight-mid border border-creme-dark dark:border-white/5 rounded-2xl p-8 shadow-soft dark:shadow-card-dark mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <MapPin className="w-6 h-6 text-gold" />
                            <h2 className="text-2xl font-serif font-bold text-espresso dark:text-ivory">
                                Delivery Areas
                            </h2>
                        </div>
                        <p className="text-espresso-light dark:text-ivory/80 leading-relaxed">
                            Fresh and perishable products such as milk, curd, paneer, khoya,
                            chaas, colostrum milk, and other fresh dairy items are currently
                            delivered only in Lucknow and nearby serviceable areas.
                        </p>
                        <p className="text-espresso-light dark:text-ivory/80 leading-relaxed mt-4">
                            Non-perishable products such as A2 Bilona Ghee, Honey, Cold-Pressed
                            Oils, Rice, Pulses, Flours, Jaggery, Wellness Products, and selected
                            dry grocery items may be shipped across India, subject to courier
                            serviceability.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-midnight-mid border border-creme-dark dark:border-white/5 rounded-2xl p-8 shadow-soft dark:shadow-card-dark mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Clock className="w-6 h-6 text-gold" />
                            <h2 className="text-2xl font-serif font-bold text-espresso dark:text-ivory">
                                Estimated Delivery Time
                            </h2>
                        </div>
                        <ul className="list-disc list-inside text-espresso-light dark:text-ivory/80 space-y-2">
                            <li>
                                <strong>Lucknow fresh delivery:</strong> generally within 24 hours,
                                depending on route and product availability.
                            </li>
                            <li>
                                <strong>Daily milk subscriptions:</strong> generally delivered in
                                the morning delivery window as per route schedule.
                            </li>
                            <li>
                                <strong>North India shipping:</strong> generally 2–5 business days
                                after dispatch.
                            </li>
                            <li>
                                <strong>Rest of India shipping:</strong> generally 3–7 business days
                                after dispatch.
                            </li>
                        </ul>
                        <p className="text-espresso-muted dark:text-ivory/60 text-sm mt-4">
                            Delivery timelines may vary due to weather, public holidays, courier
                            delays, route availability, or other operational reasons.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-midnight-mid border border-creme-dark dark:border-white/5 rounded-2xl p-8 shadow-soft dark:shadow-card-dark mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Package className="w-6 h-6 text-gold" />
                            <h2 className="text-2xl font-serif font-bold text-espresso dark:text-ivory">
                                Order Processing Time
                            </h2>
                        </div>
                        <p className="text-espresso-light dark:text-ivory/80 leading-relaxed">
                            Orders are generally processed within 1 business day after order
                            confirmation and payment confirmation, wherever applicable.
                        </p>
                        <p className="text-espresso-light dark:text-ivory/80 leading-relaxed mt-4">
                            Some products are seasonal, batch-based, or limited in availability. If
                            any product is unavailable after order placement, our team will contact
                            the customer for replacement, rescheduling, or refund as applicable.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-midnight-mid border border-creme-dark dark:border-white/5 rounded-2xl p-8 shadow-soft dark:shadow-card-dark mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Truck className="w-6 h-6 text-gold" />
                            <h2 className="text-2xl font-serif font-bold text-espresso dark:text-ivory">
                                Shipping Charges
                            </h2>
                        </div>
                        <p className="text-espresso-light dark:text-ivory/80 leading-relaxed">
                            Shipping charges, if applicable, are displayed during checkout before
                            payment is completed. Charges may vary depending on product type, order
                            weight, destination, delivery mode, and courier serviceability.
                        </p>
                        <p className="text-espresso-light dark:text-ivory/80 leading-relaxed mt-4">
                            For local Lucknow subscription deliveries, delivery charges may vary
                            based on route, delivery frequency, and subscription arrangement.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-midnight-mid border border-creme-dark dark:border-white/5 rounded-2xl p-8 shadow-soft dark:shadow-card-dark mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <HelpCircle className="w-6 h-6 text-gold" />
                            <h2 className="text-2xl font-serif font-bold text-espresso dark:text-ivory">
                                Delivery Support
                            </h2>
                        </div>
                        <p className="text-espresso-light dark:text-ivory/80 leading-relaxed">
                            Customers receive order confirmation through email, phone, or WhatsApp,
                            depending on the order type and available contact details.
                        </p>
                        <p className="text-espresso-light dark:text-ivory/80 leading-relaxed mt-4">
                            For delivery-related questions, customers may contact our support team
                            directly.
                        </p>
                    </div>

                    <div className="bg-gold/10 dark:bg-gold/5 border border-gold/30 rounded-2xl p-8 mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Mail className="w-6 h-6 text-gold" />
                            <h2 className="text-2xl font-serif font-bold text-espresso dark:text-ivory">
                                Contact for Shipping & Delivery
                            </h2>
                        </div>
                        <div className="bg-white dark:bg-midnight rounded-xl p-6 space-y-3">
                            <p className="text-espresso dark:text-ivory">
                                <strong>Email:</strong>{" "}
                                <a
                                    href="mailto:support@amritmilkorganic.com"
                                    className="text-gold hover:underline"
                                >
                                    support@amritmilkorganic.com
                                </a>
                            </p>
                            <p className="text-espresso dark:text-ivory">
                                <strong>WhatsApp:</strong>{" "}
                                <a
                                    href="https://wa.me/918130693767"
                                    className="text-gold hover:underline"
                                >
                                    +91 81306 93767
                                </a>
                            </p>
                            <p className="text-espresso dark:text-ivory">
                                <strong>Phone:</strong>{" "}
                                <a href="tel:+918130693767" className="text-gold hover:underline">
                                    +91 81306 93767
                                </a>
                            </p>
                            <p className="text-espresso dark:text-ivory">
                                <strong>Address:</strong> Amrit Milk Farms, Lucknow, Uttar Pradesh,
                                India
                            </p>
                            <p className="text-espresso-muted dark:text-ivory/60 text-sm mt-2">
                                Customer Support Hours: 7:00 AM - 9:00 PM IST, Monday - Sunday
                            </p>
                        </div>
                    </div>

                    <div className="text-center space-y-6">
                        <p className="text-espresso-muted dark:text-ivory/60 max-w-xl mx-auto">
                            Have questions about delivery or product availability? Our team will
                            help you confirm serviceability before ordering.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button
                                href="https://wa.me/918130693767"
                                size="lg"
                                className="bg-green-500 text-white hover:bg-green-400"
                            >
                                WhatsApp Support
                            </Button>
                            <Button href="/faqs" variant="glass" size="lg">
                                View FAQs
                            </Button>
                        </div>
                    </div>
                </div>
            </Section>
        </main>
    );
}