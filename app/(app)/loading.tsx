import { Skeleton } from "@/components/ui";

/** Squelette affiché instantanément pendant le chargement d'une page. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" style={{ display: "grid", gap: "var(--gutter)" }}>
      <span className="visually-hidden">Chargement…</span>
      <Skeleton h={34} w={240} r={12} />
      <div style={{ display: "grid", gap: "var(--gutter)", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <Skeleton h={220} r={24} />
        <Skeleton h={220} r={24} />
        <Skeleton h={220} r={24} />
      </div>
      <Skeleton h={160} r={24} />
    </div>
  );
}
