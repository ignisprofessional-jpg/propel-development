"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, CardHead, Switch, buttonClass, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { format } from "@/lib/i18n/dictionaries";
import { notificationsSupported, readNotifPrefs, showNotification, writeNotifPrefs, type NotifPrefs } from "@/lib/pwa/prefs";
import { CSV_TABLES } from "@/lib/export/tables";
import s from "./settings.module.css";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Rappels de prière (réglage propre à l'appareil). */
export function NotifCard() {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<NotifPrefs>({ on: false, before: 0 });
  const [supported, setSupported] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    setPrefs(readNotifPrefs());
    setSupported(notificationsSupported());
    setDenied(notificationsSupported() && Notification.permission === "denied");
  }, []);

  const update = (p: NotifPrefs) => {
    setPrefs(p);
    writeNotifPrefs(p);
  };
  const toggle = async (on: boolean) => {
    if (!on) return update({ ...prefs, on: false });
    const perm = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    setDenied(perm === "denied");
    if (perm === "granted") update({ ...prefs, on: true });
  };

  return (
    <Card>
      <CardHead title={t.settings.notif} />
      <div className={s.switchRow}>
        <div>
          <p className={s.switchLabel}>{t.settings.notifLabel}</p>
          <p className={s.hint}>{!supported ? t.settings.notifUnsupported : denied ? t.settings.notifDenied : t.settings.notifHint}</p>
        </div>
        <Switch checked={prefs.on} onChange={toggle} label={t.settings.notifLabel} />
      </div>
      {prefs.on && (
        <div className={s.linkRow} style={{ marginTop: "var(--s-3)" }}>
          <select className={inputClass} aria-label={t.settings.notifBefore} value={prefs.before} onChange={(e) => update({ ...prefs, before: Number(e.target.value) })}>
            {[0, 5, 10, 15, 20, 30].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? t.settings.notifAt : format(t.settings.notifMin, { n })}
              </option>
            ))}
          </select>
          <Button size="sm" variant="secondary" onClick={() => showNotification("Propel", t.settings.notifTestBody, "/islam/priere", "test")}>
            {t.settings.notifTest}
          </Button>
        </div>
      )}
    </Card>
  );
}

/** Installer le dashboard comme une app (PWA). */
export function AppCard() {
  const { t } = useI18n();
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalled(matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return (
    <Card>
      <CardHead title={t.settings.app} />
      <div className={s.switchRow}>
        <div>
          <p className={s.switchLabel}>{installed ? t.settings.appInstalled : t.settings.appInstall}</p>
          <p className={s.hint}>{ios && !installed ? t.settings.appIos : t.settings.appHint}</p>
        </div>
        {!installed && evt && (
          <Button
            size="sm"
            onClick={async () => {
              await evt.prompt();
              const r = await evt.userChoice;
              if (r.outcome === "accepted") toast.success(t.settings.appInstalled);
              setEvt(null);
            }}
          >
            <Smartphone size={14} aria-hidden /> {t.settings.appInstall}
          </Button>
        )}
      </div>
    </Card>
  );
}

/** Export des données (JSON complet ou un tableau en CSV). */
export function DataCard() {
  const { t } = useI18n();
  const [table, setTable] = useState<string>(CSV_TABLES[0]);
  const names = t.settings.tables as Record<string, string>;
  return (
    <Card>
      <CardHead title={t.settings.data} />
      <p className={s.hint} style={{ marginBottom: "var(--s-3)" }}>{t.settings.dataHint}</p>
      <div className={s.exportRow}>
        <a className={buttonClass("primary", "sm")} href="/api/export/data" download>
          <Download size={14} aria-hidden /> {t.settings.exportJson}
        </a>
        <span className={s.exportCsv}>
          <select className={inputClass} aria-label={t.settings.exportCsv} value={table} onChange={(e) => setTable(e.target.value)}>
            {CSV_TABLES.map((x) => (
              <option key={x} value={x}>
                {names[x] ?? x}
              </option>
            ))}
          </select>
          <a className={buttonClass("secondary", "sm")} href={`/api/export/data?table=${table}&format=csv`} download>
            {t.settings.exportCsv}
          </a>
        </span>
      </div>
    </Card>
  );
}
