export interface DistroMeta {
  name: string;
  family: string;
  tagline: string;
  docsUrl: string;
}

export function getDistroLogo(name: string, theme: string = "dark"): string {
  const lower = name.toLowerCase();
  const isLight = theme === "light";

  if (lower.includes("backup server") || lower.includes("pbs")) {
    return isLight ? "/logos/proxmox-backup-server-light.svg" : "/logos/proxmox-backup-server-dark.svg";
  }
  if (lower.includes("proxmox") || lower.includes("pve") || lower.includes("pdm")) {
    return isLight ? "/logos/proxmox-light.svg" : "/logos/proxmox-dark.svg";
  }
  if (lower.includes("ubuntu")) return "/logos/ubuntu.svg";
  if (lower.includes("debian")) return "/logos/debian.svg";
  if (lower.includes("arch")) return "/logos/arch.svg";
  if (lower.includes("fedora")) return "/logos/fedora.svg";
  if (lower.includes("mint")) return "/logos/mint.svg";
  if (lower.includes("kali")) return "/logos/kali.svg";
  if (lower.includes("alpine")) return "/logos/alpine.svg";
  if (lower.includes("alma")) return "/logos/alma.svg";
  if (lower.includes("endeavour")) return "/logos/endeavouros.svg";

  return "/logos/ubuntu.svg";
}

export function getDistroMeta(name: string): DistroMeta {
  return {
    name,
    family: "Linux",
    tagline: "Official community distribution",
    docsUrl: "#",
  };
}
