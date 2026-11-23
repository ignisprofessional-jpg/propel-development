"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Card, CardHead } from "./index";
import s from "./sheet.module.css";

const MOBILE_QUERY = "(max-width: 960px)";

/** Vrai sur téléphone / tablette (même seuil que la barre d'onglets). */
export function useIsMobile() {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(MOBILE_QUERY);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}

const CLOSE_MS = 280;

/**
 * Feuille qui monte du bas de l'écran. Ouverture et fermeture animées,
 * glisser vers le bas pour fermer (suit le doigt, se referme selon la distance ou la vitesse).
 */
export function Sheet({ open, onClose, title, children, label }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; label?: string }) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // deux images plus tard : l'état fermé est peint, la transition peut jouer
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), CLOSE_MS);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (panel.current) panel.current.style.transition = "none";
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !panel.current) return;
    const dy = e.clientY - d.y;
    // vers le haut : un peu de résistance ; vers le bas : suit le doigt
    d.dy = dy < 0 ? dy / 6 : dy;
    panel.current.style.transform = `translateY(${d.dy}px)`;
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    const el = panel.current;
    if (!d || !el) return;
    el.style.transition = "";
    el.style.transform = "";
    const v = d.dy / Math.max(1, performance.now() - d.t);
    if (d.dy > 110 || (d.dy > 24 && v > 0.55)) onClose();
  };

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(
    <div className={s.root} data-open={shown ? "" : undefined}>
      <div className={s.backdrop} onClick={onClose} aria-hidden />
      <div ref={panel} className={s.panel} role="dialog" aria-modal="true" aria-label={label}>
        <div className={s.grab} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <span className={s.handle} aria-hidden />
          {title !== undefined && (
            <div className={s.head}>
              <span className={s.title}>{title}</span>
              <button type="button" className={s.close} onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="Fermer">
                <X size={18} aria-hidden />
              </button>
            </div>
          )}
        </div>
        <div className={s.body}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Formulaire « responsive » : une carte sur ordinateur ; sur téléphone, un bouton flottant
 * qui ouvre le même formulaire dans une feuille (la page reste courte).
 */
export function ResponsiveForm({ title, fabLabel, children, fill, after }: { title: ReactNode; fabLabel: string; children: (close: () => void) => ReactNode; fill?: boolean; after?: ReactNode }) {
  const mobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  // Avant l'hydratation (et sur ordinateur) : la carte, masquée en CSS sur téléphone → pas de flash
  if (!mounted || !mobile)
    return (
      <div className={s.inPlace}>
        <Card fill={fill}>
          <CardHead title={title} />
          {children(close)}
          {after}
        </Card>
      </div>
    );
  return (
    <>
      {createPortal(
        <button type="button" className={s.fab} onClick={() => setOpen(true)} aria-label={fabLabel}>
          <span aria-hidden>+</span> {fabLabel}
        </button>,
        document.body,
      )}
      <Sheet open={open} onClose={close} title={title} label={typeof title === "string" ? title : fabLabel}>
        {children(close)}
        {after}
      </Sheet>
    </>
  );
}

/* ---------- Onglets « téléphone seulement » ---------- */

type Tab = { id: string; label: ReactNode };
const TabsCtx = createContext<{ active: string; tabs: Tab[]; pick: (id: string) => void } | null>(null);

/**
 * Sur téléphone, découpe une page longue en onglets (un seul bloc visible à la fois).
 * Sur ordinateur, ne change rien : tous les blocs restent affichés comme avant.
 * Tout passe par le CSS (media query) : même rendu côté serveur et côté navigateur, pas de saut au chargement.
 * `bar={false}` pour placer la barre ailleurs avec <MobileTabsBar />.
 */
export function MobileTabs({ tabs, children, initial, value, onChange, bar = true }: { tabs: Tab[]; children: ReactNode; initial?: string; value?: string; onChange?: (id: string) => void; bar?: boolean }) {
  const [own, setOwn] = useState(initial ?? tabs[0]?.id);
  const active = value ?? own;
  const pick = useCallback(
    (id: string) => {
      setOwn(id);
      onChange?.(id);
      const top = document.querySelector<HTMLElement>("[data-mobile-tabs]");
      if (top && top.getBoundingClientRect().top < 60) window.scrollTo({ top: Math.max(0, window.scrollY + top.getBoundingClientRect().top - 70), behavior: "smooth" });
    },
    [onChange],
  );
  return (
    <TabsCtx.Provider value={{ active, tabs, pick }}>
      {bar && <MobileTabsBar />}
      {children}
    </TabsCtx.Provider>
  );
}

export function MobileTabsBar() {
  const ctx = useContext(TabsCtx);
  if (!ctx) return null;
  return (
    <div className={s.tabs} role="tablist" data-mobile-tabs="">
      {ctx.tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={ctx.active === t.id} className={s.tab} onClick={() => ctx.pick(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Un bloc de MobileTabs. Sur ordinateur il est transparent pour la mise en page (display: contents). */
export function MobilePanel({ id, children }: { id: string; children: ReactNode }) {
  const ctx = useContext(TabsCtx);
  const on = !ctx || ctx.active === id;
  return (
    <div className={s.panelTab} data-panel="" data-on={on ? "" : undefined}>
      {children}
    </div>
  );
}
