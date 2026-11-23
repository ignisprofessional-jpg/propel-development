"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStripeKey, isStripeKey, stripeApi } from "./stripe";

type Result = { ok: true; url?: string; account?: string } | { ok: false; error: string };

/** Vérifie la clé auprès de Stripe puis l'enregistre (côté serveur, schéma privé). */
export async function connectStripe(rawKey: string): Promise<Result> {
  const key = rawKey.trim();
  if (!isStripeKey(key)) return { ok: false, error: "invalid_key" };
  const acc = await stripeApi<{ settings?: { dashboard?: { display_name?: string } }; business_profile?: { name?: string }; email?: string }>(key, "account");
  let name = "";
  if (acc.ok) name = acc.data.settings?.dashboard?.display_name || acc.data.business_profile?.name || acc.data.email || "";
  else {
    // Les clés restreintes n'ont pas toujours accès au compte : on vérifie avec le solde.
    const bal = await stripeApi(key, "balance");
    if (!bal.ok) return { ok: false, error: bal.status === 401 ? "invalid_key" : "stripe_error" };
  }
  const sb = await createClient();
  const { data, error } = await sb.rpc("dashboard_save_stripe", { p_secret: key, p_account: name, p_livemode: key.includes("_live_") });
  if (error || data !== true) return { ok: false, error: "save_failed" };
  revalidatePath("/parametres");
  revalidatePath("/agence/paiements");
  return { ok: true, account: name };
}

export async function saveStripeWebhook(secret: string): Promise<Result> {
  const s = secret.trim();
  if (s && !/^whsec_[A-Za-z0-9+/=]{10,}$/.test(s)) return { ok: false, error: "invalid_secret" };
  const sb = await createClient();
  const { data, error } = await sb.rpc("dashboard_save_stripe_webhook", { p_secret: s });
  if (error || data !== true) return { ok: false, error: "save_failed" };
  revalidatePath("/parametres");
  return { ok: true };
}

export async function disconnectStripe(): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.rpc("dashboard_stripe_disconnect");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/parametres");
  revalidatePath("/agence/paiements");
  return { ok: true };
}

/** Crée (ou renvoie) le lien de paiement Stripe d'un paiement, à envoyer au client. */
export async function createStripeLink(paymentId: string): Promise<Result> {
  const key = await getStripeKey();
  if (!key) return { ok: false, error: "not_connected" };
  const sb = await createClient();
  const { data: p } = await sb.from("agency_payments").select("id, label, amount, paid_at, stripe_link_url").eq("id", paymentId).maybeSingle();
  if (!p) return { ok: false, error: "not_found" };
  if (p.paid_at) return { ok: false, error: "already_paid" };
  if (p.stripe_link_url) return { ok: true, url: p.stripe_link_url };

  const price = await stripeApi<{ id: string }>(key, "prices", {
    currency: "eur",
    unit_amount: String(Math.round(Number(p.amount) * 100)),
    "product_data[name]": String(p.label).slice(0, 200),
  });
  if (!price.ok) return { ok: false, error: price.data.error?.message ?? "stripe_error" };
  const link = await stripeApi<{ id: string; url: string }>(key, "payment_links", {
    "line_items[0][price]": price.data.id,
    "line_items[0][quantity]": "1",
    "metadata[payment_id]": p.id,
    "payment_intent_data[metadata][payment_id]": p.id,
    "after_completion[type]": "hosted_confirmation",
    "after_completion[hosted_confirmation][custom_message]": "Merci, votre paiement est bien reçu. Propel Agency",
  });
  if (!link.ok) return { ok: false, error: link.data.error?.message ?? "stripe_error" };
  await sb.from("agency_payments").update({ stripe_link_id: link.data.id, stripe_link_url: link.data.url, provider: "stripe" }).eq("id", p.id);
  revalidatePath("/agence/paiements");
  return { ok: true, url: link.data.url };
}
