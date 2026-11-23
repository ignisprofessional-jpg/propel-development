import { PageHeader } from "@/components/ui";
import { getDict } from "@/lib/i18n/server";
import { addDays, dayKey } from "@/lib/day";
import { getTasks } from "@/lib/perso/data";
import { TasksBoard } from "./TasksBoard";

export const metadata = { title: "To-do" };

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ nouveau?: string }> }) {
  const { nouveau } = await searchParams;
  const today = dayKey();
  const [t, tasks] = await Promise.all([getDict(), getTasks({ includeDoneSince: addDays(today, -40) })]);
  return (
    <>
      <PageHeader kicker={t.nav.personal} title={t.nav.todo} />
      <TasksBoard tasks={tasks} today={today} autoFocus={nouveau === "1"} />
    </>
  );
}
