"use client";

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock4, LayoutGrid, Menu, SquareCheckBig, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { ALL_ITEMS, isActive } from "@/lib/nav";
import { SidebarContent } from "./SidebarContent";
import { BrandLogo } from "@/components/brand/Marks";
import { PointerGlow } from "./PointerGlow";
import { Intro } from "./Intro";
import { Sheet } from "@/components/ui/Sheet";
import { PwaClient } from "@/components/pwa/PwaClient";
import { Topbar } from "./Topbar";
import { CommandPalette } from "./CommandPalette";
import type { ShellGame, ShellUser } from "./types";
import s from "./shell.module.css";

const TABS = [
  { href: "/", key: "home", icon: LayoutGrid },
  { href: "/islam/priere", key: "prayer", icon: Clock4 },
  { href: "/perso/taches", key: "todo", icon: SquareCheckBig },
  { href: "/agence/prospects", key: "agency", icon: Users },
] as const;

export function AppShell({ user, game, intro = false, children }: { user: ShellUser; game: ShellGame; intro?: boolean; children: ReactNode }) {
  const { t } = useI18n();
  const realPath = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  // Navigation « optimiste » : le lien cliqué devient actif tout de suite,
  // sans attendre la réponse du serveur.
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  // Arrivée sur le site : "in" pendant l'écran d'accueil, "out" quand les blocs entrent.
  const [introPhase, setIntroPhase] = useState<"in" | "out" | null>(intro ? "in" : null);
  const [showIntro, setShowIntro] = useState(intro);
  const reveal = useCallback(() => setIntroPhase("out"), []);
  const finish = useCallback(() => {
    setShowIntro(false);
    setTimeout(() => setIntroPhase(null), 800);
  }, []);
  const path = pendingPath ?? realPath;
  const navigating = pendingPath !== null && pendingPath !== realPath;
  useEffect(() => setPendingPath(null), [realPath]);
  const onNavigate = (href: string) => {
    if (href !== realPath) setPendingPath(href);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = ALL_ITEMS.find((i) => isActive(i.href, path));
  const title = current ? t.nav[current.key] : t.nav.home;
  const tabActive = (href: string) =>
    href === "/agence/prospects" ? path.startsWith("/agence") : href === "/islam/priere" ? path.startsWith("/islam") : isActive(href, path);
  const activeTab = TABS.findIndex((tab) => tabActive(tab.href));
  const moreActive = activeTab === -1;

  return (
    <div className={s.shell} data-intro={introPhase ?? undefined} data-intro-hold={showIntro ? "" : undefined}>
      {showIntro && <Intro name={user.name} onReveal={reveal} onDone={finish} />}
      <PwaClient />
      <div className={s.progress} data-active={navigating ? "" : undefined} aria-hidden />
      <a href="#contenu" className={s.skip}>
        {t.common.skip}
      </a>

      <aside className={s.sidebar}>
        <div className={s.sidebarInner}>
          <Link href="/" className={s.brand} onClick={() => onNavigate("/")}>
            <BrandLogo caption="Development" />
            <span className="visually-hidden">{t.app.name}</span>
          </Link>
          <SidebarContent path={path} game={game} onNavigate={onNavigate} />
        </div>
      </aside>

      <div className={s.main}>
        <Topbar user={user} title={title} onSearch={() => setPaletteOpen(true)} />
        <main id="contenu" className={s.content}>
          {children}
        </main>
      </div>

      <nav className={s.mobileNav} aria-label={t.nav.menu} style={{ "--i": moreActive ? 4 : activeTab } as CSSProperties}>
        <span className={s.tabIndicator} aria-hidden />
        {TABS.map((tab) => {
          const active = tabActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`${s.tab} ${active ? s.tabActive : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={() => onNavigate(tab.href)}
            >
              <tab.icon size={20} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
              <span>{t.nav[tab.key]}</span>
            </Link>
          );
        })}
        <button className={`${s.tab} ${moreActive ? s.tabActive : ""}`} onClick={() => setMenuOpen(true)} aria-expanded={menuOpen}>
          <Menu size={20} strokeWidth={moreActive ? 2.2 : 1.8} aria-hidden />
          <span>{t.nav.more}</span>
        </button>
      </nav>

      <Sheet open={menuOpen} onClose={closeMenu} title={t.nav.menu} label={t.nav.menu}>
        <div className={s.sheetNav}>
          <SidebarContent
            path={path}
            game={game}
            onNavigate={(href) => {
              onNavigate(href);
              setMenuOpen(false);
            }}
          />
        </div>
      </Sheet>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <PointerGlow />
    </div>
  );
}
