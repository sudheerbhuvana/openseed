export interface DistroSource {
  id: string;
  name: string;
  category: "Linux Distros" | "Security" | "Hypervisor / Infrastructure";
  description: string;
  architecture: "amd64" | "arm64";
  feedUrl: string;
  type: "canonical-html" | "arch-api" | "debian-http" | "fedora-torrents" | "mint-torrents" | "kali-http" | "proxmox-html";
}

export const MONITORED_DISTROS: DistroSource[] = [
  // 1. Ubuntu (Scrapes official alternative-downloads portal)
  {
    id: "ubuntu-server",
    name: "Ubuntu Server (amd64)",
    category: "Linux Distros",
    description: "Official Ubuntu Server LTS Releases (Intel/AMD 64-bit)",
    architecture: "amd64",
    feedUrl: "https://ubuntu.com/download/alternative-downloads",
    type: "canonical-html",
  },
  {
    id: "ubuntu-server-arm64",
    name: "Ubuntu Server (arm64)",
    category: "Linux Distros",
    description: "Official Ubuntu Server LTS Releases (ARM 64-bit)",
    architecture: "arm64",
    feedUrl: "https://ubuntu.com/download/alternative-downloads",
    type: "canonical-html",
  },
  {
    id: "ubuntu-desktop",
    name: "Ubuntu Desktop (amd64)",
    category: "Linux Distros",
    description: "Official Ubuntu Desktop Releases (Intel/AMD 64-bit)",
    architecture: "amd64",
    feedUrl: "https://ubuntu.com/download/alternative-downloads",
    type: "canonical-html",
  },
  {
    id: "ubuntu-desktop-arm64",
    name: "Ubuntu Desktop (arm64)",
    category: "Linux Distros",
    description: "Official Ubuntu Desktop Releases (ARM 64-bit)",
    architecture: "arm64",
    feedUrl: "https://ubuntu.com/download/alternative-downloads",
    type: "canonical-html",
  },

  // 2. Debian (Scrapes current Debian CD directory over HTTP; cdimage.debian.org drops port 443)
  {
    id: "debian",
    name: "Debian GNU/Linux (amd64)",
    category: "Linux Distros",
    description: "Official Debian CD Images (amd64)",
    architecture: "amd64",
    feedUrl: "http://cdimage.debian.org/debian-cd/current/amd64/bt-cd/",
    type: "debian-http",
  },
  {
    id: "debian-arm64",
    name: "Debian GNU/Linux (arm64)",
    category: "Linux Distros",
    description: "Official Debian CD Images (arm64)",
    architecture: "arm64",
    feedUrl: "http://cdimage.debian.org/debian-cd/current/arm64/bt-cd/",
    type: "debian-http",
  },

  // 3. Fedora (Scrapes Fedora's live torrent index)
  {
    id: "fedora",
    name: "Fedora Linux",
    category: "Linux Distros",
    description: "Official Fedora Workstation & Server Releases",
    architecture: "amd64",
    feedUrl: "https://torrent.fedoraproject.org/torrents/",
    type: "fedora-torrents",
  },

  // 4. Linux Mint (Scrapes Mint's live download portal)
  {
    id: "linux-mint",
    name: "Linux Mint",
    category: "Linux Distros",
    description: "Official Linux Mint Releases",
    architecture: "amd64",
    feedUrl: "https://www.linuxmint.com/download.php",
    type: "mint-torrents",
  },

  // 5. Arch Linux (Official JSON API - gives all historic & current monthly ISOs)
  {
    id: "arch-linux",
    name: "Arch Linux",
    category: "Linux Distros",
    description: "Arch Linux Monthly Rolling Releases",
    architecture: "amd64",
    feedUrl: "https://archlinux.org/releng/releases/json/",
    type: "arch-api",
  },

  // 6. Kali Linux (Scrapes current OffSec Kali mirror)
  {
    id: "kali-linux",
    name: "Kali Linux",
    category: "Security",
    description: "Kali Linux Quarterly Releases",
    architecture: "amd64",
    feedUrl: "https://cdimage.kali.org/current/",
    type: "kali-http",
  },

  // 7. Proxmox VE (x86_64 and arm64)
  {
    id: "proxmox-ve",
    name: "Proxmox VE (amd64)",
    category: "Hypervisor / Infrastructure",
    description: "Proxmox Virtual Environment Installers (x86_64)",
    architecture: "amd64",
    feedUrl: "https://www.proxmox.com/en/downloads/proxmox-virtual-environment/iso",
    type: "proxmox-html",
  },
  {
    id: "proxmox-ve-arm64",
    name: "Proxmox VE (arm64)",
    category: "Hypervisor / Infrastructure",
    description: "Proxmox Virtual Environment Installers (ARM64)",
    architecture: "arm64",
    feedUrl: "https://www.proxmox.com/en/downloads/proxmox-virtual-environment/iso",
    type: "proxmox-html",
  },

  // 8. Proxmox Backup Server (PBS)
  {
    id: "proxmox-pbs",
    name: "Proxmox Backup Server (PBS)",
    category: "Hypervisor / Infrastructure",
    description: "Proxmox Backup Server Installers",
    architecture: "amd64",
    feedUrl: "https://www.proxmox.com/en/downloads/proxmox-backup-server/iso",
    type: "proxmox-html",
  },

  // 9. Proxmox Datacenter Manager (PDM)
  {
    id: "proxmox-pdm",
    name: "Proxmox Datacenter Manager (PDM)",
    category: "Hypervisor / Infrastructure",
    description: "Proxmox Datacenter Manager Installers",
    architecture: "amd64",
    feedUrl: "https://www.proxmox.com/en/downloads/proxmox-datacenter-manager",
    type: "proxmox-html",
  },
];
