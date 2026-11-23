import { PageHeader } from "@/components/ui";
import { getDict } from "@/lib/i18n/server";
import { getDocuments, getLeads } from "@/lib/agency/data";
import { DocumentsBoard } from "./DocumentsBoard";
import { dayKey } from "@/lib/day";

export const metadata = { title: "Devis et factures" };

export default async function DocumentsPage() {
  const [t, docs, leads] = await Promise.all([getDict(), getDocuments(), getLeads()]);
  return (
    <>
      <PageHeader kicker={t.nav.agency} title={t.nav.documents} />
      <DocumentsBoard docs={docs} leads={leads.map((l) => ({ id: l.id, business: l.business }))} month={dayKey().slice(0, 7)} />
    </>
  );
}
