import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";
import { completeProvisioning, deleteServer } from "@/lib/servers.functions";
import { getAppSettings } from "@/lib/app-settings.functions";
import { useNavigate } from "@tanstack/react-router";

type Props = {
  serverId: string;
  startedAt: string;
  durationS: number;
  onComplete?: () => void;
};

export function ProvisioningOverlay({ serverId, startedAt, durationS, onComplete }: Props) {
  const t = useT();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const completeFn = useServerFn(completeProvisioning);
  const deleteFn = useServerFn(deleteServer);
  const settingsFn = useServerFn(getAppSettings);
  const settings = useQuery({ queryKey: ["app-settings"], queryFn: settingsFn, staleTime: 60_000 });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, []);

  const start = new Date(startedAt).getTime();
  const total = Math.max(1, durationS) * 1000;
  const elapsed = Math.max(0, now - start);
  const rawPct = Math.min(100, (elapsed / total) * 100);
  // Ease the displayed value so it accelerates and decelerates beautifully.
  const eased = 100 * easeInOut(rawPct / 100);
  const pct = Math.min(100, eased);

  const overloadS = settings.data?.provision_overload_seconds ?? 900;
  const isOverloaded = elapsed > overloadS * 1000;

  // Map percentage to step text (i18n)
  const steps: Array<{ at: number; key: string }> = [
    { at: 0, key: "provision.step.queue" },
    { at: 12, key: "provision.step.allocate" },
    { at: 28, key: "provision.step.image" },
    { at: 46, key: "provision.step.deps" },
    { at: 64, key: "provision.step.network" },
    { at: 80, key: "provision.step.storage" },
    { at: 94, key: "provision.step.finalize" },
    { at: 100, key: "provision.step.ready" },
  ];
  const currentStep = [...steps].reverse().find((s) => pct >= s.at) ?? steps[0];

  const minMin = Math.max(1, Math.round((settings.data?.provision_min_seconds ?? 180) / 60));
  const maxMin = Math.max(minMin, Math.round((settings.data?.provision_max_seconds ?? 240) / 60));
  const overloadMin = Math.max(1, Math.round(overloadS / 60));

  const completed = pct >= 99.5;
  const completeMut = useMutation({
    mutationFn: () => completeFn({ data: { id: serverId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["server", serverId] });
      qc.invalidateQueries({ queryKey: ["servers"] });
      onComplete?.();
    },
    onError: () => { /* will retry on next tick */ },
  });
  useEffect(() => {
    if (completed && !completeMut.isPending && !completeMut.isSuccess) completeMut.mutate();
  }, [completed]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteMut = useMutation({
    mutationFn: () => deleteFn({ data: { id: serverId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servers"] });
      toast.success(t("files.deleted"));
      navigate({ to: "/servers" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong relative mx-auto max-w-2xl overflow-hidden rounded-3xl p-8 sm:p-12"
      >
        {/* animated gradient halo */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 30%, oklch(0.66 0.22 296 / 0.35), transparent 70%), radial-gradient(50% 50% at 50% 80%, oklch(0.62 0.20 258 / 0.25), transparent 70%)",
          }}
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Floating orb / check */}
        <div className="mx-auto grid h-24 w-24 place-items-center">
          <motion.div
            className="relative grid h-24 w-24 place-items-center rounded-full"
            style={{
              background: completed
                ? "radial-gradient(circle, oklch(0.72 0.18 155 / 0.9), oklch(0.62 0.20 258 / 0.4))"
                : "radial-gradient(circle, oklch(0.66 0.22 296 / 0.9), oklch(0.62 0.20 258 / 0.4))",
              boxShadow: completed
                ? "0 0 60px oklch(0.72 0.18 155 / 0.6)"
                : "0 0 60px oklch(0.66 0.22 296 / 0.6)",
            }}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <AnimatePresence mode="wait">
              {completed ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                >
                  <Check className="h-12 w-12 text-white drop-shadow" strokeWidth={3} />
                </motion.div>
              ) : (
                <motion.div
                  key="spin"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, rotate: 360 }}
                  exit={{ opacity: 0 }}
                  transition={{ rotate: { duration: 2.5, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.2 } }}
                >
                  <Loader2 className="h-12 w-12 text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <h2 className="mt-6 text-center font-display text-2xl font-bold sm:text-3xl">
          {t("provision.title")}
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground sm:text-base">
          {t("provision.subtitle", { min: minMin, max: maxMin })}
        </p>

        {/* progress bar */}
        <div className="mt-8">
          <div className="relative h-2.5 overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background: "linear-gradient(90deg, oklch(0.78 0.13 210), oklch(0.66 0.22 296))",
                boxShadow: "0 0 14px oklch(0.66 0.22 296 / 0.7)",
              }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
            {/* shimmer */}
            <motion.div
              aria-hidden
              className="absolute inset-y-0 w-1/3 -translate-x-full"
              style={{ background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.18), transparent)" }}
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-1.5 text-muted-foreground"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[oklch(0.72_0.18_155)] opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[oklch(0.72_0.18_155)]" />
                </span>
                {t(currentStep.key)}
              </motion.div>
            </AnimatePresence>
            <span className="font-mono tabular-nums text-muted-foreground">{Math.floor(pct)}%</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ["server", serverId] })}
            className="border-white/15 bg-white/5 hover:bg-white/10"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />{t("provision.checkStatus")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={deleteMut.isPending}
            onClick={() => deleteMut.mutate()}
            className="border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />{t("provision.deleteServer")}
          </Button>
        </div>

        {isOverloaded && (
          <p className="mt-5 text-center text-xs text-muted-foreground">
            {t("provision.overloadNote", { min: overloadMin })}
          </p>
        )}
      </motion.div>
    </div>
  );
}

function easeInOut(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}
