import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "About OpenSeed — a homelab-powered BitTorrent seed node for open-source distributions.",
};

export default function AboutPage() {
  return (
    <article className="max-w-2xl mx-auto py-8 sm:py-12 flex flex-col gap-10 text-foreground">
      {/* Title */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
          About OpenSeed
        </h1>
        <p className="text-base sm:text-lg text-zinc-500 dark:text-zinc-400">
          A personal homelab project giving bandwidth back to open source.
        </p>
      </div>

      {/* Main Conversation */}
      <div className="space-y-6 text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
        <p>
          Hey, I&apos;m{" "}
          <a
            href="https://github.com/sudheerbhuvana"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-foreground underline underline-offset-4 hover:opacity-80"
          >
            Sudheer
          </a>
          . I run OpenSeed from my homelab to contribute reliable, high-speed BitTorrent seeding to the open-source community.
        </p>

        <h2 className="text-xl font-bold tracking-tight text-foreground pt-4">
          Why I built this
        </h2>
        <p>
          Every time a major Linux distribution drops a new release — whether it&apos;s Ubuntu LTS, a new Debian point release, or Arch&apos;s monthly rolling ISO — their central download mirrors get hammered with terabytes of traffic. Direct HTTP downloads cost non-profit foundations real bandwidth money.
        </p>
        <p>
          BitTorrent is the most efficient, decentralized way to distribute large operating system images. OpenSeed exists to keep those swarms healthy, fast, and available 24/7, especially for older or specialized versions that might otherwise lose seeders.
        </p>

        <h2 className="text-xl font-bold tracking-tight text-foreground pt-4">
          How it runs in my homelab
        </h2>
        <p>
          Everything is self-hosted on my local server cluster.
        </p>
        <p>
          For torrenting, all peer traffic is isolated through a <strong>Gluetun WireGuard tunnel</strong> connected to an <strong>Oracle Cloud VPS</strong>. This handles high-bandwidth peer ingress and egress securely without exposing my home IP address.
        </p>
        <p>
          For the web dashboard and live telemetry, the site is published using a secure <strong>Cloudflare Tunnel</strong> (<code className="text-xs font-mono bg-secondary px-1.5 py-0.5 rounded">cloudflared</code>). That gives it edge caching, DDoS protection, and SSL with zero open ports forwarded on my home router.
        </p>

        <h2 className="text-xl font-bold tracking-tight text-foreground pt-4">
          Integrity & privacy
        </h2>
        <p>
          I don&apos;t alter or repackage any files. Every single ISO seeded here is checked against upstream canonical SHA-256 checksums from the official project source. If an image doesn&apos;t match the developer&apos;s cryptographic signature, it doesn&apos;t get seeded.
        </p>
        <p>
          There are zero ads, zero tracking scripts, zero cookies, and zero paywalls. Anyone can download freely directly through their BitTorrent client.
        </p>

        <h2 className="text-xl font-bold tracking-tight text-foreground pt-4">
          Host your own
        </h2>
        <p>
          If you have a homelab, a spare VPS, or unmetered home bandwidth, you should seed too. The entire OpenSeed stack is open source. You can grab the code, inspect it, or deploy your own node from the{" "}
          <a
            href="https://github.com/sudheerbhuvana/openseed"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-foreground underline underline-offset-4 hover:opacity-80"
          >
            GitHub repository
          </a>
          .
        </p>

        {/* Small quiet disclaimer */}
        <div className="pt-8 border-t border-border/80 text-xs text-zinc-500 space-y-2">
          <p>
            <strong>Disclaimer:</strong> Ubuntu, Debian, Arch Linux, Fedora, Linux Mint, Proxmox, and Kali Linux are trademarks of their respective organizations. OpenSeed is an independent community seed node distributing official, unmodified ISO images under standard open-source licenses.
          </p>
        </div>
      </div>
    </article>
  );
}
