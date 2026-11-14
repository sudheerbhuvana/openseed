"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import { getDistroLogo } from "@/lib/metadata";
import { formatBytes } from "@/lib/utils";
import { Search, ExternalLink, RefreshCw, X } from "lucide-react";

interface DistroRow {
  id: string;
  name: string;
  category: "linux" | "hypervisor" | "security";
  version: string;
  architecture: string;
  nominalSize: number;
  officialUrl: string;
  torrent?: {
    state: string;
    progress: number;
    size: number;
  } | null;
}

function getStatusInfo(torrent: DistroRow["torrent"]) {
  if (!torrent) {
    return {
      label: "Monitored",
      badgeClass: "bg-zinc-500/10 text-zinc-500 border-border",
      dotClass: "bg-zinc-400",
    };
  }

  const { state, progress = 0 } = torrent;

  if (state === "seeding" || state === "uploading" || state === "stalledUP" || progress >= 1) {
    return {
      label: "Seeding",
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      dotClass: "bg-emerald-500",
    };
  }

  if (state === "downloading" || (progress > 0 && progress < 1)) {
    const pct = Math.round(progress * 100);
    return {
      label: `Downloading (${pct}%)`,
      badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      dotClass: "bg-blue-500 animate-pulse",
    };
  }

  if (state?.includes("queued") || state === "stalledDL") {
    return {
      label: "Queued",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      dotClass: "bg-amber-500",
    };
  }

  return {
    label: "Monitored",
    badgeClass: "bg-zinc-500/10 text-zinc-500 border-border",
    dotClass: "bg-zinc-400",
  };
}

export default function MonitoredDistrosPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [distros, setDistros] = useState<DistroRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setMounted(true);
    fetchDistros();
  }, []);

  const fetchDistros = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/distros");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.distros)) {
          setDistros(json.distros);
        }
      }
    } catch (err) {
      console.error("Failed to fetch distros:", err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const activeTheme = mounted ? resolvedTheme : "dark";

  const filteredDistros = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return distros;
    return distros.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.version.toLowerCase().includes(q) ||
        d.architecture.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
    );
  }, [distros, search]);

  return (
    <div className="flex flex-col gap-6 w-full pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Monitored Distributions
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Standard catalog of all operating systems and hypervisors tracked by OpenSeed.
          </p>
        </div>

        <button
          onClick={() => fetchDistros(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-medium transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {/* Simple Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search distributions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-secondary/60 border border-border rounded-lg text-xs sm:text-sm text-foreground placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-foreground transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <span className="text-xs text-zinc-400 font-medium">
          {filteredDistros.length} distributions
        </span>
      </div>

      {/* Normal Data Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-secondary/60 text-zinc-500 dark:text-zinc-400 border-b border-border text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Distribution</th>
                <th className="py-3 px-4">Version / Flavor</th>
                <th className="py-3 px-4">Architecture</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Official Site</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && distros.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <div className="inline-flex items-center gap-2 text-xs font-medium">
                      <RefreshCw className="size-4 animate-spin text-zinc-400" />
                      <span>Loading cluster distributions...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDistros.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 text-xs">
                    No distributions found matching "{search}".
                  </td>
                </tr>
              ) : (
                filteredDistros.map((distro) => {
                  const logoPath = getDistroLogo(distro.name, activeTheme || "dark");

                  return (
                    <tr key={distro.id} className="hover:bg-secondary/40 transition-colors">
                      {/* Distribution Logo & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-7 rounded-md bg-secondary border border-border flex items-center justify-center p-1 shrink-0">
                            <img
                              src={logoPath}
                              alt={distro.name}
                              width={20}
                              height={20}
                              className="size-5 object-contain"
                            />
                          </div>
                          <span className="font-semibold text-foreground text-xs sm:text-sm">
                            {distro.name}
                          </span>
                        </div>
                      </td>

                      {/* Version / Flavor */}
                      <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300">
                        {distro.version}
                      </td>

                      {/* Architecture */}
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-secondary border border-border text-zinc-600 dark:text-zinc-300">
                          {distro.architecture}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 capitalize text-zinc-500">
                        {distro.category}
                      </td>

                      {/* Size */}
                      <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300 font-medium">
                        {formatBytes(distro.torrent?.size || distro.nominalSize)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {(() => {
                          const statusInfo = getStatusInfo(distro.torrent);
                          return (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.badgeClass}`}
                            >
                              <span className={`size-1.5 rounded-full ${statusInfo.dotClass}`} />
                              {statusInfo.label}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Official Site */}
                      <td className="py-3.5 px-4 text-right">
                        {distro.officialUrl ? (
                          <a
                            href={distro.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-foreground transition font-medium"
                          >
                            <span>Visit</span>
                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-zinc-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
