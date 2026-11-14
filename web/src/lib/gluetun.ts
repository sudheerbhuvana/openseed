import { qbit } from "@/lib/qbittorrent";

export interface GluetunStatus {
  status: "running" | "connected" | "unreachable";
  vpnType: string;
  publicIp?: string;
  country?: string;
  region?: string;
  city?: string;
  organization?: string;
  dhtNodes?: number;
  connectionStatus?: "connected" | "firewalled" | "disconnected" | "unknown";
  endpointIp?: string;
  seedingPort?: number;
}

export async function getGluetunStatus(): Promise<GluetunStatus> {
  const gluetunUrl = process.env.GLUETUN_API_URL || "http://gluetun:8000";
  let status: "running" | "connected" | "unreachable" = "unreachable";
  let publicIp: string | undefined;
  let country: string | undefined;
  let region: string | undefined;
  let city: string | undefined;
  let organization: string | undefined;

  // 1. Try querying Gluetun's built-in HTTP control server (/v1/vpn/status and /v1/publicip/ip)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const [vpnRes, ipRes] = await Promise.all([
      fetch(`${gluetunUrl}/v1/vpn/status`, { signal: controller.signal, cache: "no-store" }).catch(() => null),
      fetch(`${gluetunUrl}/v1/publicip/ip`, { signal: controller.signal, cache: "no-store" }).catch(() => null),
    ]);
    clearTimeout(timeout);

    if (vpnRes && vpnRes.ok) {
      const vpnJson = await vpnRes.json().catch(() => null);
      if (vpnJson?.status === "running") {
        status = "running";
      }
    }

    if (ipRes && ipRes.ok) {
      const ipJson = await ipRes.json().catch(() => null);
      if (ipJson) {
        publicIp = ipJson.public_ip || ipJson.ip;
        country = ipJson.country;
        region = ipJson.region;
        city = ipJson.city;
        organization = ipJson.organization;
      }
    }
  } catch {
    // Gluetun control port not mapped or not reachable
  }

  // 2. Fetch qBittorrent's live server state (since qBittorrent runs directly inside Gluetun container)
  let dhtNodes: number | undefined;
  let connectionStatus: GluetunStatus["connectionStatus"] = "unknown";

  try {
    const rawState = await qbit.getRawServerState();
    if (rawState) {
      dhtNodes = typeof rawState.dht_nodes === "number" ? rawState.dht_nodes : undefined;
      if (rawState.connection_status === "connected") connectionStatus = "connected";
      else if (rawState.connection_status === "firewalled") connectionStatus = "firewalled";
      else if (rawState.connection_status === "disconnected") connectionStatus = "disconnected";

      // Dynamically extract tunnel-reported external IP (v4 or v6)
      const extIp = rawState.last_external_address_v4 || rawState.last_external_address_v6 || rawState.external_ip;
      if (!publicIp && extIp) {
        publicIp = extIp;
      }

      // If qBittorrent is connected to peers/DHT inside Gluetun, mark tunnel as connected
      if (status === "unreachable" && (connectionStatus === "connected" || (dhtNodes && dhtNodes > 0))) {
        status = "connected";
      }
    }
  } catch {
    // qBittorrent offline
  }

  const envPort = process.env.SEEDING_PORT ? parseInt(process.env.SEEDING_PORT, 10) : undefined;
  const endpointIp = process.env.WIREGUARD_ENDPOINT_IP || undefined;
  const vpnType = process.env.VPN_TYPE || "WireGuard";

  if (!publicIp && endpointIp) {
    publicIp = endpointIp;
  }
  if (status === "unreachable" && endpointIp) {
    status = "running";
  }

  return {
    status,
    vpnType,
    publicIp,
    country,
    region,
    city,
    organization,
    dhtNodes,
    connectionStatus,
    endpointIp,
    seedingPort: envPort || 51413,
  };
}
