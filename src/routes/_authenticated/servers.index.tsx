import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Server, Trash2, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listServers, createServer, deleteServer } from "@/lib/servers.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { StatusBadge } from "./dashboard";

export const Route = createFileRoute("/_authenticated/servers")({
  component: ServersPage,
});

function ServersPage() {
  const listFn = useServerFn(listServers);
  const servers = useQuery({ queryKey: ["servers"], queryFn: listFn });
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Servers</h1>
          <p className="text-sm text-muted-foreground">Spin up and manage your Discord bot instances.</p>
        </div>
        <CreateServerDialog />
      </div>

      {servers.isLoading ? (
        <div className="glass-strong rounded-2xl p-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : !servers.data?.length ? (
        <div className="glass-strong rounded-2xl p-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[oklch(0.66_0.22_296/0.3)] to-[oklch(0.62_0.20_258/0.3)]"><Server className="h-6 w-6" /></div>
          <h3 className="mt-4 font-display text-lg font-semibold">No servers yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Create your first server to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {servers.data.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass group rounded-2xl p-5 transition-all hover:bg-white/[0.07] hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.66_0.22_296/0.3)] to-[oklch(0.62_0.20_258/0.3)]"><Server className="h-5 w-5" /></div>
                <StatusBadge status={s.status} />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{s.name}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description ?? `${s.runtime.toUpperCase()} server`}</p>
              <div className="mt-4 flex items-center gap-2">
                <Link to="/servers/$id" params={{ id: s.id }} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full border-white/15 bg-white/5 hover:bg-white/10">Manage</Button>
                </Link>
                <DeleteServerButton id={s.id} name={s.name} />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateServerDialog() {
  const qc = useQueryClient();
  const createFn = useServerFn(createServer);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [runtime, setRuntime] = useState<"nodejs" | "python">("nodejs");
  const mut = useMutation({
    mutationFn: () => createFn({ data: { name, description, runtime } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servers"] });
      toast.success("Server created");
      setOpen(false); setName(""); setDescription("");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-[oklch(0.66_0.22_296)] to-[oklch(0.62_0.20_258)] text-white"><Plus className="mr-2 h-4 w-4" />Create server</Button>
      </DialogTrigger>
      <DialogContent className="glass-strong border-white/10">
        <DialogHeader><DialogTitle>Create a new server</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
          <div className="space-y-2"><Label>Server name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} placeholder="my-cool-bot" className="bg-white/5" /></div>
          <div className="space-y-2"><Label>Description (optional)</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={280} placeholder="What does this bot do?" className="bg-white/5" /></div>
          <div className="space-y-2">
            <Label>Runtime</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["nodejs", "python"] as const).map((r) => (
                <button key={r} type="button" onClick={() => setRuntime(r)}
                  className={`rounded-xl border p-4 text-left text-sm transition-all ${runtime === r ? "border-[oklch(0.66_0.22_296)] bg-[oklch(0.66_0.22_296/0.1)]" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                  <div className="font-display text-base font-semibold">{r === "nodejs" ? "Node.js" : "Python"}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{r === "nodejs" ? "discord.js, node-18" : "discord.py, py-3.12"}</div>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mut.isPending} className="w-full bg-gradient-to-r from-[oklch(0.66_0.22_296)] to-[oklch(0.62_0.20_258)] text-white">
              {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create server
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteServerButton({ id, name }: { id: string; name: string }) {
  const qc = useQueryClient();
  const delFn = useServerFn(deleteServer);
  const mut = useMutation({
    mutationFn: () => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["servers"] }); toast.success("Server deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="glass-strong border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>This permanently removes the server, all files, logs and metrics. This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => mut.mutate()} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
