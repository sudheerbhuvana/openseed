import { NextRequest, NextResponse } from "next/server";
import { resolveLiveDistroVerification } from "@/lib/checksum-resolver";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const force = searchParams.get("force") === "true";

  if (!id) {
    return NextResponse.json({ error: "Missing distro id" }, { status: 400 });
  }

  try {
    const data = await resolveLiveDistroVerification(id, force);
    if (!data) {
      return NextResponse.json({ error: "Distro configuration not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("API /api/verify error:", err);
    return NextResponse.json({ error: err.message || "Failed to resolve live checksum" }, { status: 500 });
  }
}

