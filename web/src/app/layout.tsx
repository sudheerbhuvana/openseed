import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import pkg from "../../package.json";

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

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "OpenSeed",
    template: "%s | OpenSeed",
  },
  description: "Continuous BitTorrent seeding for Linux distributions and hypervisors.",
  icons: {
    icon: "/logos/openseed.png",
    apple: "/logos/openseed.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground flex flex-col font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {/* Vercel Header with Mobile Navigation & Theme Toggle */}
          <Navbar />

          {/* Main View */}
          <main className="w-full px-6 sm:px-10 lg:px-16 2xl:px-20 py-8 flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-border bg-background py-8 text-xs text-zinc-500">
            <div className="w-full px-6 sm:px-10 lg:px-16 2xl:px-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex flex-col gap-1 max-w-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <img
                    src="/logos/openseed.png"
                    alt="OpenSeed"
                    width={18}
                    height={18}
                    className="size-4.5 rounded object-contain"
                  />
                  <span className="font-semibold text-foreground">OpenSeed</span>
                  <span className="text-zinc-400">•</span>
                  <a href="/about" className="text-zinc-600 dark:text-zinc-300 hover:text-foreground hover:underline transition-colors">
                    About
                  </a>
                  <span className="text-zinc-400">•</span>
                  <span>
                    Operated by{" "}
                    <a
                      href="https://github.com/sudheerbhuvana"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-foreground hover:underline"
                    >
                      sudheerbhuvana
                    </a>
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  All trademarks, logos, and distribution ISOs belong to their respective projects. OpenSeed is an independent community seed mirror.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs shrink-0">
                <a
                  href="https://github.com/sudheerbhuvana/openseed"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors font-medium text-xs shadow-xs"
                >
                  <GithubIcon className="size-3.5" />
                  <span>Host your own seeder</span>
                  <span className="text-[10px] font-mono text-zinc-400 border-l border-border pl-2 ml-0.5">
                    v{pkg.version}
                  </span>
                </a>
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
