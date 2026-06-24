import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Cpu, Globe2, ShieldCheck, Sparkles, Terminal, Zap } from "lucide-react";
import { Backdrop } from "@/components/brand/Backdrop";
import { Button } from "@/components/ui/button";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getPublicStats } from "@/lib/public-stats.functions";

const statsQO = queryOptions({
  queryKey: ["public-stats"],
  queryFn: () => getPublicStats(),
  staleTime: 30_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lave Hosting — Free Discord Bot Hosting" },
      { name: "description", content: "Create and manage Discord bot servers in seconds. Free, fast, secure Discord bot hosting." },
      { property: "og:title", content: "Lave Hosting" },
      { property: "og:description", content: "Free Discord Bot Hosting — create and manage in seconds." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(statsQO),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <Backdrop />
      <MarketingHeader />
      <Hero />
      <Stats />
      <Features />
      <ServicesPreview />
      <CTA />
      <MarketingFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 sm:pt-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-3xl text-center"
      >
        <div className="mx-auto inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-[oklch(0.78_0.13_210)]" />
          Now in public beta — Free forever tier
        </div>
        <h1 className="mt-6 font-display text-5xl font-bold tracking-tight sm:text-7xl">
          <span className="gradient-text">Lave Hosting</span>
        </h1>
        <p className="mt-4 text-2xl font-semibold sm:text-3xl">Free Discord Bot Hosting</p>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          Create and manage Discord bot servers in seconds. Upload your code, hit start, and watch the console light up in real time.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/auth" search={{ mode: "signup" } as never}>
            <Button size="lg" className="bg-gradient-to-r from-[oklch(0.66_0.22_296)] to-[oklch(0.62_0.20_258)] text-white shadow-[0_10px_40px_-10px_oklch(0.66_0.22_296_/_0.6)] hover:opacity-90">
              Create Server <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="outline" className="border-white/15 bg-white/5 backdrop-blur-md hover:bg-white/10">
              Dashboard
            </Button>
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="mx-auto mt-16 max-w-5xl"
      >
        <div className="glass-strong overflow-hidden rounded-2xl p-1.5 shadow-[0_30px_80px_-20px_oklch(0.66_0.22_296_/_0.35)]">
          <div className="rounded-xl bg-[oklch(0.12_0.03_280)] p-4 font-mono text-sm">
            <div className="mb-3 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
              <span className="ml-3 text-xs text-muted-foreground">my-bot · console</span>
            </div>
            <pre className="text-left text-[oklch(0.85_0.05_280)]">
{`$ node index.js
[INFO] Loading 12 commands…
[INFO] Connecting to gateway…
`}<span className="text-[oklch(0.72_0.18_155)]">{`[READY] Bot logged in as MyCoolBot#4521`}</span>{`
[INFO] Serving 1,283 guilds — latency 42ms`}
            </pre>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function Stats() {
  const { data } = useSuspenseQuery(statsQO);
  const items = [
    { label: "Active Servers", value: data.activeServers, icon: Cpu },
    { label: "Registered Users", value: data.users, icon: Globe2 },
    { label: "Running Servers", value: data.running, icon: Bot },
    { label: "Uptime", value: data.uptime, icon: ShieldCheck, format: false },
  ] as const;
  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {items.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <s.icon className="h-3.5 w-3.5" /> {s.label}
            </div>
            <div className="mt-3 font-display text-3xl font-bold">
              {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: Zap, title: "Instant deploys", desc: "Push code, hit start, your bot is online in under 5 seconds." },
    { icon: Terminal, title: "Real-time console", desc: "Colored logs streamed over WebSockets. Send commands live." },
    { icon: ShieldCheck, title: "Isolated runtimes", desc: "Every server runs in its own container with strict CPU and RAM limits." },
    { icon: Cpu, title: "Built-in editor", desc: "Monaco-powered IDE with syntax highlighting and auto-save." },
    { icon: Globe2, title: "Global edge", desc: "Low-latency control panel served from the edge worldwide." },
    { icon: Bot, title: "Made for Discord", desc: "Optimized for Node.js and Python Discord bots out of the box." },
  ];
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">Everything your bot needs</h2>
        <p className="mt-3 text-muted-foreground">Production-grade primitives, packaged in a control panel that feels great.</p>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="glass group rounded-2xl p-6 transition-all hover:bg-white/[0.08] hover:-translate-y-1"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.66_0.22_296/0.3)] to-[oklch(0.62_0.20_258/0.3)] text-[oklch(0.85_0.15_290)]">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function ServicesPreview() {
  const services = [
    { emoji: "🖥️", name: "Discord Bot Hosting", status: "Available now", active: true },
    { emoji: "🎮", name: "Minecraft Hosting", status: "Coming soon", active: false },
    { emoji: "🦖", name: "ARK Hosting", status: "Coming soon", active: false },
    { emoji: "🚜", name: "Farming Simulator Hosting", status: "Coming soon", active: false },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">Hosting that grows with you</h2>
        <p className="mt-3 text-muted-foreground">Start with Discord bots. More game servers landing soon.</p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -4 }}
            className={`glass rounded-2xl p-6 ${s.active ? "ring-1 ring-[oklch(0.66_0.22_296/0.5)]" : ""}`}
          >
            <div className="text-4xl">{s.emoji}</div>
            <h3 className="mt-4 font-display text-base font-semibold">{s.name}</h3>
            <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs ${s.active ? "bg-[oklch(0.72_0.18_155/0.15)] text-[oklch(0.85_0.18_155)]" : "bg-white/5 text-muted-foreground"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${s.active ? "bg-[oklch(0.72_0.18_155)]" : "bg-muted-foreground"}`} />
              {s.status}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="glass-strong relative overflow-hidden rounded-3xl p-10 text-center md:p-16">
        <div className="absolute inset-0 -z-10 opacity-50" style={{ background: "var(--gradient-radial)" }} />
        <h2 className="font-display text-3xl font-bold sm:text-5xl">
          Ship your bot in <span className="gradient-text">60 seconds</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Create an account, spin up a server, paste your code. We handle the rest.
        </p>
        <div className="mt-7 flex justify-center">
          <Link to="/auth" search={{ mode: "signup" } as never}>
            <Button size="lg" className="bg-gradient-to-r from-[oklch(0.66_0.22_296)] to-[oklch(0.62_0.20_258)] text-white shadow-[0_10px_40px_-10px_oklch(0.66_0.22_296_/_0.6)] hover:opacity-90">
              Get started free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
