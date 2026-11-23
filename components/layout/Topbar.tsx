"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Search, UserRound } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { formatGregorian, formatHijri } from "@/lib/dates";
import type { ShellUser } from "./types";
import s from "./shell.module.css";

export function Topbar({
  user,
  title,
  onSearch,
}: {
  user: ShellUser;
  title: string;
  onSearch: () => void;
}) {
  const { t, locale } = useI18n();
  const [now, setNow] = useState(() => new Date());
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Met la date à jour à minuit sans recharger.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !notifRef.current?.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [notifOpen]);

  const greg = formatGregorian(now, locale);
  const hijri = formatHijri(now, locale);
  const initial = user.name.trim().charAt(0).toUpperCase();

  return (
    <header className={s.topbar}>
      <div className={s.mobileTitle}>
        <span className={s.mobileTitleMain}>{title}</span>
        <span className={s.mobileTitleSub} suppressHydrationWarning>
          {formatGregorian(now, locale, { weekday: false })} · {hijri}
        </span>
      </div>

      <button className={s.search} onClick={onSearch} aria-label={t.topbar.search} aria-keyshortcuts="Control+K">
        <Search size={18} aria-hidden />
        <span className={s.searchMore} aria-hidden>
          <span>
            <span className={s.searchText}>{t.topbar.search}</span>
            <span className={s.kbd}>
              <kbd>Ctrl</kbd>
              <kbd>K</kbd>
            </span>
          </span>
        </span>
      </button>

      <span className={s.spacer} />

      <div className={s.dateChip} suppressHydrationWarning>
        <span className={s.dateMain}>{greg}</span>
        <span className={s.dateHijri}>{hijri}</span>
      </div>

      <div className={`${s.rel} ${s.notif}`} ref={notifRef}>
        <button
          className={s.iconBtn}
          onClick={() => setNotifOpen((v) => !v)}
          aria-label={t.topbar.notifications}
          aria-expanded={notifOpen}
        >
          <Bell size={18} aria-hidden />
        </button>
        {notifOpen && (
          <div className={s.popover} role="dialog" aria-label={t.topbar.notifications}>
            <p className={s.popTitle}>{t.topbar.notifications}</p>
            <p className={s.popEmpty}>{t.topbar.noNotifications}</p>
          </div>
        )}
      </div>

      <Link href="/profil" className={s.avatar} aria-label={t.topbar.account}>
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" width={44} height={44} />
        ) : (
          initial || <UserRound size={18} aria-hidden />
        )}
      </Link>
    </header>
  );
}
