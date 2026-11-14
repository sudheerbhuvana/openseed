"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { formatBytes } from "@/lib/utils";
import { getDistroLogo } from "@/lib/metadata";
import { resolveDistroStatus, type DistroStatus } from "@/lib/status";
import { StatusBadge } from "@/components/status-badge";
import type { QBitTorrent } from "@/lib/qbittorrent";
import type { GluetunStatus } from "@/lib/gluetun";
import {
  Upload,
  Plus,
  Trash2,
  Pause,
  Play,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  DownloadCloud,
  ArrowDownToLine,
  ArrowUpToLine,
  Layers,
  Activity,
  HardDrive,
  Database,
  ShieldCheck,
  History,
  Clock,
  FileText,
  Check,
  Network,
  LogOut,
  ShieldAlert,
} from "lucide-react";

interface UpstreamRelease {
  id: string;
  name: string;
  category: string;
  description: string;
  architecture?: "amd64" | "arm64";
  torrentUrl: string;
  versionName: string;
  isSeeded: boolean;
  status?: string;
  progress?: number;
}

interface LogItem {
  id?: number;
  distroId: string;
  status: "success" | "error" | "warning" | "info";
  eventType?: "auto_add" | "prune" | "checksum_sync" | "manual_add" | "safety_valve" | "general";
  message: string;
  createdAt: string;
}

interface StatsSummary {
  totalUploadedBytes?: number;
  globalRatio?: number;
  freeSpaceBytes?: number;
  totalPeerConnections?: number;
  currentUploadRateBytes?: number;
  currentDownloadRateBytes?: number;
  totalTorrents?: number;
  activeSeeding?: number;
}

