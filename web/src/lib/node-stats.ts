import { qbit, type QBitTorrent } from "@/lib/qbittorrent";
import {
  getNodeStatsSnapshot,
  saveNodeStatsSnapshot,
  syncTorrentUploadHistory,
} from "@/lib/db";

export const STATS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes (300 seconds)

function cleanMagnetUri(magnet?: string): string | undefined {
  if (!magnet) return magnet;
  // Strip redundant web seeds (ws=) to optimize telemetry payload size
  if (!magnet.includes("ws=")) return magnet;
  const parts = magnet.split("&");
  return parts.filter((p) => !p.startsWith("ws=")).join("&");
}

export function sanitizeTorrent(t: any): QBitTorrent {
  return {
    hash: t.hash,
    name: t.name,
    size: t.size || 0,
    progress: t.progress || 0,
    state: t.state || "",
    num_seeds: t.num_seeds || 0,
    num_leechs: t.num_leechs || 0,
    num_complete: t.num_complete || 0,
    num_incomplete: t.num_incomplete || 0,
    ratio: t.ratio || 0,
    uploaded: t.uploaded || 0,
    downloaded: t.downloaded || 0,
    upspeed: t.upspeed || 0,
    dlspeed: t.dlspeed || 0,
    time_active: t.time_active || 0,
    seeding_time: t.seeding_time || 0,
    added_on: t.added_on || 0,
    completion_on: t.completion_on || 0,
    category: t.category || "",
    tags: t.tags || "",
    magnet_uri: cleanMagnetUri(t.magnet_uri),
  };
}

export interface NodeStatsResult {
  torrents: QBitTorrent[];
  summary: {
    totalTorrents: number;
    activeSeeding: number;
    totalUploadedBytes: number;
    activeTorrentsUploadedBytes: number;
    sessionUploadedBytes: number;
    totalSizeStoredBytes: number;
    currentUploadRateBytes: number;
    currentDownloadRateBytes: number;
    averageRatio: number;
    globalRatio: number;
    totalPeerConnections: number;
    freeSpaceBytes: number;
    cached: boolean;
    cachedAt: number;
    nextRefreshInSeconds: number;
  };
}

let inFlightPromise: Promise<NodeStatsResult> | null = null;

export async function getNodeStats(forceLive = false): Promise<NodeStatsResult> {
  const now = Date.now();
  const snapshot = getNodeStatsSnapshot();
  const isStaleEmpty = snapshot && snapshot.summary.totalTorrents === 0;
  const effectiveTtl = isStaleEmpty ? 15000 : STATS_CACHE_TTL_MS;

  // If not forcing live and snapshot is fresh, return SQLite cache immediately
  if (!forceLive && snapshot && now - snapshot.updatedAt < effectiveTtl) {
    const ageSeconds = Math.floor((now - snapshot.updatedAt) / 1000);
    const nextRefreshInSeconds = Math.max(0, 300 - ageSeconds);

    return {
      torrents: (snapshot.torrents || []).map(sanitizeTorrent),
      summary: {
        ...snapshot.summary,
        cached: true,
        cachedAt: snapshot.updatedAt,
        nextRefreshInSeconds,
      },
    };
  }

  // Deduplicate concurrent requests (thundering herd protection)
  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      const [rawTorrents, serverState] = await Promise.all([
        qbit.getTorrents(),
        qbit.getServerState(),
      ]);

      const torrents = rawTorrents.map(sanitizeTorrent);

      let totalSizeStoredBytes = 0;
      let currentUploadRateBytes = 0;
      let currentDownloadRateBytes = 0;
      let activeSeeding = 0;
      let totalRatio = 0;

      for (const t of torrents) {
        totalSizeStoredBytes += t.size || 0;
        currentUploadRateBytes += t.upspeed || 0;
        currentDownloadRateBytes += t.dlspeed || 0;
        totalRatio += t.ratio || 0;
        if (
          t.state.toLowerCase().includes("upload") ||
          t.state.toLowerCase().includes("seed") ||
          t.state.toLowerCase() === "stalledup"
        ) {
          activeSeeding++;
        }
      }

      const { lifetimeUploadedBytes, activeUploadedBytes } = syncTorrentUploadHistory(torrents);
      const averageRatio = torrents.length > 0 ? totalRatio / torrents.length : 0;

      const summary = {
        totalTorrents: torrents.length,
        activeSeeding,
        totalUploadedBytes: lifetimeUploadedBytes,
        activeTorrentsUploadedBytes: activeUploadedBytes,
        sessionUploadedBytes: serverState.sessionUl || 0,
        totalSizeStoredBytes,
        currentUploadRateBytes: serverState.upSpeed || currentUploadRateBytes,
        currentDownloadRateBytes: serverState.dlSpeed || currentDownloadRateBytes,
        averageRatio,
        globalRatio: serverState.globalRatio || averageRatio,
        totalPeerConnections: serverState.totalPeerConnections || 0,
        freeSpaceBytes: serverState.freeSpaceBytes || 0,
      };

      // Persist snapshot into SQLite
      saveNodeStatsSnapshot(summary, torrents);

      return {
        torrents,
        summary: {
          ...summary,
          cached: false,
          cachedAt: Date.now(),
          nextRefreshInSeconds: 300,
        },
      };
    } catch (err) {
      console.warn("[OpenSeed] Failed to fetch live qBittorrent stats, falling back to SQLite snapshot:", err);
      if (snapshot) {
        return {
          torrents: (snapshot.torrents || []).map(sanitizeTorrent),
          summary: {
            ...snapshot.summary,
            cached: true,
            cachedAt: snapshot.updatedAt,
            nextRefreshInSeconds: 0,
          },
        };
      }
      throw err;
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

