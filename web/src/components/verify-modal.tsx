"use client";

import { useEffect, useState } from "react";
import type { LiveDistroVerification } from "@/lib/types";
import { getDistroLogo } from "@/lib/metadata";
import { copyToClipboard } from "@/lib/clipboard";
import {
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Terminal,
  FileText,
  BookOpen,
  Calendar,
  Lock,
  Globe,
  Radio,
  Clock,
} from "lucide-react";

interface VerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  distroId: string | null;
  theme?: string;
}

export function VerifyModal({ isOpen, onClose, distroId, theme = "dark" }: VerifyModalProps) {
  const [data, setData] = useState<LiveDistroVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedBtih, setCopiedBtih] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && distroId) {
      setLoading(true);
      setError(null);
      fetch(`/api/verify?id=${encodeURIComponent(distroId)}`)
        .then(async (res) => {
          if (!res.ok) {
            const errJson = await res.json().catch(() => null);
            throw new Error(errJson?.error || `Failed to fetch (status ${res.status})`);
          }
          return res.json();
        })
        .then((json) => {
          setData(json);
          setError(null);
        })
        .catch((err) => {
          console.error("Failed to load live verification:", err);
          setError(err.message || "Failed to load verification");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setData(null);
      setError(null);
    }
  }, [isOpen, distroId]);

  if (!isOpen) return null;

  const logoPath = data ? getDistroLogo(data.name, theme) : "/logos/ubuntu.svg";
  const verifyCommand = data
    ? `echo "${data.checksumValue}  ${data.fileName}" | sha256sum -c`
    : "";

  const copyHash = async () => {
    if (!data?.checksumValue) return;
    const ok = await copyToClipboard(data.checksumValue);
    if (ok) {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const copyBtih = async () => {
    if (!data?.bitTorrentInfoHash) return;
    const ok = await copyToClipboard(data.bitTorrentInfoHash);
    if (ok) {
      setCopiedBtih(true);
      setTimeout(() => setCopiedBtih(false), 2000);
    }
  };

  const copyCommand = async () => {
    if (!verifyCommand) return;
    const ok = await copyToClipboard(verifyCommand);
    if (ok) {
      setCopiedCommand(true);
      setTimeout(() => setCopiedCommand(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl lg:max-w-4xl bg-card border border-border rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col my-auto text-foreground">
        {/* Header */}
        <div className="flex items-start justify-between p-6 sm:p-7 border-b border-border bg-secondary/20">
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            <div className="size-13 sm:size-14 rounded-2xl bg-secondary border border-border flex items-center justify-center p-2.5 shrink-0 shadow-sm">
              <img
                src={logoPath}
                alt={data?.name || "Distro"}
                width={36}
                height={36}
                className="size-8 sm:size-9 object-contain"
              />
            </div>
            <div className="flex flex-col min-w-0">
              {loading || !data ? (
                <div className="flex flex-col gap-2">
                  <div className="h-6 w-56 bg-secondary rounded animate-pulse" />
                  <div className="h-4 w-36 bg-secondary rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-black text-xl sm:text-2xl text-foreground tracking-tight">
                      {data.name}
                    </h3>
                    <span
                      className={`text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-md border font-bold ${
                        data.architecture === "arm64"
                          ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30"
                          : "bg-secondary text-zinc-600 dark:text-zinc-300 border-border"
                      }`}
                    >
                      {data.architecture}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    <span className="font-semibold text-foreground/80">{data.version}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      <span>{data.releaseDate}</span>
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-500 hover:text-foreground hover:bg-secondary transition"
            aria-label="Close dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 flex flex-col gap-6 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-5 py-12 items-center justify-center text-center">
              <Radio className="size-9 text-blue-500 animate-spin" />
              <div className="space-y-1">
                <p className="font-bold text-base text-foreground">
                  Dynamically Querying Upstream Mirror...
                </p>
                <p className="text-xs text-zinc-500">
                  Fetching and regex-parsing canonical SHA256SUMS from source
                </p>
              </div>
            </div>
          ) : error || !data ? (
            <div className="flex flex-col gap-4 py-12 items-center justify-center text-center">
              <p className="font-bold text-base text-foreground">Verification Temporarily Unavailable</p>
              <p className="text-xs text-zinc-500 max-w-sm">
                {error || "Upstream mirror checksum could not be verified at this moment."}
              </p>
              <button
                onClick={() => {
                  if (distroId) {
                    setLoading(true);
                    setError(null);
                    fetch(`/api/verify?id=${encodeURIComponent(distroId)}&force=true`)
                      .then((res) => (res.ok ? res.json() : Promise.reject()))
                      .then((json) => setData(json))
                      .catch(() => setError("Upstream mirror unreachable"))
                      .finally(() => setLoading(false));
                  }
                }}
                className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border transition"
              >
                Retry Query
              </button>
            </div>
          ) : (
            <>
              {/* Live Upstream Verification Status Pill */}
              <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-semibold">
                <div className="flex items-center gap-2.5">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Verified from Canonical Upstream Mirror</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  <Clock className="size-3.5" />
                  <span>{new Date(data.verifiedLiveAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* 1. Cryptographic Checksum (SHA-256) */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    <ShieldCheck className="size-4 text-emerald-500" />
                    <span>Dynamic Checksum ({data.checksumType})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {data.gpgSignatureUrl && (
                      <a
                        href={data.gpgSignatureUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-foreground transition underline underline-offset-4"
                      >
                        <Lock className="size-3.5 text-amber-500" />
                        <span>GPG Signature</span>
                      </a>
                    )}
                    <a
                      href={data.checksumFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-500 hover:underline"
                    >
                      <FileText className="size-3.5" />
                      <span>Official Source</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>

                {/* Monospace Hash Container */}
                <div className="relative flex items-center justify-between gap-3 bg-secondary/70 border border-border p-3.5 px-4 rounded-xl font-mono text-xs sm:text-sm">
                  <span className="break-all select-all text-zinc-800 dark:text-zinc-200 font-medium">
                    {data.checksumValue}
                  </span>
                  <button
                    onClick={copyHash}
                    title="Copy hash"
                    className="shrink-0 p-2 rounded-lg bg-background hover:bg-secondary text-foreground border border-border shadow-xs transition"
                  >
                    {copiedHash ? (
                      <Check className="size-4 text-emerald-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* 2. BitTorrent Cryptographic Info-Hash (BTIH) */}
              {data.bitTorrentInfoHash && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Live Seed Node Info-Hash (BTIH)
                    </span>
                    <span className="text-xs text-zinc-500">Block-by-Block Verified</span>
                  </div>
                  <div className="relative flex items-center justify-between gap-3 bg-secondary/50 border border-border/80 p-3 px-4 rounded-xl font-mono text-xs sm:text-sm">
                    <span className="break-all select-all text-zinc-700 dark:text-zinc-300">
                      {data.bitTorrentInfoHash}
                    </span>
                    <button
                      onClick={copyBtih}
                      title="Copy BitTorrent info-hash"
                      className="shrink-0 p-2 rounded-lg bg-background hover:bg-secondary text-foreground border border-border shadow-xs transition"
                    >
                      {copiedBtih ? (
                        <Check className="size-4 text-emerald-500" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* 3. One-Click Shell Verification Command */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    <Terminal className="size-4 text-foreground" />
                    <span>Terminal Verification Command</span>
                  </div>
                  <button
                    onClick={copyCommand}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:underline"
                  >
                    {copiedCommand ? (
                      <>
                        <Check className="size-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        <span>Copy Command</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-zinc-950 text-zinc-200 dark:bg-zinc-950 border border-zinc-800 p-4 rounded-xl font-mono text-xs sm:text-[13px] leading-relaxed break-all sm:break-normal whitespace-pre-wrap sm:whitespace-pre overflow-x-auto">
                  <code>{verifyCommand}</code>
                </div>
                <p className="text-xs text-zinc-500">
                  Run this in your shell to verify the downloaded ISO bit-for-bit against upstream cryptographic proof.
                </p>
              </div>

              {/* 4. Official Upstream Resources */}
              <div className="flex flex-col gap-3">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Official Upstream Resources
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <a
                    href={data.releaseNotesUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3.5 px-4 rounded-xl bg-secondary/40 hover:bg-secondary/90 border border-border transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="size-4 text-foreground shrink-0" />
                      <span className="text-sm font-semibold truncate">Release Notes</span>
                    </div>
                    <ExternalLink className="size-3.5 text-zinc-400 group-hover:text-foreground shrink-0 transition-colors" />
                  </a>

                  <a
                    href={data.installGuideUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3.5 px-4 rounded-xl bg-secondary/40 hover:bg-secondary/90 border border-border transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BookOpen className="size-4 text-foreground shrink-0" />
                      <span className="text-sm font-semibold truncate">Install Guide</span>
                    </div>
                    <ExternalLink className="size-3.5 text-zinc-400 group-hover:text-foreground shrink-0 transition-colors" />
                  </a>

                  <a
                    href={data.upstreamUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3.5 px-4 rounded-xl bg-secondary/40 hover:bg-secondary/90 border border-border transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Globe className="size-4 text-foreground shrink-0" />
                      <span className="text-sm font-semibold truncate">Project Home</span>
                    </div>
                    <ExternalLink className="size-3.5 text-zinc-400 group-hover:text-foreground shrink-0 transition-colors" />
                  </a>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-7 border-t border-border bg-secondary/20 flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-xl text-sm font-bold bg-foreground text-background hover:opacity-90 transition shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
