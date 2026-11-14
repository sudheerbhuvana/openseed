import type { QBitTorrent } from "./qbittorrent";

export type DistroStatus =
  | "available"   // discovered, not downloaded.
  | "queued"      // queued in torrent client waiting to download.
  | "downloading" // downloading ISO.
  | "verifying"   // checking existing data.
  | "seeding"     // successfully seeding.
  | "inactive"    // no longer actively seeded.
  | "archived";   // retained metadata, files removed.

export const STATUS_LABELS: Record<DistroStatus, { label: string; description: string }> = {
  available: {
    label: "Available",
    description: "Discovered, not downloaded.",
  },
  queued: {
    label: "Queued",
    description: "Queued in seed client waiting to download.",
  },
  downloading: {
    label: "Downloading",
    description: "Downloading ISO chunks.",
  },
  verifying: {
    label: "Verifying",
    description: "Checking existing data integrity.",
  },
  seeding: {
    label: "Seeding",
    description: "Successfully seeding to the swarm.",
  },
  inactive: {
    label: "Inactive",
    description: "Paused or idle.",
  },
  archived: {
    label: "Archived",
    description: "Retained metadata, files removed.",
  },
};

/**
 * Resolves the official status from live qBittorrent torrent state
 */
export function resolveDistroStatus(
  torrent?: QBitTorrent | null,
  isArchived: boolean = false
): DistroStatus {
  if (isArchived) return "archived";
  if (!torrent) return "available";

  const raw = (torrent.state || "").toLowerCase();

  // 1. Verifying: checking existing data
  if (
    raw.includes("check") ||
    raw.includes("verif") ||
    raw === "moving" ||
    raw.includes("allocating")
  ) {
    return "verifying";
  }

  // 2. Inactive: paused, stopped, error, missing files
  if (
    raw.includes("pause") ||
    raw.includes("stop") ||
    raw.includes("error") ||
    raw.includes("missing")
  ) {
    return "inactive";
  }

  // 3. Seeding: 100% completed & uploading / stalledUP
  if (
    (raw.includes("upload") || raw.includes("seed") || raw === "stalledup" || raw === "queuedup") &&
    torrent.progress >= 1
  ) {
    return "seeding";
  }

  // 4. Queued: waiting in download queue
  if (raw === "queueddl" || raw.includes("queued") || (raw === "stalleddl" && torrent.progress === 0)) {
    return "queued";
  }

  // 5. Downloading: actively downloading ISO
  if (
    raw.includes("dl") ||
    raw.includes("download") ||
    raw.includes("meta") ||
    (torrent.progress > 0 && torrent.progress < 1)
  ) {
    return "downloading";
  }

  return "available";
}
