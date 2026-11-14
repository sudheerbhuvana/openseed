"use client";

import { useEffect, useState, useMemo } from "react";
import { useTheme } from "next-themes";
import { formatBytes } from "@/lib/utils";
import { getDistroLogo } from "@/lib/metadata";
import { resolveDistroStatus, type DistroStatus } from "@/lib/status";
import { StatusBadge } from "@/components/status-badge";
import { VerifyModal } from "@/components/verify-modal";
import { copyToClipboard } from "@/lib/clipboard";
import type { OpenSeedStats } from "@/lib/qbittorrent";
import type { NodeStatsResult } from "@/lib/node-stats";
import {
  Search,
  Copy,
  Check,
  Download,
  LayoutGrid,
  List,
  ShieldCheck,
  Calendar,
  ArrowDownToLine,
  RefreshCw,
} from "lucide-react";
import {
  CURATED_SEED_CATALOG,
  matchTorrentToCatalog,
  resolveDynamicDistroDisplay,
} from "@/lib/catalog";

interface HomeClientProps {
  initialStats?: OpenSeedStats | NodeStatsResult | null;
}

export default function HomeClient({ initialStats }: HomeClientProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<OpenSeedStats | NodeStatsResult | null>(initialStats || null);
  const [loading, setLoading] = useState<boolean>(!initialStats);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [archFilter, setArchFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "vertical">("grid");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedDistroId, setSelectedDistroId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openVerifyModal = (distroId: string) => {
    setSelectedDistroId(distroId);
    setIsModalOpen(true);
  };

  useEffect(() => {
    setMounted(true);
    const savedView = localStorage.getItem("openseed_view_mode");
    if (savedView === "vertical" || savedView === "grid") {
      setViewMode(savedView);
    }
  }, []);

  const handleToggleView = (mode: "grid" | "vertical") => {
    setViewMode(mode);
    localStorage.setItem("openseed_view_mode", mode);
  };

  const fetchData = async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load live stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialStats) {
      fetchData();
    }

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchData();
      }
    }, 60000); // Check every minute (server caches for 5 mins)

    const handleVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [initialStats]);

  const copyMagnet = async (magnet: string, id: string) => {
    const success = await copyToClipboard(magnet);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const processedItems = useMemo(() => {
    const liveTorrents = data?.torrents || [];
    const matchedHashes = new Set<string>();

    const items = CURATED_SEED_CATALOG.map((catalog) => {
      const matched = matchTorrentToCatalog(catalog, liveTorrents);

      if (matched) {
        matchedHashes.add(matched.hash);
        const status = resolveDistroStatus(matched);
        const dynamicDisplay = resolveDynamicDistroDisplay(catalog, matched);

        return {
          ...catalog,
          name: dynamicDisplay.title,
          version: dynamicDisplay.versionSubtitle,
          size: matched.size || catalog.nominalSize,
          uploaded: matched.uploaded || 0,
          ratio: matched.ratio || 0,
          progress: matched.progress || 0,
          dlspeed: matched.dlspeed || 0,
          upspeed: matched.upspeed || 0,
          magnet: matched.magnet_uri || catalog.officialMagnet,
          hash: matched.hash,
          targetFileName: dynamicDisplay.fileName || catalog.targetFileName,
          status,
          isLive: true,
        };
      }

      return {
        ...catalog,
        size: catalog.nominalSize,
        uploaded: 0,
        ratio: 0,
        progress: 0,
        dlspeed: 0,
        upspeed: 0,
        magnet: catalog.officialMagnet,
        hash: undefined,
        targetFileName: catalog.targetFileName,
        status: "available" as DistroStatus,
        isLive: false,
      };
    });

    // Also include any active torrents currently seeded in qBittorrent that weren't in static catalog
    const extraTorrents = liveTorrents.filter((t) => !matchedHashes.has(t.hash));
    for (const extra of extraTorrents) {
      const isArm = extra.name.toLowerCase().includes("arm");
      items.push({
        id: `cluster-${extra.hash}`,
        name: extra.name.replace(".iso", "").replace(".torrent", ""),
        category: "linux",
        version: "Cluster Distribution",
        architecture: (isArm ? "arm64" : "x86_64") as "arm64" | "x86_64",
        nominalSize: extra.size,
        size: extra.size,
        uploaded: extra.uploaded,
        ratio: extra.ratio,
        progress: extra.progress,
        dlspeed: extra.dlspeed,
        upspeed: extra.upspeed,
        magnet: extra.magnet_uri || "",
        officialMagnet: extra.magnet_uri || "",
        officialUrl: "",
        hash: extra.hash,
        targetFileName: extra.name,
        status: resolveDistroStatus(extra),
        isLive: true,
      });
    }

    return items;
  }, [data]);

  const filteredItems = useMemo(() => {
    return processedItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.version.toLowerCase().includes(query.toLowerCase());
      if (!matchesSearch) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (archFilter !== "all" && item.architecture !== archFilter) return false;
      return true;
    });
  }, [processedItems, query, categoryFilter, archFilter]);

  // Total uploaded is STRICTLY live data from qBittorrent summary (zero mock fallback!)
  const totalUploadedBytes = data?.summary?.totalUploadedBytes ?? 0;

  return (
    <div className="flex flex-col gap-6 w-full pt-4 sm:pt-6 pb-20">
      {/* 1. Search & Category / Architecture Filters */}
      <div id="distributions" className="flex flex-col xl:flex-row items-center justify-between gap-4 bg-card border border-border p-3 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3 px-3 w-full xl:w-96">
          <Search className="size-4 text-zinc-500 shrink-0" />
          <input
            type="text"
            placeholder="Search distributions, architectures, versions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm sm:text-base font-medium text-foreground placeholder:text-zinc-500 focus:outline-none"
          />
        </div>

        {/* Filter Pills (Category & Architecture) */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-xl border border-border/60 overflow-x-auto">
            {[
              { id: "all", label: "All Distros" },
              { id: "linux", label: "Linux" },
              { id: "hypervisor", label: "Hypervisors" },
              { id: "security", label: "Security" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === tab.id
                    ? "bg-foreground text-background shadow-xs"
                    : "text-zinc-600 dark:text-zinc-300 hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Architecture Filter */}
          <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-xl border border-border/60">
            {[
              { id: "all", label: "All Arch" },
              { id: "x86_64", label: "x86_64" },
              { id: "arm64", label: "ARM64" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setArchFilter(tab.id)}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  archFilter === tab.id
                    ? "bg-foreground text-background shadow-xs"
                    : "text-zinc-600 dark:text-zinc-300 hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* View Toggle (Grid vs Vertical List) */}
          <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-xl border border-border/60">
            <button
              onClick={() => handleToggleView("grid")}
              title="Grid View (Cards)"
              aria-label="Grid View"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-foreground text-background shadow-xs"
                  : "text-zinc-500 hover:text-foreground"
              }`}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => handleToggleView("vertical")}
              title="Vertical View (List Rows)"
              aria-label="Vertical View"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "vertical"
                  ? "bg-foreground text-background shadow-xs"
                  : "text-zinc-500 hover:text-foreground"
              }`}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Distribution Catalog: Grid View or Vertical List View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
          {filteredItems.map((item) => {
            const activeTheme = mounted ? resolvedTheme : "dark";
            const logoPath = getDistroLogo(item.name, activeTheme || "dark");
            const isCopied = copiedId === item.id;
            const isDownloading = item.status === "downloading";
            const isVerifying = item.status === "verifying";

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-border bg-card hover:border-foreground/30 p-6 transition-all duration-200 flex flex-col justify-between gap-6 shadow-sm"
              >
                {/* Header: Logo + Title + Standardized 6-State Badge */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="size-11 rounded-xl bg-secondary/80 border border-border flex items-center justify-center p-2 shrink-0 shadow-sm">
                      <img
                        src={logoPath}
                        alt={item.name}
                        width={28}
                        height={28}
                        className="size-7 object-contain"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border font-bold ${
                        item.architecture === "arm64"
                          ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30"
                          : "bg-secondary text-zinc-600 dark:text-zinc-300 border-border"
                      }`}>
                        {item.architecture}
                      </span>
                      <StatusBadge status={item.status} progress={item.progress} />
                    </div>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-base text-foreground truncate" title={item.name}>
                      {item.name}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      <span className="truncate">{item.version}</span>
                      {item.releaseDate && (
                        <>
                          <span>•</span>
                          <span className="shrink-0 text-[11px] font-mono">{item.releaseDate.split(',')[0]}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Bar (if Downloading) */}
                {isDownloading && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <ArrowDownToLine className="size-3" />
                        <span>{formatBytes(item.dlspeed)}/s</span>
                      </span>
                      <span>{(item.progress * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden border border-border/50">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(3, item.progress * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Verifying Banner (if Verifying) */}
                {isVerifying && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-500 bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/20">
                    <RefreshCw className="size-3.5 animate-spin shrink-0" />
                    <span>Checking data integrity...</span>
                  </div>
                )}

                {/* 3-Column Stats Matrix */}
                <div className="grid grid-cols-3 gap-1.5 px-3 py-2.5 rounded-xl bg-secondary/80 border border-border text-center">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                      Size
                    </div>
                    <div className="text-xs text-foreground font-bold mt-0.5 truncate" title={formatBytes(item.size)}>
                      {formatBytes(item.size)}
                    </div>
                  </div>
                  <div className="min-w-0 border-x border-border/60">
                    <div className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                      Contributed
                    </div>
                    <div className="text-xs text-foreground font-bold mt-0.5 truncate" title={formatBytes(item.uploaded)}>
                      {formatBytes(item.uploaded)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                      Ratio
                    </div>
                    <div className="text-xs text-foreground font-bold mt-0.5 truncate">
                      {item.ratio.toFixed(1)}x
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => copyMagnet(item.magnet, item.id)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl text-xs font-bold bg-foreground text-background hover:opacity-90 transition-all active:scale-[0.98] shadow-sm flex-1 truncate cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <Check className="size-3.5 shrink-0 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5 shrink-0" />
                          <span className="truncate">Magnet</span>
                        </>
                      )}
                    </button>

                    <a
                      href={`/api/download?id=${encodeURIComponent(item.id)}${item.hash ? `&hash=${encodeURIComponent(item.hash)}` : ""}&name=${encodeURIComponent(item.targetFileName || item.name)}`}
                      download={`${(item.targetFileName || item.name).replace(/\.iso$/i, "")}.torrent`}
                      title={`Download ${item.name} .torrent`}
                      className="inline-flex items-center justify-center size-9.5 sm:size-8 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors shrink-0"
                    >
                      <Download className="size-4 sm:size-3.5" />
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => openVerifyModal(item.id)}
                    title="View Cryptographic Hashes & Upstream Release Info"
                    className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-foreground transition-colors px-2.5 py-2 sm:py-1.5 rounded-xl hover:bg-secondary shrink-0 cursor-pointer border border-border/40 sm:border-transparent"
                  >
                    <ShieldCheck className="size-4 sm:size-3.5 text-emerald-500" />
                    <span>Verify</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Vertical List View */
        <div className="flex flex-col gap-3">
          {filteredItems.map((item) => {
            const activeTheme = mounted ? resolvedTheme : "dark";
            const logoPath = getDistroLogo(item.name, activeTheme || "dark");
            const isCopied = copiedId === item.id;
            const isDownloading = item.status === "downloading";
            const isVerifying = item.status === "verifying";

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-border bg-card hover:border-foreground/30 p-4 sm:px-6 sm:py-4 transition-all duration-200 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 shadow-sm"
              >
                {/* 1. Left: Distro Logo + Identity + Badges */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="size-11 rounded-xl bg-secondary/80 border border-border flex items-center justify-center p-2 shrink-0 shadow-sm">
                    <img
                      src={logoPath}
                      alt={item.name}
                      width={28}
                      height={28}
                      className="size-7 object-contain"
                    />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm sm:text-base text-foreground truncate" title={item.name}>
                        {item.name}
                      </span>
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border font-bold ${
                        item.architecture === "arm64"
                          ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30"
                          : "bg-secondary text-zinc-600 dark:text-zinc-300 border-border"
                      }`}>
                        {item.architecture}
                      </span>
                      <StatusBadge status={item.status} progress={item.progress} />
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      <span className="truncate" title={item.version}>
                        {item.version}
                      </span>
                      {item.releaseDate && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono shrink-0">
                            <Calendar className="size-3 text-zinc-400" />
                            <span>{item.releaseDate}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Middle & Right: Telemetry, DL Progress, and Actions */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 w-full xl:w-auto justify-between xl:justify-end">
                  {/* Live DL Progress (if downloading) */}
                  {isDownloading && (
                    <div className="flex flex-col gap-1 w-36 sm:w-44 shrink-0">
                      <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <ArrowDownToLine className="size-3" />
                          <span>{formatBytes(item.dlspeed)}/s</span>
                        </span>
                        <span>{(item.progress * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden border border-border/50">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(3, item.progress * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {isVerifying && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 shrink-0">
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </div>
                  )}

                  {/* 3 Metrics: Size, Contributed, Ratio */}
                  <div className="flex items-center gap-5 sm:gap-6 shrink-0">
                    <div className="min-w-[60px]">
                      <div className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                        Size
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
                        {formatBytes(item.size)}
                      </div>
                    </div>

                    <div className="min-w-[70px]">
                      <div className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                        Contributed
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
                        {formatBytes(item.uploaded)}
                      </div>
                    </div>

                    <div className="min-w-[45px]">
                      <div className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                        Ratio
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
                        {item.ratio.toFixed(1)}x
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => copyMagnet(item.magnet, item.id)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold bg-foreground text-background hover:opacity-90 transition-all active:scale-[0.98] shadow-sm cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <Check className="size-3.5 shrink-0 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5 shrink-0" />
                          <span>Magnet</span>
                        </>
                      )}
                    </button>

                    <a
                      href={`/api/download?id=${encodeURIComponent(item.id)}${item.hash ? `&hash=${encodeURIComponent(item.hash)}` : ""}&name=${encodeURIComponent(item.targetFileName || item.name)}`}
                      download={`${(item.targetFileName || item.name).replace(/\.iso$/i, "")}.torrent`}
                      title={`Download ${item.name} .torrent`}
                      className="inline-flex items-center justify-center size-9 sm:size-8 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors shrink-0"
                    >
                      <Download className="size-4 sm:size-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => openVerifyModal(item.id)}
                      title="View Cryptographic Hashes & Upstream Release Info"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-foreground transition-colors px-2.5 py-2 sm:py-1.5 rounded-xl hover:bg-secondary shrink-0 border border-border/60 cursor-pointer"
                    >
                      <ShieldCheck className="size-4 sm:size-3.5 text-emerald-500" />
                      <span>Verify & Hashes</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cryptographic Verification & Upstream Release Notes Dialog */}
      <VerifyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        distroId={selectedDistroId}
        theme={mounted ? resolvedTheme : "dark"}
      />
    </div>
  );
}

