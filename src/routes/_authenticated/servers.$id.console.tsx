import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Send, Loader2, Trash } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getServerLogs, sendConsoleCommand } from "@/lib/servers.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/servers/$id/console")({
  component: ConsolePage,
});

type LogRow = { id: number; level: "stdout" | "stderr" | "system"; message: string; ts: string };

function ConsolePage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const logsFn = useServerFn(getServerLogs);
  const cmdFn = useServerFn(sendConsoleCommand);

  const q = useQuery({ queryKey: ["logs", id], queryFn: () => logsFn({ data: { id, limit: 300 } }) });
  const [localLogs, setLocalLogs] = useState<LogRow[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (q.data) setLocalLogs(q.data as LogRow[]); }, [q.data]);

  useEffect(() => {
    const ch = supabase
      .channel(`logs-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "server_logs", filter: `server_id=eq.${id}` }, (payload) => {
        setLocalLogs((l) => [...l, payload.new as LogRow].slice(-500));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [localLogs.length]);

  const send = useMutation({
    mutationFn: () => cmdFn({ data: { server_id: id, command: input } }),
    onSuccess: () => { setInput(""); qc.invalidateQueries({ queryKey: ["logs", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function colorFor(level: string) {
    if (level === "stderr") return "text-[oklch(0.78_0.20_25)]";
    if (level === "system") return "text-[oklch(0.78_0.13_210)]";
    return "text-[oklch(0.92_0.03_280)]";
  }

  return (
    <div className="space-y-3">
      <div className="glass-strong overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-[oklch(0.72_0.18_155)] animate-pulse" />
            <span className="text-muted-foreground">Live console · realtime</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setLocalLogs([])}><Trash className="mr-1 h-3.5 w-3.5" />Clear view</Button>
        </div>
        <div className="h-[60vh] overflow-y-auto bg-[oklch(0.10_0.03_280)] p-4 font-mono text-xs leading-relaxed">
          {localLogs.length === 0 && <div className="text-muted-foreground">No output yet. Start your server to see logs.</div>}
          {localLogs.map((l) => (
            <div key={l.id} className={`whitespace-pre-wrap ${colorFor(l.level)}`}>
              <span className="text-muted-foreground/60">[{new Date(l.ts).toLocaleTimeString()}]</span> {l.message}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) send.mutate(); }} className="flex gap-2">
        <span className="grid place-items-center px-2 text-[oklch(0.85_0.15_290)] font-mono">$</span>
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Send command to bot…" className="flex-1 bg-white/5 font-mono" maxLength={500} />
        <Button type="submit" disabled={send.isPending || !input.trim()} className="bg-gradient-to-r from-[oklch(0.66_0.22_296)] to-[oklch(0.62_0.20_258)] text-white">
          {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
