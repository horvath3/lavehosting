import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listServers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("servers")
      .select("id, name, description, runtime, status, started_at, created_at, updated_at, cpu_limit_pct, ram_limit_mb, disk_limit_mb")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getServer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: server, error } = await supabase
      .from("servers")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!server) throw new Error("Server not found");

    const { data: metric } = await supabase
      .from("server_metrics")
      .select("*")
      .eq("server_id", data.id)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return { server, metric };
  });

const createServerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(280).optional(),
  runtime: z.enum(["nodejs", "python"]),
});

export const createServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createServerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { count } = await supabase.from("servers").select("id", { count: "exact", head: true }).eq("owner_id", userId);
    if ((count ?? 0) >= 3) throw new Error("Free tier limit: 3 servers per account");

    // Pull provisioning duration window from app_settings; admin can tune it.
    const { data: settings } = await supabase
      .from("app_settings")
      .select("provision_min_seconds, provision_max_seconds")
      .eq("id", true)
      .maybeSingle();
    const minS = settings?.provision_min_seconds ?? 180;
    const maxS = settings?.provision_max_seconds ?? 240;
    const duration = Math.floor(minS + Math.random() * Math.max(1, maxS - minS + 1));

    const entryFile = data.runtime === "nodejs" ? "index.js" : "main.py";
    const { data: created, error } = await supabase
      .from("servers")
      .insert({
        owner_id: userId,
        name: data.name,
        description: data.description ?? null,
        runtime: data.runtime,
        status: "creating",
        entry_file: entryFile,
        provisioning_started_at: new Date().toISOString(),
        provisioning_duration_s: duration,
        provisioned: false,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const starter = data.runtime === "nodejs"
      ? "// Lave Hosting — Node.js Discord bot starter\nconsole.log('Hello from Lave Hosting!');\n"
      : "# Lave Hosting — Python Discord bot starter\nprint('Hello from Lave Hosting!')\n";

    await supabase.from("server_files").insert({
      server_id: created.id,
      path: entryFile,
      is_dir: false,
      size_bytes: starter.length,
      mime: "text/plain",
      storage_key: `${created.id}/${entryFile}`,
    });

    await supabase.storage.from("server-files").upload(`${created.id}/${entryFile}`, new Blob([starter], { type: "text/plain" }), { upsert: true });

    return created;
  });

/**
 * Called by the client when its provisioning timer completes.
 * Server guard: only flips `provisioned=true` after the configured duration
 * has actually elapsed, so the animation can't be skipped client-side.
 */
export const completeProvisioning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: srv, error } = await supabase
      .from("servers")
      .select("id, provisioning_started_at, provisioning_duration_s, provisioned")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !srv) throw new Error("Server not found");
    if (srv.provisioned) return { ok: true };
    if (!srv.provisioning_started_at) return { ok: true };
    const elapsed = (Date.now() - new Date(srv.provisioning_started_at).getTime()) / 1000;
    if (elapsed + 2 < (srv.provisioning_duration_s ?? 0)) {
      throw new Error("Provisioning still in progress");
    }
    await supabase
      .from("servers")
      .update({ provisioned: true, status: "stopped" })
      .eq("id", data.id);
    return { ok: true };
  });

export const deleteServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // List + remove storage objects
    const { data: list } = await supabase.storage.from("server-files").list(data.id, { limit: 1000 });
    if (list && list.length) {
      await supabase.storage.from("server-files").remove(list.map((o) => `${data.id}/${o.name}`));
    }
    const { error } = await supabase.from("servers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const enqueueCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      server_id: z.string().uuid(),
      kind: z.enum(["start", "stop", "restart", "exec", "sync_files"]),
      payload: z.record(z.unknown()).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("server_commands").insert({
      server_id: data.server_id,
      kind: data.kind,
      payload: (data.payload ?? null) as any,
      created_by: userId,
    });
    if (error) throw new Error(error.message);

    // Optimistic status update; runner will overwrite via ack webhook.
    if (data.kind === "start") {
      await supabase.from("servers").update({ status: "starting" }).eq("id", data.server_id);
    } else if (data.kind === "stop") {
      await supabase.from("servers").update({ status: "stopping" }).eq("id", data.server_id);
    } else if (data.kind === "restart") {
      await supabase.from("servers").update({ status: "starting" }).eq("id", data.server_id);
    }

    // Demo: synthesize a log line so the console shows activity even without a runner.
    await supabase.from("server_logs").insert({
      server_id: data.server_id,
      level: "system",
      message: `[system] queued ${data.kind} command`,
    });

    return { ok: true };
  });

export const getServerMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows } = await supabase
      .from("server_metrics")
      .select("cpu_pct, ram_mb, disk_mb, uptime_s, recorded_at")
      .eq("server_id", data.id)
      .order("recorded_at", { ascending: false })
      .limit(60);
    return rows ?? [];
  });

export const getServerLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), limit: z.number().int().min(1).max(500).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows } = await supabase
      .from("server_logs")
      .select("id, level, message, ts")
      .eq("server_id", data.id)
      .order("ts", { ascending: false })
      .limit(data.limit ?? 200);
    return (rows ?? []).reverse();
  });

export const sendConsoleCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ server_id: z.string().uuid(), command: z.string().min(1).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("server_commands").insert({
      server_id: data.server_id,
      kind: "exec",
      payload: { command: data.command },
      created_by: userId,
    });
    await supabase.from("server_logs").insert({
      server_id: data.server_id,
      level: "system",
      message: `> ${data.command}`,
    });
    return { ok: true };
  });
