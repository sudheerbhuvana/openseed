import "./network";
import { MONITORED_DISTROS, DistroSource } from "./distros";

export interface ResolvedRelease {
  id: string;
  name: string;
  category: string;
  description: string;
  architecture: "amd64" | "arm64";
  torrentUrl: string;
  versionName: string;
  detectedAt: string;
}

export async function resolveDistroReleases(source: DistroSource): Promise<ResolvedRelease[]> {
  const releases: ResolvedRelease[] = [];

  try {
    // 1. Arch Linux (API gives full array of historic monthly releases)
    // Curated: ONLY take the single latest monthly rolling ISO (no duplicate past months)
    if (source.type === "arch-api") {
      const res = await fetch(source.feedUrl, { next: { revalidate: 3600 } });
      if (!res.ok) return [];
      const json = await res.json();
      const latest = (json.releases || []).slice(0, 1);

      for (const rel of latest) {
        const fullTorrentUrl = rel.torrent_url?.startsWith("http")
          ? rel.torrent_url
          : `https://archlinux.org${rel.torrent_url}`;
        const urlToUse = rel.magnet_uri || fullTorrentUrl;

        releases.push({
          id: source.id,
          name: `${source.name} (${rel.version})`,
          category: source.category,
          description: source.description,
          architecture: source.architecture,
          torrentUrl: urlToUse,
          versionName: `archlinux-${rel.version}-x86_64.iso`,
          detectedAt: new Date().toISOString(),
        });
      }
      return releases;
    }

    // 2. Canonical Ubuntu (Parses official https://ubuntu.com/download/alternative-downloads)
    if (source.type === "canonical-html") {
      const pageRes = await fetch(source.feedUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) OpenSeed-Bot/1.0" },
        next: { revalidate: 3600 },
      });
      if (!pageRes.ok) return [];
      const pageHtml = await pageRes.text();

      // Extract official LTS releases from releases.ubuntu.com
      const torrentUrlMatches = Array.from(
        pageHtml.matchAll(/href="(https:\/\/(?:releases|cdimage)\.ubuntu\.com\/[^"]+\.torrent)"/gi)
      );
      const isServer = source.id.startsWith("ubuntu-server");
      const isArm64 = source.architecture === "arm64";
      const targetPattern = isServer
        ? (isArm64 ? /live-server-arm64\.iso\.torrent$/i : /live-server-amd64\.iso\.torrent$/i)
        : (isArm64 ? /desktop-arm64\.iso\.torrent$/i : /desktop-amd64\.iso\.torrent$/i);

      const seenUrls = new Set<string>();

      for (const match of torrentUrlMatches) {
        const url = match[1];
        if (targetPattern.test(url) && !seenUrls.has(url)) {
          seenUrls.add(url);
          const fileName = url.split("/").pop() || source.name;
          const verMatch = fileName.match(/ubuntu-(\d+\.\d+)/i);
          const verTag = verMatch ? verMatch[1] : "";
          const is2404 = verTag.startsWith("24");
          const ltsSuffix = is2404 ? " LTS" : "";
          const friendlyName = verTag
            ? source.name.replace("Ubuntu ", `Ubuntu ${verTag}${ltsSuffix} `)
            : source.name;
          const releaseId = verTag
            ? `${source.id}-${verTag.replace(".", "")}`
            : `${source.id}-${releases.length}`;

          releases.push({
            id: releaseId,
            name: friendlyName,
            category: source.category,
            description: is2404
              ? `Canonical long-term enterprise production release with multi-year security maintenance.`
              : source.description,
            architecture: source.architecture,
            torrentUrl: url,
            versionName: fileName.replace(".torrent", ""),
            detectedAt: new Date().toISOString(),
          });

          // Track both modern 26.04 release and active 24.04 LTS release
          if (releases.length >= 2) break;
        }
      }
      return releases;
    }

    // 3. Linux Mint (Discovers Cinnamon Edition from live portal)
    if (source.type === "mint-torrents") {
      const mintRes = await fetch(source.feedUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) OpenSeed-Bot/1.0" },
        next: { revalidate: 3600 },
      });
      if (!mintRes.ok) return [];
      const mintHtml = await mintRes.text();
      const cinnamonMatch =
        mintHtml.match(/href=["'](edition\.php\?id=\d+)["'][^>]*>[\s\S]*?Cinnamon/i) ||
        mintHtml.match(/Cinnamon[\s\S]*?href=["'](edition\.php\?id=\d+)["']/i);

      if (cinnamonMatch) {
        const edUrl = new URL(cinnamonMatch[1], source.feedUrl).toString();
        const edRes = await fetch(edUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) OpenSeed-Bot/1.0" },
          next: { revalidate: 3600 },
        });
        if (edRes.ok) {
          const edHtml = await edRes.text();
          const torrentMatch = edHtml.match(
            /href=["'](https?:\/\/[^"']+\/torrents\/linuxmint-[^"']+-cinnamon-64bit\.iso\.torrent)["']/i
          );
          if (torrentMatch) {
            const rawUrl = torrentMatch[1];
            const fileName = rawUrl.split("/").pop() || "linuxmint-cinnamon-64bit.iso";
            releases.push({
              id: source.id,
              name: source.name,
              category: source.category,
              description: source.description,
              architecture: source.architecture,
              torrentUrl: rawUrl,
              versionName: fileName.replace(".torrent", ""),
              detectedAt: new Date().toISOString(),
            });
            return releases;
          }
        }
      }
    }

    // 4. HTML Directory Scrapers (Debian, Fedora, Kali, Proxmox)
    const res = await fetch(source.feedUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) OpenSeed-Bot/1.0" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const html = await res.text();

    const torrentMatches = Array.from(html.matchAll(/href="([^"]+\.torrent)"/gi));
    const seenUrls = new Set<string>();

    // For Fedora torrent repository: sort numerically descending so highest version is selected first
    let rawUrls = torrentMatches.map((m) => {
      let u = m[1];
      return u.startsWith("http") ? u : new URL(u, source.feedUrl).toString();
    });

    if (source.type === "fedora-torrents") {
      rawUrls = rawUrls.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    }

    for (const rawUrl of rawUrls) {
      if (seenUrls.has(rawUrl)) continue;

      const lower = rawUrl.toLowerCase();
      let isRelevant = false;

      // Curation filter: Select standard installer ISO images only
      if (source.type === "debian-http") {
        // Standard netinst minimal installer images
        const isArm64 = source.architecture === "arm64";
        const archTarget = isArm64 ? "arm64-netinst.iso" : "amd64-netinst.iso";
        if (
          lower.includes("debian") &&
          lower.includes(archTarget) &&
          !lower.includes("edu") &&
          !lower.includes("mac")
        ) {
          isRelevant = true;
        }
      } else if (source.type === "fedora-torrents") {
        // Standard Workstation Live x86_64
        if (
          lower.includes("fedora-workstation-live-x86_64") &&
          !lower.includes("beta")
        ) {
          isRelevant = true;
        }
      } else if (source.type === "kali-http") {
        // Standard installer ISO images
        if (
          lower.includes("kali-linux") &&
          lower.includes("installer-amd64.iso") &&
          !lower.includes("everything") &&
          !lower.includes("hyperv") &&
          !lower.includes("wsl")
        ) {
          isRelevant = true;
        }
      } else if (source.type === "proxmox-html") {
        // Official Proxmox VE (x86_64 or arm64), PBS, or PDM release ISOs
        if (source.id === "proxmox-ve") {
          // Flagship x86_64 Proxmox VE installer (skip arm64)
          if (lower.includes("proxmox-ve") && !lower.includes("arm64") && lower.endsWith(".iso.torrent")) {
            isRelevant = true;
          }
        } else if (source.id === "proxmox-ve-arm64") {
          // Proxmox VE ARM64 installer
          if (lower.includes("proxmox-ve") && lower.includes("arm64") && lower.endsWith(".iso.torrent")) {
            isRelevant = true;
          }
        } else if (source.id === "proxmox-pbs") {
          if (lower.includes("proxmox-backup-server") && lower.endsWith(".iso.torrent")) {
            isRelevant = true;
          }
        } else if (source.id === "proxmox-pdm") {
          if (lower.includes("proxmox-datacenter-manager") && lower.endsWith(".iso.torrent")) {
            isRelevant = true;
          }
        }
      }

      if (isRelevant) {
        seenUrls.add(rawUrl);
        const fileName = rawUrl.split("/").pop() || source.name;
        const vName = fileName.replace(".torrent", "");
        const formattedVersionName = vName.endsWith(".iso") ? vName : `${vName}.iso`;
        releases.push({
          id: source.id,
          name: source.name,
          category: source.category,
          description: source.description,
          architecture: source.architecture,
          torrentUrl: rawUrl,
          versionName: formattedVersionName,
          detectedAt: new Date().toISOString(),
        });

        if (releases.length >= 1) break;
      }
    }

    return releases;
  } catch (err) {
    console.error(`Failed to dynamically resolve releases for ${source.name}:`, err);
    return [];
  }
}

export async function checkAllDistros(): Promise<ResolvedRelease[]> {
  const promises = MONITORED_DISTROS.map(resolveDistroReleases);
  const results = await Promise.all(promises);
  return results.flat();
}
