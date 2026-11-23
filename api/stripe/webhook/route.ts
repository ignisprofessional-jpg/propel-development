import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

/**
 * Webhook Stripe : marque le paiement payé quand le client a réglé via le lien.
 * Signature vérifiée (en-tête Stripe-Signature, HMAC-SHA256, 5 minutes de tolérance).
 * Le secret « whsec_… » est saisi dans Paramètres → Stripe (ou STRIPE_WEBHOOK_SECRET).
 */
export async function POST(request: NextRequest) {
  const ingest = process.env.INBOUND_INGEST_TOKEN;
  if (!ingest) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: dbSecret } = await sb.rpc("dashboard_stripe_webhook_secret", { p_token: ingest });
  const secret = (typeof dbSecret === "string" && dbSecret) || process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const raw = await request.text();
  if (raw.length > 1_000_000 || !verifyStripe(raw, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }
  const event = JSON.parse(raw) as {
    type?: string;
    data?: { object?: { id?: string; metadata?: { payment_id?: string }; payment_intent?: string; payment_status?: string } };
  };
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const o = event.data?.object;
    const id = o?.metadata?.payment_id;
    if (id && /^[0-9a-f-]{36}$/.test(id) && o?.payment_status !== "unpaid") {
      await sb.rpc("dashboard_stripe_mark_paid", { p_token: ingest, p_payment_id: id, p_session_id: o?.id ?? null, p_intent_id: o?.payment_intent ?? null });
      revalidatePath("/agence/paiements");
    }
  }
  return NextResponse.json({ received: true });
}

function verifyStripe(raw: string, header: string | null, secret: string, tolerance = 300) {
  if (!header) return false;
  const items = header.split(",").map((kv) => {
    const i = kv.indexOf("=");
    return [kv.slice(0, i), kv.slice(i + 1)] as const;
  });
  const t = Number(items.find(([k]) => k === "t")?.[1]);
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > tolerance) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${raw}`).digest();
  return items
    .filter(([k]) => k === "v1")
    .some(([, v]) => {
      const got = Buffer.from(v, "hex");
      return got.length === expected.length && timingSafeEqual(got, expected);
    });
}
