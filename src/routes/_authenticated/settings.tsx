import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (pw !== pw2) throw new Error("Passwords don't match");
      if (pw.length < 8) throw new Error("Minimum 8 characters");
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Password updated"); setPw(""); setPw2(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Security and preferences.</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="glass-strong space-y-4 rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold">Change password</h2>
        <div className="space-y-2"><Label>New password</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} maxLength={128} className="bg-white/5" /></div>
        <div className="space-y-2"><Label>Confirm</Label><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={8} maxLength={128} className="bg-white/5" /></div>
        <Button type="submit" disabled={save.isPending || !pw} className="bg-gradient-to-r from-[oklch(0.66_0.22_296)] to-[oklch(0.62_0.20_258)] text-white">
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update password
        </Button>
      </form>
    </div>
  );
}
