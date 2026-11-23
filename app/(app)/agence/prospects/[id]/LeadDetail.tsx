"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Mail, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, CardHead, Field, PageHeader, ScrollArea, Segmented, buttonClass, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { addActivity, addLeadTask, deleteLead, setLeadStage, updateLead, type LeadInput } from "@/lib/agency/actions";
import { setTaskStatus } from "@/lib/perso/actions";
import { STAGES, docTotal, type Activity, type Doc, type Email, type Lead, type Payment, type Stage } from "@/lib/agency/types";
import s from "../../agence.module.css";

type Props = {
  lead: Lead;
  activities: Activity[];
  tasks: { id: string; title: string; status: string; due_date: string | null }[];
  payments: Payment[];
  emails: Email[];
  docs: Doc[];
};
type Tab = "tasks" | "payments" | "mails" | "documents";

export function LeadDetail({ lead, activities, tasks, payments, emails, docs }: Props) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState<LeadInput>({ business: lead.business, contact_name: lead.contact_name, email: lead.email, phone: lead.phone, city: lead.city, source: lead.source, offer: lead.offer, amount: lead.amount, notes: lead.notes });
  const [note, setNote] = useState("");
  const [task, setTask] = useState("");
  const [tab, setTab] = useState<Tab>("tasks");
  const set = <K extends keyof LeadInput>(k: K, val: LeadInput[K]) => setV((o) => ({ ...o, [k]: val }));
  const f = t.agency.fields;
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const eur = (n: number) => new Intl.NumberFormat(loc, { style: "currency", currency: "EUR" }).format(n);
  const when = (iso: string) => new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const day = (d: string) => new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
  const run = (fn: () => Promise<{ ok: boolean }>, ok?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(t.agency.error);
      else ok?.();
    });
  const dirty = JSON.stringify(v) !== JSON.stringify({ business: lead.business, contact_name: lead.contact_name, email: lead.email, phone: lead.phone, city: lead.city, source: lead.source, offer: lead.offer, amount: lead.amount, notes: lead.notes });

  return (
    <>
      <PageHeader
        mobile
        kicker={<Link href="/agence/prospects" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowLeft size={12} /> {t.agency.back}</Link>}
        title={lead.business}
        sub={[lead.contact_name, lead.city].filter(Boolean).join(" · ") || undefined}
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select className={inputClass} style={{ height: 40 }} value={lead.stage} onChange={(e) => run(() => setLeadStage(lead.id, e.target.value as Stage), () => e.target.value === "signed" && toast.success(t.agency.signedHint))} aria-label={f.stage}>
              {STAGES.map((st) => <option key={st} value={st}>{t.agency.stages[st]}</option>)}
            </select>
            <Button variant="ghost" icon aria-label={t.agency.delete} onClick={() => confirm(t.agency.deleteConfirm) && run(() => deleteLead(lead.id), () => router.push("/agence/prospects"))}>
              <Trash2 size={16} />
            </Button>
          </div>
        }
      />
      <div className={s.grid2}>
        <Card fill>
          <CardHead
            title={t.agency.fields.business}
            action={
              <div style={{ display: "flex", gap: 6 }}>
                {lead.email && <a className={buttonClass("secondary", "sm")} href={`mailto:${lead.email}`}><Mail size={13} /> {f.email}</a>}
                {lead.phone && <a className={buttonClass("secondary", "sm")} href={`tel:${lead.phone}`}><Phone size={13} /> {f.phone}</a>}
              </div>
            }
          />
          <ScrollArea>
            <form className={s.form} onSubmit={(e) => { e.preventDefault(); run(() => updateLead(lead.id, v), () => toast.success(t.agency.saved)); }}>
              <div className={s.two}>
                <Field label={f.business}><input className={inputClass} value={v.business} maxLength={120} onChange={(e) => set("business", e.target.value)} /></Field>
                <Field label={f.contact}><input className={inputClass} value={v.contact_name} maxLength={120} onChange={(e) => set("contact_name", e.target.value)} /></Field>
                <Field label={f.email}><input className={inputClass} type="email" value={v.email} onChange={(e) => set("email", e.target.value)} /></Field>
                <Field label={f.phone}><input className={inputClass} type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
                <Field label={f.city}><input className={inputClass} value={v.city} onChange={(e) => set("city", e.target.value)} /></Field>
                <Field label={f.source}><input className={inputClass} value={v.source} onChange={(e) => set("source", e.target.value)} /></Field>
                <Field label={f.offer}><input className={inputClass} value={v.offer} onChange={(e) => set("offer", e.target.value)} /></Field>
                <Field label={f.amount}><input className={inputClass} type="number" min={0} step="0.01" value={v.amount || ""} onChange={(e) => set("amount", Number(e.target.value))} /></Field>
              </div>
              <Field label={f.notes}>
                <textarea className={inputClass} style={{ height: 110, padding: 12, resize: "vertical" }} value={v.notes} maxLength={4000} onChange={(e) => set("notes", e.target.value)} />
              </Field>
              <Button type="submit" disabled={pending || !dirty} style={{ justifySelf: "start" }}>{t.settings.save}</Button>
            </form>
          </ScrollArea>
        </Card>

        <div className={`${s.col} ${s.colFill}`}>
          <Card fill>
            <CardHead title={t.agency.history} />
            <form className={s.noteForm} onSubmit={(e) => { e.preventDefault(); run(() => addActivity(lead.id, "note", note), () => setNote("")); }}>
              <input className={inputClass} value={note} placeholder={t.agency.notePlaceholder} maxLength={2000} onChange={(e) => setNote(e.target.value)} aria-label={t.agency.addNote} />
              <Button type="submit" size="sm" disabled={!note.trim()}><Plus size={14} /></Button>
            </form>
            <ScrollArea>
              <ul className={s.timeline}>
                {activities.map((a) => (
                  <li key={a.id} data-kind={a.kind}>
                    <span className={s.dot} />
                    <span className={s.tlBody}>
                      <span>{a.kind === "stage" ? `${t.agency.fields.stage} : ${t.agency.stages[a.content.replace("Étape : ", "") as Stage] ?? a.content}` : a.content}</span>
                      <span className={s.tlDate}>{when(a.created_at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </Card>

          <Card fill>
            <div className={s.top}>
              <Segmented<Tab>
                value={tab}
                onChange={setTab}
                options={[
                  { value: "tasks", label: `${t.agency.tasks} · ${tasks.filter((x) => x.status !== "done").length}` },
                  { value: "payments", label: t.agency.payments },
                  { value: "mails", label: t.agency.mails },
                  { value: "documents", label: t.agency.doc.quote },
                ]}
              />
            </div>
            <ScrollArea>
              {tab === "tasks" && (
                <>
                  <form className={s.noteForm} onSubmit={(e) => { e.preventDefault(); run(() => addLeadTask(lead.id, task, null), () => setTask("")); }}>
                    <input className={inputClass} value={task} placeholder={t.agency.addTask} maxLength={200} onChange={(e) => setTask(e.target.value)} />
                    <Button type="submit" size="sm" disabled={!task.trim()}><Plus size={14} /></Button>
                  </form>
                  {tasks.length === 0 ? <p className={s.empty}>{t.agency.none}</p> : (
                    <ul className={s.list}>
                      {tasks.map((x) => (
                        <li key={x.id}>
                          <label style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                            <input type="checkbox" checked={x.status === "done"} onChange={() => run(() => setTaskStatus(x.id, x.status === "done" ? "todo" : "done"))} />
                            <span className={x.status === "done" ? s.done : undefined}>{x.title}</span>
                          </label>
                          {x.due_date && <span className={s.meta}>{day(x.due_date)}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {tab === "payments" && (payments.length === 0 ? <p className={s.empty}>{t.agency.none}</p> : (
                <ul className={s.list}>
                  {payments.map((p) => (
                    <li key={p.id}>
                      <span>{p.label} <span className={s.subtle}>· {t.agency.pay.kinds[p.kind]}</span></span>
                      <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span className={s.money}>{eur(p.amount)}</span>
                        <Badge tone={p.paid_at ? "solid" : "outline"}>{p.paid_at ? t.agency.doc.status.paid : p.due_date ? day(p.due_date) : "—"}</Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              ))}
              {tab === "mails" && (emails.length === 0 ? <p className={s.empty}>{t.agency.none}</p> : (
                <ul className={s.list}>
                  {emails.map((m) => (
                    <li key={m.id}>
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.subject || "(sans objet)"}</span>
                      <a className={buttonClass("ghost", "sm")} href={`https://mail.google.com/mail/u/0/#all/${m.thread_id}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /></a>
                    </li>
                  ))}
                </ul>
              ))}
              {tab === "documents" && (docs.length === 0 ? <p className={s.empty}>{t.agency.none}</p> : (
                <ul className={s.list}>
                  {docs.map((d) => (
                    <li key={d.id}>
                      <Link href={`/document/${d.id}`} target="_blank">{d.kind === "quote" ? t.agency.doc.quote : t.agency.doc.invoice} {d.number}</Link>
                      <span className={s.money}>{eur(docTotal(d).ttc)}</span>
                    </li>
                  ))}
                </ul>
              ))}
            </ScrollArea>
          </Card>
        </div>
      </div>
    </>
  );
}
