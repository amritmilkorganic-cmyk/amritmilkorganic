"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError("");
        const data = new FormData(event.currentTarget);
        const response = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
        });
        if (response.ok) {
            router.replace("/admin/orders");
            router.refresh();
        } else {
            setError("Invalid credentials or administrator login is unavailable.");
            setLoading(false);
        }
    }
    return (
        <main className="min-h-screen bg-creme flex items-center justify-center p-6">
            <form
                onSubmit={submit}
                className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl space-y-5"
            >
                <h1 className="text-3xl font-serif font-bold">Administrator login</h1>
                <p className="text-sm text-gray-600">
                    This login protects Amrit custom administration tools. Sanity Studio login is
                    separate.
                </p>
                <label className="block text-sm font-semibold">
                    Email
                    <input
                        name="email"
                        type="email"
                        required
                        autoComplete="username"
                        className="mt-2 w-full rounded-lg border p-3"
                    />
                </label>
                <label className="block text-sm font-semibold">
                    Password
                    <input
                        name="password"
                        type="password"
                        required
                        autoComplete="current-password"
                        className="mt-2 w-full rounded-lg border p-3"
                    />
                </label>
                {error && (
                    <p role="alert" className="text-sm text-red-700">
                        {error}
                    </p>
                )}
                <button
                    disabled={loading}
                    className="w-full rounded-lg bg-espresso p-3 font-bold text-white disabled:opacity-60"
                >
                    {loading ? "Signing in…" : "Sign in"}
                </button>
            </form>
        </main>
    );
}
