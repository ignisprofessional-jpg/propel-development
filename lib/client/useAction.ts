"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/provider";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Lance une action serveur dans une transition.
 * `optimistic` s'exécute dans la même transition : l'interface change tout de suite
 * et revient en arrière toute seule si le serveur répond une erreur.
 */
export function useAction() {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<Result>, opts?: { optimistic?: () => void; onDone?: () => void }) =>
    startTransition(async () => {
      opts?.optimistic?.();
      const r = await fn();
      if (!r.ok) toast.error(t.islam.error);
      else opts?.onDone?.();
    });
  return { run, pending };
}
