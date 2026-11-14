"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatBytes } from "@/lib/utils";
import { Menu, X, Disc, Info, ExternalLink, Home } from "lucide-react";

function GithubIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<{
    activeSeeding: number;
    totalUploaded: number;
    totalTorrents: number;
  } | null>(null);
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Periodic lightweight live node telemetry fetching for sticky header
  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        if (res.ok && isMounted) {
          const data = await res.json();
          setStats({
            activeSeeding: data?.summary?.activeSeeding ?? 0,
            totalUploaded: data?.summary?.totalUploadedBytes ?? 0,
            totalTorrents: data?.summary?.totalTorrents ?? data?.torrents?.length ?? 0,
          });
        }
      } catch {
        // Silently ignore network hiccups
      }
    };

    fetchStats();
    const timer = setInterval(fetchStats, 15000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="w-full px-4 sm:px-8 lg:px-12 2xl:px-16 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src="/logos/openseed.png"
              alt="OpenSeed Logo"
              width={28}
              height={28}
              className="size-7 rounded-lg object-contain shadow-xs"
            />
            <span className="font-bold text-base tracking-tight text-foreground">
              OpenSeed
            </span>
          </Link>
        </div>

        {/* Center: Live Cluster Telemetry Stats (Clean, prominent inline typography) */}
        {stats && (
          <div className="hidden md:flex items-center gap-5 text-sm lg:text-base select-none">
            <div className="flex items-center gap-2 font-bold text-emerald-500">
              <span className="relative flex size-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
              </span>
              <span>{stats.activeSeeding} Active Seeding</span>
            </div>

            <span className="text-zinc-400 dark:text-zinc-600 text-base font-bold">·</span>

            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 font-medium">
              <span className="text-zinc-500 dark:text-zinc-400">Contributed:</span>
              <span className="font-extrabold text-foreground">{formatBytes(stats.totalUploaded)}</span>
            </div>

            <span className="text-zinc-400 dark:text-zinc-600 text-base font-bold">·</span>

            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 font-medium">
              <span className="font-extrabold text-foreground">{stats.totalTorrents}</span>
              <span className="text-zinc-500 dark:text-zinc-400">Distros</span>
            </div>
          </div>
        )}

        {/* Right: Desktop Navigation & Controls */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          <Link
            href="/distros"
            className={`text-sm font-medium transition-colors ${
              pathname === "/distros"
                ? "text-foreground font-semibold"
                : "text-zinc-600 dark:text-zinc-300 hover:text-foreground"
            }`}
          >
            Distributions
          </Link>
          <Link
            href="/about"
            className={`text-sm font-medium transition-colors ${
              pathname === "/about"
                ? "text-foreground font-semibold"
                : "text-zinc-600 dark:text-zinc-300 hover:text-foreground"
            }`}
          >
            About
          </Link>
          <a
            href="https://github.com/sudheerbhuvana/openseed"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-zinc-600 dark:text-zinc-300 hover:text-foreground transition-colors p-1"
            aria-label="GitHub Repository"
          >
            <GithubIcon className="size-4" />
          </a>
          <ThemeToggle />
        </div>

        {/* Mobile Header Controls */}
        <div className="flex md:hidden items-center gap-2">
          {stats && (
            <div className="flex items-center gap-1.5 text-xs font-semibold select-none pr-1">
              <span className="flex items-center gap-1 text-emerald-500">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{stats.activeSeeding}</span>
              </span>
              <span className="text-zinc-400 dark:text-zinc-600 font-bold">·</span>
              <span className="text-foreground font-bold">{formatBytes(stats.totalUploaded)}</span>
            </div>
          )}

          <ThemeToggle />

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="p-2.5 rounded-xl border border-border bg-secondary/80 text-foreground hover:bg-secondary transition-colors focus:outline-none cursor-pointer"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer / Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background/98 backdrop-blur-2xl shadow-2xl">
          {stats && (
            <div className="px-5 pt-4 pb-2 grid grid-cols-3 gap-2 text-center border-b border-border/60">
              <div className="p-2 rounded-xl bg-secondary/50 border border-border/50">
                <div className="text-xs font-bold text-emerald-500">{stats.activeSeeding}</div>
                <div className="text-[10px] text-zinc-500 font-medium">Seeding</div>
              </div>
              <div className="p-2 rounded-xl bg-secondary/50 border border-border/50">
                <div className="text-xs font-bold text-foreground">{formatBytes(stats.totalUploaded)}</div>
                <div className="text-[10px] text-zinc-500 font-medium">Contributed</div>
              </div>
              <div className="p-2 rounded-xl bg-secondary/50 border border-border/50">
                <div className="text-xs font-bold text-foreground">{stats.totalTorrents}</div>
                <div className="text-[10px] text-zinc-500 font-medium">Distros</div>
              </div>
            </div>
          )}

          <div className="px-5 py-4 flex flex-col gap-2">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors ${
                pathname === "/"
                  ? "bg-foreground text-background"
                  : "text-foreground hover:bg-secondary/70"
              }`}
            >
              <Home className="size-4.5 opacity-80" />
              <span>Catalog & Mirrors</span>
            </Link>

            <Link
              href="/distros"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors ${
                pathname === "/distros"
                  ? "bg-foreground text-background"
                  : "text-foreground hover:bg-secondary/70"
              }`}
            >
              <Disc className="size-4.5 opacity-80" />
              <span>Distributions List</span>
            </Link>

            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors ${
                pathname === "/about"
                  ? "bg-foreground text-background"
                  : "text-foreground hover:bg-secondary/70"
              }`}
            >
              <Info className="size-4.5 opacity-80" />
              <span>About & Infrastructure</span>
            </Link>

            <div className="pt-2 border-t border-border mt-1">
              <a
                href="https://github.com/sudheerbhuvana/openseed"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-foreground hover:bg-secondary/70 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <GithubIcon className="size-4" />
                  <span>GitHub Repository</span>
                </div>
                <ExternalLink className="size-3.5 opacity-60" />
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

