import { cn } from "@/lib/utils";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.66_0.22_296)] to-[oklch(0.62_0.20_258)] shadow-[0_8px_24px_-8px_oklch(0.66_0.22_296_/_0.6)]">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7v10l8 4 8-4V7l-8-4-8 4z" />
          <path d="M4 7l8 4 8-4" />
          <path d="M12 11v10" />
        </svg>
      </div>
      {showText && (
        <span className="font-display text-lg font-bold tracking-tight">
          Lave<span className="gradient-text">Hosting</span>
        </span>
      )}
    </div>
  );
}
