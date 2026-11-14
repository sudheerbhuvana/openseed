import { getNodeStats } from "@/lib/node-stats";
import HomeClient from "@/components/home-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let initialStats = null;
  try {
    initialStats = await getNodeStats(false);
  } catch (err) {
    console.warn("[OpenSeed] Failed to retrieve server-side initial stats:", err);
  }

  return <HomeClient initialStats={initialStats} />;
}
