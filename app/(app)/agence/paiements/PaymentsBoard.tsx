"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, Link2, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, EmptyShowcase, Field, ScrollArea, Segmented, StatCard, buttonClass, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { ResponsiveForm } from "@/components/ui/Sheet";
import { createPayment, deletePayment, markPaid } from "@/lib/agency/actions";
import { createStripeLink } from "@/lib/payments/actions";
import type { Payment, PaymentKind } from "@/lib/agency/types";
import s from "../agence.module.css";

type Filter = "upcoming" | "late" | "paid" | "all";

export function PaymentsBoard({ payments, leads, today, stripe }: { payments: Payment[]; leads: { id: string; business: string }[]; today: string; stripe: boolean }) {
  const { t, locale } = useI18n();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [form, setForm] = useState({ lead_id: "", label: "", kind: "deposit" as PaymentKind, amount: "", due_date: today, paid: false, method: "Virement" });
  const p = t.agency.pay;
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const eur = (n: number) => new Intl.NumberFormat(loc, { style: "currency", currency: "EUR" }).format(n);
  const eur0 = (n: number) => new Intl.NumberFormat(loc, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  const day = (d: string) => new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
  const names = new Map(leads.map((l) => [l.id, l.business]));
  const monthStart = today.slice(0, 7);

  const late = (x: Payment) => !x.paid_at && !!x.due_date && x.due_date < today;
  const list = useMemo(
    () =>
      payments.filter((x) =>
        filter === "all" ? true : filter === "paid" ? !!x.paid_at : filter === "late" ? late(x) : !x.paid_at && !late(x),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [payments, filter, today],
  );
  const month = payments.filter((x) => x.paid_at && x.paid_at.slice(0, 7) === monthStart).reduce((a, x) => a + x.amount, 0);
  const toCome = payments.filter((x) => !x.paid_at).reduce((a, x) => a + x.amount, 0);
  const lateSum = payments.filter(late).reduce((a, x) => a + x.amount, 0);
  const run = (fn: () => Promise<{ ok: boolean }>, ok?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(t.agency.error);
      else ok?.();
    });

  return (
    <div className={s.grid2}>
      <Card fill>
        <div className={s.three} style={{ marginBottom: "var(--gutter)", flex: "none" }}>
          <StatCard compact label={p.month} value={eur0(month)} />
          <StatCard compact label={p.toCome} value={eur0(toCome)} />
          <StatCard compact label={p.lateTotal} value={eur0(lateSum)} />
        </div>
        <div className={s.top}>
          <Segmented<Filter> value={filter} onChange={setFilter} options={(["upcoming", "late", "paid", "all"] as Filter[]).map((f) => ({ value: f, label: p.filters[f] }))} />
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- téléchargement CSV */}
          <a className={buttonClass("secondary", "sm")} href="/api/export/payments">
            <Download size={14} aria-hidden /> {p.export}
          </a>
        </div>
        <ScrollArea>
          {list.length === 0 ? (
            <EmptyShowcase icon={Wallet} title={payments.length ? p.empty : p.emptyTitle} text={payments.length ? undefined : p.emptyText} />
          ) : (
            list.map((x) => (
              <div key={x.id} className={s.payRow}>
                <span className={s.payMain}>
                  <span className={s.payLabel}>{x.label}</span>
                  <span className={s.payMeta}>
                    {(x.lead_id && names.get(x.lead_id)) || p.noClient} · {p.kinds[x.kind]}
                    {x.due_date && (
                      <>
                        {" · "}
                        <span className={late(x) ? s.late : undefined}>{day(x.due_date)}</span>
                      </>
                    )}
                    {x.paid_at && ` · ${x.method || ""}`}
                  </span>
                </span>
                <span className={s.money}>{eur(x.amount)}</span>
                {x.paid_at ? (
                  <Button size="sm" variant="ghost" onClick={() => run(() => markPaid(x.id, false))}>
                    <Badge tone="solid">{t.agency.doc.status.paid}</Badge>
                  </Button>
                ) : (
                  <Button size="sm" variant={late(x) ? "primary" : "secondary"} onClick={() => run(() => markPaid(x.id, true))}>
                    {p.markPaid}
                  </Button>
                )}
                {stripe && !x.paid_at && (
                  <button
                    className={s.iconBtn}
                    aria-label={p.stripeLink}
                    title={p.stripeLink}
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await createStripeLink(x.id);
                        if (r.ok && r.url) {
                          await navigator.clipboard.writeText(r.url).catch(() => {});
                          toast.success(p.stripeCopied);
                        } else toast.error(r.ok ? t.agency.error : r.error);
                      })
                    }
                  >
                    <Link2 size={14} />
                  </button>
                )}
                <button className={s.iconBtn} aria-label={t.agency.delete} onClick={() => confirm(p.deleteConfirm) && run(() => deletePayment(x.id))}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </ScrollArea>
      </Card>

      <ResponsiveForm title={p.new} fabLabel={p.new}>
        {(close) => (
        <form
          className={s.form}
          onSubmit={(e) => {
            e.preventDefault();
            run(() => createPayment({ ...form, lead_id: form.lead_id || null, amount: Number(form.amount), due_date: form.due_date || null }), () => {
              setForm((o) => ({ ...o, label: "", amount: "", paid: false }));
              close();
            });
          }}
        >
          <Field label={p.client}>
            <select className={inputClass} value={form.lead_id} onChange={(e) => setForm({ ...form, lead_id: e.target.value })}>
              <option value="">{p.noClient}</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.business}</option>)}
            </select>
          </Field>
          <Field label={p.label}>
            <input className={inputClass} value={form.label} maxLength={160} required placeholder="Acompte 30 % — site vitrine" onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </Field>
          <div className={s.two}>
            <Field label={p.kind}>
              <select className={inputClass} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as PaymentKind })}>
                {(["deposit", "balance", "subscription", "other"] as PaymentKind[]).map((k) => <option key={k} value={k}>{p.kinds[k]}</option>)}
              </select>
            </Field>
            <Field label={t.agency.fields.amount}>
              <input className={inputClass} type="number" min={0.01} step="0.01" required placeholder="450" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
            <Field label={p.due}>
              <input className={inputClass} type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </Field>
            <Field label={p.method}>
              <select className={inputClass} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                {["Virement", "Espèces", "Chèque", "PayPal", "Carte"].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "var(--text-sm)" }}>
            <input type="checkbox" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} /> {p.paidNow}
          </label>
          <Button type="submit" disabled={pending || !form.label.trim() || !form.amount} style={{ justifySelf: "start" }}>
            <Plus size={15} aria-hidden /> {p.add}
          </Button>
        </form>
        )}
      </ResponsiveForm>
    </div>
  );
}
