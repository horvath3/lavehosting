import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyRunnerSignature } from "@/lib/runner-sig.server";

/**
 * Runner -> control panel: long-poll for pending commands.
 * Body: { runner_id?: string }
 * Returns: { commands: [{ id, server_id, kind, payload }] }
 */
export const Route = createFileRoute("/api/public/runner/poll")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RUNNER_SECRET;
        if (!secret) return new Response("RUNNER_SECRET not configured", { status: 500 });
        const raw = await request.text();
        const verify = verifyRunnerSignature(raw, request.headers.get("x-runner-signature"), secret);
        if (!verify.ok) return new Response(`Unauthorized: ${verify.reason}`, { status: 401 });

        try { z.object({ runner_id: z.string().optional() }).parse(JSON.parse(raw || "{}")); }
        catch { return new Response("Invalid body", { status: 400 }); }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("server_commands")
          .select("id, server_id, kind, payload")
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(20);
        if (error) return Response.json({ error: error.message }, { status: 500 });

        if (data && data.length) {
          await supabaseAdmin.from("server_commands")
            .update({ status: "running" })
            .in("id", data.map((c) => c.id));
        }
        return Response.json({ commands: data ?? [] });
      },
    },
  },
});
