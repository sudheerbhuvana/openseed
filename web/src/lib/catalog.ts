import type { QBitTorrent } from "./qbittorrent";

export interface CatalogItem {
  id: string;
  name: string;
  category: "linux" | "hypervisor" | "security";
  version: string;
  architecture: "x86_64" | "amd64" | "arm64";
  nominalSize: number;
  releaseDate?: string;
  officialMagnet: string;
  officialUrl: string;
  targetFileName?: string;
  description?: string;
}

export interface DynamicDistroDisplay {
  title: string;
  versionSubtitle: string;
  fileName: string;
  releaseDate: string;
  sizeBytes: number;
  magnetUri: string;
  detectedVersion?: string;
}

export const CURATED_SEED_CATALOG: CatalogItem[] = [
  {
    id: "ubuntu-2404-desktop",
    name: "Ubuntu 24.04 LTS Desktop",
    category: "linux",
    version: "Noble Numbat • Desktop 64-bit",
    architecture: "x86_64",
    nominalSize: 6250332160,
    releaseDate: "LTS Track",
    officialMagnet: "https://releases.ubuntu.com/noble/",
    officialUrl: "https://releases.ubuntu.com/noble/",
    targetFileName: "ubuntu-24.04-desktop-amd64.iso",
    description: "Official Canonical Ubuntu Desktop LTS with GNOME and long-term security support through 2029.",
  },
  {
    id: "ubuntu-2404-server",
    name: "Ubuntu 24.04 LTS Server",
    category: "linux",
    version: "Noble Numbat • Live Server 64-bit",
    architecture: "x86_64",
    nominalSize: 2831155200,
    releaseDate: "LTS Track",
    officialMagnet: "https://releases.ubuntu.com/noble/",
    officialUrl: "https://releases.ubuntu.com/noble/",
    targetFileName: "ubuntu-24.04-live-server-amd64.iso",
    description: "Enterprise container, cloud, and bare-metal server foundation with subiquity automated installer.",
  },
  {
    id: "ubuntu-2404-server-arm64",
    name: "Ubuntu 24.04 LTS Server (ARM64)",
    category: "linux",
    version: "Noble Numbat • ARM64 Live Server",
    architecture: "arm64",
    nominalSize: 3120000000,
    releaseDate: "LTS Track",
    officialMagnet: "https://cdimage.ubuntu.com/releases/noble/release/",
    officialUrl: "https://ubuntu.com/download/server/arm",
    targetFileName: "ubuntu-24.04-live-server-arm64.iso",
    description: "Canonical certified 64-bit ARM server image optimized for Ampere Altra, Apple Silicon virtualization, and ARM64 servers.",
  },
  {
    id: "ubuntu-2604-desktop",
    name: "Ubuntu 26.04 Desktop",
    category: "linux",
    version: "Resolute Daily • amd64 Live",
    architecture: "x86_64",
    nominalSize: 6482409472,
    releaseDate: "Daily Rolling",
    officialMagnet: "https://cdimage.ubuntu.com/daily-live/current/resolute-desktop-amd64.iso.torrent",
    officialUrl: "https://cdimage.ubuntu.com/daily-live/current/",
    targetFileName: "ubuntu-26.04-desktop-amd64.iso",
    description: "Daily automated desktop snapshot testing next-generation kernel and system packages.",
  },
  {
    id: "ubuntu-2604-server",
    name: "Ubuntu 26.04 Server",
    category: "linux",
    version: "Resolute Daily • Server amd64",
    architecture: "x86_64",
    nominalSize: 3120000000,
    releaseDate: "Daily Rolling",
    officialMagnet: "https://cdimage.ubuntu.com/ubuntu-server/daily-live/current/resolute-live-server-amd64.iso.torrent",
    officialUrl: "https://cdimage.ubuntu.com/daily-live/current/",
    targetFileName: "ubuntu-26.04-live-server-amd64.iso",
    description: "Automated daily build for testing upstream cloud-init, Linux kernel development, and systemd releases.",
  },
  {
    id: "ubuntu-2604-server-arm64",
    name: "Ubuntu 26.04 Server (ARM64)",
    category: "linux",
    version: "Resolute Daily • ARM64 Server",
    architecture: "arm64",
    nominalSize: 2850000000,
    releaseDate: "Daily Rolling",
    officialMagnet: "https://cdimage.ubuntu.com/ubuntu/releases/resolute/release/ubuntu-26.04.1-live-server-arm64.iso.torrent",
    officialUrl: "https://cdimage.ubuntu.com/ubuntu/releases/resolute/release/",
    targetFileName: "ubuntu-26.04-live-server-arm64.iso",
    description: "Daily automated ARM64 server builds for automated testing on 64-bit ARM hardware and cloud instances.",
  },
  {
    id: "debian-13-netinst",
    name: "Debian Testing Netinst",
    category: "linux",
    version: "Trixie • Minimal Network Installer",
    architecture: "amd64",
    nominalSize: 792723456,
    releaseDate: "Testing Track",
    officialMagnet: "http://cdimage.debian.org/debian-cd/current/amd64/bt-cd/",
    officialUrl: "https://www.debian.org/CD/torrent-cd/",
    targetFileName: "debian-13-amd64-netinst.iso",
    description: "Minimal network installer for universal Debian operating system with debian-installer and apt repos.",
  },
  {
    id: "debian-13-netinst-arm64",
    name: "Debian Testing Netinst (ARM64)",
    category: "linux",
    version: "Trixie • ARM64 Network Installer",
    architecture: "arm64",
    nominalSize: 760000000,
    releaseDate: "Testing Track",
    officialMagnet: "http://cdimage.debian.org/debian-cd/current/arm64/bt-cd/",
    officialUrl: "https://www.debian.org/CD/torrent-cd/",
    targetFileName: "debian-13-arm64-netinst.iso",
    description: "Official 64-bit ARM network installer for Debian Trixie supporting ARMv8-A servers and single-board computers.",
  },
  {
    id: "arch-linux-current",
    name: "Arch Linux",
    category: "linux",
    version: "Rolling Release • Monthly Snapshot",
    architecture: "x86_64",
    nominalSize: 1180000000,
    releaseDate: "Monthly Rolling",
    officialMagnet: "https://archlinux.org/download/",
    officialUrl: "https://archlinux.org/download/",
    targetFileName: "archlinux-x86_64.iso",
    description: "Lightweight and flexible rolling Linux distribution with Pacman, systemd, and cutting-edge software.",
  },
  {
    id: "fedora-workstation",
    name: "Fedora Workstation",
    category: "linux",
    version: "Workstation Live • Leading Edge",
    architecture: "x86_64",
    nominalSize: 2540000000,
    releaseDate: "Stable Release",
    officialMagnet: "https://torrent.fedoraproject.org/",
    officialUrl: "https://fedoraproject.org/workstation/download",
    targetFileName: "Fedora-Workstation-Live-x86_64.iso",
    description: "Leading-edge developer and workstation platform featuring GNOME, Wayland, and DNF5 package management.",
  },
  {
    id: "linux-mint",
    name: "Linux Mint",
    category: "linux",
    version: "Cinnamon Edition • Desktop",
    architecture: "amd64",
    nominalSize: 3010000000,
    releaseDate: "LTS Channel",
    officialMagnet: "https://www.linuxmint.com/download.php",
    officialUrl: "https://www.linuxmint.com/download.php",
    targetFileName: "linuxmint-cinnamon-64bit.iso",
    description: "Modern, polished desktop Linux distribution built on Ubuntu LTS foundation with Cinnamon desktop.",
  },
  {
    id: "kali-linux",
    name: "Kali Linux",
    category: "security",
    version: "Installer Live • Security Auditing",
    architecture: "amd64",
    nominalSize: 4320000000,
    releaseDate: "Quarterly Rolling",
    officialMagnet: "https://cdimage.kali.org/current/",
    officialUrl: "https://www.kali.org/get-kali/",
    targetFileName: "kali-linux-installer-amd64.iso",
    description: "The premier advanced penetration testing and security auditing Linux distribution maintained by OffSec.",
  },
  {
    id: "proxmox-ve",
    name: "Proxmox VE",
    category: "hypervisor",
    version: "Virtual Environment (x86_64)",
    architecture: "x86_64",
    nominalSize: 1420000000,
    releaseDate: "Enterprise Track",
    officialMagnet: "https://www.proxmox.com/en/downloads/proxmox-virtual-environment/iso",
    officialUrl: "https://www.proxmox.com/en/downloads/proxmox-virtual-environment/iso",
    targetFileName: "proxmox-ve.iso",
    description: "Complete open-source enterprise virtualization platform combining KVM hypervisor and LXC containers.",
  },
  {
    id: "proxmox-ve-arm64",
    name: "Proxmox VE (ARM64)",
    category: "hypervisor",
    version: "Virtual Environment (ARM64)",
    architecture: "arm64",
    nominalSize: 1508000000,
    releaseDate: "Enterprise Track",
    officialMagnet: "https://www.proxmox.com/en/downloads/proxmox-virtual-environment/iso",
    officialUrl: "https://www.proxmox.com/en/downloads/proxmox-virtual-environment/iso",
    targetFileName: "proxmox-ve-arm64.iso",
    description: "Native 64-bit ARM enterprise virtualization stack for ARM-based servers and enterprise clusters.",
  },
  {
    id: "proxmox-pbs",
    name: "Proxmox Backup Server",
    category: "hypervisor",
    version: "PBS • Enterprise Deduplicating Backup",
    architecture: "x86_64",
    nominalSize: 1280000000,
    releaseDate: "Enterprise Track",
    officialMagnet: "https://www.proxmox.com/en/downloads/proxmox-backup-server/iso",
    officialUrl: "https://www.proxmox.com/en/downloads/proxmox-backup-server/iso",
    targetFileName: "proxmox-backup-server.iso",
    description: "Enterprise deduplicating backup solution supporting incremental, verified, and encrypted backups for VMs.",
  },
  {
    id: "proxmox-pdm",
    name: "Proxmox Datacenter Manager",
    category: "hypervisor",
    version: "PDM • Multi-Cluster Central UI",
    architecture: "x86_64",
    nominalSize: 1100000000,
    releaseDate: "Enterprise Track",
    officialMagnet: "https://www.proxmox.com/en/downloads/proxmox-datacenter-manager",
    officialUrl: "https://www.proxmox.com/en/downloads/proxmox-datacenter-manager",
    targetFileName: "proxmox-datacenter-manager.iso",
    description: "Centralized multi-cluster management and monitoring interface across distributed Proxmox VE and PBS installations.",
  },
];

