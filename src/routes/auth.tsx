import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Backdrop } from "@/components/brand/Backdrop";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

const authSearchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => authSearchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — Lave Hosting" },
      { name: "description", content: "Sign in or create an account to manage your Discord bot servers on Lave Hosting." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    setMode(search.mode ?? "signin");
  }, [search.mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const parsed = z.object({
          email: z.string().email("Invalid email").max(255),
          password: z.string().min(8, "At least 8 characters").max(128),
          username: z.string().min(2).max(40),
        }).safeParse({ email, password, username });
        if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username, display_name: username },
          },
        });
        if (error) throw error;
        toast.success("Account created — you're in!");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message || "Google sign-in failed");
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen">
      <Backdrop />
      <div className="absolute top-6 left-6"><Link to="/"><Logo /></Link></div>
      <div className="grid min-h-screen place-items-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="glass-strong w-full max-w-md rounded-2xl p-8"
        >
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signup" ? "Start hosting bots in seconds." : "Sign in to your control panel."}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={googleLoading}
            onClick={handleGoogle}
            className="mt-6 w-full border-white/15 bg-white/5 hover:bg-white/10"
          >
            {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8L6.1 33C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.3 4.5-4.2 6L37.3 39C42 35.1 44 30 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            )}
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-white/10" />OR<span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={2} maxLength={40} className="bg-white/5" placeholder="cool_dev" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} className="bg-white/5" placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "signup" ? 8 : 1} maxLength={128} className="bg-white/5" placeholder="••••••••" />
              {mode === "signup" && <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>}
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[oklch(0.66_0.22_296)] to-[oklch(0.62_0.20_258)] text-white hover:opacity-90">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? (
              <>Already have an account?{" "}
                <button type="button" onClick={() => setMode("signin")} className="text-foreground underline-offset-4 hover:underline">Sign in</button>
              </>
            ) : (
              <>New here?{" "}
                <button type="button" onClick={() => setMode("signup")} className="text-foreground underline-offset-4 hover:underline">Create an account</button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
