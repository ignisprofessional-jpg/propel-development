import { HomeDashboard } from "@/components/home/HomeDashboard";
import { getDict, getLocale } from "@/lib/i18n/server";
import { formatGregorian, formatHijri } from "@/lib/dates";
import { getHomeData } from "@/lib/home";

export default async function HomePage() {
  const [t, locale, data] = await Promise.all([getDict(), getLocale(), getHomeData()]);
  const now = new Date();
  return <HomeDashboard t={t} locale={locale} gregorian={formatGregorian(now, locale)} hijri={formatHijri(now, locale)} data={data} />;
}
