import "./network";

export interface QBitTorrent {
  hash: string;
  name: string;
  size: number;
  progress: number;
  state: string;
  num_seeds: number;
  num_leechs: number;
  num_complete: number;
  num_incomplete: number;
  ratio: number;
  uploaded: number;
  downloaded: number;
  upspeed: number;
  dlspeed: number;
  time_active: number;
  seeding_time: number;
  added_on: number;
  completion_on: number;
  category: string;
  tags: string;
  magnet_uri?: string;
}

export interface OpenSeedStats {
  torrents: QBitTorrent[];
  summary: {
    totalTorrents: number;
    activeSeeding: number;
    totalUploadedBytes: number;
    totalSizeStoredBytes: number;
    currentUploadRateBytes: number;
    averageRatio: number;
  };
}

class QBitClient {
  private cookie: string | null = null;
  private cookieExpiry: number = 0;

  private get baseUrl(): string {
    return process.env.QBIT_API_URL || "http://gluetun:8080";
  }

  private getHeaders(cookie: string, extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { ...extra };
    if (cookie && cookie !== "BYPASS") {
      headers["Cookie"] = cookie;
    }
    return headers;
  }

  private async authenticate(): Promise<string> {
    const now = Date.now();
    if (this.cookie && now < this.cookieExpiry) {
      return this.cookie;
    }

    // 1. First probe if qBittorrent API is accessible without authentication (subnet whitelist / local auth disabled)
    try {
      const probeRes = await fetch(`${this.baseUrl}/api/v2/app/version`, {
        cache: "no-store",
        signal: AbortSignal.timeout(2000),
      });
      if (probeRes.ok) {
        this.cookie = "BYPASS";
        this.cookieExpiry = now + 60 * 60 * 1000;
        return this.cookie;
      }
    } catch {
      // Continue to try login
    }

    const username = process.env.QBIT_USERNAME || "admin";
    const password = process.env.QBIT_PASSWORD || "adminadmin";

    const body = new URLSearchParams({ username, password });

    try {
      const res = await fetch(`${this.baseUrl}/api/v2/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: this.baseUrl,
        },
        body: body.toString(),
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });

      if (!res.ok) {
        console.warn(`[OpenSeed] qBittorrent login returned ${res.status} (${res.statusText}).`);
        this.cookie = null;
        return "";
      }

      const setCookie = res.headers.get("set-cookie");
      if (!setCookie) {
        this.cookie = "BYPASS";
        this.cookieExpiry = now + 60 * 60 * 1000;
        return this.cookie;
      }

      // Extract SID cookie
      const sidMatch = setCookie.match(/SID=([^;]+)/);
      this.cookie = sidMatch ? `SID=${sidMatch[1]}` : setCookie.split(";")[0];
      this.cookieExpiry = now + 60 * 60 * 1000; // 1 hour cache
      return this.cookie;
    } catch (err: any) {
      console.warn("[OpenSeed] qBittorrent login request error:", err?.message || err);
      this.cookie = null;
      return "";
    }
  }

  async getTorrents(): Promise<QBitTorrent[]> {
    try {
      const cookie = await this.authenticate();
      const res = await fetch(`${this.baseUrl}/api/v2/torrents/info`, {
        headers: this.getHeaders(cookie),
        cache: "no-store",
      });

      if (res.status === 403) {
        // Invalidate cached cookie and retry once
        this.cookie = null;
        const freshCookie = await this.authenticate();
        const retryRes = await fetch(`${this.baseUrl}/api/v2/torrents/info`, {
          headers: this.getHeaders(freshCookie),
          cache: "no-store",
        });
        if (!retryRes.ok) return [];
        return (await retryRes.json()) as QBitTorrent[];
      }

      if (!res.ok) return [];
      return (await res.json()) as QBitTorrent[];
    } catch (err) {
      console.error("Error fetching torrents from qBittorrent:", err);
      return [];
    }
  }

  async addTorrent(options: {
    urls?: string;
    file?: Blob;
    fileName?: string;
    category?: string;
    tags?: string;
  }): Promise<boolean> {
    const cookie = await this.authenticate();
    const formData = new FormData();

    if (options.urls && !options.file) {
      let finalUrl = options.urls.trim();
      if (finalUrl.startsWith("/")) {
        if (finalUrl.includes("releng") || finalUrl.includes("arch")) {
          finalUrl = `https://archlinux.org${finalUrl}`;
        } else if (finalUrl.includes("debian")) {
          finalUrl = `http://cdimage.debian.org${finalUrl}`;
        }
      }
      // Debian mirror pool drops HTTPS port 443; fallback to standard HTTP port 80
      if (finalUrl.includes("cdimage.debian.org") && finalUrl.startsWith("https://")) {
        finalUrl = finalUrl.replace("https://", "http://");
      }

      // If URL points to a remote .torrent file, fetch it directly in Node.js
      // and upload as binary Blob so qBittorrent doesn't fail on network/redirects
      if (
        (finalUrl.startsWith("http://") || finalUrl.startsWith("https://")) &&
        (finalUrl.includes(".torrent") || finalUrl.includes("/bt-cd/"))
      ) {
        try {
          const tRes = await fetch(finalUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) OpenSeed/1.0",
            },
          });
          if (tRes.ok) {
            const arrayBuffer = await tRes.arrayBuffer();
            const fileName = finalUrl.split("/").pop() || "distro.torrent";
            const blob = new Blob([arrayBuffer], { type: "application/x-bittorrent" });
            formData.append("torrents", blob, fileName);
          } else {
            formData.append("urls", finalUrl);
          }
        } catch (fetchErr) {
          console.warn("[OpenSeed] Pre-fetch .torrent failed, falling back to urls parameter:", fetchErr);
          formData.append("urls", finalUrl);
        }
      } else {
        formData.append("urls", finalUrl);
      }
    } else if (options.urls) {
      formData.append("urls", options.urls);
    }
    if (options.file) {
      formData.append("torrents", options.file, options.fileName || "distro.torrent");
    }
    formData.append("savepath", "/data/isos");
    formData.append("autoTMM", "false");
    formData.append("paused", "false");
    if (options.category) formData.append("category", options.category);
    if (options.tags) formData.append("tags", options.tags);

    const res = await fetch(`${this.baseUrl}/api/v2/torrents/add`, {
      method: "POST",
      headers: this.getHeaders(cookie),
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`qBittorrent add error (${res.status}):`, errText);
      return false;
    }

    const text = await res.text();
    if (text.includes('"failure_count":1') || text.trim() === "Fails.") {
      console.error("qBittorrent rejected torrent:", text);
      return false;
    }

    return true;
  }

  async pauseTorrent(hash: string): Promise<boolean> {
    const cookie = await this.authenticate();
    // Support modern qBittorrent /api/v2/torrents/stop with fallback to legacy /pause
    let res = await fetch(`${this.baseUrl}/api/v2/torrents/stop`, {
      method: "POST",
      headers: this.getHeaders(cookie, { "Content-Type": "application/x-www-form-urlencoded" }),
      body: new URLSearchParams({ hashes: hash }).toString(),
    });
    if (!res.ok) {
      res = await fetch(`${this.baseUrl}/api/v2/torrents/pause`, {
        method: "POST",
        headers: this.getHeaders(cookie, { "Content-Type": "application/x-www-form-urlencoded" }),
        body: new URLSearchParams({ hashes: hash }).toString(),
      });
    }
    return res.ok;
  }

  async resumeTorrent(hash: string): Promise<boolean> {
    const cookie = await this.authenticate();
    // Support modern qBittorrent /api/v2/torrents/start with fallback to legacy /resume
    let res = await fetch(`${this.baseUrl}/api/v2/torrents/start`, {
      method: "POST",
      headers: this.getHeaders(cookie, { "Content-Type": "application/x-www-form-urlencoded" }),
      body: new URLSearchParams({ hashes: hash }).toString(),
    });
    if (!res.ok) {
      res = await fetch(`${this.baseUrl}/api/v2/torrents/resume`, {
        method: "POST",
        headers: this.getHeaders(cookie, { "Content-Type": "application/x-www-form-urlencoded" }),
        body: new URLSearchParams({ hashes: hash }).toString(),
      });
    }
    return res.ok;
  }

  async deleteTorrent(hash: string, deleteFiles: boolean = false): Promise<boolean> {
    const cookie = await this.authenticate();
    const res = await fetch(`${this.baseUrl}/api/v2/torrents/delete`, {
      method: "POST",
      headers: this.getHeaders(cookie, { "Content-Type": "application/x-www-form-urlencoded" }),
      body: new URLSearchParams({
        hashes: hash,
        deleteFiles: deleteFiles ? "true" : "false",
      }).toString(),
    });
    return res.ok;
  }

  async exportTorrent(hash: string): Promise<ArrayBuffer | null> {
    try {
      const cookie = await this.authenticate();
      const res = await fetch(`${this.baseUrl}/api/v2/torrents/export?hash=${encodeURIComponent(hash)}`, {
        headers: this.getHeaders(cookie),
      });
      if (!res.ok) return null;
      return await res.arrayBuffer();
    } catch {
      return null;
    }
  }

  /**
   * Returns remaining disk space and total capacity for the ISO download directory
   */
  async getDiskSpace(): Promise<{ freeBytes: number; totalBytes: number; percentUsed: number }> {
    try {
      const cookie = await this.authenticate();
      // qBittorrent provides free space on download disk
      const [spaceRes, maindataRes] = await Promise.all([
        fetch(`${this.baseUrl}/api/v2/app/defaultSavePath`, { headers: this.getHeaders(cookie), cache: "no-store" }),
        fetch(`${this.baseUrl}/api/v2/sync/maindata`, { headers: this.getHeaders(cookie), cache: "no-store" }),
      ]);

      const maindata = maindataRes.ok ? await maindataRes.json() : {};
      const freeBytes = maindata?.server_state?.free_space_on_disk || 0;
      const totalSizeOfTorrents = (maindata?.server_state?.alltime_dl || 0);

      // Estimate total capacity based on free space and torrent sizes
      const estimatedTotal = freeBytes + totalSizeOfTorrents;
      const percentUsed = estimatedTotal > 0 ? ((estimatedTotal - freeBytes) / estimatedTotal) * 100 : 0;

      return {
        freeBytes,
        totalBytes: estimatedTotal,
        percentUsed: Math.min(Math.round(percentUsed), 100),
      };
    } catch {
      return { freeBytes: 0, totalBytes: 0, percentUsed: 0 };
    }
  }

  async getRawServerState(): Promise<any> {
    try {
      const cookie = await this.authenticate();
      const res = await fetch(`${this.baseUrl}/api/v2/sync/maindata`, {
        headers: this.getHeaders(cookie),
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.server_state || null;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves full server telemetry including monotonic all-time upload/download,
   * live transfer speeds, DHT nodes, and active peer connections.
   */
  async getServerState(): Promise<{
    alltimeUl: number;
    alltimeDl: number;
    sessionUl: number;
    sessionDl: number;
    upSpeed: number;
    dlSpeed: number;
    freeSpaceBytes: number;
    globalRatio: number;
    totalPeerConnections: number;
  }> {
    try {
      const cookie = await this.authenticate();
      const res = await fetch(`${this.baseUrl}/api/v2/sync/maindata`, {
        headers: this.getHeaders(cookie),
        cache: "no-store",
      });
      if (!res.ok) {
        return {
          alltimeUl: 0,
          alltimeDl: 0,
          sessionUl: 0,
          sessionDl: 0,
          upSpeed: 0,
          dlSpeed: 0,
          freeSpaceBytes: 0,
          globalRatio: 0,
          totalPeerConnections: 0,
        };
      }
      const data = await res.json();
      const s = data.server_state || {};
      return {
        alltimeUl: s.alltime_ul || 0,
        alltimeDl: s.alltime_dl || 0,
        sessionUl: s.up_info_data || 0,
        sessionDl: s.dl_info_data || 0,
        upSpeed: s.up_info_speed || 0,
        dlSpeed: s.dl_info_speed || 0,
        freeSpaceBytes: s.free_space_on_disk || 0,
        globalRatio: parseFloat(s.global_ratio || "0") || 0,
        totalPeerConnections: s.total_peer_connections || 0,
      };
    } catch {
      return {
        alltimeUl: 0,
        alltimeDl: 0,
        sessionUl: 0,
        sessionDl: 0,
        upSpeed: 0,
        dlSpeed: 0,
        freeSpaceBytes: 0,
        globalRatio: 0,
        totalPeerConnections: 0,
      };
    }
  }
}

export const qbit = new QBitClient();

