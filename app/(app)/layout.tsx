import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { hasValidSession } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { getShellGame, shellUserFrom } from "@/lib/shell";
import { getSettings } from "@/lib/islam/data";
import { getTotals, syncTree } from "@/lib/game/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Le jeton du cookie doit correspondre à une session encore valide en base.
  const [valid, locale, settings] = await Promise.all([hasValidSession(), getLocale(), getSettings()]);
  if (!valid) redirect("/auth/expire");
  await syncTree();
  const totals = await getTotals();

  return (
    <AppShell user={shellUserFrom(settings.first_name)} game={getShellGame(locale, totals.xp)} intro>
      {children}
    </AppShell>
  );
}
