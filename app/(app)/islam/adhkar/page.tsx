import { MobilePanel, MobileTabs } from "@/components/ui/Sheet";
import { PageHeader } from "@/components/ui";
import { getDict, getLocale } from "@/lib/i18n/server";
import { dayKey } from "@/lib/day";
import { getAdhkar, getDhikr, getSettings } from "@/lib/islam/data";
import { getDayTimes } from "@/lib/islam/times";
import { AdhkarList } from "./AdhkarList";
import { Tasbih } from "./Tasbih";
import s from "../islam.module.css";

export const metadata = { title: "Adhkar" };

export default async function AdhkarPage() {
  const [t, locale, settings] = await Promise.all([getDict(), getLocale(), getSettings()]);
  const today = dayKey();
  const [done, counters] = await Promise.all([getAdhkar(today), getDhikr(today)]);
  // Matin jusqu'au Asr, soir ensuite.
  const asr = (await getDayTimes(today, settings)).asr;
  const period = Date.now() < asr.getTime() ? "morning" : "evening";

  return (
    <>
      <PageHeader kicker={t.nav.islam} title={t.nav.adhkar} />
      <MobileTabs tabs={[{ id: "adhkar", label: "Adhkar" }, { id: "dhikr", label: "Dhikr" }]}>
        <div className={s.grid2}>
          <MobilePanel id="adhkar">
            <AdhkarList day={today} initialPeriod={period} done={done} locale={locale} />
          </MobilePanel>
          <MobilePanel id="dhikr">
            <Tasbih day={today} counters={counters} />
          </MobilePanel>
        </div>
      </MobileTabs>
    </>
  );
}
