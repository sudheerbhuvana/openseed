import { NextResponse } from "next/server";
import { checkAllDistros } from "@/lib/tracker";
import { qbit, QBitTorrent } from "@/lib/qbittorrent";
import { syncAllDistrosToDatabase } from "@/lib/checksum-resolver";
import { logSync } from "@/lib/db";
import { timingSafeCompare } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_VERSIONS_PER_DISTRO = parseInt(process.env.MAX_VERSIONS_PER_DISTRO || "3", 10);
const MAX_DISK_PERCENT_LIMIT = parseInt(process.env.MAX_DISK_PERCENT_LIMIT || "90", 10);
const MIN_RATIO_BEFORE_PRUNE = parseFloat(process.env.MIN_RATIO_BEFORE_PRUNE || "1.0");

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET || process.env.ADMIN_PASSWORD || "admin123";

  let authorized = false;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    authorized = timingSafeCompare(token, expectedSecret);
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [availableReleases, existingTorrents, diskSpace] = await Promise.all([
      checkAllDistros(),
      qbit.getTorrents(),
      qbit.getDiskSpace(),
    ]);

    const existingNames = new Set(existingTorrents.map((t) => t.name.toLowerCase()));
    const addedList: string[] = [];
    const skippedList: string[] = [];
    const prunedList: string[] = [];

    // Safety Valve: Check if disk space exceeds threshold (e.g. 90%)
    const diskFull = diskSpace.freeBytes > 0 && diskSpace.percentUsed >= MAX_DISK_PERCENT_LIMIT;

    if (diskFull) {
      console.warn(
        `[OpenSeed Safety Valve] Disk is ${diskSpace.percentUsed}% full (Limit: ${MAX_DISK_PERCENT_LIMIT}%). Pausing additions until old releases are pruned.`
      );
      logSync(
        "system",
        "warning",
        `Safety valve: Storage is ${diskSpace.percentUsed}% full (Limit: ${MAX_DISK_PERCENT_LIMIT}%). Auto-add paused until old releases are pruned.`,
        "safety_valve"
      );
    }

    // Step 1: Add new releases if disk is NOT full
    if (!diskFull) {
      for (const rel of availableReleases) {
        const isAlreadySeeded = Array.from(existingNames).some(
          (name) => name.includes(rel.versionName.toLowerCase()) || rel.versionName.toLowerCase().includes(name)
        );

        if (!isAlreadySeeded && rel.torrentUrl) {
          console.log(`[OpenSeed Cron] New release detected: ${rel.name} (${rel.versionName}). Adding to seed queue...`);
          const success = await qbit.addTorrent({
            urls: rel.torrentUrl,
            category: rel.category,
            tags: `openseed,${rel.id}`,
          });

          if (success) {
            addedList.push(rel.name);
            logSync(
              rel.id,
              "success",
              `Auto-added new release to seed queue: ${rel.name} (${rel.versionName})`,
              "auto_add"
            );
          } else {
            logSync(
              rel.id,
              "error",
              `qBittorrent rejected auto-add for release: ${rel.name} (${rel.versionName})`,
              "auto_add"
            );
          }
        } else {
          skippedList.push(rel.name);
        }
      }
    }

    // Step 2: Dynamically sync upstream cryptographic hashes into SQLite database
    let dbSyncCount = 0;
    try {
      const synced = await syncAllDistrosToDatabase();
      dbSyncCount = synced.length;
    } catch (dbErr) {
      console.error("[OpenSeed Cron] Failed to sync distros to SQLite:", dbErr);
    }

    // Step 3: Prune old releases if count > MAX_VERSIONS_PER_DISTRO or if disk is under pressure
    const allTorrents = await qbit.getTorrents();
    const distroGroups: { [distroId: string]: QBitTorrent[] } = {};

    for (const t of allTorrents) {
      const tagsList = (t.tags || "").split(",").map((s) => s.trim().toLowerCase());
      let matchedDistroId = tagsList.find((tag) => tag !== "openseed" && tag.length > 0);

      if (!matchedDistroId) {
        const nameLower = t.name.toLowerCase();
        if (nameLower.includes("ubuntu")) matchedDistroId = "ubuntu";
        else if (nameLower.includes("debian")) matchedDistroId = "debian";
        else if (nameLower.includes("fedora")) matchedDistroId = "fedora";
        else if (nameLower.includes("arch")) matchedDistroId = "arch-linux";
        else if (nameLower.includes("mint")) matchedDistroId = "linux-mint";
        else if (nameLower.includes("kali")) matchedDistroId = "kali-linux";
        else if (nameLower.includes("proxmox") || nameLower.includes("pve")) matchedDistroId = "proxmox";
        else matchedDistroId = "other";
      }

      if (!distroGroups[matchedDistroId]) {
        distroGroups[matchedDistroId] = [];
      }
      distroGroups[matchedDistroId].push(t);
    }

    // Prune each group down to MAX_VERSIONS_PER_DISTRO (oldest first)
    // Intelligent gate: Only prune if it has hit target ratio (1.0x) OR if forced by disk space
    for (const [distroId, items] of Object.entries(distroGroups)) {
      if (items.length > MAX_VERSIONS_PER_DISTRO || diskFull) {
        // Sort newest first by added_on
        items.sort((a, b) => (b.added_on || 0) - (a.added_on || 0));

        // Excess items beyond the allowed version count
        const candidates = items.slice(MAX_VERSIONS_PER_DISTRO);

        for (const candidate of candidates) {
          const ratioMet = (candidate.ratio || 0) >= MIN_RATIO_BEFORE_PRUNE;

          // Prune if ratio target reached OR if disk space is critical
          if (ratioMet || diskFull) {
            console.log(
              `[OpenSeed Prune] Pruning old release: ${candidate.name} (Ratio: ${candidate.ratio}x, Disk: ${diskSpace.percentUsed}%)`
            );
            await qbit.deleteTorrent(candidate.hash, true);
            prunedList.push(`${distroId}: ${candidate.name} (${candidate.ratio.toFixed(2)}x)`);
            logSync(
              distroId,
              "info",
              `Pruned older release: ${candidate.name} (Ratio: ${candidate.ratio.toFixed(2)}x, Disk: ${diskSpace.percentUsed}%)`,
              "prune"
            );
          } else {
            console.log(
              `[OpenSeed Prune] Holding ${candidate.name} (Ratio ${candidate.ratio.toFixed(2)}x < ${MIN_RATIO_BEFORE_PRUNE}x) until ratio target met.`
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      diskStatus: {
        percentUsed: diskSpace.percentUsed,
        safetyValveTriggered: diskFull,
      },
      summary: {
        checked: availableReleases.length,
        sqliteSyncedCount: dbSyncCount,
        newlyAddedCount: addedList.length,
        newlyAdded: addedList,
        alreadySeeding: skippedList,
        maxVersionsLimit: MAX_VERSIONS_PER_DISTRO,
        prunedCount: prunedList.length,
        pruned: prunedList,
      },
    });
  } catch (err: any) {
    console.error("[OpenSeed Cron] Error during sync and prune:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
