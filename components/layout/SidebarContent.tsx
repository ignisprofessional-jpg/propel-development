"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";
import { RankInsignia } from "@/components/brand/Marks";
import { useI18n } from "@/lib/i18n/provider";
import { NAV, SETTINGS_ITEM, isActive, spaceForPath, type NavItem, type Space } from "@/lib/nav";
import { LangToggle, ThemeToggle } from "./Toggles";
import type { ShellGame } from "./types";
import s from "./shell.module.css";

const STORAGE_KEY = "nav-open";

export function GameCard({ game }: { game: ShellGame }) {
  const { t } = useI18n();
  return (
    <div className={s.game}>
      <div className={s.gameRow}>
        <span className={s.gameLabel}>{t.game.level}</span>
        <span className={s.gameLevel}>{game.level}</span>
      </div>
      <div className={s.xpBar} title={`${game.xpInLevel} / ${game.xpNeeded} ${t.game.xp}`}>
        <div className={s.xpFill} style={{ width: `${Math.min(100, (game.xpInLevel / game.xpNeeded) * 100)}%` }} />
      </div>
      <div className={s.gameRow}>
        <span className={s.rank}>
          <span className={s.rankBadge}>
            <RankInsignia rank={game.rankIndex} size={30} />
          </span>
          <span className={s.rankText}>
            <span className={s.rankKicker}>{t.game.rank}</span>
            <span className={s.rankName}>{game.rankName}</span>
          </span>
        </span>
        <span className={s.xpSmall}>
          {game.xpInLevel}/{game.xpNeeded} {t.game.xp}
        </span>
      </div>
    </div>
  );
}

function NavLink({ item, path, onNavigate }: { item: NavItem; path: string; onNavigate?: (href: string) => void }) {
  const { t } = useI18n();
  const active = isActive(item.href, path);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`${s.link} ${active ? s.linkActive : ""}`}
      aria-current={active ? "page" : undefined}
      onClick={() => onNavigate?.(item.href)}
    >
      <Icon size={17} strokeWidth={1.9} aria-hidden />
      <span className={s.linkText}>{t.nav[item.key]}</span>
    </Link>
  );
}

/** Groupes ouverts : celui de la page courante + ceux ouverts à la main (mémorisés). */
function useOpenGroups(path: string) {
  const current = spaceForPath(path);
  const [open, setOpen] = useState<Set<Space>>(() => new Set([current]));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Space[];
      setOpen(new Set([...saved, current]));
    } catch {
      setOpen((o) => new Set([...o, current]));
    }
    // Les animations ne démarrent qu'après le premier affichage.
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [current]);

  const toggle = (sp: Space) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(sp)) n.delete(sp);
      else n.add(sp);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...n]));
      } catch {}
      return n;
    });

  return { open, toggle, ready };
}

export function SidebarContent({ path, game, onNavigate }: { path: string; game: ShellGame; onNavigate?: (href: string) => void }) {
  const { t } = useI18n();
  const { open, toggle, ready } = useOpenGroups(path);

  return (
    <>
      <GameCard game={game} />
      <nav className={s.nav} aria-label={t.nav.menu} data-ready={ready ? "" : undefined}>
        {NAV.map((g) => {
          if (!g.key) return g.items.map((item) => <NavLink key={item.href} item={item} path={path} onNavigate={onNavigate} />);
          const isOpen = open.has(g.space);
          const GroupIcon = g.icon;
          const id = `nav-${g.space}`;
          return (
            <div key={g.space} className={`${s.group} ${isOpen ? s.groupOpen : ""}`}>
              <button className={s.groupBtn} onClick={() => toggle(g.space)} aria-expanded={isOpen} aria-controls={id}>
                {GroupIcon && <GroupIcon size={17} strokeWidth={1.8} aria-hidden />}
                <span className={`${s.groupName} ${s.linkText}`}>{t.nav[g.key]}</span>
                <ChevronRight size={15} className={s.chevron} aria-hidden />
              </button>
              <div className={s.groupBody} id={id}>
                <div className={s.groupInner} inert={!isOpen || undefined}>
                  {g.items.map((item) => (
                    <NavLink key={item.href} item={item} path={path} onNavigate={onNavigate} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>
      <div className={s.sideFoot}>
        <NavLink item={SETTINGS_ITEM} path={path} onNavigate={onNavigate} />
        <div className={s.toggles}>
          <ThemeToggle />
          <LangToggle />
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className={s.link}>
            <LogOut size={17} strokeWidth={1.8} aria-hidden />
            {t.nav.signOut}
          </button>
        </form>
      </div>
    </>
  );
}
