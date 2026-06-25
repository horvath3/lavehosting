import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useT } from "@/i18n/I18nProvider";

export function MarketingHeader() {
  const t = useT();
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/"><Logo /></Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link to="/" className="hover:text-foreground transition-colors">{t("marketing.nav.home")}</Link>
          <Link to="/services" className="hover:text-foreground transition-colors">{t("marketing.nav.services")}</Link>
          <a href="#features" className="hover:text-foreground transition-colors">{t("marketing.nav.features")}</a>
        </nav>
        <div className="flex items-center gap-1">
          <LanguageSwitcher persist={false} />
          <Link to="/auth"><Button variant="ghost" size="sm">{t("marketing.cta.signin")}</Button></Link>
          <Link to="/auth" search={{ mode: "signup" } as never}>
            <Button size="sm" className="bg-gradient-to-r from-[oklch(0.66_0.22_296)] to-[oklch(0.62_0.20_258)] text-white hover:opacity-90">
              {t("marketing.cta.getStarted")}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
