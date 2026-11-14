import { NextRequest, NextResponse } from "next/server";
import { getSyncLogs, type SyncLogRecord } from "@/lib/db";
import { verifyAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
    const eventType = url.searchParams.get("type") || undefined;

    const logs = getSyncLogs(limit, eventType);

    const stats = {
      total: logs.length,
      autoAddedCount: logs.filter((l) => l.eventType === "auto_add").length,
      prunedCount: logs.filter((l) => l.eventType === "prune").length,
      checksumSyncCount: logs.filter((l) => l.eventType === "checksum_sync").length,
      safetyValveCount: logs.filter((l) => l.eventType === "safety_valve").length,
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
      logs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

