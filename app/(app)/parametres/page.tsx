import { getSettings } from "@/lib/islam/data";
import { getRuhSummary } from "@/lib/ruh/data";
import { SettingsForm } from "./SettingsForm";
import { SITE_URL, getStripeStatus } from "@/lib/payments/stripe";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const [settings, ruh, stripe] = await Promise.all([getSettings(), getRuhSummary(), getStripeStatus()]);
  return (
    <SettingsForm
      initial={settings}
      ruhLinked={!!settings.ruh_user_id}
      ruhUpdatedAt={ruh?.updatedAt ?? null}
      stripe={stripe}
      stripeWebhookUrl={`${SITE_URL}/api/stripe/webhook`}
    />
  );
}
