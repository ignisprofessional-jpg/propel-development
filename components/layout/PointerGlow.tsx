"use client";

import { useEffect } from "react";

/**
 * Le contour des cartes [data-glow] suit la souris (ordinateur uniquement).
 * Loin d'une carte, la lumière revient en haut au centre (état statique).
 * Coupé sur écran tactile et si « réduire les animations » est activé.
 */
export function PointerGlow() {
  useEffect(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let x = -9999;
    let y = -9999;
    const RANGE = 260;

    const update = () => {
      raf = 0;
      document.querySelectorAll<HTMLElement>("[data-glow]").forEach((el) => {
        const r = el.getBoundingClientRect();
        const near = x > r.left - RANGE && x < r.right + RANGE && y > r.top - RANGE && y < r.bottom + RANGE;
        if (near) {
          el.style.setProperty("--mx", `${x - r.left}px`);
          el.style.setProperty("--my", `${y - r.top}px`);
        } else {
          el.style.removeProperty("--mx");
          el.style.removeProperty("--my");
        }
      });
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onLeave = () => {
      x = y = -9999;
      if (!raf) raf = requestAnimationFrame(update);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);
  return null;
}
