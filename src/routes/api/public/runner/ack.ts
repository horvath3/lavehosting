import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyRunnerSignature } from "@/lib/runner-sig.server";

const ackSchema = z.object({
  command_id: z.string().uuid(),
  server_id: z.string().uuid(),
  status: z.enum(["done", "failed"]),
  result: z.record(z.unknown()).optional(),
  server_status: z.enum(["stopped", "starting", "running", "stopping", "crashed"]).optional(),
  container_id: z.string().optional(),
});

export const Route = createFileRoute("/api/public/runner/ack")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RUNNER_SECRET;
        if (!secret) return new Response("RUNNER_SECRET not configured", { status: 500 });
        const raw = await request.text();
        const verify = verifyRunnerSignature(raw, request.headers.get("x-runner-signature"), secret);
        if (!verify.ok) return new Response(`Unauthorized: ${verify.reason}`, { status: 401 });

        let body: z.infer<typeof ackSchema>;
        try { body = ackSchema.parse(JSON.parse(raw)); }
        catch (e) { return new Response(`Invalid body: ${(e as Error).message}`, { status: 400 }); }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("server_commands").update({
          status: body.status,
          result: (body.result ?? null) as any,
          finished_at: new Date().toISOString(),
        }).eq("id", body.command_id);

        if (body.server_status || body.container_id) {
          const patch: Record<string, unknown> = {};
          if (body.server_status) patch.status = body.server_status;
          if (body.container_id) patch.container_id = body.container_id;
          if (body.server_status === "running") patch.started_at = new Date().toISOString();
          await supabaseAdmin.from("servers").update(patch as any).eq("id", body.server_id);
        }
        return Response.json({ ok: true });
      },
    },
  },
});
