"use server";

import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, looksLikeToken } from "@/lib/session";

export type PinState = { error?: "invalid" | "locked" | "error"; attempt?: number; ok?: boolean; next?: string };

const safeNext = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

/**
 * Le code est vérifié en base (hash bcrypt) : il n'apparaît nulle part dans le code.
 * En cas de succès, on renvoie `ok` (sans rediriger) pour laisser jouer l'animation
 * de validation ; le client navigue ensuite vers `next`.
 */
export async function unlockWithPin(prev: PinState, form: FormData): Promise<PinState> {
  const pin = String(form.get("pin") ?? "").replace(/\D/g, "");
  const attempt = (prev.attempt ?? 0) + 1;
  if (pin.length < 4) return { error: "invalid", attempt };

  const supabase = await createClient("");
  const ua = (await headers()).get("user-agent") ?? undefined;
  const { data, error } = await supabase.rpc("dashboard_login", { p_pin: pin, p_user_agent: ua });

  if (error) return { error: error.message.includes("too_many_attempts") ? "locked" : "error", attempt };
  if (!looksLikeToken(data as string | null | undefined)) return { error: "invalid", attempt };

  const jar = await cookies();
  jar.set(SESSION_COOKIE, data as string, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return { ok: true, attempt, next: safeNext(form.get("next")) };
}
