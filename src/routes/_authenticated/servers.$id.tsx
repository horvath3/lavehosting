import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, FolderTree, Settings as Cog, Terminal, LayoutDashboard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getServer } from "@/lib/servers.functions";
import { StatusBadge } from "./dashboard";

export const Route = createFileRoute("/_authenticated/servers/$id")({
  component: ServerLayout,
});

function ServerLayout() {
  const { id } = Route.useParams();
  const getFn = useServerFn(getServer);
  const q = useQuery({ queryKey: ["server", id], queryFn: () => getFn({ data: { id } }), refetchInterval: 5000 });
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const tabs = [
    { to: `/servers/${id}`, label: "Overview", icon: LayoutDashboard, exact: true },
    { to: `/servers/${id}/files`, label: "Files", icon: FolderTree },
    { to: `/servers/${id}/console`, label: "Console", icon: Terminal },
    { to: `/servers/${id}/settings`, label: "Settings", icon: Cog },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link to="/servers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Back to servers</Link>

      <div className="glass-strong rounded-2xl p-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold sm:text-3xl">{q.data?.server.name ?? "Loading…"}</h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">{q.data?.server.description ?? q.data?.server.runtime?.toUpperCase()}</p>
          </div>
          <div className="shrink-0">{q.data && <StatusBadge status={q.data.server.status} />}</div>
        </div>

        <nav className="mt-5 flex flex-wrap gap-1 border-t border-white/5 pt-4">
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.to : pathname === t.to || pathname.startsWith(t.to + "/");
            return (
              <Link key={t.to} to={t.to as any} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${active ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}>
                <t.icon className="h-3.5 w-3.5" />{t.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <Outlet />
    </div>
  );
}
