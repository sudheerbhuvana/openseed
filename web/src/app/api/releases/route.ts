import { NextRequest, NextResponse } from "next/server";
import { checkAllDistros } from "@/lib/tracker";
import { qbit } from "@/lib/qbittorrent";
import { resolveDistroStatus } from "@/lib/status";
import { verifyAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = verifyAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [availableReleases, existingTorrents] = await Promise.all([
      checkAllDistros(),
      qbit.getTorrents(),
    ]);

    const releasesWithStatus = availableReleases.map((rel) => {
      // Find matching torrent in qBittorrent
      const rName = rel.versionName.toLowerCase();
      const matchedTorrent = existingTorrents.find((t) => {
        const tName = t.name.toLowerCase();
        return tName.includes(rName) || rName.includes(tName);
      });

      const status = resolveDistroStatus(matchedTorrent);
      const progress = matchedTorrent?.progress ?? 0;

      return {
        ...rel,
        isSeeded: Boolean(matchedTorrent), // Keep boolean for backwards compatibility (hides Seed ISO button)
        status,
        progress,
        torrent: matchedTorrent || null,
      };
    });

    return NextResponse.json({
      releases: releasesWithStatus,
      checkedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