export function resolveDynamicDistroDisplay(
  item: CatalogItem,
  torrent?: QBitTorrent | null,
  dbRecord?: { fileName?: string; releaseDate?: string; version?: string } | null
): DynamicDistroDisplay {
  const fileName = torrent?.name || dbRecord?.fileName || item.targetFileName || `${item.id}.iso`;
  
  // Extract dynamic version tag from fileName if possible (e.g. 24.04.5 or 2026.11.01 or 9.2-1 or 13.7.0)
  let detectedVersion: string | undefined = undefined;
  const vMatch = fileName.match(/(\d+\.\d+(?:\.\d+)?(?:-\d+)?|\d{4}\.\d{2}\.\d{2})/);
  if (vMatch) {
    detectedVersion = vMatch[1];
  }

  let versionSubtitle = item.version;
  if (detectedVersion && !item.version.includes(detectedVersion)) {
    versionSubtitle = `${detectedVersion} • ${item.version}`;
  }

  return {
    title: item.name,
    versionSubtitle,
    fileName,
    releaseDate: dbRecord?.releaseDate || item.releaseDate || "Current Upstream",
    sizeBytes: torrent?.size || item.nominalSize,
    magnetUri: torrent?.magnet_uri || item.officialMagnet,
    detectedVersion,
  };
}

