import { getLeads } from "@/lib/agency/data";
import { getDict } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { LeadsBoard } from "./LeadsBoard";

export const metadata = { title: "Prospects" };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ nouveau?: string }> }) {
  const { nouveau } = await searchParams;
  const [t, leads] = await Promise.all([getDict(), getLeads()]);
  return (
    <>
      <PageHeader kicker={t.nav.agency} title={t.nav.leads} />
      <LeadsBoard leads={leads} openNew={nouveau === "1"} />
    </>
  );
}
