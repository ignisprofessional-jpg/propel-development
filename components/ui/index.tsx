import type { ComponentProps, CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import s from "./ui.module.css";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ---------- Card ---------- */
type CardProps = ComponentProps<"section"> & { variant?: "default" | "hero"; flush?: boolean; fill?: boolean };
export function Card({ variant = "default", flush, fill, className, ...rest }: CardProps) {
  return <section className={cx(s.card, variant === "hero" && s.cardHero, flush && s.cardFlush, fill && s.cardFill, className)} {...rest} />;
}

/** Zone qui défile à l'intérieur d'un bloc (sur ordinateur, la page elle-même ne défile pas). */
export function ScrollArea({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(s.scroll, className)}>{children}</div>;
}

export function CardHead({ title, kicker, action }: { title?: ReactNode; kicker?: ReactNode; action?: ReactNode }) {
  return (
    <header className={s.cardHead}>
      <div style={{ display: "grid", gap: 6 }}>
        {kicker && <Kicker>{kicker}</Kicker>}
        {title && <h2 className={s.cardTitle}>{title}</h2>}
      </div>
      {action}
    </header>
  );
}

/* ---------- Kicker ---------- */
export function Kicker({ children, onDark, className }: { children: ReactNode; onDark?: boolean; className?: string }) {
  return <span className={cx(s.kicker, onDark && s.kickerOnDark, className)}>{children}</span>;
}

/* ---------- Stat card ---------- */
export function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  foot,
  compact,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  icon?: LucideIcon;
  foot?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cx(s.stat, compact && s.statCompact, className)} data-glow suppressHydrationWarning>
      <div className={s.statTop}>
        {Icon ? (
          <span className={s.statIcon}>
            <Icon size={16} strokeWidth={2} aria-hidden />
          </span>
        ) : (
          <span />
        )}
        <span className={s.statLabel}>{label}</span>
      </div>
      <div className={s.statValue}>
        {value}
        {unit && <span className={s.statUnit}>{unit}</span>}
      </div>
      {foot && <div className={s.statFoot}>{foot}</div>}
    </div>
  );
}

/* ---------- Badge ---------- */
export type Tone = "solid" | "soft" | "outline" | "muted";
export function Badge({ tone = "soft", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx(s.badge, s[`badge-${tone}`])}>{children}</span>;
}

/* ---------- Button ---------- */
type BtnProps = ComponentProps<"button"> & {
  variant?: "primary" | "accent" | "secondary" | "ghost";
  size?: "md" | "sm";
  icon?: boolean;
  block?: boolean;
};
export function Button({ variant = "primary", size = "md", icon, block, className, type = "button", ...rest }: BtnProps) {
  return (
    <button
      type={type}
      className={cx(s.btn, s[`btn-${variant}`], size === "sm" && s.btnSm, icon && s.btnIcon, block && s.btnBlock, className)}
      {...rest}
    />
  );
}
/** Classes de bouton pour un <Link>. */
export const buttonClass = (variant: BtnProps["variant"] = "primary", size: "md" | "sm" = "md") =>
  cx(s.btn, s[`btn-${variant}`], size === "sm" && s.btnSm);

