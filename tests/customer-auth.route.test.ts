import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

const sanity = vi.hoisted(() => ({
  fetch: vi.fn(),
  create: vi.fn(),
  patchCommit: vi.fn(),
}));

vi.mock("@/lib/sanity", () => {
  const patch = () => ({
    set: () => ({ commit: sanity.patchCommit }),
    ifRevisionId: () => ({ set: () => ({ commit: sanity.patchCommit }) }),
  });
  return {
    writeClient: { fetch: sanity.fetch, create: sanity.create, patch },
    client: { fetch: sanity.fetch, patch },
  };
});

import { POST as customerLogin } from "@/app/api/user/login/route";
import { POST as customerLogout } from "@/app/api/user/logout/route";
import { GET as customerProfile } from "@/app/api/user/profile/route";
import { POST as updateAddress } from "@/app/api/user/update-address/route";
import { POST as adminLogin } from "@/app/api/admin/login/route";
import { GET as adminSettings } from "@/app/api/admin/settings/route";
import { POST as seedSanity } from "@/app/api/seed-sanity/route";
import { POST as testEmail } from "@/app/api/test-email/route";
import { DELETE as exitPreview } from "@/app/api/preview/route";
import { createSessionToken, CUSTOMER_COOKIE } from "@/lib/security/session";

const origin = "https://shop.example";
function request(path: string, init: any = {}) {
  return new NextRequest(`${origin}${path}`, {
    ...init,
    headers: { origin, ...(init.headers || {}) },
  });
}
function cookieFrom(response: Response, name: string) {
  const match = response.headers.get("set-cookie")?.match(new RegExp(`${name}=([^;]+)`));
  return match ? `${name}=${match[1]}` : "";
}

describe("actual customer and administrator routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = origin;
    process.env.AUTH_SESSION_SECRET = `base64:${Buffer.alloc(32, 9).toString("base64")}`;
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash("correct horse battery staple", 4);
    sanity.fetch.mockResolvedValue({ count: 0, oldest: null });
    sanity.create.mockResolvedValue({});
  });

  it("rejects unauthenticated profile and admin API access", async () => {
    expect((await customerProfile(request("/api/user/profile"))).status).toBe(401);
    expect((await adminSettings(request("/api/admin/settings"))).status).toBe(401);
  });

  it("logs in, sets the secure customer cookie, and returns only owned records", async () => {
    const passwordHash = await bcrypt.hash("customer-password", 4);
    sanity.fetch.mockImplementation(async (query: string) => {
      if (query.includes('canonicalPhone == $canonical') && query.includes("passwordHash")) {
        return [{ _id: "customer-a", phone: "+91 99999 99999", canonicalPhone: "9999999999", passwordHash, isActive: true, name: "A", email: "a@example.test" }];
      }
      if (query.includes('_id == $accountId')) return { _id: "customer-a", canonicalPhone: "9999999999", phone: "9999999999", name: "A", isActive: true };
      if (query.includes('customerAccount" && canonicalPhone')) return [{ _id: "customer-a" }];
      if (query.includes('"order" && customerAccount._ref')) return [{ _id: "order-a", orderNumber: "A-1", phone: "9999999999", total: 100 }];
      if (query.includes('"order" && !defined')) return [{ _id: "order-b", phone: "8888888888", total: 999 }];
      if (query.includes('"subscription" && customerAccount._ref')) return [{ _id: "sub-a", customer: { phone: "9999999999" }, status: "active" }];
      if (query.includes('"subscription" && !defined')) return [{ _id: "sub-b", customer: { phone: "8888888888" } }];
      return [];
    });

    const login = await customerLogin(request("/api/user/login", { method: "POST", body: JSON.stringify({ phone: "99999 99999", password: "customer-password" }) }));
    expect(login.status).toBe(200);
    const cookie = cookieFrom(login, CUSTOMER_COOKIE);
    expect(login.headers.get("set-cookie")).toMatch(/HttpOnly/i);
    expect(login.headers.get("set-cookie")).toMatch(/Secure/i);
    expect(login.headers.get("set-cookie")).toMatch(/SameSite=lax/i);

    const profile = await customerProfile(request("/api/user/profile", { headers: { cookie } }));
    expect(profile.status).toBe(200);
    const body = await profile.json();
    expect(body.orders.map((item: any) => item.id)).toEqual(["order-a"]);
    expect(body.subscriptions.map((item: any) => item.id)).toEqual(["sub-a"]);
  });

  it("denies a cross-customer address mutation", async () => {
    const token = createSessionToken({ sub: "customer-a", role: "customer", phone: "9999999999" })!;
    const response = await updateAddress(request("/api/user/update-address", {
      method: "POST",
      headers: { cookie: `${CUSTOMER_COOKIE}=${token}` },
      body: JSON.stringify({ phone: "8888888888", address: "Other address" }),
    }));
    expect(response.status).toBe(403);
    expect(sanity.patchCommit).not.toHaveBeenCalled();
  });

  it("does not authorize a normal customer as an administrator", async () => {
    const token = createSessionToken({ sub: "customer-a", role: "customer", phone: "9999999999" })!;
    expect((await adminSettings(request("/api/admin/settings", { headers: { cookie: `${CUSTOMER_COOKIE}=${token}` } }))).status).toBe(401);
  });

  it("protects operational mutations with admin authorization and Origin validation", async () => {
    expect((await seedSanity(request("/api/seed-sanity", { method: "POST" }))).status).toBe(401);
    expect((await testEmail(request("/api/test-email", { method: "POST" }))).status).toBe(401);
    const admin = createSessionToken({ sub: "admin@example.com", role: "admin" })!;
    const crossOrigin = new NextRequest(`${origin}/api/seed-sanity`, {
      method: "POST",
      headers: { origin: "https://evil.example", cookie: `amrit_admin_session=${admin}` },
    });
    expect((await seedSanity(crossOrigin)).status).toBe(403);
    expect((await exitPreview(new NextRequest(`${origin}/api/preview`, {
      method: "DELETE", headers: { origin: "https://evil.example" },
    }))).status).toBe(403);
  });

  it("sets and clears login cookies through actual routes", async () => {
    const login = await adminLogin(request("/api/admin/login", { method: "POST", body: JSON.stringify({ email: "admin@example.com", password: "correct horse battery staple" }) }));
    expect(login.status).toBe(200);
    expect(login.headers.get("set-cookie")).toContain("amrit_admin_session=");
    expect(login.headers.get("set-cookie")).toMatch(/HttpOnly/i);
    expect(login.headers.get("set-cookie")).toMatch(/Secure/i);
    expect(login.headers.get("set-cookie")).toMatch(/SameSite=lax/i);

    const token = createSessionToken({ sub: "customer-a", role: "customer", phone: "9999999999" })!;
    const logout = await customerLogout(request("/api/user/logout", { method: "POST", headers: { cookie: `${CUSTOMER_COOKIE}=${token}` } }));
    expect(logout.status).toBe(200);
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
