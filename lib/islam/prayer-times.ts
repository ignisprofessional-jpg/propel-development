import { CalculationMethod, CalculationParameters, Coordinates, HighLatitudeRule, Madhab, PrayerTimes } from "adhan";

export const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type PrayerKey = (typeof PRAYER_KEYS)[number];

export const PRAYER_NAMES: Record<PrayerKey, { label: string; arabic: string }> = {
  fajr: { label: "Fajr", arabic: "الفجر" },
  dhuhr: { label: "Dhuhr", arabic: "الظهر" },
  asr: { label: "Asr", arabic: "العصر" },
  maghrib: { label: "Maghrib", arabic: "المغرب" },
  isha: { label: "Isha", arabic: "العشاء" },
};

/** Méthodes de calcul proposées (France en premier). */
export const CALC_METHODS = [
  { id: "france12", label: "France — UOIF (12°)" },
  { id: "france15", label: "France — 15°" },
  { id: "france18", label: "France — 18°" },
  { id: "mwl", label: "Ligue islamique mondiale" },
  { id: "moonsighting", label: "Moonsighting Committee" },
  { id: "isna", label: "Amérique du Nord (ISNA)" },
  { id: "egypt", label: "Égypte" },
  { id: "karachi", label: "Karachi" },
  { id: "ummalqura", label: "Umm al-Qura (La Mecque)" },
  { id: "dubai", label: "Dubaï" },
  { id: "qatar", label: "Qatar" },
  { id: "kuwait", label: "Koweït" },
  { id: "turkey", label: "Turquie (Diyanet)" },
  { id: "singapore", label: "Singapour" },
] as const;
export type CalcMethodId = (typeof CALC_METHODS)[number]["id"];

function params(method: string): CalculationParameters {
  const custom = (angle: number) => {
    const p = CalculationMethod.Other();
    p.fajrAngle = angle;
    p.ishaAngle = angle;
    return p;
  };
  switch (method) {
    case "france12": return custom(12);
    case "france15": return custom(15);
    case "france18": return custom(18);
    case "moonsighting": return CalculationMethod.MoonsightingCommittee();
    case "isna": return CalculationMethod.NorthAmerica();
    case "egypt": return CalculationMethod.Egyptian();
    case "karachi": return CalculationMethod.Karachi();
    case "ummalqura": return CalculationMethod.UmmAlQura();
    case "dubai": return CalculationMethod.Dubai();
    case "qatar": return CalculationMethod.Qatar();
    case "kuwait": return CalculationMethod.Kuwait();
    case "turkey": return CalculationMethod.Turkey();
    case "singapore": return CalculationMethod.Singapore();
    default: return CalculationMethod.MuslimWorldLeague();
  }
}

export type PrayerSettings = { latitude: number; longitude: number; timezone: string; calc_method: string; madhab: string };

/** Date « civile » (midi UTC) correspondant à une clé de jour, pour adhan. */
const civilDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};

export function prayerTimesFor(dayKeyStr: string, s: PrayerSettings) {
  const coords = new Coordinates(s.latitude, s.longitude);
  const p = params(s.calc_method);
  p.madhab = s.madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  p.highLatitudeRule = HighLatitudeRule.recommended(coords);
  const t = new PrayerTimes(coords, civilDate(dayKeyStr), p);
  return { fajr: t.fajr, sunrise: t.sunrise, dhuhr: t.dhuhr, asr: t.asr, maghrib: t.maghrib, isha: t.isha };
}

export function formatTime(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: tz }).format(date);
}

/** Prochaine prière à partir de maintenant (passe au Fajr du lendemain après Isha). */
export function nextPrayer(today: string, tomorrow: string, s: PrayerSettings, now = new Date()) {
  const t = prayerTimesFor(today, s);
  const key = PRAYER_KEYS.find((k) => t[k].getTime() > now.getTime());
  if (key) return { key, at: t[key] };
  return { key: "fajr" as PrayerKey, at: prayerTimesFor(tomorrow, s).fajr };
}
