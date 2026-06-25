import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppSettings = {
  provision_min_seconds: number;
  provision_max_seconds: number;
  provision_overload_seconds: number;
};

const DEFAULTS: AppSettings = {
  provision_min_seconds: 180,
  provision_max_seconds: 240,
  provision_overload_seconds: 900,
};

/** Publicly readable — used by the provisioning overlay and admin form. */
export const getAppSettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data } = await supabase
      .from("app_settings")
      .select("provision_min_seconds, provision_max_seconds, provision_overload_seconds")
      .eq("id", true)
      .maybeSingle();
    return (data as AppSettings | null) ?? DEFAULTS;
  } catch {
    return DEFAULTS;
  }
});

const settingsSchema = z.object({
  provision_min_seconds: z.number().int().min(5).max(3600),
  provision_max_seconds: z.number().int().min(5).max(3600),
  provision_overload_seconds: z.number().int().min(30).max(7200),
});

export const updateAppSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => settingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Admin-only via RLS; double-check here to give a clear error.
    const { data: role } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden: admin role required");
    if (data.provision_min_seconds > data.provision_max_seconds)
      throw new Error("min must be ≤ max");

    const { error } = await supabase
      .from("app_settings")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
