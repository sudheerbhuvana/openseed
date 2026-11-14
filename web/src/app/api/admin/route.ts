import { NextRequest, NextResponse } from "next/server";
import { qbit } from "@/lib/qbittorrent";
import { syncAllDistrosToDatabase } from "@/lib/checksum-resolver";
import { getAllDistroImages, getSyncLogs, logSync } from "@/lib/db";
import { getGluetunStatus } from "@/lib/gluetun";
import {
  verifyAdminRequest,
  timingSafeCompare,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  getClientIp,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = verifyAdminRequest(req);

  let gluetun = null;
  if (auth.authorized) {
    gluetun = await getGluetunStatus().catch(() => null);
  }

  return NextResponse.json({
    authenticated: auth.authorized,
    method: auth.method || null,
    email: auth.email || null,
    gluetun,
  });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";

  // Check rate limit upfront
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Too many failed login attempts. IP temporarily locked. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
        locked: true,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      { status: 429 }
    );
  }

  const contentType = req.headers.get("content-type") || "";

  // 1. Handle multipart torrent uploads (requires auth)
  if (contentType.includes("multipart/form-data")) {
    const auth = verifyAdminRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const urls = (formData.get("urls") as string) || undefined;
      const category = (formData.get("category") as string) || "Linux Distros";
      const tags = (formData.get("tags") as string) || "openseed";

      if (!file && !urls) {
        return NextResponse.json(
          { error: "Provide either a .torrent file or magnet/HTTP url" },
          { status: 400 }
        );
      }

      await qbit.addTorrent({
        file: file || undefined,
        fileName: file?.name,
        urls,
        category,
        tags,
      });

      logSync("manual_add", "success", `Admin manually added torrent: ${file?.name || urls?.slice(0, 50)}`);
      return NextResponse.json({ success: true, message: "Torrent added" });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Failed to add torrent" }, { status: 500 });
    }
  }

  // 2. Parse JSON body
  let json: any = {};
  try {
    json = await req.json();
  } catch {
    json = {};
  }

  const { action, password, hash, urls, category, tags, deleteFiles } = json;

  // 3. Handle Login Action
  if (action === "login" || action === "test") {
    // If already authorized via Cloudflare Access or existing valid session
    const existingAuth = verifyAdminRequest(req);
    if (existingAuth.authorized) {
      resetRateLimit(ip);
      const res = NextResponse.json({
        success: true,
        authenticated: true,
        email: existingAuth.email || null,
        method: existingAuth.method,
      });
      return res;
    }

    // Attempt password authentication
    const providedPass = password || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!providedPass || !timingSafeCompare(providedPass, expectedPassword)) {
      const failed = recordFailedAttempt(ip);
      console.warn(`[OpenSeed Security] Failed admin login attempt from IP ${ip}. Remaining attempts: ${failed.remainingAttempts}`);

      return NextResponse.json(
        {
          error: failed.locked
            ? `Too many failed attempts. Account locked for 15 minutes.`
            : `Invalid admin credentials. ${failed.remainingAttempts} attempt(s) remaining.`,
          remainingAttempts: failed.remainingAttempts,
          locked: failed.locked,
        },
        { status: 401 }
      );
    }

    // Password is valid -> reset rate limit and issue secure session cookie
    resetRateLimit(ip);
    const sessionToken = createSessionToken();
    const res = NextResponse.json({
      success: true,
      authenticated: true,
      message: "Authentication successful",
      token: sessionToken,
    });
    setSessionCookie(res, sessionToken, req);
    return res;
  }

  // 4. Handle Logout Action
  if (action === "logout") {
    const res = NextResponse.json({ success: true, message: "Logged out" });
    clearSessionCookie(res, req);
    return res;
  }

  // 5. All other actions REQUIRE strict verification
  const auth = verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (action === "add") {
      if (!urls) return NextResponse.json({ error: "Missing URLs" }, { status: 400 });
      await qbit.addTorrent({ urls, category, tags });
      logSync("manual_add", "success", `Admin queued magnet: ${urls.slice(0, 60)}`);
      return NextResponse.json({ success: true });
    }

    if (action === "pause") {
      if (!hash) return NextResponse.json({ error: "Missing hash" }, { status: 400 });
      await qbit.pauseTorrent(hash);
      return NextResponse.json({ success: true });
    }

    if (action === "resume") {
      if (!hash) return NextResponse.json({ error: "Missing hash" }, { status: 400 });
      await qbit.resumeTorrent(hash);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      if (!hash) return NextResponse.json({ error: "Missing hash" }, { status: 400 });
      await qbit.deleteTorrent(hash, deleteFiles ?? false);
      logSync("manual_add", "info", `Admin removed torrent ${hash} (deleteFiles: ${deleteFiles})`);
      return NextResponse.json({ success: true });
    }

    if (action === "db-sync") {
      const results = await syncAllDistrosToDatabase();
      return NextResponse.json({ success: true, count: results.length });
    }

    if (action === "db-status") {
      const images = getAllDistroImages();
      return NextResponse.json({ success: true, count: images.length });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Operation failed" }, { status: 500 });
  }
}
