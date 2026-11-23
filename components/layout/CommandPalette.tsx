"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Clock4, Plus, SunMoon, Timer, UserPlus } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { ALL_ITEMS } from "@/lib/nav";
import { useTheme } from "./Toggles";
import s from "./palette.module.css";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const { toggle } = useTheme();

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const actions = [
    { label: t.palette.newTask, icon: Plus, run: () => go("/perso/taches?nouveau=1") },
    { label: t.palette.newLead, icon: UserPlus, run: () => go("/agence/prospects?nouveau=1") },
    { label: t.palette.logPrayer, icon: Clock4, run: () => go("/islam/priere") },
    { label: t.palette.startFocus, icon: Timer, run: () => go("/perso/concentration") },
    { label: t.palette.toggleTheme, icon: SunMoon, run: () => (toggle(), onOpenChange(false)) },
  ];

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label={t.topbar.search}
      overlayClassName={s.overlay}
      contentClassName={s.content}
      className={s.root}
    >
      <Command.Input className={s.input} placeholder={t.palette.placeholder} autoFocus />
      <Command.List className={s.list}>
        <Command.Empty className={s.empty}>{t.palette.empty}</Command.Empty>
        <Command.Group heading={t.palette.actions} className={s.group}>
          {actions.map((a) => (
            <Command.Item key={a.label} onSelect={a.run} className={s.item}>
              <a.icon size={16} aria-hidden />
              {a.label}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading={t.palette.pages} className={s.group}>
          {ALL_ITEMS.map((i) => (
            <Command.Item key={i.href} value={`${t.nav[i.key]} ${i.href}`} onSelect={() => go(i.href)} className={s.item}>
              <i.icon size={16} aria-hidden />
              {t.nav[i.key]}
              {i.group && <span className={s.space}>{t.nav[i.group]}</span>}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