/* ---------- Progress ring ---------- */
export function ProgressRing({
  value,
  size = 140,
  stroke = 14,
  label,
  color = "currentColor",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: ReactNode;
  color?: string;
  children?: ReactNode;
}) {
  const v = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className={s.ring}
      style={{ width: size, height: size, color }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle className={s.ringTrack} cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          className={s.ringBar}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          strokeLinecap="round"
        />
      </svg>
      <div className={s.ringCenter}>
        {children ?? (
          <>
            <span className={s.ringValue} style={{ fontSize: size * 0.22 }}>
              {Math.round(v * 100)}%
            </span>
            {label && <span className={s.ringLabel}>{label}</span>}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Linear progress ---------- */
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={s.bar} role="progressbar" aria-label={label} aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={s.barFill} style={{ width: `${v * 100}%` }} />
    </div>
  );
}

/* ---------- Objets 3D décoratifs ---------- */
export function Orb({ style, className }: { style?: CSSProperties; className?: string }) {
  return <span aria-hidden className={cx(s.orb, className)} style={style} />;
}
export function Torus({ style, className }: { style?: CSSProperties; className?: string }) {
  return <span aria-hidden className={cx(s.torus, className)} style={style} />;
}

/* ---------- Empty state & skeleton ---------- */
/**
 * État vide « vitrine » : remplit le bloc avec une silhouette estompée du contenu à venir,
 * une icône, un texte, les étapes et l'action principale.
 */
export function EmptyShowcase({
  icon: Icon,
  title,
  text,
  steps,
  action,
  ghost = "rows",
}: {
  icon: LucideIcon;
  title: ReactNode;
  text?: ReactNode;
  steps?: ReactNode[];
  action?: ReactNode;
  ghost?: "rows" | "doc";
}) {
  return (
    <div className={s.showcase}>
      <div className={s.ghost} aria-hidden>
        {ghost === "doc" ? (
          <div className={s.ghostDoc}>
            <span style={{ width: "38%" }} />
            <span style={{ width: "22%", marginLeft: "auto" }} />
            <i />
            {[72, 56, 64].map((w, i) => (
              <span key={i} style={{ width: `${w}%` }} />
            ))}
            <i />
            <span style={{ width: "30%", marginLeft: "auto" }} />
          </div>
        ) : (
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={s.ghostRow}>
              <b />
              <span style={{ width: `${[46, 62, 38, 54, 44, 58][i]}%` }} />
              <em />
            </div>
          ))
        )}
      </div>
      <div className={s.showcaseBody}>
        <span className={s.showcaseIcon}>
          <Icon size={22} aria-hidden />
        </span>
        <p className={s.emptyTitle}>{title}</p>
        {text && <p className={s.emptyText}>{text}</p>}
        {steps && steps.length > 0 && (
          <ol className={s.steps} data-n={steps.length}>
            {steps.map((st, i) => (
              <li key={i}>
                <span>{i + 1}</span>
                {st}
              </li>
            ))}
          </ol>
        )}
        {action}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={s.empty}>
      <span className={s.emptyIcon}>
        <Icon size={24} aria-hidden />
      </span>
      <p className={s.emptyTitle}>{title}</p>
      {text && <p className={s.emptyText}>{text}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ w = "100%", h = 16, r }: { w?: number | string; h?: number | string; r?: number }) {
  return <span aria-hidden className={s.skeleton} style={{ display: "block", width: w, height: h, borderRadius: r }} />;
}

/* ---------- En-tête de page ---------- */
export function PageHeader({ kicker, title, sub, actions, mobile }: { kicker?: ReactNode; title: ReactNode; sub?: ReactNode; actions?: ReactNode; mobile?: boolean }) {
  return (
    <header className={cx(s.pageHead, mobile && s.pageHeadMobile)}>
      <div>
        {kicker && <Kicker>{kicker}</Kicker>}
        <h1 className={s.pageTitle}>{title}</h1>
        {sub && <p className={s.pageSub}>{sub}</p>}
      </div>
      {actions}
    </header>
  );
}

/* ---------- Contrôle segmenté ---------- */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  full,
  label,
}: {
  value: T | null;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  full?: boolean;
  label?: string;
}) {
  return (
    <div className={cx(s.seg, full && s.segFull)} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={s.segBtn} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Pastille à cocher ---------- */
export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={s.chip} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

/* ---------- Champs ---------- */
export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className={s.field}>
      <span className={s.fieldLabel}>{label}</span>
      {children}
      {hint && <span className={s.fieldHint}>{hint}</span>}
    </label>
  );
}
export const inputClass = s.input;

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={s.switch} onClick={() => onChange(!checked)} />;
}
