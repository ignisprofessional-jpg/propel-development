"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dayKey } from "@/lib/day";
import { KICKOFF_TASKS, STAGES, type DocLine, type PaymentKind, type Stage } from "./types";

type Result = { ok: true; id?: string } | { ok: false; error: string };
const fail = (e: { message: string } | null): Result => (e ? { ok: false, error: e.message } : { ok: true });
const isDay = (d: string | null | undefined) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const money = (v: unknown) => Math.max(0, Math.round(Number(v) * 100) / 100) || 0;
const refresh = (...p: string[]) => {
  for (const x of p) revalidatePath(x);
  revalidatePath("/", "layout");
};

export type LeadInput = { business: string; contact_name?: string; email?: string; phone?: string; city?: string; source?: string; offer?: string; amount?: number; notes?: string; stage?: Stage };

const clean = (i: Partial<LeadInput>) => {
  const o: Record<string, unknown> = {};
  if (i.business !== undefined) o.business = str(i.business, 120) || "Sans nom";
  if (i.contact_name !== undefined) o.contact_name = str(i.contact_name, 120);
  if (i.email !== undefined) o.email = str(i.email, 160).toLowerCase();
  if (i.phone !== undefined) o.phone = str(i.phone, 40);
  if (i.city !== undefined) o.city = str(i.city, 80);
  if (i.source !== undefined) o.source = str(i.source, 80);
  if (i.offer !== undefined) o.offer = str(i.offer, 120);
  if (i.amount !== undefined) o.amount = money(i.amount);
  if (i.notes !== undefined) o.notes = str(i.notes, 4000);
  return o;
};

async function log(leadId: string, kind: string, content: string) {
  const sb = await createClient();
  await sb.from("agency_activities").insert({ lead_id: leadId, kind, content: content.slice(0, 2000) });
}

export async function createLead(input: LeadInput): Promise<Result> {
  if (!str(input.business, 120)) return { ok: false, error: "invalid" };
  const sb = await createClient();
  const stage = input.stage && STAGES.includes(input.stage) ? input.stage : "new";
  const { data, error } = await sb.from("agency_leads").insert({ ...clean(input), stage }).select("id").single();
  if (error || !data) return fail(error);
  await log(data.id, "note", "Prospect créé");
  refresh("/agence/prospects");
  return { ok: true, id: data.id };
}

export async function updateLead(id: string, input: Partial<LeadInput>): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.from("agency_leads").update({ ...clean(input), updated_at: new Date().toISOString() }).eq("id", id);
  refresh("/agence/prospects", `/agence/prospects/${id}`);
  return fail(error);
}

/** Change l'étape ; « Signé » crée les tâches de démarrage liées au client. */
export async function setLeadStage(id: string, stage: Stage): Promise<Result> {
  if (!STAGES.includes(stage)) return { ok: false, error: "invalid" };
  const sb = await createClient();
  const { data: lead } = await sb.from("agency_leads").select("stage, business").eq("id", id).maybeSingle();
  if (!lead) return { ok: false, error: "not_found" };
  if (lead.stage === stage) return { ok: true };
  const { error } = await sb
    .from("agency_leads")
    .update({ stage, updated_at: new Date().toISOString(), ...(stage === "signed" ? { signed_at: new Date().toISOString() } : {}) })
    .eq("id", id);
  if (error) return fail(error);
  await log(id, "stage", `Étape : ${stage}`);
  if (stage === "signed") {
    const { count } = await sb.from("tasks").select("id", { count: "exact", head: true }).eq("lead_id", id);
    if (!count) {
      const today = dayKey();
      await sb.from("tasks").insert(
        KICKOFF_TASKS.map((title, i) => ({ title: `${title} — ${lead.business}`.slice(0, 200), space: "agence", lead_id: id, priority: i === 0 ? 2 : 1, due_date: today })),
      );
      await log(id, "task", `${KICKOFF_TASKS.length} tâches de démarrage créées`);
    }
  }
  refresh("/agence/prospects", `/agence/prospects/${id}`, "/perso/taches");
  return { ok: true };
}

export async function deleteLead(id: string): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.from("agency_leads").delete().eq("id", id);
  refresh("/agence/prospects");
  return fail(error);
}

export async function addActivity(leadId: string, kind: "note" | "call" | "email", content: string): Promise<Result> {
  const c = str(content, 2000);
  if (!c) return { ok: false, error: "invalid" };
  await log(leadId, kind, c);
  refresh(`/agence/prospects/${leadId}`);
  return { ok: true };
}

export async function addLeadTask(leadId: string, title: string, due: string | null): Promise<Result> {
  const t = str(title, 200);
  if (!t) return { ok: false, error: "invalid" };
  const sb = await createClient();
  const { error } = await sb.from("tasks").insert({ title: t, space: "agence", lead_id: leadId, due_date: isDay(due) ? due : null });
  refresh(`/agence/prospects/${leadId}`, "/perso/taches");
  return fail(error);
}

/* ---------------- Paiements ---------------- */