export function matchTorrentToCatalog(catalogItem: CatalogItem, torrents: QBitTorrent[]): QBitTorrent | undefined {
  const id = catalogItem.id.toLowerCase();
  const isArm64 = catalogItem.architecture === "arm64";

  return torrents.find((t) => {
    const tName = t.name.toLowerCase();
    const tIsArm64 = tName.includes("arm64") || tName.includes("aarch64");
    if (isArm64 !== tIsArm64) return false;

    if (id === "ubuntu-2404-desktop") {
      return tName.includes("ubuntu") && /24\.04(?:\.\d+)?/.test(tName) && tName.includes("desktop");
    }
    if (id === "ubuntu-2404-server" || id === "ubuntu-2404-server-arm64") {
      return tName.includes("ubuntu") && /24\.04(?:\.\d+)?/.test(tName) && tName.includes("server");
    }
    if (id === "ubuntu-2604-desktop") {
      return tName.includes("ubuntu") && /26\.04(?:\.\d+)?/.test(tName) && tName.includes("desktop");
    }
    if (id === "ubuntu-2604-server" || id === "ubuntu-2604-server-arm64") {
      return tName.includes("ubuntu") && /26\.04(?:\.\d+)?/.test(tName) && tName.includes("server");
    }
    if (id === "debian-13-netinst" || id === "debian-13-netinst-arm64") {
      return tName.includes("debian") && (tName.includes("netinst") || /13(?:\.\d+)?/.test(tName));
    }
    if (id === "arch-linux-current") {
      return tName.includes("arch");
    }
    if (id.includes("fedora")) {
      return tName.includes("fedora");
    }
    if (id.includes("mint")) {
      return tName.includes("mint");
    }
    if (id.includes("kali")) {
      return tName.includes("kali");
    }
    if (id.includes("proxmox-ve")) {
      return tName.includes("proxmox-ve") || tName.includes("pve");
    }
    if (id.includes("proxmox-pbs") || id.includes("backup")) {
      return tName.includes("proxmox-backup") || tName.includes("pbs");
    }
    if (id.includes("proxmox-pdm") || id.includes("datacenter")) {
      return tName.includes("datacenter") || tName.includes("pdm");
    }

    return false;
  });
}
