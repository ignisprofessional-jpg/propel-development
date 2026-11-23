"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, CardHead, Field, PageHeader, ScrollArea, Switch, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { format } from "@/lib/i18n/dictionaries";
import { linkRuh, saveSettings, searchCity, unlinkRuh, type CityResult } from "@/lib/islam/actions";
import { CALC_METHODS } from "@/lib/islam/prayer-times";
import type { Settings } from "@/lib/islam/types";
import { LocateButton } from "@/components/islam/LocateButton";
import { AppCard, DataCard, NotifCard } from "./DeviceCards";
import { StripeCard } from "./StripeCard";
import { MobilePanel, MobileTabs } from "@/components/ui/Sheet";
import type { StripeStatus } from "@/lib/payments/stripe";
import s from "./settings.module.css";

export function SettingsForm({
  initial,
  ruhLinked,
  ruhUpdatedAt,
  stripe,
  stripeWebhookUrl,
}: {
  initial: Settings;
  ruhLinked: boolean;
  ruhUpdatedAt: string | null;
  stripe: StripeStatus;
  stripeWebhookUrl: string;
}) {
  const { t, locale } = useI18n();
  const [v, setV] = useState(initial);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityResult[] | null>(null);
  const [saving, startSaving] = useTransition();
  const set = <K extends keyof Settings>(k: K, val: Settings[K]) => setV((o) => ({ ...o, [k]: val }));

  // Recherche de ville avec un petit délai pendant la frappe
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    const id = setTimeout(async () => setResults(await searchCity(query, locale)), 300);
    return () => clearTimeout(id);
  }, [query, locale]);

  // La liaison Rûh se fait à part : elle ne compte pas comme une modification à enregistrer.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dirty = JSON.stringify({ ...v, ruh_user_id: null }) !== JSON.stringify({ ...initial, ruh_user_id: null });

  return (
    <form
      id="settings-form"
      className={s.form}
      onSubmit={(e) => {
        e.preventDefault();
        startSaving(async () => {
          const r = await saveSettings(v);
          if (r.ok) toast.success(t.settings.saved);
          else toast.error(t.islam.error);
        });
      }}
    >
      <PageHeader
        title={t.settings.title}
        actions={
          <Button type="submit" disabled={!dirty || saving} className={s.saveTop}>
            {t.settings.save}
          </Button>
        }
      />
      {mounted &&
        createPortal(
          <Button type="submit" form="settings-form" disabled={!dirty || saving} className={s.saveFloat} aria-hidden={!dirty}>
            {t.settings.save}
          </Button>,
          document.body,
        )}
      <MobileTabs tabs={[{ id: "general", label: t.settings.tabs.general }, { id: "islam", label: t.nav.islam }, { id: "agency", label: t.nav.agency }, { id: "device", label: t.settings.tabs.device }]}>
      <div className={s.grid}>
      <ScrollArea>
      <div className={s.column}>
      <MobilePanel id="general">
      <Card>
        <CardHead title={t.settings.profile} />
        <Field label={t.settings.firstName} hint={t.settings.firstNameHint}>
          <input className={inputClass} value={v.first_name} maxLength={40} autoComplete="given-name" onChange={(e) => set("first_name", e.target.value)} />
        </Field>
      </Card>

      <Card>
        <CardHead title={t.settings.prayer} />
        <div className={s.stack}>
          <Field label={t.settings.city} hint={format(t.settings.cityCurrent, { city: v.city })}>
            <input className={inputClass} type="search" placeholder={t.settings.citySearch} value={query} onChange={(e) => setQuery(e.target.value)} />
          </Field>
          <div className={s.geo}>
            <LocateButton className={s.geoBtn} />
            <span className={s.hint}>{t.settings.geoHint}</span>
          </div>
          {results && (
            <ul className={s.results}>
              {results.length === 0 && <li className={s.noResult}>{t.settings.noResult}</li>}
              {results.map((r) => (
                <li key={`${r.latitude},${r.longitude}`}>
                  <button
                    type="button"
                    className={s.result}
                    onClick={() => {
                      setV((o) => ({ ...o, city: r.name, latitude: r.latitude, longitude: r.longitude, timezone: r.timezone }));
                      setQuery("");
                      setResults(null);
                    }}
                  >
                    <MapPin size={14} aria-hidden />
                    <span>
                      {r.name}
                      <span className={s.resultMeta}>{[r.region, r.country].filter(Boolean).join(", ")}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Field label={t.settings.method}>
            <select className={inputClass} value={v.calc_method} onChange={(e) => set("calc_method", e.target.value)}>
              {CALC_METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          {/* Réglages fins repliés : on ne les touche presque jamais */}
          <details className={s.advanced}>
          <summary>{t.settings.advanced}</summary>
          <div className={s.advancedBody}>
          <div className={s.field}>
            <span className={s.label}>{t.settings.tune}</span>
            <div className={s.tune}>
              {(["fajr", "dhuhr", "asr", "maghrib", "isha"] as const).map((k) => (
                <label key={k} className={s.tuneItem}>
                  <span>{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                  <input
                    className={inputClass}
                    type="number"
                    inputMode="numeric"
                    min={-30}
                    max={30}
                    value={v.prayer_tune?.[k] ?? 0}
                    onChange={(e) => set("prayer_tune", { ...v.prayer_tune, [k]: Number(e.target.value) })}
                  />
                </label>
              ))}
            </div>
            <span className={s.hint}>{t.settings.tuneHint}</span>
          </div>
          <Field label={t.settings.madhab}>
            <select className={inputClass} value={v.madhab} onChange={(e) => set("madhab", e.target.value as "shafi" | "hanafi")}>
              <option value="shafi">{t.settings.shafi}</option>
              <option value="hanafi">{t.settings.hanafi}</option>
            </select>
          </Field>
          </div>
          </details>
        </div>
      </Card>
      </MobilePanel>

      </div>
      </ScrollArea>
      <ScrollArea>
      <div className={s.column}>
      <MobilePanel id="islam">
      <RuhLink linked={ruhLinked} updatedAt={ruhUpdatedAt} />
      </MobilePanel>

      <MobilePanel id="agency">
      <Card>
        <CardHead title={t.settings.company} />
        <div className={s.stack}>
        <p className={s.hint} style={{ marginTop: -8 }}>{t.settings.companyHint}</p>
        <div className={s.two}>
          <Field label={t.settings.companyName}>
            <input className={inputClass} value={v.company_name ?? ""} maxLength={120} autoComplete="organization" onChange={(e) => set("company_name", e.target.value)} />
          </Field>
          <Field label={t.settings.companyEmail}>
            <input className={inputClass} type="email" value={v.company_email ?? ""} maxLength={160} onChange={(e) => set("company_email", e.target.value)} />
          </Field>
        </div>
        <Field label={t.settings.companyAddress}>
          <input className={inputClass} value={v.company_address ?? ""} maxLength={300} autoComplete="street-address" onChange={(e) => set("company_address", e.target.value)} />
        </Field>
        <div className={s.two}>
          <Field label={t.settings.siret}>
            <input className={inputClass} inputMode="numeric" value={v.siret ?? ""} maxLength={17} placeholder="ex. 123 456 789 00012" onChange={(e) => set("siret", e.target.value)} />
          </Field>
          <Field label={t.settings.vatNumber}>
            <input className={inputClass} value={v.vat_number ?? ""} maxLength={30} onChange={(e) => set("vat_number", e.target.value)} />
          </Field>
        </div>
        {v.vat_number ? (
          <Field label={t.settings.vatRate}>
            <input className={inputClass} type="number" min={0} max={30} step="0.1" value={v.vat_rate ?? 20} onChange={(e) => set("vat_rate", Number(e.target.value))} />
          </Field>
        ) : null}
        </div>
      </Card>

      <StripeCard status={stripe} webhookUrl={stripeWebhookUrl} />
      </MobilePanel>

      <MobilePanel id="islam">
      <Card>
        <CardHead title={t.settings.quran} />
        <div className={s.two}>
          <Field label={t.settings.dailyPages}>
            <input className={inputClass} type="number" inputMode="numeric" min={1} max={604} value={v.quran_daily_pages} onChange={(e) => set("quran_daily_pages", Number(e.target.value))} />
          </Field>
          <Field label={t.settings.khatmDays}>
            <input className={inputClass} type="number" inputMode="numeric" min={1} max={3650} value={v.khatm_days} onChange={(e) => set("khatm_days", Number(e.target.value))} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHead title={t.settings.worship} />
        <div className={s.switchRow}>
          <div>
            <p className={s.switchLabel}>{t.settings.noXp}</p>
            <p className={s.hint}>{t.settings.noXpHint}</p>
          </div>
          <Switch checked={v.no_xp_for_worship} onChange={(c) => set("no_xp_for_worship", c)} label={t.settings.noXp} />
        </div>
      </Card>

      <NotifCard />
      </MobilePanel>

      <MobilePanel id="device">
      <AppCard />
      <DataCard />
      </MobilePanel>

      </div>
      </ScrollArea>
      </div>
      </MobileTabs>
    </form>
  );
}

/** Liaison du compte Rûh (lecture seule de sa progression). */
function RuhLink({ linked, updatedAt }: { linked: boolean; updatedAt: string | null }) {
  const { t, locale } = useI18n();
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();
  const date = updatedAt
    ? new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(updatedAt))
    : null;

  return (
    <Card>
      <CardHead title={t.settings.ruh} />
      {linked ? (
        <div className={s.switchRow}>
          <div>
            <p className={s.switchLabel}>{t.settings.ruhLinked}</p>
            <p className={s.hint}>
              {t.settings.ruhLinkedText}
              {date && <> · {format(t.islam.overview.lastSync, { date })}</>}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => start(async () => void (await unlinkRuh()))}
          >
            {t.settings.ruhUnlink}
          </Button>
        </div>
      ) : (
        <>
        <div className={s.linkRow}>
          <Field label={t.settings.ruhEmail}>
            <input className={inputClass} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button
            size="sm"
            disabled={pending || !email}
            onClick={() =>
              start(async () => {
                const r = await linkRuh(email);
                if (r.ok) toast.success(t.settings.ruhLinked);
                else toast.error(r.error === "not_found" ? t.settings.ruhNotFound : t.islam.error);
              })
            }
          >
            {t.settings.ruhLink}
          </Button>
        </div>
        <p className={s.hint}>{t.settings.ruhHint}</p>
        </>
      )}
    </Card>
  );
}
