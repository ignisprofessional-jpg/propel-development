"use client";

import { useCallback, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button, Field, inputClass } from "@/components/ui";
import { Sheet, useIsMobile } from "@/components/ui/Sheet";
import { useI18n } from "@/lib/i18n/provider";
import { createLead, type LeadInput } from "@/lib/agency/actions";
import s from "@/app/(app)/agence/agence.module.css";

/** Fenêtre « Nouveau prospect ». */
export function NewLeadModal({ onClose, initial }: { onClose: () => void; initial?: Partial<LeadInput> }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState<LeadInput>({ business: "", contact_name: "", email: "", phone: "", city: "", source: "", offer: "", amount: 0, notes: "", ...initial });
  const set = <K extends keyof LeadInput>(k: K, val: LeadInput[K]) => setV((o) => ({ ...o, [k]: val }));
  const f = t.agency.fields;
  const mobile = useIsMobile();
  // Fermeture animée : on joue la sortie, puis on prévient le parent
  const [closing, setClosing] = useState(false);
  const close = useCallback(() => {
    setClosing((c) => {
      if (!c) setTimeout(onClose, mobile ? 290 : 170);
      return true;
    });
  }, [onClose, mobile]);

  const form = (
        <form
          className={s.form}
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await createLead(v);
              if (r.ok) {
                close();
                if (r.id) router.push(`/agence/prospects/${r.id}`);
              } else toast.error(t.agency.error);
            });
          }}
        >
          <div className={s.two}>
            <Field label={f.business}>
              <input className={inputClass} value={v.business} maxLength={120} required autoFocus onChange={(e) => set("business", e.target.value)} />
            </Field>
            <Field label={f.contact}>
              <input className={inputClass} value={v.contact_name} maxLength={120} onChange={(e) => set("contact_name", e.target.value)} />
            </Field>
            <Field label={f.email}>
              <input className={inputClass} type="email" value={v.email} maxLength={160} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label={f.phone}>
              <input className={inputClass} type="tel" value={v.phone} maxLength={40} onChange={(e) => set("phone", e.target.value)} />
            </Field>
          </div>
          <div className={s.three}>
            <Field label={f.city}>
              <input className={inputClass} value={v.city} maxLength={80} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label={f.source}>
              <input className={inputClass} value={v.source} maxLength={80} placeholder="Instagram, bouche-à-oreille…" onChange={(e) => set("source", e.target.value)} />
            </Field>
            <Field label={f.amount}>
              <input className={inputClass} type="number" min={0} step="0.01" value={v.amount || ""} onChange={(e) => set("amount", Number(e.target.value))} />
            </Field>
          </div>
          <Field label={f.offer}>
            <input className={inputClass} value={v.offer} maxLength={120} placeholder="Site vitrine, fiche Google, réseaux…" onChange={(e) => set("offer", e.target.value)} />
          </Field>
          <div className={s.modalActions}>
            <Button variant="ghost" onClick={close}>{t.nav.close}</Button>
            <Button type="submit" disabled={pending || !v.business.trim()}>{t.agency.create}</Button>
          </div>
        </form>
  );

  if (mobile) {
    return (
      <Sheet open={!closing} onClose={close} title={t.agency.newLead} label={t.agency.newLead}>
        {form}
      </Sheet>
    );
  }
  return (
    <ModalFrame title={t.agency.newLead} closing={closing} onClose={close} closeLabel={t.nav.close}>
      {form}
    </ModalFrame>
  );
}

/** Fenêtre centrée (ordinateur) avec entrée et sortie animées. */
function ModalFrame({ title, closing, onClose, closeLabel, children }: { title: string; closing: boolean; onClose: () => void; closeLabel: string; children: ReactNode }) {
  return (
    <>
      <div className={s.backdrop} data-closing={closing ? "" : undefined} onClick={onClose} aria-hidden />
      <div className={s.modal} data-closing={closing ? "" : undefined} role="dialog" aria-modal="true" aria-label={title}>
        <div className={s.modalHead}>
          <p className={s.modalTitle}>{title}</p>
          <button className={s.iconBtn} onClick={onClose} aria-label={closeLabel}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
