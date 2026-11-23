import {
  BookOpen,
  Briefcase,
  Network,
  Gem,
  Sprout,
  ChartColumn,
  CircleDot,
  Clock4,
  FileText,
  LayoutGrid,
  Mail,
  Moon,
  TrendingUp,
  Repeat2,
  Settings,
  SquareCheckBig,
  Target,
  Timer,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Dict } from "@/lib/i18n/dictionaries";

export type Space = "home" | "islam" | "agence" | "perso" | "game";
type NavKey = keyof Dict["nav"];

export type NavItem = { href: string; key: NavKey; icon: LucideIcon; step: number };
export type NavGroup = { space: Space; key: NavKey | null; icon?: LucideIcon; items: NavItem[] };

export const NAV: NavGroup[] = [
  { space: "home", key: null, items: [{ href: "/", key: "home", icon: LayoutGrid, step: 2 }] },
  {
    space: "islam",
    key: "islam",
    icon: Moon,
    items: [
      { href: "/islam/avancee", key: "overview", icon: TrendingUp, step: 3 },
      { href: "/islam/priere", key: "prayer", icon: Clock4, step: 3 },
      { href: "/islam/coran", key: "quran", icon: BookOpen, step: 3 },
      { href: "/islam/adhkar", key: "adhkar", icon: CircleDot, step: 3 },
    ],
  },
  {
    space: "agence",
    key: "agency",
    icon: Briefcase,
    items: [
      { href: "/agence/prospects", key: "leads", icon: Users, step: 6 },
      { href: "/agence/paiements", key: "payments", icon: Wallet, step: 6 },
      { href: "/agence/mails", key: "mails", icon: Mail, step: 6 },
      { href: "/agence/documents", key: "documents", icon: FileText, step: 6 },
    ],
  },
  {
    space: "perso",
    key: "personal",
    icon: Sprout,
    items: [
      { href: "/perso/habitudes", key: "habits", icon: Repeat2, step: 5 },
      { href: "/perso/taches", key: "todo", icon: SquareCheckBig, step: 5 },
      { href: "/perso/concentration", key: "focus", icon: Timer, step: 5 },
      { href: "/perso/objectifs", key: "goals", icon: Target, step: 5 },
    ],
  },
  {
    space: "game",
    key: "game",
    icon: Gem,
    items: [
      { href: "/progression", key: "tree", icon: Network, step: 4 },
      { href: "/statistiques", key: "stats", icon: ChartColumn, step: 4 },
      { href: "/profil", key: "profile", icon: UserRound, step: 4 },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = { href: "/parametres", key: "settings", icon: Settings, step: 4 };

export const ALL_ITEMS: (NavItem & { space: Space; group: NavKey | null })[] = [
  ...NAV.flatMap((g) => g.items.map((i) => ({ ...i, space: g.space, group: g.key }))),
  { ...SETTINGS_ITEM, space: "home", group: null },
];

/** Espace (et donc couleur d'accent) d'une URL. */
export function spaceForPath(path: string): Space {
  if (path.startsWith("/islam")) return "islam";
  if (path.startsWith("/agence")) return "agence";
  if (path.startsWith("/perso")) return "perso";
  if (["/progression", "/statistiques", "/profil"].some((p) => path.startsWith(p))) return "game";
  return "home";
}

export function isActive(href: string, path: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}
