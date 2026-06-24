export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-[oklch(0.66_0.22_296/0.25)] blur-3xl animate-pulse" style={{ animationDuration: "8s" }} />
      <div className="absolute top-1/3 -right-32 h-[520px] w-[520px] rounded-full bg-[oklch(0.62_0.20_258/0.22)] blur-3xl animate-pulse" style={{ animationDuration: "10s" }} />
      <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-[oklch(0.78_0.13_210/0.15)] blur-3xl animate-pulse" style={{ animationDuration: "12s" }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.03),transparent_60%)]" />
      <svg className="absolute inset-0 h-full w-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}
