"use client";

import { useActionState, useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Orb } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { unlockWithPin, type PinState } from "./actions";
import s from "./login.module.css";

const LENGTH = 8;

/** Carte du code : saisie, erreur, puis animation de validation avant d'entrer. */
export function PinCard({ next }: { next: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [state, action, pending] = useActionState<PinState, FormData>(unlockWithPin, {});
  const [pin, setPin] = useState("");
  const [phase, setPhase] = useState<"idle" | "success" | "leave">("idle");
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Code faux : on vide le champ…
  useEffect(() => {
    if (state.error) setPin("");
  }, [state]);
  // …et on garde le focus dès que la vérification est finie.
  useEffect(() => {
    if (!pending && phase === "idle") inputRef.current?.focus();
  }, [pending, state, phase]);

  // Code bon : cases qui se remplissent, cadenas → coche, puis la carte s'efface.
  useEffect(() => {
    if (!state.ok) return;
    const target = state.next ?? "/";
    router.prefetch(target);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPhase("success");
    const t1 = setTimeout(() => setPhase("leave"), reduce ? 300 : 1250);
    const t2 = setTimeout(() => router.replace(target), reduce ? 500 : 1550);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [state, router]);

  const onChange = (v: string) => {
    if (pending || phase !== "idle") return;
    const digits = v.replace(/\D/g, "").slice(0, LENGTH);
    setPin(digits);
    if (digits.length === LENGTH) requestAnimationFrame(() => formRef.current?.requestSubmit());
  };

  const filled = phase === "idle" ? pin.length : LENGTH;
  const message = phase !== "idle" ? t.login.welcome : pending ? t.login.checking : state.error ? t.login[state.error] : t.login.hint;

  return (
    <section className={s.card} data-phase={phase}>
      <Orb className={s.orb} />
      <span className={s.lock} aria-hidden>
        <LockKeyhole size={20} className={s.lockIcon} />
      </span>
      {/* Code bon : tout s'efface, puis la coche verte prend la place */}
      <div className={s.successStage} aria-hidden>
        <svg className={s.success} viewBox="0 0 52 52" width="96" height="96">
          <circle className={s.successRing} cx="26" cy="26" r="24" />
          <circle className={s.successDisc} cx="26" cy="26" r="24" />
          <path className={s.successCheck} pathLength={1} d="M15.5 26.8 22.6 33.6 36.8 19.2" />
        </svg>
        <span className={s.successText}>{t.login.welcome}</span>
      </div>
      <h1 className={s.title}>{t.login.title}</h1>

      <form ref={formRef} action={action} className={s.form}>
        <input type="hidden" name="next" value={next} />
        <label className={s.pinField} key={state.attempt ?? 0} data-error={state.error ? "" : undefined}>
          <span className="visually-hidden">{t.login.code}</span>
          <input
            ref={inputRef}
            className={s.pinInput}
            name="pin"
            value={pin}
            onChange={(e) => onChange(e.target.value)}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            autoFocus
            maxLength={LENGTH}
            readOnly={pending || phase !== "idle"}
            aria-invalid={!!state.error}
            aria-describedby="pin-error"
          />
          <span className={s.cells} aria-hidden>
            {Array.from({ length: LENGTH }, (_, i) => (
              <span
                key={i}
                className={s.cell}
                style={{ "--i": i } as CSSProperties}
                data-filled={i < filled ? "" : undefined}
                data-current={phase === "idle" && i === pin.length && !pending ? "" : undefined}
              />
            ))}
          </span>
        </label>

        <p id="pin-error" className={s.message} role={state.error ? "alert" : "status"} aria-live="polite">
          {message}
        </p>
      </form>
    </section>
  );
}
