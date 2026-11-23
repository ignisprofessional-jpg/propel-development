"use client";

import { useState, useTransition } from "react";
import { LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/provider";
import { savePosition } from "@/lib/islam/actions";

/**
 * Utilise la position exacte de l'appareil (GPS / réseau) pour les horaires de prière.
 * Seules les coordonnées sont enregistrées (dans tes réglages Supabase).
 */
export function LocateButton({ className, compact }: { className?: string; compact?: boolean }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();

  const locate = () => {
    if (!("geolocation" in navigator)) {
      toast.error(t.settings.geoUnavailable);
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        start(async () => {
          const r = await savePosition(latitude, longitude, tz);
          setBusy(false);
          if (r.ok) toast.success(`${t.settings.geoSaved} (± ${Math.round(accuracy)} m)`);
          else toast.error(t.islam.error);
        });
      },
      (err) => {
        setBusy(false);
        toast.error(err.code === err.PERMISSION_DENIED ? t.settings.geoDenied : t.settings.geoUnavailable);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  return (
    <button type="button" className={className} onClick={locate} disabled={busy} aria-busy={busy} aria-label={t.settings.geoUse} title={t.settings.geoUse}>
      <LocateFixed size={14} aria-hidden />
      {!compact && <span>{busy ? t.settings.geoLocating : t.settings.geoUse}</span>}
    </button>
  );
}
