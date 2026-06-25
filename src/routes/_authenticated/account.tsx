import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getMe, updateProfile } from "@/lib/account.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
});

function AccountPage() {
  const meFn = useServerFn(getMe);
  const upFn = useServerFn(updateProfile);
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: meFn });
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (me.data?.profile) {
      setDisplayName(me.data.profile.display_name ?? "");
      setUsername(me.data.profile.username ?? "");
    }
  }, [me.data]);

  const save = useMutation({
    mutationFn: () => upFn({ data: { display_name: displayName, username } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["me"] }); toast.success("Profile updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Account</h1>
        <p className="text-sm text-muted-foreground">Manage your profile information.</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="glass-strong space-y-4 rounded-2xl p-6">
        <div className="space-y-2"><Label>Email</Label><Input value={me.data?.email ?? ""} disabled className="bg-white/5" /></div>
        <div className="space-y-2"><Label>Display name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} className="bg-white/5" /></div>
        <div className="space-y-2"><Label>Username</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} minLength={2} maxLength={40} className="bg-white/5 font-mono" /></div>
        <div className="space-y-2"><Label>Role</Label><div className="flex gap-2">{me.data?.roles.map((r) => <span key={r} className="rounded-full bg-white/10 px-3 py-1 text-xs">{r}</span>)}</div></div>
        <Button type="submit" disabled={save.isPending} className="bg-gradient-to-r from-[oklch(0.66_0.22_296)] to-[oklch(0.62_0.20_258)] text-white">
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
        </Button>
      </form>
    </div>
  );
}
