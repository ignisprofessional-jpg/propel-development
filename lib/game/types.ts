/** Types partagés du système de jeu (client + serveur). */

/** Règles qui valident une étape toute seule à partir des vraies données. */
export type Rule =
  | { type: "prayer_full_days"; value: number }
  | { type: "quran_pages"; value: number }
  | { type: "hifz"; surah: number }
  | { type: "level"; value: number }
  | { type: "rewards"; value: number }
  | { type: "ruh_lessons"; value: number }
  | { type: "ruh_level"; level: "debutant" | "intermediaire" | "avance" };

export type RuleType = Rule["type"];
export const RULE_TYPES: RuleType[] = ["prayer_full_days", "quran_pages", "hifz", "level", "rewards", "ruh_lessons", "ruh_level"];

/** Règles liées à l'adoration : pas d'XP si l'option « sans XP pour l'adoration » est active. */
export const WORSHIP_RULES: RuleType[] = ["prayer_full_days", "quran_pages", "hifz", "ruh_lessons", "ruh_level"];

export type NodeState = "done" | "available" | "locked";

export type QuestNode = {
  id: string;
  kind: "root" | "step";
  title: string;
  x: number;
  y: number;
  xp: number;
  rule: Rule | null;
  done_at: string | null;
  state: NodeState;
  progress: { current: number; target: number } | null;
};

export type QuestEdge = { source: string; target: string };

export type QuestSummary = {
  id: string;
  title: string;
  style: "solid" | "outline" | "dashed";
  reward_xp: number;
  reward_coins: number;
  completed_at: string | null;
  done: number;
  total: number;
};

export type Reward = { id: string; title: string; cost: number; note: string };
export type Purchase = { id: string; title: string; cost: number; created_at: string };
