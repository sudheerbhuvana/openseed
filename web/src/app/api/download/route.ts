import { NextRequest, NextResponse } from "next/server";
import { qbit } from "@/lib/qbittorrent";
import { CURATED_SEED_CATALOG, matchTorrentToCatalog } from "@/lib/catalog";
import { getNodeStats } from "@/lib/node-stats";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  let hash = searchParams.get("hash");
  const id = searchParams.get("id");
  let name = searchParams.get("name") || "download";

  // If no hash provided, attempt to resolve hash from cached torrents via distro ID
  if (!hash && id) {
    const catalogItem = CURATED_SEED_CATALOG.find((c) => c.id === id);
    if (catalogItem) {
      name = catalogItem.targetFileName || catalogItem.name;
      try {
        const stats = await getNodeStats(false);
        const matched = matchTorrentToCatalog(catalogItem, stats.torrents);
        if (matched?.hash) {
          hash = matched.hash;
        }
      } catch {
        // silent fallback
      }
    }
  }

  // Validate hash format (BitTorrent v1 is 40-char hex, v2 is 64-char hex)
  if (hash && !/^[a-fA-F0-9]{32,64}$/.test(hash)) {
    hash = null;
  }

  // 1. Try to export raw .torrent file directly from qBittorrent
  if (hash) {
    try {
      const buffer = await qbit.exportTorrent(hash);
      if (buffer && buffer.byteLength > 0) {
        const safeName = name
          .replace(/[^a-zA-Z0-9._-]/g, "_")
          .replace(/\.iso$/i, "")
          .replace(/\.torrent$/i, "");
        return new Response(buffer, {
          status: 200,
          headers: {
            "Content-Type": "application/x-bittorrent",
            "Content-Disposition": `attachment; filename="${safeName || "distro"}.torrent"`,
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    } catch (err) {
      console.warn("Failed to export torrent from qBittorrent:", err);
    }
  }

  // 2. Fallback: If not currently in daemon, redirect to official upstream .torrent / release URL
  if (id) {
    const catalogItem = CURATED_SEED_CATALOG.find((c) => c.id === id);
    if (catalogItem) {
      if (catalogItem.officialMagnet.startsWith("http")) {
        return NextResponse.redirect(catalogItem.officialMagnet, 302);
      }
      if (catalogItem.officialUrl) {
        return NextResponse.redirect(catalogItem.officialUrl, 302);
      }
    }
  }

  return NextResponse.json({ error: "Download not available for this distribution" }, { status: 404 });
}

