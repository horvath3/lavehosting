import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Backdrop } from "@/components/brand/Backdrop";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — Lave Hosting" },
      { name: "description", content: "Discord bot hosting available now. Minecraft, ARK and Farming Simulator hosting coming soon." },
      { property: "og:title", content: "Services — Lave Hosting" },
      { property: "og:description", content: "Discord bot hosting available now. Game servers coming soon." },
    ],
  }),
  component: Services,
});

const services = [
  {
    emoji: "🖥️",
    name: "Discord Bot Hosting",
    desc: "Run your Discord bot 24/7 with Node.js or Python in isolated containers.",
    perks: ["Node.js & Python runtimes", "Real-time console", "File manager + Monaco editor", "Auto-restart on crash"],
    available: true,
  },
  { emoji: "🎮", name: "Minecraft Hosting", desc: "Vanilla, Paper, Forge and modpacks with one-click installer.", perks: ["1-click modpacks", "Console + RCON", "Backups"], available: false },
  { emoji: "🦖", name: "ARK Hosting", desc: "Survival servers with mods, clusters and cross-server transfers.", perks: ["Mods & cluster support", "Schedule restarts", "Backups"], available: false },
  { emoji: "🚜", name: "Farming Simulator Hosting", desc: "Dedicated FS servers with savegame management.", perks: ["Savegame sync", "Mods folder", "Web UI"], available: false },
];

function Services() {
  return (
    <div className="min-h-screen">
      <Backdrop />
      <MarketingHeader />
      <section className="mx-auto max-w-7xl px-4 pt-16 pb-10 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-4xl font-bold sm:text-6xl">Our <span className="gradient-text">services</span></h1>
          <p className="mt-4 text-muted-foreground">One control panel. Multiple workloads. Discord bots first, game servers next.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="grid gap-5 md:grid-cols-2">
          {services.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className={`glass relative rounded-2xl p-7 ${s.available ? "ring-1 ring-[oklch(0.66_0.22_296/0.5)]" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className="text-5xl">{s.emoji}</div>
                <span className={`rounded-full px-3 py-1 text-xs ${s.available ? "bg-[oklch(0.72_0.18_155/0.15)] text-[oklch(0.85_0.18_155)]" : "bg-white/5 text-muted-foreground"}`}>
                  {s.available ? "Available now" : "Coming soon"}
                </span>
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">{s.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              <ul className="mt-5 space-y-2">
                {s.perks.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-[oklch(0.72_0.18_155)]" /> {p}
                  </li>
                ))}
              </ul>
              {s.available && (
                <div className="mt-6">
                  <Link to="/auth" search={{ mode: "signup" } as never}>
                    <Button className="bg-gradient-to-r from-[oklch(0.66_0.22_296)] to-[oklch(0.62_0.20_258)] text-white">
                      Get started <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
