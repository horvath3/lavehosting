import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyRunnerSignature } from "@/lib/runner-sig.server";

const schema = z.object({
  server_id: z.string().uuid(),
  cpu_pct: z.number().min(0).max(100),
  ram_mb: z.number().min(0).max(1024 * 1024),
  disk_mb: z.number().min(0).max(1024 * 1024),
  uptime_s: z.number().int().min(0),
});

export const Route = createFileRoute("/api/public/runner/metrics")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RUNNER_SECRET;
        if (!secret) return new Response("RUNNER_SECRET not configured", { status: 500 });
        const raw = await request.text();
        const verify = verifyRunnerSignature(raw, request.headers.get("x-runner-signature"), secret);
        if (!verify.ok) return new Response(`Unauthorized: ${verify.reason}`, { status: 401 });

        let body: z.infer<typeof schema>;
        try { body = schema.parse(JSON.parse(raw)); }
        catch { return new Response("Invalid body", { status: 400 }); }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("server_metrics").insert({
          server_id: body.server_id, cpu_pct: body.cpu_pct, ram_mb: body.ram_mb, disk_mb: body.disk_mb, uptime_s: body.uptime_s,
        });
        return Response.json({ ok: true });
      },
    },
  },
});
