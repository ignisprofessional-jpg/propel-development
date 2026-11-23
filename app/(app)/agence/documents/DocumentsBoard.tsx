"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, EmptyShowcase, Field, ScrollArea, Segmented, StatCard, buttonClass, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { ResponsiveForm } from "@/components/ui/Sheet";
import { createDocument, setDocumentStatus } from "@/lib/agency/actions";
import { docTotal, type Doc, type DocLine } from "@/lib/agency/types";
import s from "../agence.module.css";

export function DocumentsBoard({ docs, leads, month }: { docs: Doc[]; leads: { id: string; business: string }[]; month: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<"quote" | "invoice">("quote");
  const [leadId, setLeadId] = useState("");
  const [due, setDue] = useState("");
  const [lines, setLines] = useState<DocLine[]>([{ label: "", qty: 1, unit: 0 }]);
  const d = t.agency.doc;
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const eur = (n: number) => new Intl.NumberFormat(loc, { style: "currency", currency: "EUR" }).format(n);
  const day = (x: string) => new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(x + "T12:00:00Z"));
  const names = new Map(leads.map((l) => [l.id, l.business]));
  const total = lines.reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.unit) || 0), 0);
  const eur0 = (n: number) => new Intl.NumberFormat(loc, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  const pendingQuotes = docs.filter((x) => x.kind === "quote" && (x.status === "draft" || x.status === "sent"));
  const unpaid = docs.filter((x) => x.kind === "invoice" && x.status !== "paid" && x.status !== "cancelled");
  const billed = docs.filter((x) => x.kind === "invoice" && x.status !== "cancelled" && x.issued_on.slice(0, 7) === month);
  const sum = (l: Doc[]) => l.reduce((a, x) => a + docTotal(x).ttc, 0);
  const setLine = (i: number, patch: Partial<DocLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <div className={s.grid2}>
      <Card fill>
        <div className={s.three} style={{ marginBottom: "var(--gutter)", flex: "none" }}>
          <StatCard compact label={d.pending} value={eur0(sum(pendingQuotes))} foot={`${pendingQuotes.length} ${d.quote.toLowerCase()}`} />
          <StatCard compact label={d.unpaid} value={eur0(sum(unpaid))} foot={`${unpaid.length} ${d.invoice.toLowerCase()}`} />
          <StatCard compact label={d.billed} value={eur0(sum(billed))} foot={`${billed.length} ${d.invoice.toLowerCase()}`} />
        </div>
        <ScrollArea>
          {docs.length === 0 ? (
            <EmptyShowcase icon={FileText} ghost="doc" title={d.emptyTitle} text={d.emptyText} steps={d.steps} />
          ) : (
            <ul className={s.list}>
              {docs.map((x) => (
                <li key={x.id}>
                  <span style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                    <FileText size={16} aria-hidden style={{ flex: "none" }} />
                    <span style={{ display: "grid", minWidth: 0 }}>
                      <strong>{x.kind === "quote" ? d.quote : d.invoice} {x.number}</strong>
                      <span className={s.subtle}>{(x.lead_id && names.get(x.lead_id)) || "—"} · {day(x.issued_on)}</span>
                    </span>
                  </span>
                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={s.money}>{eur(docTotal(x).ttc)}</span>
                    <select className={inputClass} style={{ height: 32, fontSize: 12, padding: "0 28px 0 10px", borderRadius: 8, width: "auto" }} value={x.status} onChange={(e) => start(async () => void (await setDocumentStatus(x.id, e.target.value as Doc["status"])))} aria-label="Statut">
                      {(["draft", "sent", "accepted", "paid", "cancelled"] as const).map((st) => <option key={st} value={st}>{d.status[st]}</option>)}
                    </select>
                    <Link className={buttonClass("ghost", "sm")} href={`/document/${x.id}`} target="_blank" aria-label={d.print}>
                      <Printer size={14} />
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </Card>

      <ResponsiveForm title={d.new} fabLabel={d.new} fill>
        {(close) => (
        <ScrollArea>
          <form
            className={s.form}
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await createDocument({ lead_id: leadId || null, kind, lines, due_on: due || null, notes: "" });
                if (r.ok) {
                  setLines([{ label: "", qty: 1, unit: 0 }]);
                  close();
                  if (r.id) window.open(`/document/${r.id}`, "_blank");
                  router.refresh();
                } else toast.error(t.agency.error);
              });
            }}
          >
            <Segmented<"quote" | "invoice"> value={kind} onChange={setKind} options={[{ value: "quote", label: d.quote }, { value: "invoice", label: d.invoice }]} />
            <div className={kind === "invoice" ? s.two : undefined}>
              <Field label={t.agency.pay.client}>
                <select className={inputClass} value={leadId} onChange={(e) => setLeadId(e.target.value)}>
                  <option value="">{t.agency.pay.noClient}</option>
                  {leads.map((l) => <option key={l.id} value={l.id}>{l.business}</option>)}
                </select>
              </Field>
              {kind === "invoice" && (
                <Field label={d.due}>
                  <input className={inputClass} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                </Field>
              )}
            </div>
            <div className={s.lines}>
              {lines.map((l, i) => (
                <div key={i} className={s.lineRow}>
                  <Field label={i === 0 ? d.line : ""}>
                    <input className={inputClass} value={l.label} maxLength={200} placeholder="Site vitrine 5 pages" onChange={(e) => setLine(i, { label: e.target.value })} />
                  </Field>
                  <Field label={i === 0 ? d.qty : ""}>
                    <input className={inputClass} type="number" min={0} step="0.5" value={l.qty} onChange={(e) => setLine(i, { qty: Number(e.target.value) })} />
                  </Field>
                  <Field label={i === 0 ? d.unit : ""}>
                    <input className={inputClass} type="number" min={0} step="0.01" placeholder="900" value={l.unit || ""} onChange={(e) => setLine(i, { unit: Number(e.target.value) })} />
                  </Field>
                  <button type="button" className={s.iconBtn} aria-label={t.agency.delete} onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : ls))}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setLines((ls) => [...ls, { label: "", qty: 1, unit: 0 }])} style={{ justifySelf: "start" }}>
                <Plus size={14} aria-hidden /> {d.addLine}
              </Button>
            </div>
            <div className={s.totals}>
              <span>{d.total}</span>
              <strong>{eur(total)}</strong>
            </div>
            <Button type="submit" disabled={pending || !lines.some((l) => l.label.trim() && l.qty > 0)} style={{ justifySelf: "start" }}>
              {d.create}
            </Button>
          </form>
        </ScrollArea>
        )}
      </ResponsiveForm>
    </div>
  );
}
