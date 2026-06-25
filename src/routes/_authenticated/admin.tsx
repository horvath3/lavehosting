import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Users, Server, Activity, Ban, Trash2, Loader2, Settings as SettingsIcon } from "lucide-react";
import { adminStats, adminListUsers, adminListServers, adminBanUser, adminDeleteServer } from "@/lib/admin.functions";
import { getAppSettings, updateAppSettings } from "@/lib/app-settings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const t = useT();
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
        <h1 className="font-display text-3xl font-bold">{t("admin.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat icon={Users} label={t("admin.users")} value={stats.data?.users ?? 0} />
        <Stat icon={Server} label={t("admin.servers")} value={stats.data?.servers ?? 0} />
        <Stat icon={Activity} label={t("admin.running")} value={stats.data?.running ?? 0} />
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="bg-white/5">
          <TabsTrigger value="users">{t("admin.users")}</TabsTrigger>
          <TabsTrigger value="servers">{t("admin.servers")}</TabsTrigger>
          <TabsTrigger value="settings"><SettingsIcon className="mr-1.5 h-3.5 w-3.5" />{t("admin.settings")}</TabsTrigger>
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
        <TabsContent value="settings">
          <ProvisioningSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProvisioningSettings() {
  const t = useT();
  const qc = useQueryClient();
  const getFn = useServerFn(getAppSettings);
  const setFn = useServerFn(updateAppSettings);
  const s = useQuery({ queryKey: ["app-settings"], queryFn: getFn });

  const [minS, setMinS] = useState(180);
  const [maxS, setMaxS] = useState(240);
  const [overload, setOverload] = useState(900);

  useEffect(() => {
    if (s.data) {
      setMinS(s.data.provision_min_seconds);
      setMaxS(s.data.provision_max_seconds);
      setOverload(s.data.provision_overload_seconds);
    }
  }, [s.data]);

  const save = useMutation({
    mutationFn: () => setFn({ data: { provision_min_seconds: minS, provision_max_seconds: maxS, provision_overload_seconds: overload } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["app-settings"] }); toast.success(t("admin.provisioning.saved")); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="glass-strong space-y-5 rounded-2xl p-6">
      <div>
        <h3 className="font-display text-lg font-semibold">{t("admin.provisioning.title")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin.provisioning.body")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>{t("admin.provisioning.min")}</Label>
          <Input type="number" min={5} max={3600} value={minS} onChange={(e) => setMinS(Number(e.target.value))} className="bg-white/5 font-mono" />
          <p className="text-xs text-muted-foreground">{Math.round(minS / 60)} min</p>
        </div>
        <div className="space-y-2">
          <Label>{t("admin.provisioning.max")}</Label>
          <Input type="number" min={5} max={3600} value={maxS} onChange={(e) => setMaxS(Number(e.target.value))} className="bg-white/5 font-mono" />
          <p className="text-xs text-muted-foreground">{Math.round(maxS / 60)} min</p>
        </div>
        <div className="space-y-2">
          <Label>{t("admin.provisioning.overload")}</Label>
          <Input type="number" min={30} max={7200} value={overload} onChange={(e) => setOverload(Number(e.target.value))} className="bg-white/5 font-mono" />
          <p className="text-xs text-muted-foreground">{Math.round(overload / 60)} min</p>
        </div>
      </div>
      <Button type="submit" disabled={save.isPending} className="bg-gradient-to-r from-[oklch(0.66_0.22_296)] to-[oklch(0.62_0.20_258)] text-white">
        {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("admin.provisioning.save")}
      </Button>
    </form>
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
