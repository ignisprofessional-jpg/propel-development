"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, Check, Copy, Inbox, ListPlus, Mail, Reply, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyShowcase, ScrollArea, Segmented, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/provider";
import { format } from "@/lib/i18n/dictionaries";
import { leadFromEmail, linkEmail, taskFromEmail } from "@/lib/agency/actions";
import type { Email } from "@/lib/agency/types";
import s from "../agence.module.css";

type Filter = "all" | "unlinked" | "linked";

export function MailsBoard({
  emails,
  leads,
  fetchBody,
  webhookUrl,
}: {
  emails: Email[];
  leads: { id: string; business: string }[];
  fetchBody: boolean;
  webhookUrl: string;
}) {
  const { t, locale } = useI18n();
  const m = t.agency.mail;
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(emails[0]?.id ?? null);
  const [copied, setCopied] = useState(false);
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const when = (x: string) => new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(x));
  const names = new Map(leads.map((l) => [l.id, l.business]));
  const list = useMemo(() => emails.filter((e) => (filter === "all" ? true : filter === "linked" ? !!e.lead_id : !e.lead_id)), [emails, filter]);
  const open = emails.find((e) => e.id === openId) ?? null;

  const act = (fn: () => Promise<{ ok: boolean }>, ok: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(ok);
      else toast.error(t.agency.error);
    });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast.success(m.copied);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  const setup = (
    <div className={s.hook}>
      <div className={s.hookUrl}>
        <code title={webhookUrl}>{webhookUrl}</code>
        <button type="button" className={s.iconBtn} onClick={copy} aria-label={m.copy} title={m.copy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );

  if (emails.length === 0) {
    return (
      <Card fill>
        <ScrollArea>
          <EmptyShowcase icon={Inbox} title={m.emptyTitle} text={m.emptyText} steps={m.setup} action={setup} />
        </ScrollArea>
      </Card>
    );
  }

  const reader = open && (
    <article className={s.reader}>
      <button type="button" className={s.readerBack} onClick={() => setOpenId(null)}>
        <ArrowLeft size={14} aria-hidden /> {t.nav.mails}
      </button>
      <header className={s.readerHead}>
        <h2>{open.subject || "—"}</h2>
        <p>
          <strong>{open.from_name || open.from_email}</strong>
          {open.from_name && <span> &lt;{open.from_email}&gt;</span>}
          <span> · {when(open.received_at)}</span>
        </p>
      </header>
      <div className={s.readerActions}>
        <a className={s.pillBtn} href={`mailto:${encodeURIComponent(open.from_email)}?subject=${encodeURIComponent(`Re: ${open.subject}`)}`}>
          <Reply size={14} aria-hidden /> {m.reply}
        </a>
        <select className={inputClass} aria-label={m.linkTo} value={open.lead_id ?? ""} disabled={pending} onChange={(ev) => act(() => linkEmail(open.id, ev.target.value || null), t.perso.saved)}>
          <option value="">{m.unlinked}</option>
          {leads.map((l) => <option key={l.id} value={l.id}>{l.business}</option>)}
        </select>
        {!open.lead_id && (
          <button type="button" className={s.pillBtn} disabled={pending} onClick={() => act(() => leadFromEmail(open.id), m.toLead)}>
            <UserPlus size={14} aria-hidden /> {m.toLead}
          </button>
        )}
        <button type="button" className={s.pillBtn} disabled={pending} onClick={() => act(() => taskFromEmail(open.id), m.toTask)}>
          <ListPlus size={14} aria-hidden /> {m.toTask}
        </button>
      </div>
      <ScrollArea>
        <div className={s.readerBody}>{open.body || open.snippet || (fetchBody ? "—" : m.noBody)}</div>
      </ScrollArea>
    </article>
  );

  return (
    <div className={s.inbox} data-open={open ? "" : undefined}>
      <Card fill className={s.inboxList}>
        <div className={s.top}>
          <Segmented<Filter> value={filter} onChange={setFilter} options={(["all", "unlinked", "linked"] as Filter[]).map((f) => ({ value: f, label: m.filters[f] }))} />
          <span className={s.subtle}>{format(m.count, { n: list.length })}</span>
        </div>
        <ScrollArea>
          {list.map((e) => (
            <button key={e.id} type="button" className={s.mailItem} data-active={e.id === openId || undefined} onClick={() => setOpenId(e.id)}>
              <span className={s.mailHead}>
                <span className={s.mailFrom}>{e.from_name || e.from_email}</span>
                <span className={s.mailDate}>{when(e.received_at)}</span>
              </span>
              <span className={s.mailSubject}>{e.subject || "—"}</span>
              <span className={s.mailSnippet}>{e.snippet}</span>
              {e.lead_id && (
                <span className={s.mailLead}>
                  <Mail size={11} aria-hidden /> {names.get(e.lead_id)}
                </span>
              )}
            </button>
          ))}
        </ScrollArea>
        {setup}
      </Card>
      <Card fill className={s.inboxReader}>
        {reader ?? <EmptyShowcase icon={Mail} title={m.pick} />}
      </Card>
    </div>
  );
}
