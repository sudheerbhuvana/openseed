"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="size-8 rounded-full border border-border bg-secondary opacity-50" />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle Black and White Theme"
      title={`Switch to ${isDark ? "White (Light)" : "Black (Dark)"} mode`}
      className="inline-flex items-center justify-center size-8 rounded-full border border-border bg-secondary hover:bg-secondary/80 text-foreground hover:scale-105 active:scale-95 transition-all shadow-sm"
    >
      {isDark ? (
        <Sun className="size-4 text-zinc-100 hover:text-white transition-colors" />
      ) : (
        <Moon className="size-4 text-zinc-900 hover:text-black transition-colors" />
      )}
    </button>
  );
}
