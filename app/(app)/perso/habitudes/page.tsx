import { PageHeader } from "@/components/ui";
import { getDict } from "@/lib/i18n/server";
import { dayKey } from "@/lib/day";
import { getHabits } from "@/lib/perso/data";
import { HabitsBoard } from "./HabitsBoard";

export const metadata = { title: "Habitudes" };

export default async function HabitsPage() {
  const [t, habits] = await Promise.all([getDict(), getHabits(182)]);
  return (
    <>
      <PageHeader kicker={t.nav.personal} title={t.nav.habits} />
      <HabitsBoard habits={habits} today={dayKey()} />
    </>
  );
}
