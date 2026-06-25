import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Server, Plus, Activity, Cpu, MemoryStick, ArrowUpRight, type LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getDashboard } from "@/lib/dashboard.functions";
import { getMe } from "@/lib/account.functions";
import { toAppServer } from "@/lib/runner/adapters";
import { getRunnerSocket } from "@/lib/runner/socket";
import type { DashboardSnapshot } from "@/lib/runner/types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const meFn = useServerFn(getMe);
  const dashboardFn = useServerFn(getDashboard);
  const me = useQuery({ queryKey: ["me"], queryFn: meFn });
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: dashboardFn, refetchInterval: 5000 });
  const [liveDashboard, setLiveDashboard] = useState<typeof dashboard.data | null>(null);

  useEffect(() => {
    const socket = getRunnerSocket();
    const onDashboardUpdate = (snapshot: DashboardSnapshot) => {
      setLiveDashboard({
        ...snapshot,
        servers: snapshot.servers.map(toAppServer)
      });
    };

    socket.emit("dashboard:subscribe");
    socket.on("dashboard:update", onDashboardUpdate);

    return () => {
      socket.emit("dashboard:unsubscribe");
      socket.off("dashboard:update", onDashboardUpdate);
    };
  }, []);

  const dashboardData = liveDashboard ?? dashboard.data;
  const servers = dashboardData?.servers ?? [];
  const total = servers.length;
  const running = servers.filter((s) => s.status === "running").length;
  const stopped = total - running;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Welcome back, <span className="gradient-text">{me.data?.profile?.display_name ?? me.data?.profile?.username ?? "dev"}</span>
          </h1>
          <p className="text-sm text-muted-foreground">Here's what's happening with your servers.</p>
        </div>
        <Link to="/servers"><Button className="bg-gradient-to-r from-[oklch(0.66_0.22_296)] to-[oklch(0.62_0.20_258)] text-white"><Plus className="mr-2 h-4 w-4" />New server</Button></Link>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Server} label="Total servers" value={total} />
        <StatCard icon={Activity} label="Running" value={running} accent="success" />
        <StatCard icon={Cpu} label="Stopped" value={stopped} />
        <StatCard icon={MemoryStick} label="Quota" value={`${total}/3`} />
      </div>

      <div className="glass-strong rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Your servers</h2>
          <Link to="/servers" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">View all <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </div>
        {dashboard.isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>
        ) : !servers.length ? (
          <EmptyServers />
        ) : (
          <div className="space-y-2">
            {servers.slice(0, 5).map((s) => (
              <Link key={s.id} to="/servers/$id" params={{ id: s.id }} className="flex items-center justify-between rounded-xl border border-white/5 p-3 transition-colors hover:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[oklch(0.66_0.22_296/0.25)] to-[oklch(0.62_0.20_258/0.25)]"><Server className="h-4 w-4" /></div>
                  <div>
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.runtime.toUpperCase()}</div>
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: LucideIcon; label: string; value: number | string; accent?: "success" }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground"><span>{label}</span><Icon className="h-4 w-4" /></div>
      <div className={`mt-3 font-display text-3xl font-bold ${accent === "success" ? "text-[oklch(0.85_0.18_155)]" : ""}`}>{value}</div>
    </motion.div>
  );
}

function EmptyServers() {
  return (
    <div className="py-10 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[oklch(0.66_0.22_296/0.3)] to-[oklch(0.62_0.20_258/0.3)]"><Server className="h-6 w-6" /></div>
      <h3 className="mt-4 font-display text-lg font-semibold">No servers yet</h3>
      <p className="mt-1 text-sm text-muted-foreground">Spin up your first Discord bot in under a minute.</p>
      <Link to="/servers" className="mt-5 inline-block"><Button className="bg-gradient-to-r from-[oklch(0.66_0.22_296)] to-[oklch(0.62_0.20_258)] text-white"><Plus className="mr-2 h-4 w-4" />Create your first server</Button></Link>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    running: { color: "bg-[oklch(0.72_0.18_155/0.18)] text-[oklch(0.85_0.18_155)]", label: "Running" },
    stopped: { color: "bg-white/8 text-muted-foreground", label: "Stopped" },
    starting: { color: "bg-[oklch(0.80_0.17_80/0.18)] text-[oklch(0.85_0.17_80)]", label: "Starting" },
    stopping: { color: "bg-[oklch(0.80_0.17_80/0.18)] text-[oklch(0.85_0.17_80)]", label: "Stopping" },
    crashed: { color: "bg-destructive/20 text-destructive", label: "Crashed" },
    creating: { color: "bg-white/8 text-muted-foreground", label: "Creating" },
    deleting: { color: "bg-destructive/15 text-destructive", label: "Deleting" },
  };
  const v = map[status] ?? map.stopped;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${v.color}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />{v.label}
  </span>;
}
