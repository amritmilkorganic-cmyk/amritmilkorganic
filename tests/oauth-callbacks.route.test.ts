import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ docs: new Map<string, any>(), revision: 0 }));
vi.mock("@/lib/sanity", () => {
  const writeClient = {
    create: vi.fn(async (doc: any) => { const stored = { ...doc, _rev: `r${++state.revision}` }; state.docs.set(doc._id, stored); return stored; }),
    fetch: vi.fn(async (_query: string, params: any) => state.docs.get(params.id) || null),
    patch: (id: string) => {
      let revision = ""; let values: any = {};
      const chain: any = {
        ifRevisionId(value: string) { revision = value; return chain; },
        set(value: any) { values = value; return chain; },
        async commit() {
          const current = state.docs.get(id);
          if (!current || current._rev !== revision) throw new Error("revision conflict");
          const next = { ...current, ...values, _rev: `r${++state.revision}` };
          state.docs.set(id, next); return next;
        },
      };
      return chain;
    },
  };
  const patch: any = { set: () => patch, setIfMissing: () => patch };
  const transaction: any = { createIfNotExists: () => transaction, patch: () => transaction, commit: vi.fn(async () => ({})) };
  return { writeClient, client: { patch: () => patch, transaction: () => transaction } };
});

import { GET as googleCallback } from "@/app/api/auth/google/callback/route";
import { GET as instagramCallback } from "@/app/api/auth/instagram/callback/route";
import { issueOAuthState, OAUTH_STATE_COOKIE } from "@/lib/security/oauth-state";
import { ADMIN_COOKIE, createSessionToken } from "@/lib/security/session";

const origin = "https://shop.example";
function adminCookie(subject = "admin@example.com") {
  return `${ADMIN_COOKIE}=${createSessionToken({ sub: subject, role: "admin" })}`;
}
function callback(provider: "google" | "instagram", query: string, nonce?: string, subject = "admin@example.com") {
  const cookies = [adminCookie(subject), nonce ? `${OAUTH_STATE_COOKIE}=${nonce}` : ""].filter(Boolean).join("; ");
  return new NextRequest(`${origin}/api/auth/${provider}/callback?${query}`, { headers: { cookie: cookies } });
}

describe("actual OAuth callback routes", () => {
  beforeEach(() => {
    state.docs.clear(); state.revision = 0; vi.restoreAllMocks();
    process.env.AUTH_SESSION_SECRET = `base64:${Buffer.alloc(32, 5).toString("base64")}`;
    process.env.NEXT_PUBLIC_SITE_URL = origin;
    process.env.GOOGLE_CLIENT_ID = "google-id"; process.env.GOOGLE_CLIENT_SECRET = "google-secret";
    process.env.INSTAGRAM_APP_ID = "instagram-id"; process.env.INSTAGRAM_APP_SECRET = "instagram-secret";
  });

  it("rejects missing and mismatched Google state", async () => {
    expect((await googleCallback(callback("google", "code=x"))).headers.get("location")).toContain("invalid_oauth_state");
    const nonce = await issueOAuthState("google", "admin@example.com");
    expect((await googleCallback(callback("google", "code=x&state=wrong", nonce))).headers.get("location")).toContain("invalid_oauth_state");
  });

  it("rejects expired, cross-provider, and cross-administrator state", async () => {
    const expired = await issueOAuthState("google", "admin@example.com");
    const expiredDoc = Array.from(state.docs.values()).find((doc) => doc.provider === "google");
    expiredDoc.expiresAt = new Date(Date.now() - 1).toISOString();
    expect((await googleCallback(callback("google", `code=x&state=${expired}`, expired))).headers.get("location")).toContain("invalid_oauth_state");

    const crossProvider = await issueOAuthState("instagram", "admin@example.com");
    expect((await googleCallback(callback("google", `code=x&state=${crossProvider}`, crossProvider))).headers.get("location")).toContain("invalid_oauth_state");

    const crossAdmin = await issueOAuthState("google", "admin@example.com");
    expect((await googleCallback(callback("google", `code=x&state=${crossAdmin}`, crossAdmin, "other@example.com"))).headers.get("location")).toContain("invalid_oauth_state");
  });

  it("accepts valid Google state exactly once", async () => {
    const nonce = await issueOAuthState("google", "admin@example.com");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ access_token: "access", refresh_token: "refresh", expires_in: 3600 }) }));
    const first = await googleCallback(callback("google", `code=x&state=${nonce}`, nonce));
    expect(first.headers.get("location")).toContain("success=google_connected");
    const replay = await googleCallback(callback("google", `code=x&state=${nonce}`, nonce));
    expect(replay.headers.get("location")).toContain("invalid_oauth_state");
  });

  it("accepts valid Instagram state and rejects replay", async () => {
    const nonce = await issueOAuthState("instagram", "admin@example.com");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ json: async () => ({ access_token: "short", user_id: 1 }) })
      .mockResolvedValueOnce({ json: async () => ({ access_token: "long", expires_in: 3600 }) }));
    const first = await instagramCallback(callback("instagram", `code=x&state=${nonce}`, nonce));
    expect(first.headers.get("location")).toContain("success=instagram_connected");
    const replay = await instagramCallback(callback("instagram", `code=x&state=${nonce}`, nonce));
    expect(replay.headers.get("location")).toContain("invalid_oauth_state");
  });
});
