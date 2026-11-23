import { NextResponse } from "next/server";
import { createClient, hasValidSession } from "@/lib/supabase/server";

/** Export CSV des paiements (séparateur « ; », compatible Excel français). */
export async function GET() {
  if (!(await hasValidSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sb = await createClient();
  const [{ data: payments }, { data: leads }] = await Promise.all([
    sb.from("agency_payments").select("label, kind, amount, due_date, paid_at, method, lead_id, created_at").order("created_at"),
    sb.from("agency_leads").select("id, business"),
  ]);
  const names = new Map((leads ?? []).map((l) => [l.id, l.business]));
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Client", "Libellé", "Type", "Montant", "Échéance", "Payé le", "Moyen"];
  const lines = (payments ?? []).map((p) =>
    [names.get(p.lead_id) ?? "", p.label, p.kind, String(p.amount).replace(".", ","), p.due_date ?? "", p.paid_at ? p.paid_at.slice(0, 10) : "", p.method].map(esc).join(";"),
  );
  const csv = "﻿" + [head.map(esc).join(";"), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="paiements-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
