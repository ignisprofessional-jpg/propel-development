/** Tables exportables (toutes protégées par RLS : lues avec la session du dashboard). */
export const EXPORT_TABLES = [
  "dash_settings",
  "islam_prayer_logs",
  "islam_nafl_logs",
  "islam_quran_reading",
  "islam_quran_position",
  "islam_hifz",
  "islam_adhkar_logs",
  "islam_dhikr_counters",
  "islam_dhikr_counts",
  "perso_habits",
  "perso_habit_logs",
  "tasks",
  "focus_sessions",
  "perso_goals",
  "perso_goal_steps",
  "game_xp_events",
  "game_milestones",
  "agency_leads",
  "agency_activities",
  "agency_payments",
  "agency_documents",
  "agency_emails",
] as const;
export type ExportTable = (typeof EXPORT_TABLES)[number];

/** Tableaux proposés en CSV dans Paramètres (les plus utiles dans un tableur). */
export const CSV_TABLES: ExportTable[] = ["islam_prayer_logs", "islam_quran_reading", "perso_habit_logs", "tasks", "focus_sessions", "game_xp_events", "agency_leads", "agency_payments"];
