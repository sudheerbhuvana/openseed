import "./network";
import { qbit } from "./qbittorrent";
import { type LiveDistroVerification } from "./types";
export type { LiveDistroVerification } from "./types";
import { CURATED_SEED_CATALOG } from "./catalog";
import {
  getDistroImage,
  upsertDistroImage,
  logSync,
  getAllDistroImages,
  getSyncLogs,
  type DistroImageRecord,
  type SyncLogRecord,
} from "./db";

export interface DistroUpstreamConfig {
  id: string;
  name: string;
  version: string;
  architecture: "x86_64" | "amd64" | "arm64";
  fileNamePattern: RegExp;
  targetFileName: string;
  checksumSourceType: "arch-json" | "sha256sums-file" | "proxmox-html" | "fedora-checksum" | "alpine-sha256";
  checksumFileUrl: string;
  gpgSignatureUrl?: string;
  releaseNotesUrl: string;
  installGuideUrl: string;
  upstreamUrl: string;
  defaultReleaseDate?: string;
}


export const DISTRO_CONFIGS: Record<string, DistroUpstreamConfig> = {
  "ubuntu-2404-desktop": {
    id: "ubuntu-2404-desktop",
    name: "Ubuntu 24.04 LTS Desktop",
    version: "24.04 LTS (Noble Numbat)",
    architecture: "x86_64",
    fileNamePattern: /([a-f0-9]{64})\s+\*?(ubuntu-24\.04(?:\.[0-9]+)?-desktop-amd64\.iso)/i,
    targetFileName: "ubuntu-24.04-desktop-amd64.iso",
    checksumSourceType: "sha256sums-file",
    checksumFileUrl: "https://releases.ubuntu.com/noble/SHA256SUMS",
    gpgSignatureUrl: "https://releases.ubuntu.com/noble/SHA256SUMS.gpg",
    releaseNotesUrl: "https://discourse.ubuntu.com/t/noble-numbat-release-notes/39890",
    installGuideUrl: "https://ubuntu.com/tutorials/install-ubuntu-desktop",
    upstreamUrl: "https://releases.ubuntu.com/noble/",
    defaultReleaseDate: "August 2024",
  },
  "ubuntu-2404-server": {
    id: "ubuntu-2404-server",
    name: "Ubuntu 24.04 LTS Server",
    version: "24.04 LTS (Noble Numbat)",
    architecture: "x86_64",
    fileNamePattern: /([a-f0-9]{64})\s+\*?(ubuntu-24\.04(?:\.[0-9]+)?-live-server-amd64\.iso)/i,
    targetFileName: "ubuntu-24.04-live-server-amd64.iso",
    checksumSourceType: "sha256sums-file",
    checksumFileUrl: "https://releases.ubuntu.com/noble/SHA256SUMS",
    gpgSignatureUrl: "https://releases.ubuntu.com/noble/SHA256SUMS.gpg",
    releaseNotesUrl: "https://discourse.ubuntu.com/t/noble-numbat-release-notes/39890",
    installGuideUrl: "https://documentation.ubuntu.com/server/how-to/installation/",
    upstreamUrl: "https://releases.ubuntu.com/noble/",
    defaultReleaseDate: "August 2024",
  },
  "ubuntu-2404-server-arm64": {
    id: "ubuntu-2404-server-arm64",
    name: "Ubuntu 24.04 Server (ARM64)",
    version: "24.04 LTS ARM64",
    architecture: "arm64",
    fileNamePattern: /([a-f0-9]{64})\s+\*?(ubuntu-24\.04(?:\.[0-9]+)?-live-server-arm64\.iso)/i,
    targetFileName: "ubuntu-24.04-live-server-arm64.iso",
    checksumSourceType: "sha256sums-file",
    checksumFileUrl: "https://cdimage.ubuntu.com/releases/noble/release/SHA256SUMS",
    gpgSignatureUrl: "https://cdimage.ubuntu.com/releases/noble/release/SHA256SUMS.gpg",
    releaseNotesUrl: "https://discourse.ubuntu.com/t/noble-numbat-release-notes/39890",
    installGuideUrl: "https://ubuntu.com/download/server/arm",
    upstreamUrl: "https://cdimage.ubuntu.com/releases/noble/release/",
    defaultReleaseDate: "August 2024",
  },
  "ubuntu-2604-desktop": {
    id: "ubuntu-2604-desktop",
    name: "Ubuntu 26.04 Desktop (Daily)",
    version: "26.04 (Resolute Daily)",
    architecture: "x86_64",
    fileNamePattern: /([a-f0-9]{64})\s+\*?(ubuntu-26\.04(?:\.[0-9]+)?-desktop-amd64\.iso)/i,
    targetFileName: "ubuntu-26.04-desktop-amd64.iso",
    checksumSourceType: "sha256sums-file",
    checksumFileUrl: "https://releases.ubuntu.com/26.04/SHA256SUMS",
    gpgSignatureUrl: "https://releases.ubuntu.com/26.04/SHA256SUMS.gpg",
    releaseNotesUrl: "https://discourse.ubuntu.com/",
    installGuideUrl: "https://ubuntu.com/tutorials/install-ubuntu-desktop",
    upstreamUrl: "https://releases.ubuntu.com/26.04/",
    defaultReleaseDate: "Daily Rolling",
  },
  "ubuntu-2604-server": {
    id: "ubuntu-2604-server",
    name: "Ubuntu 26.04 Server (Daily)",
    version: "26.04 (Resolute Daily)",
    architecture: "x86_64",
    fileNamePattern: /([a-f0-9]{64})\s+\*?(ubuntu-26\.04(?:\.[0-9]+)?-live-server-amd64\.iso)/i,
    targetFileName: "ubuntu-26.04-live-server-amd64.iso",
    checksumSourceType: "sha256sums-file",
    checksumFileUrl: "https://releases.ubuntu.com/26.04/SHA256SUMS",
    gpgSignatureUrl: "https://releases.ubuntu.com/26.04/SHA256SUMS.gpg",
    releaseNotesUrl: "https://discourse.ubuntu.com/",
    installGuideUrl: "https://documentation.ubuntu.com/server/how-to/installation/",
    upstreamUrl: "https://releases.ubuntu.com/26.04/",
    defaultReleaseDate: "Daily Rolling",
  },
  "ubuntu-2604-server-arm64": {
    id: "ubuntu-2604-server-arm64",
    name: "Ubuntu 26.04 Server (ARM64)",
    version: "26.04 ARM64 Daily",
    architecture: "arm64",
    fileNamePattern: /([a-f0-9]{64})\s+\*?(ubuntu-26\.04(?:\.[0-9]+)?-live-server-arm64\.iso)/i,
    targetFileName: "ubuntu-26.04-live-server-arm64.iso",
    checksumSourceType: "sha256sums-file",
    checksumFileUrl: "https://cdimage.ubuntu.com/ubuntu/releases/resolute/release/SHA256SUMS",
    gpgSignatureUrl: "https://cdimage.ubuntu.com/ubuntu/releases/resolute/release/SHA256SUMS.gpg",
    releaseNotesUrl: "https://discourse.ubuntu.com/",
    installGuideUrl: "https://ubuntu.com/download/server/arm",
    upstreamUrl: "https://cdimage.ubuntu.com/ubuntu/releases/resolute/release/",
    defaultReleaseDate: "Daily Rolling",
  },
  "debian-13-netinst": {
    id: "debian-13-netinst",
    name: "Debian 13 (Trixie) Netinst",
    version: "13.x Netinst Testing",
    architecture: "amd64",
    fileNamePattern: /([a-f0-9]{64})\s+(debian-[0-9\.]+-amd64-netinst\.iso)/i,
    targetFileName: "debian-13.7.0-amd64-netinst.iso",
    checksumSourceType: "sha256sums-file",
    checksumFileUrl: "http://cdimage.debian.org/debian-cd/current/amd64/bt-cd/SHA256SUMS",
    gpgSignatureUrl: "http://cdimage.debian.org/debian-cd/current/amd64/bt-cd/SHA256SUMS.sign",
    releaseNotesUrl: "https://www.debian.org/releases/trixie/",
    installGuideUrl: "https://www.debian.org/releases/stable/installmanual",
    upstreamUrl: "https://www.debian.org/CD/torrent-cd/",
    defaultReleaseDate: "Latest Stable Point Release",
  },
  "debian-13-netinst-arm64": {
    id: "debian-13-netinst-arm64",
    name: "Debian 13 Netinst (ARM64)",
    version: "13.x Netinst ARM64",
    architecture: "arm64",
    fileNamePattern: /([a-f0-9]{64})\s+(debian-[0-9\.]+-arm64-netinst\.iso)/i,
    targetFileName: "debian-13.7.0-arm64-netinst.iso",
    checksumSourceType: "sha256sums-file",
    checksumFileUrl: "http://cdimage.debian.org/debian-cd/current/arm64/bt-cd/SHA256SUMS",
    gpgSignatureUrl: "http://cdimage.debian.org/debian-cd/current/arm64/bt-cd/SHA256SUMS.sign",
    releaseNotesUrl: "https://www.debian.org/releases/trixie/",
    installGuideUrl: "https://www.debian.org/releases/stable/installmanual",
    upstreamUrl: "http://cdimage.debian.org/debian-cd/current/arm64/bt-cd/",
    defaultReleaseDate: "Latest Stable Point Release",
  },
  "arch-linux-current": {
    id: "arch-linux-current",
    name: "Arch Linux",
    version: "Monthly Rolling Release",
    architecture: "x86_64",
    fileNamePattern: /archlinux-[0-9\.]+-x86_64\.iso/,
    targetFileName: "archlinux-x86_64.iso",
    checksumSourceType: "arch-json",
    checksumFileUrl: "https://archlinux.org/releng/releases/json/",
    gpgSignatureUrl: "https://archlinux.org/download/",
    releaseNotesUrl: "https://archlinux.org/releng/releases/",
    installGuideUrl: "https://wiki.archlinux.org/title/Installation_guide",
    upstreamUrl: "https://archlinux.org/download/",
    defaultReleaseDate: "Monthly Rolling",
  },
  "fedora-41-workstation": {
    id: "fedora-41-workstation",
    name: "Fedora 41",
    version: "Workstation 41 Live",
    architecture: "x86_64",
    fileNamePattern: /SHA256\s*\((Fedora-Workstation-Live-x86_64-41[^\)]*\.iso)\)\s*=\s*([a-f0-9]{64})/i,
    targetFileName: "Fedora-Workstation-Live-x86_64-41-1.4.iso",
    checksumSourceType: "fedora-checksum",
    checksumFileUrl: "https://download.fedoraproject.org/pub/fedora/linux/releases/41/Workstation/x86_64/iso/Fedora-Workstation-41-1.4-x86_64-CHECKSUM",
    gpgSignatureUrl: "https://fedoraproject.org/security/",
    releaseNotesUrl: "https://docs.fedoraproject.org/en-US/fedora/f41/release-notes/",
    installGuideUrl: "https://docs.fedoraproject.org/en-US/quick-docs/creating-and-using-a-live-installation-image/",
    upstreamUrl: "https://fedoraproject.org/workstation/download",
    defaultReleaseDate: "October 2024",
  },
  "proxmox-ve-92": {
    id: "proxmox-ve-92",
    name: "Proxmox VE 9.2",
    version: "PVE 9.2-1 (x86_64)",
    architecture: "x86_64",
    fileNamePattern: /proxmox-ve_9\.2-1\.iso/,
    targetFileName: "proxmox-ve_9.2-1.iso",
    checksumSourceType: "proxmox-html",
    checksumFileUrl: "https://www.proxmox.com/en/downloads/proxmox-virtual-environment/iso",
    releaseNotesUrl: "https://pve.proxmox.com/wiki/Roadmap",
    installGuideUrl: "https://pve.proxmox.com/pve-docs/pve-admin-guide.html#_installation",
    upstreamUrl: "https://www.proxmox.com/en/downloads/proxmox-virtual-environment/iso",
    defaultReleaseDate: "2026 Release Branch",
  },
  "proxmox-ve-92-arm64": {
    id: "proxmox-ve-92-arm64",
    name: "Proxmox VE 9.2 (ARM64)",
    version: "PVE 9.2-1 (ARM64)",
    architecture: "arm64",
    fileNamePattern: /proxmox-ve_9\.2-1-arm64\.iso/,
    targetFileName: "proxmox-ve_9.2-1-arm64.iso",
    checksumSourceType: "proxmox-html",
    checksumFileUrl: "https://www.proxmox.com/en/downloads/proxmox-virtual-environment/iso",
    releaseNotesUrl: "https://pve.proxmox.com/wiki/Roadmap",
    installGuideUrl: "https://pve.proxmox.com/pve-docs/pve-admin-guide.html#_installation",
    upstreamUrl: "https://www.proxmox.com/en/downloads/proxmox-virtual-environment/iso",
    defaultReleaseDate: "2026 ARM64 Port",
  },
  "proxmox-pbs-42": {
    id: "proxmox-pbs-42",
    name: "Proxmox Backup Server",
    version: "PBS 4.2-1",
    architecture: "x86_64",
    fileNamePattern: /proxmox-backup-server_4\.2-1\.iso/,
    targetFileName: "proxmox-backup-server_4.2-1.iso",
    checksumSourceType: "proxmox-html",
    checksumFileUrl: "https://www.proxmox.com/en/downloads/proxmox-backup-server/iso",
    releaseNotesUrl: "https://pbs.proxmox.com/wiki/index.php/Roadmap",
    installGuideUrl: "https://pbs.proxmox.com/docs/installation.html",
    upstreamUrl: "https://www.proxmox.com/en/downloads/proxmox-backup-server/iso",
    defaultReleaseDate: "2026 Release",
  },
  "proxmox-pdm-11": {
    id: "proxmox-pdm-11",
    name: "Proxmox Datacenter Manager",
    version: "PDM 1.1-1",
    architecture: "x86_64",
    fileNamePattern: /proxmox-datacenter-manager_1\.1-1\.iso/,
    targetFileName: "proxmox-datacenter-manager_1.1-1.iso",
    checksumSourceType: "proxmox-html",
    checksumFileUrl: "https://www.proxmox.com/en/downloads/proxmox-datacenter-manager",
    releaseNotesUrl: "https://forum.proxmox.com/threads/proxmox-datacenter-manager.160000/",
    installGuideUrl: "https://www.proxmox.com/en/proxmox-datacenter-manager",
    upstreamUrl: "https://www.proxmox.com/en/downloads/proxmox-datacenter-manager",
    defaultReleaseDate: "2026 Initial Release",
  },
  "alpine-linux": {
    id: "alpine-linux",
    name: "Alpine Linux 3.20",
    version: "3.20.3 Standard",
    architecture: "x86_64",
    fileNamePattern: /([a-f0-9]{64})\s+(alpine-standard-[0-9\.]+-x86_64\.iso)/i,
    targetFileName: "alpine-standard-3.20.3-x86_64.iso",
    checksumSourceType: "alpine-sha256",
    checksumFileUrl: "https://dl-cdn.alpinelinux.org/alpine/v3.20/releases/x86_64/alpine-standard-3.20.3-x86_64.iso.sha256",
    releaseNotesUrl: "https://alpinelinux.org/posts/Alpine-3.20.0-released.html",
    installGuideUrl: "https://wiki.alpinelinux.org/wiki/Installation",
    upstreamUrl: "https://alpinelinux.org/downloads/",
    defaultReleaseDate: "May 2024",
  },
  "kali-linux-2024": {
    id: "kali-linux-2024",
    name: "Kali Linux",
    version: "Quarterly Rolling Release",
    architecture: "amd64",
    fileNamePattern: /([a-f0-9]{64})\s+\*?(kali-linux-[0-9\.]+-installer-amd64\.iso)/i,
    targetFileName: "kali-linux-2026.3-installer-amd64.iso",
    checksumSourceType: "sha256sums-file",
    checksumFileUrl: "https://cdimage.kali.org/current/SHA256SUMS",
    gpgSignatureUrl: "https://cdimage.kali.org/current/SHA256SUMS.gpg",
    releaseNotesUrl: "https://www.kali.org/blog/",
    installGuideUrl: "https://www.kali.org/docs/installation/",
    upstreamUrl: "https://www.kali.org/get-kali/",
    defaultReleaseDate: "Quarterly Rolling",
  },
  "linux-mint-22": {
    id: "linux-mint-22",
    name: "Linux Mint 22",
    version: "22 (Wilma)",
    architecture: "amd64",
    fileNamePattern: /([a-f0-9]{64})\s+\*?(linuxmint-22[^\s]*cinnamon-64bit\.iso)/i,
    targetFileName: "linuxmint-22-cinnamon-64bit.iso",
    checksumSourceType: "sha256sums-file",
    checksumFileUrl: "https://mirrors.kernel.org/linuxmint/stable/22/sha256sum.txt",
    gpgSignatureUrl: "https://mirrors.kernel.org/linuxmint/stable/22/sha256sum.txt.gpg",
    releaseNotesUrl: "https://blog.linuxmint.com/?p=4731",
    installGuideUrl: "https://linuxmint-installation-guide.readthedocs.io/",
    upstreamUrl: "https://linuxmint.com/download.php",
    defaultReleaseDate: "July 2024",
  },
};

