import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name, avatar_url, banned, created_at, preferred_locale").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    return {
      userId,
      email: (claims.email as string | undefined) ?? null,
      profile,
      roles: (roles ?? []).map((r) => r.role) as Array<"admin" | "user">,
    };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      display_name: z.string().trim().min(1).max(80).optional(),
      username: z.string().trim().min(2).max(40).regex(/^[a-zA-Z0-9_.-]+$/).optional(),
      avatar_url: z.string().url().max(500).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("profiles").update(data).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateLocale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ locale: z.enum(["hu", "en"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ preferred_locale: data.locale })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
