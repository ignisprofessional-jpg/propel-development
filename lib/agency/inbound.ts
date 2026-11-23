import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Vrai quand le webhook Resend peut être reçu (secret de signature + jeton d'ingestion). */
export function inboundConfigured() {
  return !!process.env.RESEND_WEBHOOK_SECRET && !!process.env.INBOUND_INGEST_TOKEN;
}

/**
 * Vérifie la signature Svix envoyée par Resend.
 * Contenu signé : `${svix-id}.${svix-timestamp}.${corps brut}`, HMAC-SHA256, clé = secret « whsec_… » décodé en base64.
 */
export function verifySvix(raw: string, headers: Headers, secret: string, toleranceSec = 300): boolean {
  const id = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sigs = headers.get("svix-signature");
  if (!id || !ts || !sigs) return false;
  const t = Number(ts);
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${raw}`).digest();
  return sigs.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    const got = Buffer.from(value, "base64");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

/** « Jean Dupont <jean@x.fr> » → { name, email } */
export function parseAddress(v: string | undefined | null): { name: string; email: string } {
  const s = (v ?? "").trim();
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim(), email: m[2].trim().toLowerCase() };
  return { name: "", email: s.toLowerCase() };
}

/** Texte lisible à partir du HTML quand le mail n'a pas de partie texte. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Received = { text?: string | null; html?: string | null; headers?: Record<string, string> | null };

/** Récupère le contenu du mail (le webhook ne contient que les métadonnées). Nécessite RESEND_API_KEY. */
export async function fetchReceived(emailId: string): Promise<Received | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    return (await r.json()) as Received;
  } catch {
    return null;
  }
}
