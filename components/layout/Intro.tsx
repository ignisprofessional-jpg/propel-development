"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import s from "./intro.module.css";

const EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

/**
 * Arrivée sur le site : « Assalâmu ‘alaykum, William » se dessine lettre par lettre
 * au centre, puis glisse jusqu'au titre de l'accueil et se fond dedans pendant que
 * le fond noir s'efface. Ailleurs qu'à l'accueil, la phrase monte et le rideau se lève.
 */
export function Intro({ name, onReveal, onDone }: { name: string; onReveal: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const textRef = useRef<HTMLParagraphElement>(null);
  const [mode, setMode] = useState<"in" | "fly" | "lift">("in");
  // Juste avant l'envol, les lettres animées laissent place au texte normal (même crénage que le titre)
  const [plain, setPlain] = useState(false);

  // Même taille de lettres que le titre de l'accueil.
  useLayoutEffect(() => {
    const target = document.querySelector<HTMLElement>("[data-intro-target]");
    const el = textRef.current;
    if (!target || !el) return;
    el.style.fontSize = getComputedStyle(target).fontSize;
    // Si le titre passe à la ligne, la phrase passe à la ligne au même endroit (atterrissage exact).
    // Mesuré une fois les polices prêtes, avant que les lettres soient visibles.
    let cancelled = false;
    document.fonts.ready.then(() =>
      requestAnimationFrame(() => {
        if (cancelled) return;
        const tr = target.getBoundingClientRect();
        const lh = parseFloat(getComputedStyle(target).lineHeight) || parseFloat(el.style.fontSize);
        const lines = Math.round(tr.height / lh);
        if (lines > 1 && tr.width >= el.scrollWidth * 0.5) {
          el.style.maxWidth = `${tr.width}px`;
          el.style.textAlign = "left";
          el.style.textWrap = "wrap";
          // Bloc resserré sur la ligne la plus longue : la phrase reste bien centrée à l'écran
          requestAnimationFrame(() => {
            const range = document.createRange();
            range.selectNodeContents(el);
            const rects = [...range.getClientRects()];
            if (!rects.length) return;
            const left = Math.min(...rects.map((r) => r.left));
            const right = Math.max(...rects.map((r) => r.right));
            el.style.width = `${Math.ceil(right - left) + 2}px`;
          });
        } else if (lines === 1) {
          // le titre tient sur une ligne : la phrase aussi, pour que chaque mot atterrisse à sa place
          el.style.whiteSpace = "nowrap";
          el.style.maxWidth = "none";
        }
      }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealAt = reduce ? 450 : 1500;
    const flight = reduce ? 300 : 900;
    const toPlain = setTimeout(() => setPlain(true), revealAt - 70);

    const reveal = setTimeout(() => {
      const el = textRef.current;
      const target = document.querySelector<HTMLElement>("[data-intro-target]");
      const b = target?.getBoundingClientRect();
      if (el && target && b && b.width > 0 && b.bottom > 0 && b.top < innerHeight && !reduce) {
        // On aligne le premier mot de la phrase sur le premier mot du titre, puis on fond l'un dans l'autre.
        const box = el.getBoundingClientRect();
        const from = (el.querySelector("[data-first]") ?? el).getBoundingClientRect();
        const to = firstWordRect(target) ?? b;
        const scale = parseFloat(getComputedStyle(target).fontSize) / parseFloat(getComputedStyle(el).fontSize) || 1;
        // Origine au centre gauche du premier mot : on aligne les bords gauches et les milieux de ligne.
        el.style.transformOrigin = `${from.left - box.left}px ${from.top - box.top + from.height / 2}px`;
        // La phrase se pose exactement sur le titre (aucun fondu : « William » ne disparaît jamais) ;
        // à l'arrivée, le vrai titre prend la place au même endroit, sans que rien ne bouge.
        el.style.transition = `transform ${flight}ms ${EASE}`;
        el.style.transform = `translate(${to.left - from.left}px, ${to.top + to.height / 2 - (from.top + from.height / 2)}px) scale(${scale})`;
        setMode("fly");
      } else {
        setMode("lift");
      }
      onReveal();
    }, revealAt);
    const done = setTimeout(onDone, revealAt + flight + 40);
    return () => {
      clearTimeout(toPlain);
      clearTimeout(reveal);
      clearTimeout(done);
    };
  }, [onReveal, onDone]);

  // Lettres animées une à une ; chaque mot reste insécable pour un retour à la ligne propre.
  const words = t.home.greeting.split(" ");
  let n = 0;
  const letters = (text: string, muted = false) =>
    [...text].map((c, i) => (
      <span key={i} className={muted ? `${s.ch} ${s.muted}` : s.ch} style={{ animationDelay: `${80 + n++ * 26}ms` }}>
        {c}
      </span>
    ));

  return (
    <div className={s.intro} data-mode={mode} aria-hidden>
      <div className={s.veil} />
      <p ref={textRef} className={s.hello}>
        {plain ? (
          <>
            <span data-first="">{words[0]}</span>
            {words.length > 1 ? ` ${words.slice(1).join(" ")}` : ""}
            {name && <span className={s.muted}>, {name}</span>}
          </>
        ) : (
          <>
        {words.map((w, i) => (
          <span key={i}>
            <span className={s.w} data-first={i === 0 ? "" : undefined}>
              {letters(w)}
              {i === words.length - 1 && name ? letters(",", true) : null}
            </span>
            {i < words.length - 1 || name ? " " : ""}
          </span>
        ))}
        {name && <span className={s.w}>{letters(name, true)}</span>}
          </>
        )}
      </p>
    </div>
  );
}

/** Rectangle du premier mot d'un élément texte (pour viser exactement le début du titre). */
function firstWordRect(el: HTMLElement): DOMRect | null {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const node = walker.nextNode() as Text | null;
  if (!node?.data) return null;
  const end = node.data.indexOf(" ");
  const range = document.createRange();
  range.setStart(node, 0);
  range.setEnd(node, end > 0 ? end : node.data.length);
  return range.getClientRects()[0] ?? null;
}
