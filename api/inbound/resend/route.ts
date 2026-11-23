import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { fetchReceived, htmlToText, parseAddress, verifySvix } from "@/lib/agency/inbound";

/**
 * Webhook Resend « email.received » : à déclarer dans Resend → Webhooks avec l'URL
 * https://<ton-site>/api/inbound/resend. Voir docs/EMAIL.md.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const ingest = process.env.INBOUND_INGEST_TOKEN;
  if (!secret || !ingest) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const raw = await request.text();
  if (raw.length > 1_000_000 || !verifySvix(raw, request.headers, secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (event.type !== "email.received" || !event.data) return NextResponse.json({ ok: true, ignored: true });

  const d = event.data as { email_id?: string; created_at?: string; from?: string; to?: string[]; subject?: string; message_id?: string };
  if (!d.email_id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const content = await fetchReceived(d.email_id);
  const from = parseAddress(content?.headers?.from ?? d.from);
  const body = (content?.text?.trim() || (content?.html ? htmlToText(content.html) : "")).slice(0, 50000);
  const snippet = body.replace(/\s+/g, " ").trim().slice(0, 280);

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await sb.rpc("dashboard_ingest_email", {
    p_token: ingest,
    p_external_id: `resend:${d.email_id}`,
    p_from_email: from.email || (d.from ?? ""),
    p_from_name: from.name,
    p_to_email: (d.to ?? []).join(", "),
    p_subject: d.subject ?? "",
    p_snippet: snippet,
    p_body: body,
    p_received_at: d.created_at ?? new Date().toISOString(),
    p_message_id: d.message_id ?? null,
  });
  if (error || data !== true) return NextResponse.json({ error: "store_failed" }, { status: 500 });

  revalidatePath("/agence/mails");
  return NextResponse.json({ ok: true });
}
