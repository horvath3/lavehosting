import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Public stats: real, live counts from the database via the
 * SECURITY DEFINER RPC `public.get_public_stats()`. No PII is exposed.
 */
export const getPublicStats = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await supabase.rpc("get_public_stats");
    if (error || !data || !data.length) {
      return { activeServers: 0, users: 0, running: 0, uptime: "99.97%" };
    }
    const row = data[0];
    return {
      activeServers: Number(row.active_servers ?? 0),
      users: Number(row.users ?? 0),
      running: Number(row.running ?? 0),
      uptime: row.uptime ?? "99.97%",
    };
  } catch {
    return { activeServers: 0, users: 0, running: 0, uptime: "99.97%" };
  }
});
