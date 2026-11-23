import { PageHeader } from "@/components/ui";
import { getDict } from "@/lib/i18n/server";
import { dayKey } from "@/lib/day";
import { getGoals } from "@/lib/perso/data";
import { GoalsBoard } from "./GoalsBoard";

export const metadata = { title: "Objectifs" };

export default async function GoalsPage() {
  const [t, goals] = await Promise.all([getDict(), getGoals()]);
  return (
    <>
      <PageHeader kicker={t.nav.personal} title={t.nav.goals} />
      <GoalsBoard goals={goals} today={dayKey()} />
    </>
  );
}
