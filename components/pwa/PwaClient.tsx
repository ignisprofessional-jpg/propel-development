"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { format } from "@/lib/i18n/dictionaries";
import { NOTIF_EVENT, readNotifPrefs, showNotification } from "@/lib/pwa/prefs";

type Prayer = { key: string; name: string; at: string };
const SENT = "propel:notified";

/**
 * Service worker (installation de l'app, page hors ligne) et rappels de prière.
 * Les rappels sont programmés dans le navigateur : ils partent tant que le dashboard
 * est ouvert (onglet ou app installée), sans serveur d'envoi.
 */
export function PwaClient() {
  const { t } = useI18n();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_SW_DEV !== "1") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];
    const clear = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };

    const schedule = async () => {
      clear();
      const prefs = readNotifPrefs();
      if (!prefs.on || !("Notification" in window) || Notification.permission !== "granted") return;
      let prayers: Prayer[] = [];
      try {
        const r = await fetch("/api/prayer-times", { cache: "no-store" });
        if (!r.ok) return;
        prayers = (await r.json()).prayers ?? [];
      } catch {
        return;
      }
      const now = Date.now();
      for (const p of prayers) {
        const fireAt = new Date(p.at).getTime() - prefs.before * 60_000;
        const delay = fireAt - now;
        if (delay < -60_000 || delay > 36 * 3600_000) continue; // déjà passé (plus d'une minute) ou trop loin
        timers.push(
          setTimeout(async () => {
            const id = `${p.key}-${p.at}`;
            try {
              if (localStorage.getItem(SENT) === id) return; // un seul rappel même avec plusieurs onglets
              localStorage.setItem(SENT, id);
            } catch {
              /* stockage indisponible */
            }
            const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(p.at));
            const body = prefs.before > 0 ? format(t.settings.notifSoon, { n: prefs.before, time }) : format(t.settings.notifNow, { time });
            await showNotification(p.name, body, "/islam/priere", id);
          }, Math.max(0, delay)),
        );
      }
    };

    schedule();
    const refresh = setInterval(schedule, 60 * 60_000); // les horaires du lendemain arrivent tout seuls
    const onVisible = () => document.visibilityState === "visible" && schedule();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(NOTIF_EVENT, schedule);
    return () => {
      clear();
      clearInterval(refresh);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(NOTIF_EVENT, schedule);
    };
  }, [t]);

  return null;
}
