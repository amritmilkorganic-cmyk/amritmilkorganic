import crypto from "crypto";
import { writeClient } from "@/lib/sanity";

export const ADMIN_LOGIN_LIMIT = 5;
export const ADMIN_LOGIN_WINDOW_SECONDS = 15 * 60;

export type AdminLoginOutcome = "succeeded" | "failed" | "rate_limited";

type LoginIdentity = {
    ipHash: string;
    principalHash: string;
};

function auditKey() {
    const secret = process.env.AUTH_SESSION_SECRET;
    if (!secret) throw new Error("Admin login audit key is unavailable");
    return secret;
}

function digest(value: string) {
    return crypto.createHmac("sha256", auditKey()).update(value).digest("hex");
}

function clientAddress(request: Request) {
    // Vercel supplies this header to functions. Only retain a keyed digest of it.
    const forwarded =
        request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for");
    return forwarded?.split(",")[0]?.trim() || "unknown";
}

export function adminLoginIdentity(request: Request, suppliedEmail: string): LoginIdentity {
    return {
        ipHash: digest(`ip:${clientAddress(request)}`),
        principalHash: digest(`principal:${suppliedEmail.trim().toLowerCase() || "unknown"}`),
    };
}

export async function adminLoginRateLimit(identity: LoginIdentity, now = new Date()) {
    const since = new Date(now.getTime() - ADMIN_LOGIN_WINDOW_SECONDS * 1000).toISOString();
    const result = await writeClient.fetch<{ count: number; oldest: string | null }>(
        `{
            "count": count(*[_type == "adminLoginAudit" && occurredAt >= $since && outcome in ["failed", "rate_limited"] && (ipHash == $ipHash || principalHash == $principalHash)]),
            "oldest": *[_type == "adminLoginAudit" && occurredAt >= $since && outcome in ["failed", "rate_limited"] && (ipHash == $ipHash || principalHash == $principalHash)] | order(occurredAt asc)[0].occurredAt
        }`,
        { since, ...identity }
    );
    const limited = Number(result?.count || 0) >= ADMIN_LOGIN_LIMIT;
    const oldest = result?.oldest ? Date.parse(result.oldest) : Number.NaN;
    const retryAfter = Number.isFinite(oldest)
        ? Math.max(
              1,
              Math.ceil((oldest + ADMIN_LOGIN_WINDOW_SECONDS * 1000 - now.getTime()) / 1000)
          )
        : ADMIN_LOGIN_WINDOW_SECONDS;
    return { limited, retryAfter };
}

export async function recordAdminLogin(
    identity: LoginIdentity,
    outcome: AdminLoginOutcome,
    now = new Date()
) {
    await writeClient.create({
        _type: "adminLoginAudit",
        outcome,
        occurredAt: now.toISOString(),
        ...identity,
    });
}
