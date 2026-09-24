import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const CUSTOMER_COOKIE = "amrit_customer_session";
export const ADMIN_COOKIE = "amrit_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type Role = "customer" | "admin";
export type Session = { sub: string; role: Role; phone?: string; exp: number };

function secret(): Buffer | null {
    const value = process.env.AUTH_SESSION_SECRET;
    if (!value) return null;
    let decoded: Buffer;
    try {
        decoded = value.startsWith("base64:")
            ? Buffer.from(value.slice(7), "base64")
            : value.startsWith("hex:")
              ? Buffer.from(value.slice(4), "hex")
              : Buffer.from(value, "utf8");
    } catch {
        return null;
    }
    return decoded.length >= 32 ? decoded : null;
}

function encode(value: Buffer | string) {
    return Buffer.from(value).toString("base64url");
}

function signature(payload: string, key: Buffer) {
    return encode(crypto.createHmac("sha256", key).update(payload).digest());
}

export function createSessionToken(session: Omit<Session, "exp">): string | null {
    const key = secret();
    if (!key) return null;
    const payload = encode(
        JSON.stringify({
            ...session,
            exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
        })
    );
    return `${payload}.${signature(payload, key)}`;
}

export function readSessionToken(token?: string): Session | null {
    const key = secret();
    if (!key || !token) return null;
    const [payload, supplied, extra] = token.split(".");
    if (!payload || !supplied || extra) return null;
    const expected = signature(payload, key);
    const a = Buffer.from(supplied);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
        const value = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
        if (
            !value.sub ||
            !["customer", "admin"].includes(value.role) ||
            value.exp <= Date.now() / 1000
        )
            return null;
        return value;
    } catch {
        return null;
    }
}

export function sessionFromRequest(request: NextRequest, role: Role) {
    const name = role === "admin" ? ADMIN_COOKIE : CUSTOMER_COOKIE;
    const session = readSessionToken(request.cookies.get(name)?.value);
    return session?.role === role ? session : null;
}

export function setSessionCookie(response: NextResponse, role: Role, token: string) {
    response.cookies.set(role === "admin" ? ADMIN_COOKIE : CUSTOMER_COOKIE, token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_TTL_SECONDS,
    });
}

export function clearSessionCookie(response: NextResponse, role: Role) {
    response.cookies.set(role === "admin" ? ADMIN_COOKIE : CUSTOMER_COOKIE, "", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });
}

export function sessionConfigurationValid() {
    return secret() !== null;
}
