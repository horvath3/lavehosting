import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/5 mt-24">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Free Discord bot hosting. Built for developers who ship.
            </p>
          </div>
          <nav className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <Link to="/services" className="hover:text-foreground">Services</Link>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
            <a href="#" className="hover:text-foreground">Status</a>
            <a href="#" className="hover:text-foreground">Docs</a>
          </nav>
        </div>
        <p className="mt-8 text-xs text-muted-foreground/70">© {new Date().getFullYear()} Lave Hosting. All rights reserved.</p>
      </div>
    </footer>
  );
}
