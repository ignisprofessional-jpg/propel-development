import { PageHeader } from "@/components/ui";
import { getDict } from "@/lib/i18n/server";
import { getEmails, getLeads } from "@/lib/agency/data";
import { MailsBoard } from "./MailsBoard";

export const metadata = { title: "Mails" };

export default async function MailsPage() {
  const [t, emails, leads] = await Promise.all([getDict(), getEmails(), getLeads()]);
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://propel-developement.netlify.app").replace(/\/$/, "");
  return (
    <>
      <PageHeader kicker={t.nav.agency} title={t.nav.mails} />
      <MailsBoard
        emails={emails}
        leads={leads.map((l) => ({ id: l.id, business: l.business }))}
        fetchBody={!!process.env.RESEND_API_KEY}
        webhookUrl={`${site}/api/inbound/resend`}
      />
    </>
  );
}
