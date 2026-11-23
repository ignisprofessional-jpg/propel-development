import { PageHeader } from "@/components/ui";
import { getDict } from "@/lib/i18n/server";
import { dayKey } from "@/lib/day";
import { getLeads, getPayments } from "@/lib/agency/data";
import { PaymentsBoard } from "./PaymentsBoard";
import { getStripeKey } from "@/lib/payments/stripe";

export const metadata = { title: "Paiements" };

export default async function PaymentsPage() {
  const [t, payments, leads, stripeKey] = await Promise.all([getDict(), getPayments(), getLeads(), getStripeKey()]);
  return (
    <>
      <PageHeader kicker={t.nav.agency} title={t.nav.payments} />
      <PaymentsBoard payments={payments} leads={leads.map((l) => ({ id: l.id, business: l.business }))} today={dayKey()} stripe={!!stripeKey} />
    </>
  );
}
