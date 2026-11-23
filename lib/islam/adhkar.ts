/**
 * Adhkar du matin et du soir (sélection courante, avec références).
 * Pour les textes longs, on affiche la translittération et le sens ; l'arabe
 * complet se lit sur Rûh (page Douas) ou dans le Coran pour les sourates.
 */
export type Period = "morning" | "evening";

export type Dhikr = {
  id: string;
  periods: Period[];
  count: number;
  translit: { morning: string; evening?: string };
  arabic?: string;
  meaning: { fr: string; en: string };
  source: string;
};

export const ADHKAR: Dhikr[] = [
  {
    id: "ayat-kursi",
    periods: ["morning", "evening"],
    count: 1,
    translit: { morning: "Âyat al-Kursî — Al-Baqara 2:255" },
    meaning: { fr: "Le verset du Trône.", en: "The Verse of the Throne." },
    source: "An-Nasâ’î (as-Sunan al-Kubrâ)",
  },
  {
    id: "muawwidhat",
    periods: ["morning", "evening"],
    count: 3,
    translit: { morning: "Al-Ikhlâs, Al-Falaq, An-Nâs" },
    meaning: { fr: "Les trois dernières sourates, trois fois chacune.", en: "The last three surahs, three times each." },
    source: "Abû Dâwûd 5082 · at-Tirmidhî 3575",
  },
  {
    id: "asbahna",
    periods: ["morning", "evening"],
    count: 1,
    translit: {
      morning: "Asbahnâ wa asbaha l-mulku lillâh, wa l-hamdu lillâh…",
      evening: "Amsaynâ wa amsâ l-mulku lillâh, wa l-hamdu lillâh…",
    },
    meaning: {
      fr: "Nous voici au matin (au soir), et la royauté appartient à Allah. Louange à Allah.",
      en: "We have reached the morning (evening) and the dominion belongs to Allah. Praise be to Allah.",
    },
    source: "Muslim 2723",
  },
  {
    id: "bika",
    periods: ["morning", "evening"],
    count: 1,
    translit: {
      morning: "Allâhumma bika asbahnâ, wa bika amsaynâ, wa bika nahyâ, wa bika namûtu, wa ilayka n-nushûr",
      evening: "Allâhumma bika amsaynâ, wa bika asbahnâ, wa bika nahyâ, wa bika namûtu, wa ilayka l-masîr",
    },
    meaning: {
      fr: "Ô Allah, c'est par Toi que nous atteignons le matin et le soir, par Toi que nous vivons et mourons.",
      en: "O Allah, by You we reach the morning and the evening, by You we live and die.",
    },
    source: "at-Tirmidhî 3391 · Abû Dâwûd 5068",
  },
  {
    id: "sayyid-istighfar",
    periods: ["morning", "evening"],
    count: 1,
    translit: { morning: "Allâhumma anta rabbî, lâ ilâha illâ anta, khalaqtanî wa anâ ‘abduk…" },
    meaning: {
      fr: "Le maître des demandes de pardon (Sayyid al-istighfâr).",
      en: "The master supplication for forgiveness (Sayyid al-istighfar).",
    },
    source: "al-Bukhârî 6306",
  },
  {
    id: "bismillah",
    periods: ["morning", "evening"],
    count: 3,
    translit: { morning: "Bismillâhi lladhî lâ yadurru ma‘a smihi shay’un fi l-ardi wa lâ fi s-samâ’, wa huwa s-samî‘u l-‘alîm" },
    meaning: {
      fr: "Au nom d'Allah, avec le nom duquel rien ne peut nuire, ni sur terre ni dans le ciel.",
      en: "In the name of Allah, with whose name nothing can harm, on earth or in the heavens.",
    },
    source: "Abû Dâwûd 5088 · at-Tirmidhî 3388",
  },
  {
    id: "raditu",
    periods: ["morning", "evening"],
    count: 3,
    translit: { morning: "Radîtu billâhi rabban, wa bil-islâmi dînan, wa bi-Muhammadin ﷺ nabiyyan" },
    meaning: {
      fr: "J'agrée Allah comme Seigneur, l'islam comme religion et Muhammad ﷺ comme prophète.",
      en: "I am pleased with Allah as Lord, Islam as religion and Muhammad ﷺ as prophet.",
    },
    source: "Abû Dâwûd 5072",
  },
  {
    id: "hasbiya",
    periods: ["morning", "evening"],
    count: 7,
    translit: { morning: "Hasbiya llâhu lâ ilâha illâ huwa, ‘alayhi tawakkaltu, wa huwa rabbu l-‘arshi l-‘azîm" },
    meaning: {
      fr: "Allah me suffit, il n'y a de divinité que Lui ; en Lui je place ma confiance.",
      en: "Allah is sufficient for me, there is no god but Him; in Him I put my trust.",
    },
    source: "Abû Dâwûd 5081",
  },
  {
    id: "afini",
    periods: ["morning", "evening"],
    count: 3,
    translit: { morning: "Allâhumma ‘âfinî fî badanî, Allâhumma ‘âfinî fî sam‘î, Allâhumma ‘âfinî fî basarî" },
    meaning: {
      fr: "Ô Allah, préserve mon corps, mon ouïe et ma vue.",
      en: "O Allah, grant well-being to my body, my hearing and my sight.",
    },
    source: "Abû Dâwûd 5090",
  },
  {
    id: "ya-hayyu",
    periods: ["morning", "evening"],
    count: 1,
    translit: { morning: "Yâ Hayyu yâ Qayyûm, bi-rahmatika astaghîth, aslih lî sha’nî kullah, wa lâ takilnî ilâ nafsî tarfata ‘ayn" },
    meaning: {
      fr: "Ô Vivant, ô Subsistant, j'implore Ta miséricorde : arrange toutes mes affaires.",
      en: "O Ever-Living, O Sustainer, I seek Your mercy: set right all my affairs.",
    },
    source: "An-Nasâ’î (as-Sunan al-Kubrâ) · al-Hâkim",
  },
  {
    id: "audhu",
    periods: ["evening"],
    count: 3,
    translit: { morning: "A‘ûdhu bi-kalimâti llâhi t-tâmmâti min sharri mâ khalaq" },
    arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    meaning: {
      fr: "Je cherche refuge dans les paroles parfaites d'Allah contre le mal de ce qu'Il a créé.",
      en: "I seek refuge in the perfect words of Allah from the evil of what He has created.",
    },
    source: "Muslim 2709",
  },
  {
    id: "subhan-bihamdih",
    periods: ["morning", "evening"],
    count: 100,
    translit: { morning: "Subhâna llâhi wa bi-hamdih" },
    arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    meaning: { fr: "Gloire et louange à Allah.", en: "Glory and praise be to Allah." },
    source: "Muslim 2692",
  },
  {
    id: "tahlil",
    periods: ["morning"],
    count: 100,
    translit: { morning: "Lâ ilâha illa llâhu wahdahu lâ sharîka lah, lahu l-mulku wa lahu l-hamd, wa huwa ‘alâ kulli shay’in qadîr" },
    meaning: {
      fr: "Nul ne mérite d'être adoré si ce n'est Allah, Seul, sans associé. À Lui la royauté et la louange.",
      en: "There is no god but Allah alone, without partner. His is the dominion and the praise.",
    },
    source: "al-Bukhârî 3293 · Muslim 2691 (cent fois dans la journée)",
  },
];

export const adhkarFor = (period: Period) => ADHKAR.filter((d) => d.periods.includes(period));
