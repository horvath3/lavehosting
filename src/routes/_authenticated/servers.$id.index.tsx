import { createFileRoute } from "@tanstack/react-router";
import { Play, Square, RotateCcw, Cpu, MemoryStick, HardDrive, Clock, Loader2, type LucideIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getServer, enqueueCommand } from "@/lib/servers.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/servers/$id/")({
  component: ServerOverview,
});

function ServerOverview() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getServer);
  const cmdFn = useServerFn(enqueueCommand);
  const q = useQuery({ queryKey: ["server", id], queryFn: () => getFn({ data: { id } }), refetchInterval: 4000 });

  const cmd = useMutation({
    mutationFn: (kind: "start" | "stop" | "restart") => cmdFn({ data: { server_id: id, kind } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["server", id] }); toast.success("Command queued"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const m = q.data?.metric;
  const s = q.data?.server;
  const cpu = m?.cpu_pct ?? 0;
  const ram = m?.ram_mb ?? 0;
  const disk = m?.disk_mb ?? 0;
  const uptime = m?.uptime_s ?? 0;

  return (
    <div className="space-y-6">
      <div className="glass-strong rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => cmd.mutate("start")} disabled={cmd.isPending || s?.status === "running"} className="bg-[oklch(0.72_0.18_155)] text-white hover:opacity-90">
            {cmd.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}Start
          </Button>
          <Button onClick={() => cmd.mutate("stop")} disabled={cmd.isPending || s?.status === "stopped"} variant="outline" className="border-white/15 bg-white/5 hover:bg-white/10">
            <Square className="mr-2 h-4 w-4" />Stop
          </Button>
          <Button onClick={() => cmd.mutate("restart")} disabled={cmd.isPending} variant="outline" className="border-white/15 bg-white/5 hover:bg-white/10">
            <RotateCcw className="mr-2 h-4 w-4" />Restart
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={Cpu} label="CPU" value={`${cpu.toFixed(1)}%`} pct={cpu / (s?.cpu_limit_pct || 100)} />
        <MetricCard icon={MemoryStick} label="RAM" value={`${ram.toFixed(0)} MB`} pct={ram / (s?.ram_limit_mb || 1)} />
        <MetricCard icon={HardDrive} label="Disk" value={`${disk.toFixed(0)} MB`} pct={disk / (s?.disk_limit_mb || 1)} />
        <MetricCard icon={Clock} label="Uptime" value={formatUptime(uptime)} pct={null} />
      </div>

      <div className="glass-strong rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold">Server info</h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Row k="Runtime" v={s?.runtime?.toUpperCase() ?? "—"} />
          <Row k="Entry file" v={s?.entry_file ?? "—"} />
          <Row k="CPU limit" v={`${s?.cpu_limit_pct ?? "—"}%`} />
          <Row k="RAM limit" v={`${s?.ram_limit_mb ?? "—"} MB`} />
          <Row k="Disk limit" v={`${s?.disk_limit_mb ?? "—"} MB`} />
          <Row k="Created" v={s?.created_at ? new Date(s.created_at).toLocaleString() : "—"} />
        </dl>
        {!m && (
          <p className="mt-4 rounded-lg bg-white/5 px-3 py-2 text-xs text-muted-foreground">
            No metrics yet — connect a runner backend or wait for the next push. See <code>docs/runner/README.md</code>.
          </p>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, pct }: { icon: LucideIcon; label: string; value: string; pct: number | null }) {
  const filled = pct === null ? 0 : Math.min(100, Math.max(0, pct * 100));
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground"><span>{label}</span><Icon className="h-3.5 w-3.5" /></div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      {pct !== null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-gradient-to-r from-[oklch(0.66_0.22_296)] to-[oklch(0.62_0.20_258)] transition-all" style={{ width: `${filled}%` }} />
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between border-b border-white/5 py-1.5"><dt className="text-muted-foreground">{k}</dt><dd className="font-mono">{v}</dd></div>;
}

function formatUptime(s: number): string {
  if (!s) return "—";
  const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}
