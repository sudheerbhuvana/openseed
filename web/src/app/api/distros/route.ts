import { NextResponse } from "next/server";
import {
  CURATED_SEED_CATALOG,
  matchTorrentToCatalog,
  resolveDynamicDistroDisplay,
  type CatalogItem,
} from "@/lib/catalog";
import { getAllDistroImages, syncTorrentUploadHistory, type DistroImageRecord } from "@/lib/db";
import { getNodeStats } from "@/lib/node-stats";
import type { QBitTorrent } from "@/lib/qbittorrent";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Fetch cached torrents and server state from 5-minute SQLite snapshot
    let torrents: QBitTorrent[] = [];
    try {
      const stats = await getNodeStats(false);
      torrents = stats.torrents;
    } catch (err) {
      console.warn("Failed to fetch node stats:", err);
    }

    // 2. Fetch cached upstream metadata & dynamic checksums from SQLite
    let dbRecords: DistroImageRecord[] = [];
    try {
      dbRecords = getAllDistroImages();
    } catch (err) {
      console.warn("Failed to fetch from SQLite db:", err);
    }

    const dbMap = new Map<string, DistroImageRecord>();
    for (const rec of dbRecords) {
      dbMap.set(rec.id, rec);
    }

    // 3. Assemble monitored distros matrix with 100% dynamic upstream values
    const monitored = CURATED_SEED_CATALOG.map((item) => {
      const dbInfo = dbMap.get(item.id);
      const matchedTorrent = matchTorrentToCatalog(item, torrents);
      const display = resolveDynamicDistroDisplay(item, matchedTorrent, dbInfo);

      return {
        id: item.id,
        name: display.title,
        category: item.category,
        version: display.versionSubtitle,
        architecture: item.architecture,
        nominalSize: display.sizeBytes,
        description: item.description || "",
        targetFileName: display.fileName,
        releaseDate: display.releaseDate,
        officialUrl: item.officialUrl,
        officialMagnet: display.magnetUri,
        detectedVersion: display.detectedVersion || null,
        // Upstream Verification Data (SQLite cached or fallback)
        checksum: {
          type: dbInfo?.checksumType || "SHA-256",
          value: dbInfo?.checksumValue || null,
          sourceUrl: dbInfo?.checksumFileUrl || null,
          gpgUrl: dbInfo?.gpgSignatureUrl || null,
          releaseNotesUrl: dbInfo?.releaseNotesUrl || null,
          installGuideUrl: dbInfo?.installGuideUrl || null,
          upstreamUrl: dbInfo?.upstreamUrl || item.officialUrl,
          lastSyncedAt: dbInfo?.lastSyncedAt || null,
          isDynamicUpstream: dbInfo?.isDynamicUpstream ?? true,
        },
        // Cluster Seeding Telemetry
        torrent: matchedTorrent
          ? {
              hash: matchedTorrent.hash,
              name: matchedTorrent.name,
              state: matchedTorrent.state,
              progress: matchedTorrent.progress,
              size: matchedTorrent.size,
              uploaded: matchedTorrent.uploaded,
              downloaded: matchedTorrent.downloaded,
              ratio: matchedTorrent.ratio,
              dlspeed: matchedTorrent.dlspeed,
              upspeed: matchedTorrent.upspeed,
              numSeeds: matchedTorrent.num_seeds,
              numLeechs: matchedTorrent.num_leechs,
              magnetUri: matchedTorrent.magnet_uri,
            }
          : null,
      };
    });

    const activeSeedingCount = monitored.filter((m) => {
      const state = m.torrent?.state.toLowerCase() || "";
      return state.includes("seed") || state.includes("upload") || state === "stalledup";
    }).length;

    const downloadingCount = monitored.filter((m) => {
      const state = m.torrent?.state.toLowerCase() || "";
      return state.includes("dl") || state.includes("download");
    }).length;

    const activeTorrentItems = torrents.map((t) => ({ hash: t.hash, name: t.name, uploaded: t.uploaded || 0 }));
    const { lifetimeUploadedBytes } = syncTorrentUploadHistory(activeTorrentItems);
    const totalDonatedBytes = lifetimeUploadedBytes;
    const totalStoredBytes = monitored.reduce((acc, m) => acc + (m.torrent?.size || m.nominalSize || 0), 0);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalMonitored: monitored.length,
        activeSeeding: activeSeedingCount,
        downloading: downloadingCount,
        totalDonatedBytes,
        totalStoredBytes,
      },
      distros: monitored,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
