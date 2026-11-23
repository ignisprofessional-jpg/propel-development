import { notFound, redirect } from "next/navigation";
import { hasValidSession, createClient } from "@/lib/supabase/server";
import { getDocument } from "@/lib/agency/data";
import { getDict, getLocale } from "@/lib/i18n/server";
import { docTotal } from "@/lib/agency/types";
import { PrintButton } from "./PrintButton";
import s from "./doc.module.css";

export const metadata = { title: "Document" };

/** Devis / facture imprimable (Imprimer → Enregistrer en PDF). */
export default async function DocumentPrint({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await hasValidSession())) redirect("/connexion");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [doc, t, locale] = await Promise.all([getDocument(id), getDict(), getLocale()]);
  if (!doc) notFound();
  const sb = await createClient();
  const [{ data: co }, { data: lead }] = await Promise.all([
    sb.from("dash_settings").select("company_name, company_address, company_email, siret, vat_number, first_name").eq("id", 1).maybeSingle(),
    doc.lead_id ? sb.from("agency_leads").select("business, contact_name, email, phone, city").eq("id", doc.lead_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const d = t.agency.doc;
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const eur = (n: number) => new Intl.NumberFormat(loc, { style: "currency", currency: "EUR" }).format(n);
  const day = (x: string) => new Intl.DateTimeFormat(loc, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(x + "T12:00:00Z"));
  const tot = docTotal(doc);

  return (
    <main className={s.page}>
      <div className={s.toolbar}>
        <PrintButton label={d.print} />
      </div>
      <article className={s.sheet}>
        <header className={s.head}>
          <div>
            <p className={s.brand}>{co?.company_name || "Propel Agency"}</p>
            {co?.company_address && <p className={s.small}>{co.company_address}</p>}
            {co?.company_email && <p className={s.small}>{co.company_email}</p>}
            {co?.siret && <p className={s.small}>SIRET {co.siret}</p>}
            {co?.vat_number && <p className={s.small}>TVA {co.vat_number}</p>}
          </div>
          <div className={s.meta}>
            <p className={s.kind}>{doc.kind === "quote" ? d.quote : d.invoice}</p>
            <p>{d.number} {doc.number}</p>
            <p>{d.issued} : {day(doc.issued_on)}</p>
            {doc.due_on && <p>{t.agency.pay.due} : {day(doc.due_on)}</p>}
          </div>
        </header>

        {lead && (
          <section className={s.client}>
            <p className={s.label}>{d.to}</p>
            <p><strong>{lead.business}</strong></p>
            {lead.contact_name && <p>{lead.contact_name}</p>}
            {lead.city && <p>{lead.city}</p>}
            {lead.email && <p>{lead.email}</p>}
          </section>
        )}

        <table className={s.table}>
          <thead>
            <tr>
              <th>{d.line}</th>
              <th className={s.num}>{d.qty}</th>
              <th className={s.num}>{d.unit}</th>
              <th className={s.num}>{d.total}</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((l, i) => (
              <tr key={i}>
                <td>{l.label}</td>
                <td className={s.num}>{l.qty}</td>
                <td className={s.num}>{eur(l.unit)}</td>
                <td className={s.num}>{eur(l.qty * l.unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className={s.totals}>
          <p><span>{d.ht}</span><span>{eur(tot.ht)}</span></p>
          {doc.vat_rate > 0 ? (
            <p><span>{d.vat} {doc.vat_rate} %</span><span>{eur(tot.vat)}</span></p>
          ) : null}
          <p className={s.grand}><span>{d.ttc}</span><span>{eur(tot.ttc)}</span></p>
        </section>

        <footer className={s.foot}>
          {doc.vat_rate === 0 && <p>{d.noVat}</p>}
          {doc.kind === "quote" && <p>{d.validity}</p>}
          {doc.notes && <p>{doc.notes}</p>}
        </footer>
      </article>
    </main>
  );
}
