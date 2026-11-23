import { Inbox, Plus } from "lucide-react";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { Badge, Button, Card, CardHead, EmptyState, Kicker, ProgressBar, ProgressRing, Skeleton } from "@/components/ui";
import { getDict, getLocale } from "@/lib/i18n/server";
import { formatGregorian, formatHijri } from "@/lib/dates";
import { getHomeData } from "@/lib/home";
import s from "./design.module.css";

export const metadata = { title: "Design system" };

/** Aperçu dev : l'accueil + la bibliothèque de composants (sans code d'accès). */
export default async function DesignPage() {
  const [t, locale] = await Promise.all([getDict(), getLocale()]);
  const now = new Date();

  return (
    <div className={s.page}>
      <HomeDashboard t={t} locale={locale} gregorian={formatGregorian(now, locale)} hijri={formatHijri(now, locale)} data={await getHomeData()} />

      <div className={s.grid}>
        <Card>
          <CardHead
            kicker="Composants"
            title="Boutons et badges"
            action={
              <Button variant="ghost" size="sm" icon aria-label="Ajouter">
                <Plus size={16} />
              </Button>
            }
          />
          <div className={s.row}>
            <Button>Principal</Button>
            <Button variant="secondary">Secondaire</Button>
            <Button variant="ghost">Discret</Button>
          </div>
          <div className={s.row}>
            <Badge tone="solid">Signé</Badge>
            <Badge tone="soft">En cours</Badge>
            <Badge tone="outline">En retard</Badge>
            <Badge tone="muted">Archivé</Badge>
          </div>
          <ProgressBar value={0.62} />
        </Card>

        <Card>
          <CardHead kicker="Progression" title="Anneau et kicker" />
          <div className={s.row}>
            <ProgressRing value={0.75} size={96} stroke={10} />
            <div style={{ display: "grid", gap: 6 }}>
              <Kicker>Kicker mono</Kicker>
              <p className="arabic" lang="ar" style={{ fontSize: "1.5rem" }}>
                تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHead kicker="États" title="Vide et chargement" />
          <EmptyState icon={Inbox} title="Aucun mail" text="Connecte Gmail pour voir ici les mails de tes clients." />
          <div style={{ display: "grid", gap: 10 }}>
            <Skeleton h={12} w="60%" />
            <Skeleton h={12} />
          </div>
        </Card>
      </div>
    </div>
  );
}
