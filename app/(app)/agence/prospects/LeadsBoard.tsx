"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, EmptyShowcase, ScrollArea, Segmented, StatCard, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { setLeadStage } from "@/lib/agency/actions";
import { STAGES, type Lead, type Stage } from "@/lib/agency/types";
import { NewLeadModal } from "@/components/agency/LeadForm";
import s from "../agence.module.css";

type View = "kanban" | "table" | "won";

export function LeadsBoard({ leads, openNew }: { leads: Lead[]; openNew?: boolean }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [, start] = useTransition();
  const [view, setView] = useState<View>("kanban");
  const [modal, setModal] = useState(!!openNew);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [q, setQ] = useState("");
  const [stageF, setStageF] = useState<"" | Stage>("");
  const [list, apply] = useOptimistic(leads, (state, p: { id: string; stage: Stage }) => state.map((l) => (l.id === p.id ? { ...l, stage: p.stage } : l)));
  const eur = (n: number) => new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  const move = (id: string, stage: Stage) =>
    start(async () => {
      apply({ id, stage });
      const r = await setLeadStage(id, stage);
      if (!r.ok) toast.error(t.agency.error);
      else if (stage === "signed") toast.success(t.agency.signedHint);
    });

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return list.filter((l) => (!stageF || l.stage === stageF) && (!qq || `${l.business} ${l.city} ${l.contact_name} ${l.source}`.toLowerCase().includes(qq)));
  }, [list, q, stageF]);

  // Téléphone : le pipeline s'ouvre sur la première étape qui contient des prospects
  const boardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = boardRef.current;
    if (!el || view !== "kanban" || el.scrollWidth <= el.clientWidth + 4) return;
    const first = el.querySelector<HTMLElement>("[data-has-leads]");
    if (first) el.scrollTo({ left: first.offsetLeft - el.offsetLeft, behavior: "instant" as ScrollBehavior });
  }, [view]);

  const kanban = () => (
    <div className={s.board} ref={boardRef}>
      {STAGES.map((st) => {
        const items = list.filter((l) => l.stage === st);
        const sum = items.reduce((a, l) => a + l.amount, 0);
        return (
          <div
            key={st}
            className={s.column}
            data-has-leads={items.length ? "" : undefined}
            data-over={over === st ? "" : undefined}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(st);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={() => {
              if (dragId) {
                const l = list.find((x) => x.id === dragId);
                if (l && l.stage !== st) move(dragId, st);
              }
              setDragId(null);
              setOver(null);
            }}
          >
            <div className={s.colHead}>
              <span className={s.colName}>{t.agency.stages[st]} · {items.length}</span>
              {sum > 0 && <span className={s.colSum}>{eur(sum)}</span>}
            </div>
            {items.map((l) => (
              <button
                key={l.id}
                className={s.lead}
                draggable
                data-dragging={dragId === l.id ? "" : undefined}
                onDragStart={() => setDragId(l.id)}
                onDragEnd={() => setDragId(null)}
                onClick={() => router.push(`/agence/prospects/${l.id}`)}
              >
                <span className={s.leadName}>{l.business}</span>
                <span className={s.leadMeta}>
                  <span>{[l.city, l.offer].filter(Boolean).join(" · ") || "—"}</span>
                  {l.amount > 0 && <span className={s.money}>{eur(l.amount)}</span>}
                </span>
              </button>
            ))}
            {items.length === 0 && <span className={s.dropHint}>{t.agency.emptyStage}</span>}
          </div>
        );
      })}
    </div>
  );

  const table = () => (
    <>
      <div className={s.filters}>
        <input className={inputClass} type="search" placeholder={t.agency.search} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputClass} value={stageF} onChange={(e) => setStageF(e.target.value as "" | Stage)} aria-label={t.agency.fields.stage}>
          <option value="">{t.agency.allStages}</option>
          {STAGES.map((st) => <option key={st} value={st}>{t.agency.stages[st]}</option>)}
        </select>
      </div>
      <ScrollArea>
        {filtered.length === 0 ? (
          <p className={s.empty}>{t.agency.empty}</p>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th>{t.agency.fields.business}</th>
                <th>{t.agency.fields.stage}</th>
                <th className={s.right}>{t.agency.fields.amount}</th>
                <th>{t.agency.fields.city}</th>
                <th>{t.agency.fields.source}</th>
                <th>{t.agency.fields.offer}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} onClick={() => router.push(`/agence/prospects/${l.id}`)}>
                  <td><strong>{l.business}</strong><br /><span className={s.subtle}>{l.contact_name}<span className={s.stageInline}>{l.contact_name ? " · " : ""}{t.agency.stages[l.stage]}</span></span></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select className={inputClass} value={l.stage} onChange={(e) => move(l.id, e.target.value as Stage)} aria-label={t.agency.fields.stage}>
                      {STAGES.map((st) => <option key={st} value={st}>{t.agency.stages[st]}</option>)}
                    </select>
                  </td>
                  <td className={`${s.right} ${s.money}`}>{l.amount ? eur(l.amount) : "—"}</td>
                  <td>{l.city || "—"}</td>
                  <td>{l.source || "—"}</td>
                  <td>{l.offer || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ScrollArea>
    </>
  );

  const won = () => {
    const signed = list.filter((l) => l.stage === "signed");
    const closed = list.filter((l) => l.stage === "signed" || l.stage === "lost");
    const open = list.filter((l) => !["signed", "lost"].includes(l.stage));
    const revenue = signed.reduce((a, l) => a + l.amount, 0);
    const sources = new Map<string, number>();
    for (const l of signed) sources.set(l.source || "—", (sources.get(l.source || "—") ?? 0) + 1);
    const maxSrc = Math.max(1, ...sources.values());
    return (
      <ScrollArea>
        <div className={s.statGrid}>
          <StatCard compact label={t.agency.stats.signed} value={signed.length} foot={`${open.length} ${t.agency.stats.open.toLowerCase()}`} />
          <StatCard compact label={t.agency.stats.conversion} value={closed.length ? `${Math.round((signed.length / closed.length) * 100)} %` : "—"} />
          <StatCard compact label={t.agency.stats.revenue} value={eur(revenue)} />
          <StatCard compact label={t.agency.stats.average} value={signed.length ? eur(revenue / signed.length) : "—"} foot={`${t.agency.stats.pipeline} : ${eur(open.reduce((a, l) => a + l.amount, 0))}`} />
        </div>
        <p className={s.subtle} style={{ marginBottom: 8 }}>{t.agency.stats.bySource}</p>
        {sources.size === 0 ? (
          <p className={s.empty}>{t.agency.none}</p>
        ) : (
          [...sources.entries()].sort((a, b) => b[1] - a[1]).map(([src, n]) => (
            <div key={src} className={s.sourceRow}>
              <span>{src}</span>
              <span className={s.sourceBar}><i style={{ width: `${(n / maxSrc) * 100}%` }} /></span>
              <span className={s.right}>{n}</span>
            </div>
          ))
        )}
      </ScrollArea>
    );
  };

  return (
    <Card fill>
      <div className={s.top}>
        <Segmented<View>
          value={view}
          onChange={setView}
          options={(["kanban", "table", "won"] as View[]).map((v) => ({ value: v, label: t.agency.views[v] }))}
        />
        <Button onClick={() => setModal(true)}>
          <Plus size={15} aria-hidden /> {t.agency.newLead}
        </Button>
      </div>
      {list.length === 0 && view !== "won" ? (
        <EmptyShowcase
          icon={Users}
          title={t.agency.emptyTitle}
          text={t.agency.emptyText}
          steps={STAGES.filter((st) => st !== "lost").map((st) => t.agency.stages[st])}
        />
      ) : view === "kanban" ? (
        <ScrollArea>{kanban()}</ScrollArea>
      ) : view === "table" ? (
        table()
      ) : (
        won()
      )}
      {modal && <NewLeadModal onClose={() => setModal(false)} />}
    </Card>
  );
}
