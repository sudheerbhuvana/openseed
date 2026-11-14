import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

const SESSION_COOKIE_NAME = "openseed_session";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Rate limiting in-memory store for failed login attempts
interface FailedAttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}

const failedAttempts = new Map<string, FailedAttemptRecord>();

// Clean up stale rate limit entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  failedAttempts.forEach((record, ip) => {
    if (record.lockedUntil && record.lockedUntil < now) {
      failedAttempts.delete(ip);
    } else if (now - record.firstAttempt > 10 * 60 * 1000) {
      failedAttempts.delete(ip);
    }
  });
}, 10 * 60 * 1000).unref();

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();
  return "127.0.0.1";
}

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const record = failedAttempts.get(ip);

  if (!record) {
    return { allowed: true, remainingAttempts: 5 };
  }

  if (record.lockedUntil && record.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  // Reset if window expired (5 minutes)
  if (now - record.firstAttempt > 5 * 60 * 1000) {
    failedAttempts.delete(ip);
    return { allowed: true, remainingAttempts: 5 };
  }

  const remaining = Math.max(0, 5 - record.count);
  return { allowed: record.count < 5, remainingAttempts: remaining };
}

export function recordFailedAttempt(ip: string): {
  remainingAttempts: number;
  locked: boolean;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  let record = failedAttempts.get(ip);

  if (!record || now - record.firstAttempt > 5 * 60 * 1000) {
    record = { count: 1, firstAttempt: now };
  } else {
    record.count += 1;
  }

  if (record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000; // 15-minute lockout
    failedAttempts.set(ip, record);
    return { remainingAttempts: 0, locked: true, retryAfterSeconds: 15 * 60 };
  }

  failedAttempts.set(ip, record);
  return { remainingAttempts: Math.max(0, 5 - record.count), locked: false };
}

export function resetRateLimit(ip: string): void {
  failedAttempts.delete(ip);
}

/**
 * Constant-time password comparison to prevent timing attacks
 */
export function timingSafeCompare(provided: string, expected: string): boolean {
  try {
    const hashA = crypto.createHash("sha256").update(provided).digest();
    const hashB = crypto.createHash("sha256").update(expected).digest();
    return crypto.timingSafeEqual(hashA, hashB);
  } catch {
    return false;
  }
}

function getSecretKey(): string {
  return process.env.ADMIN_PASSWORD || process.env.CRON_SECRET || "openseed_default_secret_key";
}

/**
 * Creates an HMAC-signed session token: `<issuedAtMs>.<signature>`
 */
export function createSessionToken(): string {
  const timestamp = Date.now().toString();
  const secret = getSecretKey();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`openseed-session:${timestamp}`)
    .digest("hex");
  return `${timestamp}.${signature}`;
}

/**
 * Verifies an HMAC-signed session token and checks for expiration (7 days)
 */
export function verifySessionToken(token: string): boolean {
  if (!token || !token.includes(".")) return false;
  const [timestampStr, signature] = token.split(".");
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  const now = Date.now();
  if (now - timestamp > SESSION_MAX_AGE_SECONDS * 1000) {
    return false; // Expired
  }

  const secret = getSecretKey();
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`openseed-session:${timestampStr}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
}

export interface AuthVerificationResult {
  authorized: boolean;
  method?: "cloudflare" | "session_cookie" | "bearer_token" | "basic_auth";
  email?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Multi-layer authentication verification for all admin routes:
 * 1. Cloudflare Access Header (Zero Trust)
 * 2. HttpOnly Session Cookie (Web Admin UI)
 * 3. Authorization Header (Bearer / Basic for API)
 */
export function verifyAdminRequest(req: NextRequest): AuthVerificationResult {
  // 1. Cloudflare Access Zero Trust (strictly enabled only if CF_ACCESS_ENABLED=true or CF_ACCESS_AUD is configured)
  const cfAccessEnabled = process.env.CF_ACCESS_ENABLED === "true" || Boolean(process.env.CF_ACCESS_AUD);
  const cfUserEmail = req.headers.get("cf-access-authenticated-user-email");
  if (cfAccessEnabled && cfUserEmail) {
    return { authorized: true, method: "cloudflare", email: cfUserEmail };
  }

  // 2. HttpOnly Session Cookie
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionCookie && verifySessionToken(sessionCookie)) {
    return { authorized: true, method: "session_cookie" };
  }

  // 3. Authorization Header
  const authHeader = req.headers.get("authorization");
  const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";

  if (authHeader) {
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      // Allow raw admin password OR signed session token in Bearer header
      if (timingSafeCompare(token, expectedPassword) || verifySessionToken(token)) {
        return { authorized: true, method: "bearer_token" };
      }
    } else if (authHeader.startsWith("Basic ")) {
      try {
        const decoded = Buffer.from(authHeader.slice(6), "base64").toString();
        const [, pass] = decoded.split(":");
        if (pass && timingSafeCompare(pass, expectedPassword)) {
          return { authorized: true, method: "basic_auth" };
        }
      } catch {
        // invalid base64
      }
    }
  }

  return { authorized: false, statusCode: 401, error: "Unauthorized" };
}

/**
 * Sets the HttpOnly session cookie on the given NextResponse.
 * Only flags 'secure: true' if the request was made over HTTPS, allowing local HTTP homelab access.
 */
export function setSessionCookie(res: NextResponse, token: string, req?: NextRequest): void {
  const isHttps = req
    ? req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https"
    : false;

  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Clears the session cookie (for logout)
 */
export function clearSessionCookie(res: NextResponse, req?: NextRequest): void {
  const isHttps = req
    ? req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https"
    : false;

  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
