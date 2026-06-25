import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Users, Server, Activity, Ban, Trash2 } from "lucide-react";
import { adminStats, adminListUsers, adminListServers, adminBanUser, adminDeleteServer } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const statsFn = useServerFn(adminStats);
  const usersFn = useServerFn(adminListUsers);
  const serversFn = useServerFn(adminListServers);
  const banFn = useServerFn(adminBanUser);
  const delFn = useServerFn(adminDeleteServer);
  const qc = useQueryClient();

  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: statsFn });
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: usersFn });
  const servers = useQuery({ queryKey: ["admin", "servers"], queryFn: serversFn });

  const ban = useMutation({
    mutationFn: (v: { user_id: string; banned: boolean }) => banFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "users"] }); toast.success("Updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delSrv = useMutation({
    mutationFn: (server_id: string) => delFn({ data: { server_id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "servers"] }); toast.success("Server deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (stats.error) {
    return <div className="mx-auto max-w-2xl rounded-2xl glass-strong p-8 text-center">
      <h1 className="font-display text-xl font-semibold">Access denied</h1>
      <p className="mt-2 text-sm text-muted-foreground">{(stats.error as Error).message}</p>
    </div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Admin panel</h1>
        <p className="text-sm text-muted-foreground">Platform-wide management.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat icon={Users} label="Users" value={stats.data?.users ?? 0} />
        <Stat icon={Server} label="Servers" value={stats.data?.servers ?? 0} />
        <Stat icon={Activity} label="Running" value={stats.data?.running ?? 0} />
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="bg-white/5">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="servers">Servers</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="glass-strong rounded-2xl">
          <Table>
            <TableHeader><TableRow><TableHead>Username</TableHead><TableHead>Display name</TableHead><TableHead>Joined</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {users.data?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono">{u.username}</TableCell>
                  <TableCell>{u.display_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{u.banned ? <span className="text-destructive">Banned</span> : <span className="text-[oklch(0.85_0.18_155)]">Active</span>}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => ban.mutate({ user_id: u.id, banned: !u.banned })}>
                      <Ban className="mr-1 h-3.5 w-3.5" />{u.banned ? "Unban" : "Ban"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="servers" className="glass-strong rounded-2xl">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Runtime</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {servers.data?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.runtime}</TableCell>
                  <TableCell className="font-mono text-xs">{s.status}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { if (confirm(`Delete ${s.name}?`)) delSrv.mutate(s.id); }}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" />Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground"><span>{label}</span><Icon className="h-4 w-4" /></div>
      <div className="mt-3 font-display text-3xl font-bold">{value.toLocaleString()}</div>
    </div>
  );
}
