"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CircleDot,
  Clock4,
  Gem,
  GraduationCap,
  ListChecks,
  Repeat2,
  Sparkles,
  Timer,
  Maximize2,
  Minus,
  Plus,
  X,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui";
import { BrandMark } from "@/components/brand/Marks";
import { useI18n } from "@/lib/i18n/provider";
import { format } from "@/lib/i18n/dictionaries";
import { TREE, type Branch } from "@/lib/game/tree";
import type { TreeState, TreeStep } from "@/lib/game/data";
import s from "./tree.module.css";

const ICONS: Record<Branch["icon"], LucideIcon> = {
  prayer: Clock4,
  quran: BookOpen,
  hifz: Sparkles,
  adhkar: CircleDot,
  ruh: GraduationCap,
  focus: Timer,
  habits: Repeat2,
  tasks: ListChecks,
  level: Gem,
};

type P = { x: number; y: number };

/** Courbe lisse passant par tous les points (Catmull-Rom → Bézier). */
function smoothPath(pts: P[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/**
 * Arbre de progression organique : les branches partent du centre dans toutes les
 * directions en s'incurvant. On ne voit que les paliers obtenus et le prochain ;
 * la suite se devine (trait en pointillé) et se dévoile au fur et à mesure.
 */
export function TreeView({ tree }: { tree: TreeState }) {
  const { t, locale } = useI18n();
  const [selected, setSelected] = useState<{ branch: Branch; index: number; step: TreeStep } | null>(null);
  const [hover, setHover] = useState<{ bi: number; k: number } | null>(null);
  // Zoom et déplacement (molette, pincement, glisser, boutons)
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const MIN = 1;
  const MAX = 4;

  /** Point écran → coordonnées du dessin (avant zoom). */
  const toSvg = (cx: number, cy: number) => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return { x: 0, y: 0 };
    const pt = new DOMPoint(cx, cy).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  };
  const zoomAt = (factor: number, cx?: number, cy?: number) =>
    setView((v) => {
      const k = Math.min(MAX, Math.max(MIN, v.k * factor));
      if (k === MIN) return { k: 1, x: 0, y: 0 };
      const r = svgRef.current?.getBoundingClientRect();
      const p = toSvg(cx ?? (r ? r.left + r.width / 2 : 0), cy ?? (r ? r.top + r.height / 2 : 0));
      return { k, x: p.x - ((p.x - v.x) * k) / v.k, y: p.y - ((p.y - v.y) * k) / v.k };
    });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(Math.exp(-e.deltaY * 0.0018), e.clientX, e.clientY);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
      drag.current = null;
      return;
    }
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(d / pinch.current, (a.x + b.x) / 2, (a.y + b.y) / 2);
      pinch.current = d;
      return;
    }
    const d0 = drag.current;
    if (!d0 || d0.id !== e.pointerId || view.k === 1) return;
    const dx = e.clientX - d0.x;
    const dy = e.clientY - d0.y;
    if (!d0.moved && Math.hypot(dx, dy) < 4) return;
    if (!d0.moved) svgRef.current?.setPointerCapture(e.pointerId);
    d0.moved = true;
    const m = svgRef.current?.getScreenCTM();
    const scale = m ? m.a : 1;
    setView((v) => ({ ...v, x: v.x + dx / scale, y: v.y + dy / scale }));
    d0.x = e.clientX;
    d0.y = e.clientY;
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const moved = drag.current?.moved;
    drag.current = null;
    if (moved) e.preventDefault();
  };
  const showLabels = view.k >= 1.7;

  // Écran en hauteur (téléphone) : l'arbre s'étire en hauteur plutôt qu'en largeur
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setPortrait(e.contentRect.height > e.contentRect.width * 1.05));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => {
    const N = TREE.length;
    const sx = portrait ? 0.92 : 1.38;
    const sy = portrait ? 1.42 : 1;
    const pos = (angleDeg: number, r: number): P => {
      const a = (angleDeg * Math.PI) / 180;
      return { x: Math.cos(a) * r * sx, y: Math.sin(a) * r * sy };
    };
    const branches = TREE.map((b, bi) => {
      const state = tree.branches.find((x) => x.id === b.id)!;
      const base = -90 + bi * (360 / N);
      const sway = (bi % 2 === 0 ? 1 : -1) * (6 + (bi % 3) * 2); // chaque branche s'incurve à sa façon
      const at = (k: number) => pos(base + sway * (k + 1) * (k === -1 ? 0 : 1), 96 + (k + 1) * 74);
      const head = pos(base, 96);
      const doneCount = state.steps.filter((st) => st.state === "done").length;
      const visible = Math.min(b.steps.length, doneCount + 1); // obtenus + le prochain
      const nodes = state.steps.slice(0, visible).map((st, k) => ({ st, k, p: at(k) }));
      const fog = visible < b.steps.length ? at(visible) : null;
      const mid = pos(base - sway * 0.6, 48);
      const path = smoothPath([{ x: 0, y: 0 }, mid, head, ...nodes.map((n) => n.p)]);
      const fogPath = fog ? smoothPath([nodes[nodes.length - 1]?.p ?? head, fog]) : "";
      return { b, bi, head, nodes, path, fogPath, fog, doneCount };
    });
    // Cadrage sur ce qui est visible : l'arbre « grandit » quand on avance
    const all = branches.flatMap((x) => [x.head, ...x.nodes.map((n) => n.p), ...(x.fog ? [x.fog] : [])]);
    const pad = portrait ? 30 : 90;
    const lim = portrait ? 90 : 120;
    const minX = Math.min(...all.map((p) => p.x), -lim) - pad;
    const maxX = Math.max(...all.map((p) => p.x), lim) + pad;
    const minY = Math.min(...all.map((p) => p.y), -lim) - pad;
    const maxY = Math.max(...all.map((p) => p.y), lim) + pad;
    return { branches, viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}` };
  }, [tree, portrait]);

  // Étiquette affichée : le palier survolé, sinon celui qu'on a choisi
  const label = useMemo(() => {
    const target = hover ?? (selected ? { bi: TREE.findIndex((x) => x.id === selected.branch.id), k: selected.index } : null);
    if (!target) return null;
    const br = layout.branches[target.bi];
    const node = br?.nodes.find((n) => n.k === target.k);
    if (!node) return null;
    const text = br.b.steps[target.k].label[locale];
    const branch = br.b.name[locale].toUpperCase();
    return { p: node.p, text, branch, w: Math.max(text.length * 6.9, branch.length * 6.4) + 28 };
  }, [hover, selected, layout, locale]);

  const fmtDate = (iso: string) => new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

  return (
    <Card fill flush className={s.card}>
      <svg
        ref={svgRef}
        className={s.svg}
        data-zoomed={view.k > 1 || undefined}
        viewBox={layout.viewBox}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={t.nav.tree}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => setSelected(null)}
      >
        <defs>
          <radialGradient id="tree-glow">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`} className={s.world}>
        <circle r="260" fill="url(#tree-glow)" />

        {/* Branches */}
        {layout.branches.map(({ b, bi, path, fogPath }) => (
          <g key={b.id} style={{ animationDelay: `${bi * 60}ms` }} className={s.branch}>
            <path d={path} className={s.limb} pathLength={1} />
            {fogPath && <path d={fogPath} className={s.fog} />}
          </g>
        ))}

        {/* Têtes de branche */}
        {layout.branches.map(({ b, bi, head, doneCount }) => {
          const Icon = ICONS[b.icon];
          return (
            <g key={`h-${b.id}`} transform={`translate(${head.x} ${head.y})`} className={s.head} style={{ animationDelay: `${200 + bi * 60}ms` }}>
              <circle r="15" className={s.headDisc} />
              <Icon x={-8} y={-8} width={16} height={16} strokeWidth={2} className={s.headIcon} />
              <title>{`${b.name[locale]} · ${doneCount}/${b.steps.length}`}</title>
            </g>
          );
        })}

        {/* Paliers visibles : seulement des points, le texte n'apparaît qu'au survol ou au clic */}
        {layout.branches.map(({ b, bi, nodes }) =>
          nodes.map(({ st, k, p }) => {
            const done = st.state === "done";
            const ratio = Math.min(1, st.current / st.target);
            const R = 13;
            const C = 2 * Math.PI * R;
            const active = (hover?.bi === bi && hover.k === k) || (selected?.branch.id === b.id && selected.index === k);
            return (
              <g
                key={st.id}
                transform={`translate(${p.x} ${p.y})`}
                className={s.node}
                data-state={st.state}
                data-active={active || undefined}
                style={{ animationDelay: `${380 + bi * 60 + k * 70}ms` }}
                onPointerEnter={(e) => e.pointerType === "mouse" && setHover({ bi, k })}
                onPointerLeave={() => setHover(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected({ branch: b, index: k, step: st });
                }}
                role="button"
                aria-label={`${b.name[locale]} · ${b.steps[k].label[locale]}`}
              >
                <circle r="22" className={s.hit} />
                {done ? (
                  <circle r="6.5" className={s.doneDisc} />
                ) : (
                  <>
                    <circle r={R} className={s.ringTrack} />
                    <circle r={R} className={s.ringArc} strokeDasharray={C} strokeDashoffset={C * (1 - ratio)} transform="rotate(-90)" />
                    <circle r="5" className={s.currentDisc} />
                  </>
                )}
                {showLabels && (
                  <text
                    x={p.x >= 0 ? 15 + 4 / view.k : -(15 + 4 / view.k)}
                    y={0}
                    dy="0.35em"
                    textAnchor={p.x >= 0 ? "start" : "end"}
                    className={done ? s.zoomLabelDone : s.zoomLabel}
                    style={{ fontSize: 12.5 / view.k, strokeWidth: 4 / view.k }}
                  >
                    {b.steps[k].label[locale]}
                  </text>
                )}
              </g>
            );
          }),
        )}

        {/* Racine */}
        <g className={s.root}>
          <circle r="46" className={s.rootDisc} />
          <g transform="translate(-13 -16)" className={s.rootIcon}>
            <BrandMark size={32} uid="tree" />
          </g>
          <title>{t.tree.vision}</title>
        </g>
        {/* Étiquette du palier survolé / choisi, dessinée par-dessus tout */}
        {label && !showLabels && (
          <g transform={`translate(${label.p.x} ${label.p.y - 30})`} pointerEvents="none">
            <g key={`${label.p.x}-${label.p.y}`} className={s.tip}>
              <rect x={-label.w / 2} y={-34} width={label.w} height={40} rx={12} className={s.tipBox} />
              <text y={-19} textAnchor="middle" className={s.tipBranch}>{label.branch}</text>
              <text y={-3} textAnchor="middle" className={s.tipLabel}>{label.text}</text>
            </g>
          </g>
        )}
        </g>
      </svg>

      {view.k === 1 && <p className={s.hint}>{t.tree.hint}</p>}

      <div className={s.zoom} role="group" aria-label="Zoom">
        <button type="button" onClick={() => zoomAt(1.4)} aria-label="Zoomer" disabled={view.k >= MAX}>
          <Plus size={15} />
        </button>
        <button type="button" onClick={() => zoomAt(1 / 1.4)} aria-label="Dézoomer" disabled={view.k <= MIN}>
          <Minus size={15} />
        </button>
        <button type="button" onClick={() => setView({ k: 1, x: 0, y: 0 })} aria-label="Vue d'ensemble" disabled={view.k === 1}>
          <Maximize2 size={14} />
        </button>
      </div>

      {selected && (
        <aside className={s.panel} aria-label={selected.branch.steps[selected.index].label[locale]}>
          <div className={s.panelHead}>
            <span className={s.panelBranch}>{selected.branch.name[locale]}</span>
            <button className={s.close} onClick={() => setSelected(null)} aria-label={t.nav.close}>
              <X size={16} />
            </button>
          </div>
          <p className={s.panelTitle}>{selected.branch.steps[selected.index].label[locale]}</p>
          <p className={s.panelState}>
            {selected.step.state === "done" && selected.step.achievedAt
              ? format(t.tree.achieved, { date: fmtDate(selected.step.achievedAt) })
              : `${t.tree.available} · ${format(t.tree.progress, { c: Math.min(selected.step.current, selected.step.target), t: selected.step.target })}`}
          </p>
          <p className={s.panelXp}>{selected.step.xp > 0 ? format(t.tree.xp, { n: selected.step.xp }) : t.tree.noXp}</p>
        </aside>
      )}
    </Card>
  );
}
