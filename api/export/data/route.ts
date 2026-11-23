import { NextResponse, type NextRequest } from "next/server";
import { createClient, hasValidSession } from "@/lib/supabase/server";
import { EXPORT_TABLES, type ExportTable } from "@/lib/export/tables";

const stamp = () => new Date().toISOString().slice(0, 10);

/**
 * Export de toutes les données du dashboard.
 *   /api/export/data                       → un fichier JSON avec toutes les tables
 *   /api/export/data?table=tasks&format=csv → une table en CSV (séparateur « ; », Excel)
 */
export async function GET(request: NextRequest) {
  if (!(await hasValidSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sb = await createClient();
  const table = request.nextUrl.searchParams.get("table");
  const format = request.nextUrl.searchParams.get("format") ?? "json";

  if (table) {
    if (!EXPORT_TABLES.includes(table as ExportTable)) return NextResponse.json({ error: "unknown_table" }, { status: 400 });
    const { data, error } = await sb.from(table).select("*").limit(50000);
    if (error) return NextResponse.json({ error: "read_failed" }, { status: 500 });
    const rows = (data ?? []) as Record<string, unknown>[];
    if (format === "csv") {
      const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
      const esc = (v: unknown) => `"${(v !== null && typeof v === "object" ? JSON.stringify(v) : String(v ?? "")).replace(/"/g, '""')}"`;
      const csv = "﻿" + [cols.map(esc).join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\r\n");
      return new NextResponse(csv, {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${table}-${stamp()}.csv"`, "Cache-Control": "private, no-store" },
      });
    }
    return NextResponse.json(rows, { headers: { "Content-Disposition": `attachment; filename="${table}-${stamp()}.json"`, "Cache-Control": "private, no-store" } });
  }

  const results = await Promise.all(EXPORT_TABLES.map((t) => sb.from(t).select("*").limit(50000)));
  const out: Record<string, unknown> = { app: "Propel Development", exported_at: new Date().toISOString() };
  EXPORT_TABLES.forEach((t, i) => (out[t] = results[i].data ?? []));
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="propel-dashboard-${stamp()}.json"`, "Cache-Control": "private, no-store" },
  });
}
