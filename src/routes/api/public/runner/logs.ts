import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyRunnerSignature } from "@/lib/runner-sig.server";

const schema = z.object({
  server_id: z.string().uuid(),
  entries: z.array(z.object({
    level: z.enum(["stdout", "stderr", "system"]).default("stdout"),
    message: z.string().max(8000),
    ts: z.string().datetime().optional(),
  })).min(1).max(200),
});

export const Route = createFileRoute("/api/public/runner/logs")({
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
        await supabaseAdmin.from("server_logs").insert(
          body.entries.map((e) => ({ server_id: body.server_id, level: e.level, message: e.message, ts: e.ts ?? new Date().toISOString() })),
        );
        return Response.json({ ok: true });
      },
    },
  },
});