export default function AdminPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isInitialDataLoading, setIsInitialDataLoading] = useState(false);
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [torrents, setTorrents] = useState<QBitTorrent[]>([]);
  const [statsSummary, setStatsSummary] = useState<StatsSummary | null>(null);
  const [releases, setReleases] = useState<UpstreamRelease[]>([]);
  const [checkingReleases, setCheckingReleases] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [dbCount, setDbCount] = useState<number | null>(null);
  const [dbSyncing, setDbSyncing] = useState(false);
  const [gluetun, setGluetun] = useState<GluetunStatus | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [logFilter, setLogFilter] = useState<string>("all");
  const [fetchingLogs, setFetchingLogs] = useState(false);

  // Form states
  const [urls, setUrls] = useState("");
  const [category, setCategory] = useState("Linux Distros");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchTorrents = async () => {
    try {
      const res = await fetch("/api/stats?live=true");
      if (res.ok) {
        const data = await res.json();
        setTorrents(data.torrents || []);
        setStatsSummary(data.summary || null);
      }
    } catch (err) {
      console.error("Failed to load torrents:", err);
    }
  };

  const fetchUpstreamReleases = async () => {
    setCheckingReleases(true);
    try {
      const res = await fetch("/api/releases");
      if (res.ok) {
        const json = await res.json();
        setReleases(json.releases || []);
      }
    } catch (err) {
      console.error("Failed to check upstream releases:", err);
    } finally {
      setCheckingReleases(false);
    }
  };

  const fetchGluetun = async () => {
    try {
      const res = await fetch("/api/admin");
      if (res.ok) {
        const json = await res.json();
        if (json.gluetun) setGluetun(json.gluetun);
      }
    } catch (err) {
      console.error("Failed to fetch Gluetun status:", err);
    }
  };

  const fetchDbStatus = async () => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "db-status" }),
      });
      if (res.ok) {
        const json = await res.json();
        setDbCount(json.count);
      }
    } catch (err) {
      console.error("Failed to fetch SQLite status:", err);
    }
  };

  const fetchLogs = async () => {
    setFetchingLogs(true);
    try {
      const res = await fetch("/api/logs?limit=50");
      if (res.ok) {
        const json = await res.json();
        setLogs(json.logs || []);
      }
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setFetchingLogs(false);
    }
  };

  const loadAllClusterData = async () => {
    setIsInitialDataLoading(true);
    try {
      await Promise.allSettled([
        fetchTorrents(),
        fetchGluetun(),
        fetchUpstreamReleases(),
        fetchDbStatus(),
        fetchLogs(),
      ]);
    } finally {
      setIsInitialDataLoading(false);
    }
  };

  // Initial authentication check on load (using HttpOnly cookie or Cloudflare header)
  useEffect(() => {
    fetch("/api/admin", { method: "GET" })
      .then(async (res) => {
        if (res.ok) {
          const json = await res.json();
          if (json.authenticated) {
            setAuthed(true);
            if (json.email) setUserEmail(json.email);
            if (json.gluetun) setGluetun(json.gluetun);
            loadAllClusterData();
          } else {
            setAuthed(false);
          }
        } else {
          setAuthed(false);
        }
      })
      .catch((err) => {
        console.error("Failed to check admin status:", err);
        setAuthed(false);
      })
      .finally(() => {
        setIsCheckingAuth(false);
      });
  }, []);

  // Periodic background refresh for active torrents
  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(fetchTorrents, 6000);
    return () => clearInterval(interval);
  }, [authed]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setSubmittingAuth(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", password }),
      });

      const json = await res.json();

      if (res.ok && json.authenticated) {
        setAuthed(true);
        if (json.email) setUserEmail(json.email);
        setPassword("");
        loadAllClusterData();
      } else {
        setAuthError(json.error || "Authentication failed");
      }
    } catch {
      setAuthError("Network connection error. Unable to verify credentials.");
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch {
      // Ignore
    } finally {
      setAuthed(false);
      setUserEmail(null);
      setTorrents([]);
      setStatsSummary(null);
      setGluetun(null);
      setReleases([]);
      setLogs([]);
    }
  };

  const handleSyncDb = async () => {
    setDbSyncing(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "db-sync" }),
      });
      if (res.ok) {
        const json = await res.json();
        const count = typeof json.count === "number" ? json.count : (Array.isArray(json.count) ? json.count.length : 0);
        setDbCount(count);
        setStatusMsg({ text: `Successfully synced ${count} distro images into SQLite with live upstream hashes.` });
      } else {
        const json = await res.json();
        setStatusMsg({ text: json.error || "Failed to sync database", error: true });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Network error", error: true });
    } finally {
      setDbSyncing(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    try {
      const formData = new FormData();
      if (file) formData.append("file", file);
      if (urls) formData.append("urls", urls);
      formData.append("category", category);

      const res = await fetch("/api/admin", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setStatusMsg({ text: "Distribution added to OpenSeed queue!" });
        setUrls("");
        setFile(null);
        fetchTorrents();
        fetchUpstreamReleases();
        fetchDbStatus();
        fetchLogs();
      } else {
        const json = await res.json();
        setStatusMsg({ text: json.error || "Failed to add", error: true });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Network error", error: true });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "pause" | "resume" | "delete", hash: string, deleteFiles = false) => {
    try {
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, hash, deleteFiles }),
      });
      fetchTorrents();
      fetchUpstreamReleases();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeedRelease = async (release: UpstreamRelease) => {
    setStatusMsg(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          urls: release.torrentUrl,
          category: release.category,
          tags: "openseed,upstream-release",
        }),
      });
      if (res.ok) {
        setStatusMsg({ text: `Started seeding ${release.name} (${release.versionName})` });
        fetchTorrents();
        fetchUpstreamReleases();
        fetchLogs();
      } else {
        const json = await res.json();
        setStatusMsg({ text: json.error || "Failed to start seeding", error: true });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Error seeding release", error: true });
    }
  };

  const activeTheme = mounted ? resolvedTheme : "dark";

  // 1. Initial Auth Check Loader (prevents form or dashboard flickering)
  if (isCheckingAuth) {
    return (
      <div className="max-w-md mx-auto my-24 p-8 bg-card border border-border rounded-2xl shadow-xl flex flex-col items-center justify-center text-center gap-4 animate-in fade-in duration-300">
        <div className="size-13 bg-secondary text-foreground rounded-2xl flex items-center justify-center border border-border shadow-xs">
          <Lock className="size-5 text-zinc-400 animate-pulse" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Verifying Node Security...</h2>
          <p className="text-xs text-zinc-500 mt-1">Checking session credentials and cluster privileges</p>
        </div>
        <div className="w-40 h-1.5 bg-secondary rounded-full overflow-hidden mt-2">
          <div className="bg-foreground h-full rounded-full animate-pulse w-3/4" />
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Login Screen with Rate-Limit Awareness
  if (!authed) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-card border border-border rounded-2xl shadow-xl space-y-6 animate-in fade-in duration-300">
        <div className="text-center space-y-2">
          <div className="size-13 bg-secondary text-foreground rounded-2xl flex items-center justify-center mx-auto border border-border shadow-xs">
            <Lock className="size-5 text-zinc-400" />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Admin Gateway</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Enter your secure admin password to manage the OpenSeed cluster
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submittingAuth}
              autoFocus
              className="w-full bg-secondary/80 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-foreground transition"
            />
          </div>

          <button
            type="submit"
            disabled={submittingAuth || !password}
            className="w-full bg-foreground hover:opacity-90 disabled:opacity-50 text-background font-bold py-2.5 rounded-xl transition text-sm shadow-sm active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
          >
            {submittingAuth ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                <span>Verifying Authorization...</span>
              </>
            ) : (
              <span>Unlock Node</span>
            )}
          </button>
        </form>

        {authError && (
          <div className="text-xs p-3.5 rounded-xl border font-medium bg-red-500/10 text-red-500 border-red-500/20 flex items-start gap-2.5">
            <ShieldAlert className="size-4 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        <div className="text-center">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
            Protected by HMAC signed sessions & rate limiting
          </span>
        </div>
      </div>
    );
  }

  // 3. Full-Dashboard Loading State (replaces empty sections)
  if (isInitialDataLoading) {
    return (
      <div className="flex flex-col gap-8 w-full pb-20 animate-in fade-in duration-300">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-2">
            <div className="h-8 w-44 bg-secondary rounded-lg animate-pulse" />
            <div className="h-4 w-72 bg-secondary rounded-md animate-pulse" />
          </div>
          <div className="h-9 w-32 bg-secondary rounded-xl animate-pulse" />
        </div>

        {/* HUD Synchronizing Banner */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <RefreshCw className="size-5 text-foreground animate-spin" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Synchronizing Node Telemetry</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Querying live qBittorrent daemon, Gluetun WireGuard tunnel, and SQLite registry...
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-zinc-400">Daemon Handshake</span>
          </div>
        </div>

        {/* 4 Metric Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between gap-4">
              <div className="h-3 w-20 bg-secondary rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-7 w-28 bg-secondary rounded animate-pulse" />
                <div className="h-3.5 w-36 bg-secondary rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Tunnel Card Skeleton */}
        <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
          <div className="h-4 w-48 bg-secondary rounded animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-secondary/60 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden p-6 space-y-4">
          <div className="h-5 w-40 bg-secondary rounded animate-pulse" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-11 w-full bg-secondary/50 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 4. Fully Loaded Admin Dashboard
  const totalUploaded = torrents.reduce((acc, t) => acc + (t.uploaded || 0), 0);
  const totalSize = torrents.reduce((acc, t) => acc + (t.size || 0), 0);
  const activeDownloading = torrents.filter((t) => t.state.toLowerCase().includes("dl") || t.state.toLowerCase().includes("download")).length;
  const activeSeeding = torrents.filter((t) => t.state.toLowerCase().includes("seed") || t.state.toLowerCase().includes("upload") || t.state.toLowerCase() === "stalledup").length;

  return (
    <div className="flex flex-col gap-8 w-full pb-20 animate-in fade-in duration-200">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Node Manager
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2 flex-wrap">
            <span>qBittorrent via Gluetun</span>
            <span className="text-zinc-400">•</span>
            {userEmail ? (
              <span>Cloudflare Zero Trust: <strong className="text-foreground font-mono">{userEmail}</strong></span>
            ) : (
              <span>Authenticated Admin Session</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleSyncDb}
            disabled={dbSyncing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Database className="size-3.5 text-purple-500" />
            <span>{dbSyncing ? "Syncing Upstreams..." : "Resync Upstreams"}</span>
          </button>

          <button
            type="button"
            onClick={loadAllClusterData}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            title="Sign out and destroy session"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-red-500 transition px-3 py-2 rounded-xl hover:bg-secondary cursor-pointer border border-border/60"
          >
            <LogOut className="size-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs sm:text-sm font-medium ${
            statusMsg.error
              ? "bg-red-500/10 text-red-500 border-red-500/20"
              : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          }`}
        >
          {statusMsg.error ? <AlertCircle className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between gap-3">
          <div className="text-[11px] uppercase font-bold text-zinc-500 tracking-wider">
            Total Stored
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {formatBytes(totalSize)}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {torrents.length} ISOs • {formatBytes(statsSummary?.freeSpaceBytes || 0)} free
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between gap-3">
          <div className="text-[11px] uppercase font-bold text-zinc-500 tracking-wider">
            Lifetime Contributed
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {formatBytes(statsSummary?.totalUploadedBytes ?? totalUploaded)}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Monotonic cluster upload
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between gap-3">
          <div className="text-[11px] uppercase font-bold text-zinc-500 tracking-wider">
            Live Swarm
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-500 tracking-tight flex items-baseline gap-2">
              <span>{activeSeeding}</span>
              <span className="text-sm font-semibold text-zinc-400">Seeding</span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {activeDownloading} downloading • {statsSummary?.totalPeerConnections || 0} peers
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between gap-3">
          <div className="text-[11px] uppercase font-bold text-zinc-500 tracking-wider">
            Live Throughput
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-baseline gap-1">
              <span className="text-emerald-500 text-lg">↑</span>
              <span>{formatBytes(statsSummary?.currentUploadRateBytes || 0)}/s</span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              ↓ {formatBytes(statsSummary?.currentDownloadRateBytes || 0)}/s inbound
            </div>
          </div>
        </div>
      </div>

      {/* 3. Gluetun WireGuard Tunnel Telemetry */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-secondary flex items-center justify-center">
              <Network className="size-4.5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Gluetun WireGuard Tunnel</h2>
              <p className="text-xs text-zinc-500">VPN egress interface & inbound port status</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`size-2.5 rounded-full ${gluetun?.status === "running" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span className="text-xs font-semibold capitalize text-foreground">{gluetun?.status || "Checking..."}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/60">
            <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">External Egress IP</div>
            <div className="text-sm font-mono font-bold text-foreground mt-1 truncate" title={gluetun?.publicIp || "Resolving..."}>
              {gluetun?.publicIp || "Resolving..."}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/60">
            <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">VPN Tunnel</div>
            <div className="text-sm font-mono font-bold text-foreground mt-1 uppercase">
              {gluetun?.vpnType || "WireGuard"}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/60">
            <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">DHT Nodes</div>
            <div className="text-sm font-bold text-emerald-500 mt-1">
              {gluetun?.dhtNodes ?? 0}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/60">
            <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Seeding Port</div>
            <div className="text-sm font-mono font-bold text-foreground mt-1">
              {gluetun?.seedingPort || "51413"} (Inbound)
            </div>
          </div>
        </div>
      </div>

      {/* 4. Active Torrents Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="p-5 sm:p-6 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Active Torrents</h2>
            <p className="text-xs text-zinc-500">Live distributions being seeded in qBittorrent</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-secondary text-foreground">
            {torrents.length} Distributions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 border-b border-border text-[11px] uppercase tracking-wider font-bold text-zinc-500">
              <tr>
                <th className="py-3.5 px-5">Name</th>
                <th className="py-3.5 px-5">Size</th>
                <th className="py-3.5 px-5">Contributed</th>
                <th className="py-3.5 px-5">Ratio</th>
                <th className="py-3.5 px-5">State</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {torrents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-medium">
                    No torrents active in cluster.
                  </td>
                </tr>
              ) : (
                torrents.map((t) => {
                  const status = resolveDistroStatus(t);
                  return (
                    <tr key={t.hash} className="hover:bg-secondary/40 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-foreground max-w-xs truncate" title={t.name}>
                        {t.name}
                      </td>
                      <td className="py-3.5 px-5 text-zinc-600 dark:text-zinc-300 font-medium">
                        {formatBytes(t.size)}
                      </td>
                      <td className="py-3.5 px-5 text-foreground font-semibold">
                        {formatBytes(t.uploaded)}
                      </td>
                      <td className="py-3.5 px-5 text-zinc-600 dark:text-zinc-300 font-medium">
                        {t.ratio.toFixed(2)}x
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex flex-col gap-1.5">
                          <StatusBadge status={status} progress={t.progress} />
                          {t.progress > 0 && t.progress < 1 && (
                            <div className="w-24">
                              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mb-1">
                                <span>{formatBytes(t.dlspeed)}/s</span>
                                <span>{(t.progress * 100).toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
                                <div
                                  className="bg-blue-500 h-full rounded-full"
                                  style={{ width: `${Math.max(4, t.progress * 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.state.toLowerCase().includes("pause") ? (
                            <button
                              type="button"
                              onClick={() => handleAction("resume", t.hash)}
                              title="Resume Seeding"
                              className="p-1.5 hover:bg-secondary rounded-lg text-emerald-500 transition cursor-pointer"
                            >
                              <Play className="size-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAction("pause", t.hash)}
                              title="Pause Seeding"
                              className="p-1.5 hover:bg-secondary rounded-lg text-amber-500 transition cursor-pointer"
                            >
                              <Pause className="size-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove ${t.name} and delete data from NVMe?`)) {
                                handleAction("delete", t.hash, true);
                              }
                            }}
                            title="Delete Torrent & Data"
                            className="p-1.5 hover:bg-secondary rounded-lg text-red-500 transition cursor-pointer"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Add New Distribution Form */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex items-center gap-3 border-b border-border pb-4 mb-4">
          <div className="size-9 rounded-xl bg-secondary flex items-center justify-center">
            <Plus className="size-4.5 text-foreground" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Add Distribution to Cluster</h2>
            <p className="text-xs text-zinc-500">Provide a .torrent file or paste magnet / direct HTTP URL</p>
          </div>
        </div>

        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              Torrent URL / Magnet Link
            </label>
            <input
              type="text"
              placeholder="magnet:?xt=urn:btih:... or https://.../image.iso.torrent"
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              className="w-full bg-secondary/60 border border-border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-zinc-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-secondary/60 border border-border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                Upload .torrent File
              </label>
              <input
                type="file"
                accept=".torrent"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-secondary file:text-foreground hover:file:bg-secondary/80"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-foreground text-background font-bold text-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Queueing..." : "Start Seeding"}
          </button>
        </form>
      </div>

      {/* 6. Upstream Release Monitor */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="p-5 sm:p-6 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Upstream Release Monitor</h2>
            <p className="text-xs text-zinc-500">Live RSS and upstream mirror feed tracking latest releases</p>
          </div>
          <button
            type="button"
            onClick={fetchUpstreamReleases}
            disabled={checkingReleases}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${checkingReleases ? "animate-spin" : ""}`} />
            <span>{checkingReleases ? "Checking upstream..." : "Check Upstream"}</span>
          </button>
        </div>

        <div className="divide-y divide-border">
          {releases.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              No upstream releases tracked currently. Click "Check Upstream" to query official mirrors.
            </div>
          ) : (
            releases.map((rel) => {
              const logo = getDistroLogo(rel.name, activeTheme || "dark");
              return (
                <div key={rel.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="size-10 rounded-xl bg-secondary flex items-center justify-center p-2 shrink-0 border border-border">
                      <img src={logo} alt={rel.name} className="size-6 object-contain" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground truncate">{rel.name}</span>
                        <span className="text-xs font-mono text-zinc-400">({rel.versionName})</span>
                        {rel.architecture && (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-secondary font-bold text-zinc-400">
                            {rel.architecture}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{rel.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    {rel.isSeeded ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-semibold">
                        <Check className="size-3.5" />
                        <span>Seeding Active</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSeedRelease(rel)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90 transition active:scale-95 cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                        <span>Seed This ISO</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 7. Automated Sync Logs */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="p-5 sm:p-6 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Automated Sync Logs</h2>
            <p className="text-xs text-zinc-500">Chronological history of automatic syncs, checks, and updates</p>
          </div>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={fetchingLogs}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${fetchingLogs ? "animate-spin" : ""}`} />
            <span>{fetchingLogs ? "Loading..." : "Refresh Logs"}</span>
          </button>
        </div>

        <div className="divide-y divide-border max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              No recent automated sync logs recorded yet.
            </div>
          ) : (
            logs.map((item, idx) => (
              <div key={item.id || idx} className="p-4 flex items-start gap-3 text-xs hover:bg-secondary/20 transition-colors">
                <span className={`size-2 rounded-full mt-1.5 shrink-0 ${
                  item.status === "success" ? "bg-emerald-500" :
                  item.status === "error" ? "bg-red-500" :
                  item.status === "warning" ? "bg-amber-500" : "bg-blue-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                      {item.eventType || "system"}
                    </span>
                    <span className="text-zinc-500 font-mono text-[11px]">
                      {new Date(item.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-zinc-400 mt-0.5 break-words">{item.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
