<div align="center">

<img src="./web/public/logos/openseed.png" alt="OpenSeed Logo" width="90" height="90" style="border-radius: 18px;" />

# OpenSeed

An automated BitTorrent seeding node and public mirror portal.

[MIT License](LICENSE) • [Docker Compose](https://www.docker.com/) • [Gluetun](https://github.com/qdm12/gluetun) • [WireGuard](https://github.com/WireGuard/wireguard-tools) • [qBittorrent](https://github.com/qbittorrent/qBittorrent)

</div>

I have a home server with an unlimited broadband connection that stays idle for most of the day with plenty of unused upload speed. Whenever a new Linux distro or Proxmox version is released, the official download mirrors become painfully slow, especially for ARM64 builds which hardly have any active seeders.

I built OpenSeed to automate this entire seeding process 24/7 over WireGuard so I don't have to manage anything manually. It checks for new releases every few hours, downloads the official torrents, verifies SHA256 hashes, and keeps a configured number of active releases per distro. Even when an older version exceeds that limit, it continues seeding until it hits at least a 1.0 share ratio, so nothing gets deleted prematurely.

Putting this Docker Compose setup here in case anyone else wants to run a seeding node on their home server or NAS.

---

## How It Works

Running a 24/7 seeding node from a home connection usually has two main problems:
1. **CGNAT and Port Forwarding:** Most home broadband connections in India and elsewhere are behind CGNAT without a dedicated public IP, which makes incoming peer connections difficult.
2. **Homelab Privacy:** Opening ports on your home router directly exposes your home IP address to everyone in the torrent swarm.

OpenSeed handles this by routing all BitTorrent traffic through an outbound WireGuard VPN tunnel:

* **Zero Inbound Ports on Your Home Router:** The container connects outbound to a WireGuard endpoint (like a cloud VPS or VPN service). Because the connection starts from inside your home network, it bypasses CGNAT and router firewalls without needing any port forwarding on your Wi-Fi router.
* **Inbound and Outbound Swarm Traffic:** All peer traffic goes through the WireGuard tunnel, keeping your real home IP, ISP, and internal network completely hidden.
* **Strict Killswitch:** If the VPN connection drops for any reason, all torrent traffic is blocked immediately at the firewall level. Nothing leaks over your home internet connection.

---

## Docker Compose Stack & Containers

The stack consists of three lightweight containers:

1. **[`gluetun`](https://github.com/qdm12/gluetun) (WireGuard Client & Killswitch):** Connects to your [WireGuard](https://github.com/WireGuard/wireguard-tools) server and acts as the network gateway for the torrent client. If the VPN disconnects, its firewall blocks all traffic instantly.
2. **[`qbittorrent`](https://github.com/qbittorrent/qBittorrent) (Headless Seeder):** Runs directly inside Gluetun's network namespace (`network_mode: service:gluetun`), so it has no direct access to your local home network. It handles downloading and seeding ISOs 24/7.
3. **`web` (Web Dashboard & Automated Scraper):** The web UI and background worker. It periodically checks official release pages for new ISOs, adds them to qBittorrent, verifies SHA256 hashes into a local SQLite database, maintains a configured number of versions per distro, and only removes older excess releases after they have reached at least a 1.0 share ratio.

---

## What It Tracks & Seeds

OpenSeed tracks the latest stable, LTS, and rolling releases directly from official upstream release tracking pages. When an upstream project releases a new version, the background worker automatically updates the active torrents without needing manual intervention:

* **Canonical (Ubuntu):**
  * Desktop and Server LTS: tracked via [Canonical Releases Portal](https://releases.ubuntu.com/)
  * ARM64 Server and Daily Builds: tracked via [Ubuntu CDImage Repository](https://cdimage.ubuntu.com/)
* **The Debian Project (Debian):**
  * Minimal network installer images (Netinst for x86_64 and ARM64): tracked via [Debian CDImage Torrents](https://cdimage.debian.org/debian-cd/current/)
* **Arch Linux:**
  * Latest monthly rolling snapshot (x86_64): tracked via [Arch Linux RelEng API](https://archlinux.org/releng/releases/json/) and [Arch Download Mirror](https://archlinux.org/download/)
* **Fedora Project (Red Hat Community):**
  * Fedora Workstation: tracked via [Fedora Torrent Repository](https://torrent.fedoraproject.org/)
* **Linux Mint:**
  * Linux Mint Cinnamon edition: tracked via [Linux Mint Download Portal](https://www.linuxmint.com/download.php)
* **OffSec (Kali Linux):**
  * Kali Linux installer: tracked via [OffSec CDImage Mirrors](https://cdimage.kali.org/current/)
* **Proxmox Server Solutions:**
  * Proxmox VE (x86_64 and ARM64), Proxmox Backup Server, and Proxmox Datacenter Manager: tracked via [Proxmox Enterprise Downloads](https://www.proxmox.com/en/downloads)
* **Alpine Linux:**
  * Alpine Linux Standard: tracked via [Alpine Linux Releases](https://alpinelinux.org/downloads/)

---

## Running Your Own Node

If you want to run this in your own setup:

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/openseed.git
   cd openseed
   ```
2. Copy the example configuration:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` with your settings:
   * Add your WireGuard client details (endpoint IP, client private key, server public key, assigned tunnel IP, and listening port).
   * Set your own `ADMIN_PASSWORD` and `CRON_SECRET`.
4. Start the containers:
   ```bash
   docker compose up -d --build
   ```

The dashboard will be live at `http://localhost:3000` (or your server's LAN IP). You can log into `/admin` to see live storage usage, check sync history, or manually add any torrents you want.

---

This setup works well for my own homelab, but this might not be the single best way to do everything. If you know a better way to handle any part of this, or if you spot any bugs, please let me know. Always happy to discuss improvements, fix any issues, or accept pull requests!
