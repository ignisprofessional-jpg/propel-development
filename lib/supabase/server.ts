import "server-only";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SESSION_COOKIE, looksLikeToken } from "@/lib/session";

/**
 * Client Supabase côté serveur uniquement (clé publique).
 * Le jeton de session du cookie est envoyé dans l'en-tête « x-dashboard-token » :
 * les politiques RLS du dashboard n'ouvrent les données qu'avec un jeton valide.
 */
export async function createClient(token?: string) {
  const t = token ?? (await cookies()).get(SESSION_COOKIE)?.value;
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: looksLikeToken(t) ? { "x-dashboard-token": t } : {} },
  });
}

/** Vrai si le cookie porte une session encore valide en base. */
export async function hasValidSession(): Promise<boolean> {
  const t = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!looksLikeToken(t)) return false;
  const supabase = await createClient(t);
  const { data, error } = await supabase.rpc("dashboard_session_valid");
  return !error && data === true;
}
