import "server-only";
import { cookies } from "next/headers";
import { defaultLocale, dictionaries, isLocale, type Locale } from "./dictionaries";

export type Theme = "dark" | "light";

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get("lang")?.value;
  return isLocale(v) ? v : defaultLocale;
}

export async function getTheme(): Promise<Theme> {
  return (await cookies()).get("theme")?.value === "light" ? "light" : "dark";
}

export async function getDict() {
  return dictionaries[await getLocale()];
}
