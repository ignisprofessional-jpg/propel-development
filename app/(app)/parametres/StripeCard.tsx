"use client";

import { useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, CardHead, Field, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { format } from "@/lib/i18n/dictionaries";
import { connectStripe, disconnectStripe, saveStripeWebhook } from "@/lib/payments/actions";
import type { StripeStatus } from "@/lib/payments/stripe";
import s from "./settings.module.css";

/** Connexion du compte Stripe : clé secrète vérifiée puis gardée côté serveur. */
export function StripeCard({ status, webhookUrl }: { status: StripeStatus; webhookUrl: string }) {
  const { t } = useI18n();
  const st = t.settings.stripe;
  const [key, setKey] = useState("");
  const [hook, setHook] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const errorText = (e: string) => (e === "invalid_key" ? st.invalidKey : e === "invalid_secret" ? st.invalidSecret : t.islam.error);

  return (
    <Card>
      <CardHead
        title={st.title}
        action={status.connected ? <Badge tone="solid">{status.livemode ? st.live : st.test}</Badge> : <Badge tone="outline">{st.off}</Badge>}
      />
      {status.connected ? (
        <div className={s.stack}>
          <div className={s.switchRow}>
            <div>
              <p className={s.switchLabel}>{format(st.connected, { name: status.accountName || "Stripe" })}</p>
              <p className={s.hint}>{format(st.keyHint, { k: status.keyHint })}</p>
            </div>
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => start(async () => void (await disconnectStripe()))}>
              {st.disconnect}
            </Button>
          </div>
          <div className={s.field}>
            <span className={s.label}>{st.webhookUrl}</span>
            <div className={s.copyRow}>
              <code>{webhookUrl}</code>
              <button
                type="button"
                aria-label={st.copy}
                onClick={async () => {
                  await navigator.clipboard.writeText(webhookUrl).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
          <div className={s.linkRow}>
            <Field label={status.hasWebhook ? st.webhookSaved : st.webhookSecret}>
              <input className={inputClass} type="password" autoComplete="off" placeholder="whsec_…" value={hook} onChange={(e) => setHook(e.target.value)} />
            </Field>
            <Button
              size="sm"
              disabled={pending || !hook.trim()}
              onClick={() =>
                start(async () => {
                  const r = await saveStripeWebhook(hook);
                  if (r.ok) {
                    setHook("");
                    toast.success(st.webhookOk);
                  } else toast.error(errorText(r.error));
                })
              }
            >
              {t.settings.save}
            </Button>
          </div>
        </div>
      ) : (
        <>
        <div className={s.linkRow}>
          <Field label={st.secretKey}>
            <input className={inputClass} type="password" autoComplete="off" placeholder="sk_live_… ou rk_live_…" value={key} onChange={(e) => setKey(e.target.value)} />
          </Field>
          <Button
            size="sm"
            disabled={pending || !key.trim()}
            onClick={() =>
              start(async () => {
                const r = await connectStripe(key);
                if (r.ok) {
                  setKey("");
                  toast.success(format(st.connected, { name: r.account || "Stripe" }));
                } else toast.error(errorText(r.error));
              })
            }
          >
            {st.connect}
          </Button>
        </div>
        <p className={s.hint}>{st.secretHint}</p>
        </>
      )}
    </Card>
  );
}
