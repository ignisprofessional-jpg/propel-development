/** Nom du cookie httpOnly qui garde le jeton de session renvoyé par dashboard_login. */
export const SESSION_COOKIE = "dash_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours, comme côté base

/** Un jeton valide fait 64 caractères hexadécimaux. */
export const looksLikeToken = (v: string | null | undefined): v is string => !!v && /^[a-f0-9]{64}$/.test(v);

/** Cookie court posé à la connexion : l'animation d'arrivée se joue une fois. */
export const INTRO_COOKIE = "dash_intro";