export async function createPayment(input: { lead_id: string | null; label: string; kind: PaymentKind; amount: number; due_date: string | null; paid: boolean; method: string }): Promise<Result> {
  const label = str(input.label, 160);
  const amount = money(input.amount);
  if (!label || amount <= 0 || !["deposit", "balance", "subscription", "other"].includes(input.kind)) return { ok: false, error: "invalid" };
  const sb = await createClient();
  const { error } = await sb.from("agency_payments").insert({
    lead_id: input.lead_id || null,
    label,
    kind: input.kind,
    amount,
    due_date: isDay(input.due_date) ? input.due_date : null,
    paid_at: input.paid ? new Date().toISOString() : null,
    method: str(input.method, 40),
  });
  if (!error && input.lead_id) await log(input.lead_id, "payment", `${label} : ${amount} €${input.paid ? " (payé)" : ""}`);
  refresh("/agence/paiements");
  return fail(error);
}

export async function markPaid(id: string, paid: boolean, method = ""): Promise<Result> {
  const sb = await createClient();
  const { data: p } = await sb.from("agency_payments").select("lead_id, label, amount").eq("id", id).maybeSingle();
  const { error } = await sb.from("agency_payments").update({ paid_at: paid ? new Date().toISOString() : null, ...(method ? { method: str(method, 40) } : {}) }).eq("id", id);
  if (!error && p?.lead_id && paid) await log(p.lead_id, "payment", `Paiement reçu : ${p.label} (${Number(p.amount)} €)`);
  refresh("/agence/paiements");
  return fail(error);
}

export async function deletePayment(id: string): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.from("agency_payments").delete().eq("id", id);
  refresh("/agence/paiements");
  return fail(error);
}

/* ---------------- Devis et factures ---------------- */

export async function createDocument(input: { lead_id: string | null; kind: "quote" | "invoice"; lines: DocLine[]; due_on: string | null; notes: string }): Promise<Result> {
  const lines = (input.lines ?? [])
    .map((l) => ({ label: str(l.label, 200), qty: Math.max(0, Number(l.qty) || 0), unit: money(l.unit) }))
    .filter((l) => l.label && l.qty > 0);
  if (!lines.length || !["quote", "invoice"].includes(input.kind)) return { ok: false, error: "invalid" };
  const sb = await createClient();
  const { data: settings } = await sb.from("dash_settings").select("vat_rate, vat_number").eq("id", 1).maybeSingle();
  // Numérotation continue par an : D-2026-001, F-2026-001
  const year = dayKey().slice(0, 4);
  const prefix = `${input.kind === "quote" ? "D" : "F"}-${year}-`;
  const { data: last } = await sb.from("agency_documents").select("number").like("number", `${prefix}%`).order("number", { ascending: false }).limit(1);
  const n = last?.[0] ? Number(last[0].number.slice(prefix.length)) + 1 : 1;
  const vat = settings?.vat_number ? Number(settings.vat_rate) || 0 : 0;
  const { data, error } = await sb
    .from("agency_documents")
    .insert({ lead_id: input.lead_id || null, kind: input.kind, number: `${prefix}${String(n).padStart(3, "0")}`, lines, vat_rate: vat, due_on: isDay(input.due_on) ? input.due_on : null, notes: str(input.notes, 1000) })
    .select("id, number")
    .single();
  if (error || !data) return fail(error);
  if (input.lead_id) await log(input.lead_id, "document", `${input.kind === "quote" ? "Devis" : "Facture"} ${data.number}`);
  refresh("/agence/documents");
  return { ok: true, id: data.id };
}

export async function setDocumentStatus(id: string, status: "draft" | "sent" | "accepted" | "paid" | "cancelled"): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.from("agency_documents").update({ status }).eq("id", id);
  refresh("/agence/documents");
  return fail(error);
}

/* ---------------- Mails ---------------- */

export async function linkEmail(emailId: string, leadId: string | null): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.from("agency_emails").update({ lead_id: leadId }).eq("id", emailId);
  refresh("/agence/mails");
  return fail(error);
}

export async function leadFromEmail(emailId: string): Promise<Result> {
  const sb = await createClient();
  const { data: e } = await sb.from("agency_emails").select("from_email, from_name, subject").eq("id", emailId).maybeSingle();
  if (!e) return { ok: false, error: "not_found" };
  const r = await createLead({ business: e.from_name || e.from_email, contact_name: e.from_name, email: e.from_email, source: "Mail", notes: `Premier mail : ${e.subject}` });
  if (r.ok && r.id) await sb.from("agency_emails").update({ lead_id: r.id }).eq("id", emailId);
  refresh("/agence/mails");
  return r;
}

export async function taskFromEmail(emailId: string): Promise<Result> {
  const sb = await createClient();
  const { data: e } = await sb.from("agency_emails").select("subject, from_name, from_email, lead_id").eq("id", emailId).maybeSingle();
  if (!e) return { ok: false, error: "not_found" };
  const { error } = await sb.from("tasks").insert({
    title: `Répondre : ${e.subject || "(sans objet)"} — ${e.from_name || e.from_email}`.slice(0, 200),
    space: "agence",
    lead_id: e.lead_id,
    due_date: dayKey(),
  });
  refresh("/agence/mails", "/perso/taches");
  return fail(error);
}
