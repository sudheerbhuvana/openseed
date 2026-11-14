import { NextRequest, NextResponse } from "next/server";
import { getNodeStats } from "@/lib/node-stats";
import { verifyAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const isLiveRequested = req.nextUrl.searchParams.get("live") === "true";
    let forceLive = false;

    if (isLiveRequested) {
      const auth = verifyAdminRequest(req);
      if (auth.authorized) {
        forceLive = true;
      }
    }

    const data = await getNodeStats(forceLive);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
