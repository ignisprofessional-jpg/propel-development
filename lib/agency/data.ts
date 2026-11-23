import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Activity, Doc, Email, Lead, Payment } from "./types";

export async function getLeads(): Promise<Lead[]> {
  const sb = await createClient();
  const { data } = await sb.from("agency_leads").select("*").order("sort").order("updated_at", { ascending: false });
  return (data ?? []).map((l) => ({ ...l, amount: Number(l.amount) })) as Lead[];
}

export async function getLead(id: string) {
  const sb = await createClient();
  const [{ data: lead }, { data: activities }, { data: tasks }, { data: payments }, { data: emails }, { data: docs }] = await Promise.all([
    sb.from("agency_leads").select("*").eq("id", id).maybeSingle(),
    sb.from("agency_activities").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    sb.from("tasks").select("id, title, status, due_date, priority").eq("lead_id", id).order("status").order("due_date", { nullsFirst: false }),
    sb.from("agency_payments").select("*").eq("lead_id", id).order("due_date", { nullsFirst: false }),
    sb.from("agency_emails").select("*").eq("lead_id", id).order("received_at", { ascending: false }).limit(20),
    sb.from("agency_documents").select("id, kind, number, issued_on, status, lines, vat_rate").eq("lead_id", id).order("issued_on", { ascending: false }),
  ]);
  if (!lead) return null;
  return {
    lead: { ...lead, amount: Number(lead.amount) } as Lead,
    activities: (activities ?? []) as Activity[],
    tasks: (tasks ?? []) as { id: string; title: string; status: string; due_date: string | null; priority: number }[],
    payments: (payments ?? []).map((p) => ({ ...p, amount: Number(p.amount) })) as Payment[],
    emails: (emails ?? []) as Email[],
    docs: (docs ?? []).map((d) => ({ ...d, vat_rate: Number(d.vat_rate) })) as Doc[],
  };
}

export async function getPayments(): Promise<Payment[]> {
  const sb = await createClient();
  const { data } = await sb.from("agency_payments").select("*").order("paid_at", { ascending: true, nullsFirst: true }).order("due_date", { nullsFirst: false });
  return (data ?? []).map((p) => ({ ...p, amount: Number(p.amount) })) as Payment[];
}

export async function getDocuments(): Promise<Doc[]> {
  const sb = await createClient();
  const { data } = await sb.from("agency_documents").select("*").order("issued_on", { ascending: false }).order("number", { ascending: false });
  return (data ?? []).map((d) => ({ ...d, vat_rate: Number(d.vat_rate) })) as Doc[];
}

export async function getDocument(id: string): Promise<Doc | null> {
  const sb = await createClient();
  const { data } = await sb.from("agency_documents").select("*").eq("id", id).maybeSingle();
  return data ? ({ ...data, vat_rate: Number(data.vat_rate) } as Doc) : null;
}

export async function getEmails(limit = 100): Promise<Email[]> {
  const sb = await createClient();
  const { data } = await sb.from("agency_emails").select("*").order("received_at", { ascending: false }).limit(limit);
  return (data ?? []) as Email[];
}

/** Chiffre d'affaires encaissé sur le mois en cours (paiements marqués payés). */
export async function getMonthRevenue(): Promise<number> {
  const sb = await createClient();
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { data } = await sb.from("agency_payments").select("amount").gte("paid_at", start);
  return (data ?? []).reduce((a, p) => a + Number(p.amount), 0);
}
