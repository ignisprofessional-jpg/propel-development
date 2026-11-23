"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/dates";

/** Compte à rebours jusqu'à une date (mis à jour toutes les 20 s). */
export function Countdown({ to, prefix }: { to: string; prefix: string }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span suppressHydrationWarning>
      {prefix} {formatDuration((target - now) / 60_000)}
    </span>
  );
}
