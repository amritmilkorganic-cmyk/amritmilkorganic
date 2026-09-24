import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, readSessionToken } from "@/lib/security/session";
import { canonicalPhone, findUniqueCustomerAccount } from "@/lib/security/customer-identity";

describe("signed sessions", () => {
  beforeEach(() => { process.env.AUTH_SESSION_SECRET = `base64:${Buffer.alloc(32, 7).toString("base64")}`; });
  it("fails safely with a weak secret", () => {
    process.env.AUTH_SESSION_SECRET = "weak";
    expect(createSessionToken({ sub: "customer-a", role: "customer", phone: "9999999999" })).toBeNull();
  });
  it("authenticates an untampered token and rejects tampering", () => {
    const token = createSessionToken({ sub: "customer-a", role: "customer", phone: "9999999999" })!;
    expect(readSessionToken(token)?.sub).toBe("customer-a");
    expect(readSessionToken(`${token}x`)).toBeNull();
  });
});

describe("canonical customer identity", () => {
  it("normalizes phone numbers and rejects ambiguous legacy accounts", async () => {
    expect(canonicalPhone("+91 99999-99999")).toBe("9999999999");
    const fetch = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([
      { _id: "a", phone: "+91 99999 99999" },
      { _id: "b", phone: "9999999999" },
    ]);
    expect(await findUniqueCustomerAccount({ fetch }, "9999999999")).toEqual({ account: null, ambiguous: true });
  });
});
