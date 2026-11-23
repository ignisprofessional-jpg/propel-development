/** Catalogue des leçons de Rûh (repris du site, pour afficher titres et liens). */
export const RUH_URL = process.env.NEXT_PUBLIC_RUH_URL ?? "https://ruh-apprentissage.netlify.app";

export type RuhLevel = "debutant" | "intermediaire" | "avance";
export type RuhLesson = { id: string; title: string; level: RuhLevel; category: string };

const RAW: [string, string, RuhLevel, string][] = [
  ["decouvrir-islam", "Qu'est-ce que l'islam ?", "debutant", "decouvrir"],
  ["shahada", "Comprendre la shahada", "debutant", "piliers"],
  ["piliers-intro", "Les cinq piliers de l'islam", "debutant", "piliers"],
  ["pilier-salat", "Le pilier de la prière (salât)", "debutant", "piliers"],
  ["pilier-zakat", "Le pilier de l'aumône (zakât)", "debutant", "piliers"],
  ["pilier-siyam", "Le jeûne du Ramadan", "debutant", "piliers"],
  ["pilier-hajj", "Le pèlerinage à La Mecque (hajj)", "debutant", "piliers"],
  ["iman-six-piliers", "Les six piliers de la foi (îmân)", "debutant", "foi"],
  ["qui-est-allah", "Qui est Allah ?", "debutant", "foi"],
  ["anges", "Les anges", "debutant", "foi"],
  ["livres", "Les livres révélés", "debutant", "foi"],
  ["prophetes", "Les prophètes et messagers", "debutant", "foi"],
  ["jour-dernier", "Le Jour dernier", "debutant", "foi"],
  ["destin", "Le destin (al-qadar)", "intermediaire", "foi"],
  ["vie-prophete", "La vie du prophète Muhammad ﷺ", "debutant", "prophete"],
  ["histoire-islam", "Les grandes étapes de l'histoire islamique", "intermediaire", "histoire"],
  ["comportements", "Les comportements recommandés en islam", "debutant", "comportement"],
  ["parents", "Le respect des parents", "debutant", "comportement"],
  ["patience", "La patience (sabr)", "debutant", "comportement"],
  ["pardon", "Le pardon", "debutant", "comportement"],
  ["sincerite", "La sincérité (ikhlâs)", "debutant", "comportement"],
  ["gratitude", "La gratitude (shukr)", "debutant", "comportement"],
  ["halal-principes", "Halal et haram : les principes", "debutant", "halal"],
  ["porc-alcool", "Le porc et l’alcool", "debutant", "halal"],
  ["viande", "Les règles concernant la viande", "intermediaire", "halal"],
  ["necessite", "Les situations de nécessité et de contrainte", "intermediaire", "halal"],
  ["famille-non-musulmane", "Manger dans une famille non musulmane", "debutant", "halal"],
  ["divergences", "Comprendre les différences d’avis juridiques", "intermediaire", "halal"],
  ["priere-approfondie", "Approfondir la prière", "intermediaire", "priere"],
  ["hadith-intro", "Comprendre les hadiths", "intermediaire", "hadith"],
  ["coran-approfondir", "Approfondir le Coran", "intermediaire", "coran"],
  ["etude-coran", "Étude approfondie du Coran (‘ulûm al-Qur’ân)", "avance", "coran"],
  ["tafsir-intro", "Introduction au tafsir", "avance", "coran"],
  ["sciences-hadith", "Les sciences du hadith", "avance", "hadith"],
  ["fiqh-intro", "Introduction au fiqh", "avance", "fiqh"],
  ["ecoles-juridiques", "Les écoles juridiques", "avance", "fiqh"],
  ["histoire-approfondie", "Histoire islamique approfondie", "avance", "histoire"],
];

export const RUH_LESSONS: RuhLesson[] = RAW.map(([id, title, level, category]) => ({ id, title, level, category }));

export const RUH_LEVELS: Record<RuhLevel, { fr: string; en: string }> = {
  debutant: { fr: "Débutant", en: "Beginner" },
  intermediaire: { fr: "Intermédiaire", en: "Intermediate" },
  avance: { fr: "Avancé", en: "Advanced" },
};

/** Pages de Rûh liées depuis le dashboard. */
export const RUH_LINKS = [
  { path: "/parcours", fr: "Parcours", en: "Path" },
  { path: "/sourates", fr: "Sourates", en: "Surahs" },
  { path: "/priere", fr: "Prière", en: "Prayer" },
  { path: "/ablutions", fr: "Ablutions", en: "Ablutions" },
  { path: "/douas", fr: "Douas", en: "Duas" },
  { path: "/quiz", fr: "Quiz", en: "Quiz" },
] as const;
