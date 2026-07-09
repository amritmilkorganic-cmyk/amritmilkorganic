"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, CheckCircle2, AlertCircle } from "lucide-react";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const token = searchParams.get("token") || "";

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");

        if (!token) {
            setError("This password reset link is invalid.");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                "/api/user/reset-password",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        token,
                        password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setError(
                    data.error ||
                        "Unable to reset password. Please try again."
                );

                setLoading(false);
                return;
            }

            setSuccess(true);

            setTimeout(() => {
                router.push("/account");
            }, 2500);
        } catch (error) {
            console.error(error);

            setError(
                "Something went wrong. Please try again."
            );

            setLoading(false);
        }
    }

    if (success) {
        return (
            <main className="min-h-screen bg-[#fffaf0] flex items-center justify-center px-4 py-20">
                <div className="w-full max-w-md rounded-[28px] border border-[#eadfce] bg-white p-8 shadow-xl text-center">

                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                        <CheckCircle2
                            size={30}
                            className="text-green-600"
                        />
                    </div>

                    <h1 className="text-3xl font-semibold text-[#3b241c]">
                        Password Updated
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-[#765f55]">
                        Your password has been reset successfully.
                        You will now be redirected to the login page.
                    </p>

                    <button
                        type="button"
                        onClick={() => router.push("/account")}
                        className="mt-7 w-full rounded-xl bg-[#a64b1a] px-5 py-4 font-semibold text-white transition hover:opacity-90"
                    >
                        GO TO LOGIN
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#fffaf0] flex items-center justify-center px-4 py-20">

            <div className="w-full max-w-md rounded-[28px] border border-[#eadfce] bg-white p-8 shadow-xl">

                <div className="text-center">

                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#e3b15c]">
                        <Lock
                            size={26}
                            className="text-[#3b241c]"
                        />
                    </div>

                    <h1 className="text-3xl font-semibold text-[#3b241c]">
                        Create New Password
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-[#765f55]">
                        Choose a secure new password for your
                        Amrit Milk Organic account.
                    </p>

                </div>

                {!token && (
                    <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">

                        <AlertCircle
                            size={20}
                            className="mt-0.5 shrink-0 text-red-600"
                        />

                        <p className="text-sm text-red-700">
                            This password reset link is invalid.
                            Please request a new password reset email.
                        </p>

                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="mt-8 space-y-5"
                >

                    <div>
                        <label
                            htmlFor="password"
                            className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#765f55]"
                        >
                            New Password
                        </label>

                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            placeholder="Minimum 8 characters"
                            autoComplete="new-password"
                            disabled={!token || loading}
                            className="w-full rounded-xl border border-[#decfbd] bg-white px-4 py-4 text-[#3b241c] outline-none transition focus:border-[#a64b1a] disabled:cursor-not-allowed disabled:bg-gray-50"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="confirmPassword"
                            className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#765f55]"
                        >
                            Confirm Password
                        </label>

                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(event) =>
                                setConfirmPassword(
                                    event.target.value
                                )
                            }
                            placeholder="Enter password again"
                            autoComplete="new-password"
                            disabled={!token || loading}
                            className="w-full rounded-xl border border-[#decfbd] bg-white px-4 py-4 text-[#3b241c] outline-none transition focus:border-[#a64b1a] disabled:cursor-not-allowed disabled:bg-gray-50"
                        />
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">

                            <AlertCircle
                                size={19}
                                className="mt-0.5 shrink-0 text-red-600"
                            />

                            <p className="text-sm text-red-700">
                                {error}
                            </p>

                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !token}
                        className="w-full rounded-xl bg-[#a64b1a] px-5 py-4 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading
                            ? "UPDATING PASSWORD..."
                            : "RESET PASSWORD"}
                    </button>

                </form>

                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={() => router.push("/account")}
                        className="text-sm font-medium text-[#a64b1a] hover:underline"
                    >
                        Back to Login
                    </button>
                </div>

            </div>

        </main>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <main className="min-h-screen bg-[#fffaf0] flex items-center justify-center">
                    <p className="text-[#765f55]">
                        Loading secure reset page...
                    </p>
                </main>
            }
        >
            <ResetPasswordForm />
        </Suspense>
    );
}