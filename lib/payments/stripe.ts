import "server-only";
import { createClient } from "@/lib/supabase/server";

export type StripeStatus = { connected: boolean; accountName: string; livemode: boolean; keyHint: string; hasWebhook: boolean };
const NONE: StripeStatus = { connected: false, accountName: "", livemode: false, keyHint: "", hasWebhook: false };

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://propel-developement.netlify.app").replace(/\/$/, "");

/** État de la connexion Stripe (jamais la clé entière). */
export async function getStripeStatus(): Promise<StripeStatus> {
  const sb = await createClient();
  const { data } = await sb.rpc("dashboard_stripe_status");
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return NONE;
  return { connected: true, accountName: row.account_name, livemode: row.livemode, keyHint: row.key_hint, hasWebhook: row.has_webhook };
}

/** Clé enregistrée dans Paramètres, sinon celle de l'environnement (Netlify). */
export async function getStripeKey(): Promise<string | null> {
  const sb = await createClient();
  const { data } = await sb.rpc("dashboard_stripe_key");
  return (typeof data === "string" && data) || process.env.STRIPE_SECRET_KEY || null;
}

/** Appel à l'API Stripe (corps en x-www-form-urlencoded, comme l'attend Stripe). */
export async function stripeApi<T = Record<string, unknown>>(key: string, path: string, params?: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: params ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params ? new URLSearchParams(params).toString() : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  return { ok: res.ok, status: res.status, data: json };
}

export const isStripeKey = (k: string) => /^(sk|rk)_(live|test)_[A-Za-z0-9]{10,}$/.test(k);
