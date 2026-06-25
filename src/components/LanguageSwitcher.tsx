import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useI18n, pushServerLocale } from "@/i18n/I18nProvider";
import { LOCALES, type Locale } from "@/i18n/dictionaries";
import { updateLocale } from "@/lib/account.functions";

export function LanguageSwitcher({ persist = true, compact = false }: { persist?: boolean; compact?: boolean }) {
  const { locale, setLocale } = useI18n();
  const qc = useQueryClient();
  const updFn = useServerFn(updateLocale);
  const mut = useMutation({
    mutationFn: (l: Locale) => updFn({ data: { locale: l } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function pick(l: Locale) {
    setLocale(l);
    pushServerLocale(l);
    if (persist) mut.mutate(l);
  }

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className="gap-1.5"
          aria-label="Language"
        >
          <Globe className="h-4 w-4" />
          {!compact && <span className="text-xs">{current.flag} {current.label}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => pick(l.code)} className={locale === l.code ? "bg-white/5" : ""}>
            <span className="mr-2">{l.flag}</span>{l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
