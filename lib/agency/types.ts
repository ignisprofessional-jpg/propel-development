/** Types partagés de l'espace Agence. */
export const STAGES = ["new", "contacted", "mockup", "quote", "signed", "lost"] as const;
export type Stage = (typeof STAGES)[number];

export type Lead = {
  id: string;
  business: string;
  contact_name: string;
  email: string;
  phone: string;
  city: string;
  source: string;
  offer: string;
  amount: number;
  stage: Stage;
  notes: string;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Activity = { id: string; lead_id: string; kind: string; content: string; created_at: string };

export type PaymentKind = "deposit" | "balance" | "subscription" | "other";
export type Payment = {
  id: string;
  lead_id: string | null;
  label: string;
  kind: PaymentKind;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  method: string;
  provider: "manual" | "stripe";
  created_at: string;
};

export type DocLine = { label: string; qty: number; unit: number };
export type Doc = {
  id: string;
  lead_id: string | null;
  kind: "quote" | "invoice";
  number: string;
  issued_on: string;
  due_on: string | null;
  lines: DocLine[];
  vat_rate: number;
  status: "draft" | "sent" | "accepted" | "paid" | "cancelled";
  notes: string;
};

export type Email = {
  id: string;
  external_id: string;
  source: "gmail" | "resend";
  thread_id: string | null;
  to_email: string;
  body: string;
  from_email: string;
  from_name: string;
  subject: string;
  snippet: string;
  received_at: string;
  lead_id: string | null;
};

export const docTotal = (d: Pick<Doc, "lines" | "vat_rate">) => {
  const ht = d.lines.reduce((a, l) => a + l.qty * l.unit, 0);
  const vat = (ht * d.vat_rate) / 100;
  return { ht, vat, ttc: ht + vat };
};

/** Tâches créées automatiquement quand un prospect passe en « Signé ». */
export const KICKOFF_TASKS = [
  "Envoyer le contrat et la facture d'acompte",
  "Récupérer les contenus (textes, photos, logo)",
  "Créer les accès (nom de domaine, hébergement, Google)",
  "Réaliser la maquette finale",
  "Planifier la mise en ligne",
];
