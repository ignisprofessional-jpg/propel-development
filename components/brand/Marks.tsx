"use client";


/** Le « P » de Propel (rond + jambage, flèche découpée), en noir et blanc (currentColor). */
export function BrandMark({ size = 24, className, uid }: { size?: number; className?: string; uid?: string }) {
  // Identifiant fixe (identique côté serveur et navigateur) : pas de décalage à l'hydratation
  const id = `-${uid ?? size}`;
  return (
    <svg width={Math.round(size * 0.8)} height={size} viewBox="9.5 4.5 25 31.5" className={className} aria-hidden>
      <defs>
        <mask id={`pm${id}`} maskUnits="userSpaceOnUse" x="-4" y="-4" width="48" height="48">
          <rect x="-4" y="-4" width="48" height="48" fill="#fff" />
          <path d="M17.6 21.4 L26.2 12.8 M19.4 12.8 H26.2 V19.6" fill="none" stroke="#000" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        </mask>
      </defs>
      <g mask={`url(#pm${id})`} fill="currentColor">
        <circle cx="22" cy="17" r="12.5" />
        <path d="M9.5 17V31.75A4.25 4.25 0 0 0 18 31.75V17Z" />
      </g>
    </svg>
  );
}

/** Logo complet : P + « ropel » (comme sur le site), avec la mention en dessous. */
export function BrandLogo({ caption, className }: { caption?: string; className?: string }) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 3, lineHeight: 1 }}>
      <BrandMark size={25} />
      <span style={{ display: "grid", gap: 3 }}>
        <span style={{ fontWeight: 700, fontSize: 21, letterSpacing: "-0.055em" }}>ropel</span>
        {caption && (
          <span style={{ font: "500 9px/1 var(--font-mono)", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-subtle)", marginLeft: 1 }}>
            {caption}
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * Insigne de rang : un hexagone, avec des chevrons (rangs 1 à 3),
 * un losange plein et des chevrons (rangs 4 à 7), puis une étoile (rang 8).
 */
export function RankInsignia({ rank, size = 32 }: { rank: number; size?: number }) {
  const r = Math.max(0, Math.min(7, rank));
  const chevron = (y: number, key: number) => (
    <path key={key} d={`M10.5 ${y} 16 ${y - 3.2} 21.5 ${y}`} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  );
  let inner: React.ReactNode;
  if (r <= 2) {
    const n = r + 1;
    const start = 17.6 + (n - 1) * 1.8;
    inner = Array.from({ length: n }, (_, i) => chevron(start - i * 3.6, i));
  } else if (r <= 6) {
    const n = r - 3;
    inner = (
      <>
        <path d="M16 8.6 18.6 11.2 16 13.8 13.4 11.2Z" fill="currentColor" />
        {Array.from({ length: n }, (_, i) => chevron(19.4 + i * 3.1 - (n - 1) * 1.2, i))}
      </>
    );
  } else {
    inner = <path d="m16 9 1.9 4 4.3.5-3.2 2.9.9 4.2L16 18.4l-3.9 2.2.9-4.2-3.2-2.9 4.3-.5Z" fill="currentColor" />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M16 2.8 27.4 9.4v13.2L16 29.2 4.6 22.6V9.4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" opacity="0.9" />
      {inner}
    </svg>
  );
}
