import { APP_TZ } from "@/lib/dates";

/** Clé de jour « AAAA-MM-JJ » dans le fuseau de l'app. */
export function dayKey(date = new Date(), tz = APP_TZ): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: tz }).format(date);
}

/** Ajoute n jours à une clé de jour (calcul en UTC, sans effet d'heure d'été). */
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Les n derniers jours, du plus ancien au plus récent (aujourd'hui inclus). */
export function lastDays(n: number, today = dayKey()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
}

/** Jour de la semaine court pour une clé (« lun. », « Mon »). */
export function weekdayShort(key: string, locale: "fr" | "en"): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { weekday: "short", timeZone: "UTC" }).format(
    new Date(key + "T12:00:00Z"),
  );
}
