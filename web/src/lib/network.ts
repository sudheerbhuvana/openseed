import dns from "node:dns";
import { setGlobalDispatcher, Agent } from "undici";

let initialized = false;

export function ensureNetworkConfigured() {
  if (initialized) return;
  initialized = true;

  try {
    // Prefer IPv4 first to prevent dual-stack Happy Eyeballs timeouts on LANs
    dns.setDefaultResultOrder("ipv4first");

    // Configure undici global dispatcher to resolve IPv4 addresses
    setGlobalDispatcher(
      new Agent({
        connect: {
          lookup: (hostname, options, callback) => {
            dns.lookup(hostname, { ...options, family: 4 }, callback);
          },
          timeout: 15000,
        },
      })
    );
  } catch (err) {
    console.warn("[OpenSeed] Failed to set global network dispatcher:", err);
  }
}

// Auto-run on module load
ensureNetworkConfigured();

