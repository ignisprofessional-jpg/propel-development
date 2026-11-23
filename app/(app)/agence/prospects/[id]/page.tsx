import { notFound } from "next/navigation";
import { getLead } from "@/lib/agency/data";
import { LeadDetail } from "./LeadDetail";

export const metadata = { title: "Fiche client" };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await getLead(id);
  if (!data) notFound();
  return <LeadDetail {...data} />;
}
