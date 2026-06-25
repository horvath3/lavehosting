import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runnerRequest } from "@/lib/runner/client.server";
import { toAppServer } from "@/lib/runner/adapters";
import type { DashboardSnapshot } from "@/lib/runner/types";

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const dashboard = await runnerRequest<DashboardSnapshot>("/api/v1/dashboard");

    return {
      ...dashboard,
      servers: dashboard.servers.map(toAppServer)
    };
  });
