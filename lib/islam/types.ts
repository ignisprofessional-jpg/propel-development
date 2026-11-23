/** Types et constantes partagés (utilisables côté client et serveur). */
export type PrayerStatus = "on_time" | "late" | "qada";
export const PRAYER_STATUSES: PrayerStatus[] = ["on_time", "late", "qada"];

export type NaflKind = "sunna_fajr" | "sunna_dhuhr" | "sunna_maghrib" | "sunna_isha" | "witr" | "duha" | "tahajjud";
export const NAFL_KINDS: NaflKind[] = ["sunna_fajr", "sunna_dhuhr", "sunna_maghrib", "sunna_isha", "witr", "duha", "tahajjud"];

export type HifzRow = {
  surah: number;
  status: "learning" | "memorized";
  started_on: string;
  memorized_on: string | null;
  interval_days: number;
  next_review: string | null;
  last_review: string | null;
  reviews: number;
};

export type DhikrCounter = { id: string; label: string; arabic: string | null; target: number; today: number };

export type Settings = {
  first_name: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  calc_method: string;
  madhab: "shafi" | "hanafi";
  quran_daily_pages: number;
  khatm_days: number;
  khatm_started_on: string;
  no_xp_for_worship: boolean;
  ruh_user_id: string | null;
  prayer_tune: Partial<Record<"fajr" | "dhuhr" | "asr" | "maghrib" | "isha", number>>;
  company_name: string;
  company_address: string;
  company_email: string;
  siret: string;
  vat_number: string;
  vat_rate: number;
};
