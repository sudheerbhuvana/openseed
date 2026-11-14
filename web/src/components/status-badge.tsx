"use client";

import type { DistroStatus } from "@/lib/status";
import { STATUS_LABELS } from "@/lib/status";

interface StatusBadgeProps {
  status: DistroStatus;
  progress?: number;
  className?: string;
}

export function StatusBadge({ status, progress, className = "" }: StatusBadgeProps) {
  const meta = STATUS_LABELS[status] || STATUS_LABELS.available;

  switch (status) {
    case "queued":
      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-semibold shrink-0 shadow-sm ${className}`}
          title={meta.description}
        >
          <span className="size-1.5 rounded-full bg-amber-500" />
          <span>Queued</span>
        </div>
      );

    case "downloading":
      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[11px] font-semibold shrink-0 shadow-sm ${className}`}
          title={meta.description}
        >
          <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span>
            Downloading{typeof progress === "number" && progress > 0 ? ` ${(progress * 100).toFixed(0)}%` : ""}
          </span>
        </div>
      );

    case "verifying":
      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-semibold shrink-0 shadow-sm ${className}`}
          title={meta.description}
        >
          <span className="size-1.5 rounded-full bg-amber-500 animate-ping" />
          <span>Verifying</span>
        </div>
      );

    case "seeding":
      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold shrink-0 shadow-sm ${className}`}
          title={meta.description}
        >
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Seeding</span>
        </div>
      );

    case "inactive":
      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary border border-border text-[11px] font-medium text-zinc-600 dark:text-zinc-300 shrink-0 shadow-sm ${className}`}
          title={meta.description}
        >
          <span className="size-1.5 rounded-full bg-zinc-500" />
          <span>Inactive</span>
        </div>
      );

    case "archived":
      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[11px] font-medium shrink-0 shadow-sm ${className}`}
          title={meta.description}
        >
          <span className="size-1.5 rounded-full bg-purple-500" />
          <span>Archived</span>
        </div>
      );

    case "available":
    default:
      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary border border-border text-[11px] font-medium text-zinc-500 dark:text-zinc-400 shrink-0 shadow-sm ${className}`}
          title={meta.description}
        >
          <span className="size-1.5 rounded-full bg-zinc-400" />
          <span>Available</span>
        </div>
      );
  }
}