// Aliases for historical / track IDs
DISTRO_CONFIGS["proxmox-ve-8"] = DISTRO_CONFIGS["proxmox-ve-92"];
DISTRO_CONFIGS["proxmox-ve-8-arm64"] = DISTRO_CONFIGS["proxmox-ve-92-arm64"];
DISTRO_CONFIGS["proxmox-pbs"] = DISTRO_CONFIGS["proxmox-pbs-42"];
DISTRO_CONFIGS["proxmox-pdm"] = DISTRO_CONFIGS["proxmox-pdm-11"];

export async function resolveLiveDistroVerification(
  id: string,
  forceRefresh: boolean = false,
  cachedTorrents?: any[]
): Promise<LiveDistroVerification | null> {
  let config = DISTRO_CONFIGS[id];
  if (!config) {
    const catalogItem = CURATED_SEED_CATALOG.find(
      (c) =>
        c.id === id ||
        c.id.replace(/[-_]/g, "").includes(id.replace(/[-_]/g, "")) ||
        id.replace(/[-_]/g, "").includes(c.id.replace(/[-_]/g, ""))
    );
    if (catalogItem) {
      config = {
        id: catalogItem.id,
        name: catalogItem.name,
        version: catalogItem.version,
        architecture: (catalogItem.architecture === "arm64" ? "arm64" : "x86_64") as any,
        fileNamePattern: new RegExp(catalogItem.targetFileName || ".*\\.iso"),
        targetFileName: catalogItem.targetFileName || `${catalogItem.id}.iso`,
        checksumSourceType: "sha256sums-file",
        checksumFileUrl: catalogItem.officialUrl,
        releaseNotesUrl: catalogItem.officialUrl,
        installGuideUrl: catalogItem.officialUrl,
        upstreamUrl: catalogItem.officialUrl,
        defaultReleaseDate: catalogItem.releaseDate || "Active Track",
      };
    }
  }
  if (!config) return null;

  const now = Date.now();

  // 1. Check SQLite persistent cache first (valid for 1 hour unless forceRefresh is true)
  if (!forceRefresh) {
    const existing = getDistroImage(id);
    if (existing && existing.checksumValue && existing.lastSyncedAt) {
      const syncedTime = new Date(existing.lastSyncedAt).getTime();
      if (now - syncedTime < 3600 * 1000) {
        return {
          id: existing.id,
          name: existing.name,
          version: existing.version,
          architecture: existing.architecture,
          releaseDate: existing.releaseDate,
          fileName: existing.fileName,
          checksumType: existing.checksumType,
          checksumValue: existing.checksumValue,
          checksumFileUrl: existing.checksumFileUrl,
          gpgSignatureUrl: existing.gpgSignatureUrl,
          releaseNotesUrl: existing.releaseNotesUrl,
          installGuideUrl: existing.installGuideUrl,
          upstreamUrl: existing.upstreamUrl,
          bitTorrentInfoHash: existing.bitTorrentInfoHash,
          verifiedLiveAt: existing.lastSyncedAt,
          isDynamicUpstream: true,
        };
      }
    }
  }

  let liveHash = "";
  let liveReleaseDate = config.defaultReleaseDate || "Upstream Verified";
  let resolvedFileName = config.targetFileName;

  try {
    // 1. Arch Linux JSON API
    if (config.checksumSourceType === "arch-json") {
      const res = await fetch(config.checksumFileUrl, { next: { revalidate: 3600 } });
      if (res.ok) {
        const json = await res.json();
        const latest = json.releases?.[0];
        if (latest) {
          liveHash = latest.sha256_sum || latest.b2_sum || "";
          liveReleaseDate = latest.release_date || config.defaultReleaseDate || "";
          if (latest.file_name) resolvedFileName = latest.file_name;
        }
      }
    }
    // 2. Official SHA256SUMS text file (Ubuntu & Debian)
    else if (config.checksumSourceType === "sha256sums-file") {
      const res = await fetch(config.checksumFileUrl, {
        headers: { "User-Agent": "OpenSeed-Mirror/1.0" },
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const text = await res.text();
        const match = text.match(config.fileNamePattern);
        if (match) {
          liveHash = match[1];
          if (match[2]) resolvedFileName = match[2];
        }
      }
    }
    // 3. Proxmox Official HTML Scraper
    else if (config.checksumSourceType === "proxmox-html") {
      const res = await fetch(config.checksumFileUrl, {
        headers: { "User-Agent": "OpenSeed-Mirror/1.0" },
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const html = await res.text();
        // Look for the SHA256SUM dd code block
        const match = html.match(/SHA256SUM[\s\S]*?<code>([a-f0-9]{64})<\/code>/i);
        if (match) {
          liveHash = match[1];
        }
      }
    }
    // 4. Fedora CHECKSUM format
    else if (config.checksumSourceType === "fedora-checksum") {
      const res = await fetch(config.checksumFileUrl, { next: { revalidate: 3600 } });
      if (res.ok) {
        const text = await res.text();
        const match = text.match(config.fileNamePattern);
        if (match) {
          resolvedFileName = match[1];
          liveHash = match[2];
        }
      }
    }
    // 5. Alpine SHA256 file
    else if (config.checksumSourceType === "alpine-sha256") {
      const res = await fetch(config.checksumFileUrl, { next: { revalidate: 3600 } });
      if (res.ok) {
        const text = await res.text();
        const match = text.match(config.fileNamePattern);
        if (match) {
          liveHash = match[1];
          if (match[2]) resolvedFileName = match[2];
        }
      }
    }
  } catch (err) {
    console.error(`Failed to dynamically fetch checksum for ${id}:`, err);
  }

  // Cross-reference live torrent info-hash (BTIH) from qBittorrent daemon
  let liveBtih: string | undefined;
  try {
    const liveTorrents = cachedTorrents || (await qbit.getTorrents().catch(() => []));
    const matched = liveTorrents.find((t: any) =>
      t.name.toLowerCase().includes(resolvedFileName.toLowerCase().replace(".iso", ""))
    );
    if (matched) {
      liveBtih = matched.hash;
    }
  } catch {
    // optional telemetry cross-reference
  }

  const syncedAt = new Date().toISOString();

  const result: LiveDistroVerification = {
    id: config.id,
    name: config.name,
    version: config.version,
    architecture: config.architecture,
    releaseDate: liveReleaseDate,
    fileName: resolvedFileName,
    checksumType: "SHA-256",
    checksumValue: liveHash || "Resolving from canonical upstream...",
    checksumFileUrl: config.checksumFileUrl,
    gpgSignatureUrl: config.gpgSignatureUrl,
    releaseNotesUrl: config.releaseNotesUrl,
    installGuideUrl: config.installGuideUrl,
    upstreamUrl: config.upstreamUrl,
    bitTorrentInfoHash: liveBtih,
    verifiedLiveAt: syncedAt,
    isDynamicUpstream: Boolean(liveHash),
  };

  // Persist into SQLite Database
  if (liveHash) {
    try {
      upsertDistroImage({
        id: config.id,
        name: config.name,
        version: config.version,
        architecture: config.architecture,
        releaseDate: liveReleaseDate,
        fileName: resolvedFileName,
        checksumType: "SHA-256",
        checksumValue: liveHash,
        checksumFileUrl: config.checksumFileUrl,
        gpgSignatureUrl: config.gpgSignatureUrl,
        releaseNotesUrl: config.releaseNotesUrl,
        installGuideUrl: config.installGuideUrl,
        upstreamUrl: config.upstreamUrl,
        bitTorrentInfoHash: liveBtih,
        lastSyncedAt: syncedAt,
        isDynamicUpstream: true,
      });
      logSync(config.id, "success", `Persisted upstream checksum: ${liveHash.slice(0, 16)}...`, "checksum_sync");
    } catch (dbErr) {
      console.error(`Failed to persist ${config.id} in SQLite:`, dbErr);
    }
  }

  return result;
}

export async function syncAllDistrosToDatabase(): Promise<LiveDistroVerification[]> {
  const ids = Object.keys(DISTRO_CONFIGS);
  const results: LiveDistroVerification[] = [];
  const liveTorrents = await qbit.getTorrents().catch(() => []);

  for (const id of ids) {
    const res = await resolveLiveDistroVerification(id, true, liveTorrents);
    if (res) results.push(res);
  }

  return results;
}

