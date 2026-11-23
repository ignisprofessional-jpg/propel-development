import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { isDevPreviewEnabled } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/server";
import { getShellGame } from "@/lib/shell";

/** Aperçu du design system sans connexion — développement uniquement. */
export default async function PreviewLayout({ children }: { children: React.ReactNode }) {
  if (!isDevPreviewEnabled()) notFound();
  const locale = await getLocale();
  return (
    <AppShell user={{ name: "" }} game={getShellGame(locale, 0)}>
      {children}
    </AppShell>
  );
}
