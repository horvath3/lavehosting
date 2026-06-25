import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getServer } from "@/lib/servers.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/servers/$id/settings")({
  component: ServerSettings,
});

function ServerSettings() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getServer);
  const q = useQuery({ queryKey: ["server", id], queryFn: () => getFn({ data: { id } }) });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [entry, setEntry] = useState("");

  useEffect(() => {
    if (q.data) {
      setName(q.data.server.name);
      setDescription(q.data.server.description ?? "");
      setEntry(q.data.server.entry_file ?? "");
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      throw new Error("Server settings update is not supported by the local Runner yet");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["server", id] }); toast.success("Saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="glass-strong max-w-2xl space-y-4 rounded-2xl p-6">
      <h2 className="font-display text-lg font-semibold">Server settings</h2>
      <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={60} className="bg-white/5" /></div>
      <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={280} className="bg-white/5" /></div>
      <div className="space-y-2"><Label>Entry file</Label><Input value={entry} onChange={(e) => setEntry(e.target.value)} className="bg-white/5 font-mono" placeholder="index.js" /></div>
      <Button type="submit" disabled={save.isPending} className="bg-gradient-to-r from-[oklch(0.66_0.22_296)] to-[oklch(0.62_0.20_258)] text-white">
        {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
      </Button>
    </form>
  );
}
