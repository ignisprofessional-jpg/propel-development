# Propel Development

Dashboard personnel tout-en-un : **Islam**, **agence Propel** et **développement perso**, avec un système de niveaux et un arbre de progression.
Next.js 15 (App Router) + TypeScript, Supabase (même projet que Rûh), déploiement Netlify.

## Lancer le projet

```powershell
npm install
npm run dev
```

Ouvre <http://localhost:3000> puis entre ton code d'accès.

- Copie `.env.example` en `.env.local` si le fichier n'existe pas (il n'est jamais commité).
- `http://localhost:3000/design` montre l'accueil et les composants **sans code**, uniquement en développement (`DEV_PREVIEW=1`). En production, cette page renvoie une 404.

## Accès par code (pas de compte)

Le dashboard s'ouvre avec un code à 8 chiffres. **Le code n'est pas dans le code source** : seul son hash bcrypt est stocké dans Supabase, dans le schéma `dashboard_private`, qui n'est pas exposé par l'API.

1. L'écran `/connexion` envoie le code à la fonction `dashboard_login`. Celle-ci compare le code au hash, bloque après 5 erreurs en 15 minutes et renvoie un jeton de session aléatoire valable 30 jours.
2. Le serveur garde ce jeton dans un cookie `httpOnly` (illisible par le JavaScript de la page).
3. Toutes les lectures et écritures passent par le serveur, qui envoie le jeton à Supabase dans l'en-tête `x-dashboard-token`. Les tables du dashboard ont RLS activé avec la politique `dashboard_session_valid()` : sans jeton valide, elles sont inaccessibles, même avec la clé publique.

Migrations : [`supabase/migrations/`](supabase/migrations). Elles sont déjà appliquées sur le projet Supabase (même projet que Rûh, aucune table de Rûh modifiée).

### Changer le code

Dans Supabase, ouvre **SQL Editor** et exécute (remplace `NOUVEAU_CODE`) :

```sql
update dashboard_private.secret
set pin_hash = extensions.crypt('NOUVEAU_CODE', extensions.gen_salt('bf', 10)), updated_at = now()
where id = 1;
-- Déconnecter tous les appareils :
delete from dashboard_private.sessions;
```

### Débloquer après trop d'essais

```sql
delete from dashboard_private.pin_attempts where not ok;
```

## Espace Islam (étape 3)

- **Mon avancée** : vue d'ensemble — progression Rûh (niveau, leçons, sourates, quiz, objectifs ; liens vers Rûh), prières sur 30 jours (carte de chaleur, série), Coran et adhkar. Le compte Rûh se relie dans Paramètres avec l'e-mail utilisé sur Rûh ; la lecture passe par la fonction `dashboard_ruh_progress()` sans modifier la table `progress` de Rûh.
- **Prière** : horaires calculés sur l'appareil avec [adhan](https://github.com/batoulapps/adhan-js) (ville, méthode et heure du Asr dans Paramètres), compte à rebours, statut de chaque prière (à l'heure, en retard, rattrapée), prières surérogatoires, 7 derniers jours et série.
- **Coran** : pages lues par jour avec objectif, khatm en cours et rythme, dernière position (lien vers Rûh), mémorisation avec révision espacée (1, 3, 7, 14, 30, 60, 120 jours).
- **Adhkar** : matin et soir avec sources, compteur de dhikr (comptage instantané, enregistré par lots, vibration à l'objectif sur mobile).
- **Paramètres** : prénom, ville (recherche Open-Meteo, seul le nom tapé est envoyé), méthode de calcul, objectif Coran, « Ne pas donner d'expérience pour les actes d'adoration » (activé par défaut).

## Progression (étape 4)

- **XP et niveaux** : niveau suivant à `100 × n^1,5` XP ; 8 rangs (Recrue → Légende) avec un insigne dessiné pour chacun.
- **Arbre de progression** (remplace les quêtes et le marché) : 9 branches fixes de 5 paliers — Prière, Coran, Mémorisation, Adhkar, Rûh, Concentration, Habitudes, Tâches, Niveau. Les paliers se valident tout seuls à partir des données et restent acquis. XP par palier : 20, 40, 80, 150, 300.
- **Adoration** : si « Ne pas donner d'expérience pour les actes d'adoration » est activé (par défaut), les branches Prière, Coran, Mémorisation, Adhkar et Rûh ne donnent aucune XP.
- **Autres sources d'XP** : habitude cochée 5, tâche faite 10, concentration 1 XP par tranche de 5 minutes.
- **Statistiques** : séries, graphiques semaine / mois / année, carte de chaleur sur 12 mois. **Profil** : niveau, rang, historique d'XP.

## Développement perso (étape 5)

- **Habitudes** : quotidiennes ou X fois par semaine, 7 derniers jours à cocher, séries, taux sur 30 jours, carte de chaleur sur 26 semaines.
- **To-do** : tâches perso, agence et islam au même endroit (filtre par espace), vues Aujourd'hui / Semaine / Kanban (glisser-déposer) / Calendrier, tâches récurrentes (la suivante est créée quand on coche).
- **Concentration** : Pomodoro (25 + 5) ou session libre, liée à une tâche ; le minuteur continue si on change de page ; les sessions comptent dans l'accueil, les stats et l'arbre.
- **Objectifs** : objectifs à long terme découpés en étapes, avec date visée.

## Agence Propel (étape 6)

- **Prospects & clients** : pipeline Nouveau → Contacté → Maquette → Devis → Signé / Perdu (glisser-déposer), vue tableau avec filtres, onglet Réussis (taux de conversion, CA signé, par source). Fiche prospect avec historique, notes, tâches, paiements, mails et devis. Passer en « Signé » crée les 5 tâches de démarrage.
- Les tâches agence sont dans **Perso → To-do** (filtre « Agence ») : pas de doublon.
- **Paiements** : saisie manuelle (acompte, solde, abonnement), filtres à venir / en retard / payés, encaissé ce mois, export CSV (`/api/export/payments`, s'ouvre dans Excel). **Stripe** se connecte dans Paramètres → Stripe : liens de paiement à envoyer au client, et passage en « Payé » automatique par webhook (`docs/STRIPE.md`).
- **Devis & factures** : numérotation automatique (D-2026-001, F-2026-001), page imprimable `/document/<id>` (bouton Imprimer → Enregistrer en PDF). Sans n° de TVA, mention « TVA non applicable, art. 293 B du CGI ». Nom, adresse, SIRET et TVA se règlent dans Paramètres → Entreprise.
- **Mails reçus** : arrivent depuis **Resend** par webhook (`/api/inbound/resend`, signature vérifiée). Lecture, rattachement automatique au prospect qui a la même adresse, création de prospect ou de tâche, réponse. Mise en place : `docs/EMAIL.md`.

## Application, rappels et données (étape 7)

- **PWA** : installable (Paramètres → Application, ou menu du navigateur ; sur iPhone : Partager → Sur l'écran d'accueil). Icônes Propel, plein écran, page hors ligne. Le service worker ne garde que les fichiers statiques : tes données ne sont jamais mises en cache.
- **Rappels de prière** : Paramètres → Rappels de prière (à l'heure ou 5 à 30 min avant). Ils partent tant que le dashboard est ouvert sur l'appareil (onglet ou app installée). Il n'y a pas de serveur d'envoi push, donc pas de rappel quand l'app est complètement fermée.
- **Export** : Paramètres → Mes données. Tout en JSON (`/api/export/data`) ou un tableau en CSV pour Excel.
- **Rûh** : déjà synchronisé (lecture de `public.progress`), voir `docs/RUH-SYNC.md`. Rien à changer côté Rûh.

## Horaires de prière

Calculés par l'API Aladhan avec la même méthode que Rûh (UOIF 12° par défaut), pour la ville choisie dans Paramètres, avec un ajustement en minutes par prière pour coller à ta mosquée. Si l'API ne répond pas, calcul local (adhan). Le calendrier (Prière + accueil) signale les jours de jeûne recommandés et les fêtes (calendrier Umm al-Qura).

## Design system

- Tous les tokens (couleurs, rayons, espacements, durées, easings) sont dans [`styles/tokens.css`](styles/tokens.css) : ce sont eux qui font foi.
- Palette **noir et blanc uniquement**. Thème sombre par défaut, thème clair disponible (cookie `theme`).
- Polices : Geist, Geist Mono (kickers), Amiri (arabe). Icônes : Lucide.
- Animations de 150 à 250 ms, coupées si « réduire les animations » est activé.
- Sur ordinateur (au moins 1101 × 600 px), les pages ne défilent pas : elles remplissent l'écran et seuls les blocs longs défilent à l'intérieur (`<Card fill>` + `<ScrollArea>`). Sur téléphone et tablette, la page défile normalement.
- Composants de base : [`components/ui`](components/ui/index.tsx). Shell (sidebar dépliante, barre du haut, barre mobile, recherche Ctrl+K) : [`components/layout`](components/layout).
- Langue FR/EN : [`lib/i18n/dictionaries.ts`](lib/i18n/dictionaries.ts) (cookie `lang`).

## Structure

```
app/(app)/        pages protégées (accueil + sections)
app/(preview)/    /design, aperçu sans code (dev uniquement)
app/connexion/    écran du code
app/auth/         déconnexion, session expirée
components/       ui, layout, home
lib/              supabase, i18n, dates (hégirien), nav, jeu (rangs, XP), démo
styles/tokens.css design tokens
supabase/         migrations SQL
docs/             documentation et captures
```

## Avancement

| Étape | Contenu | État |
|---|---|---|
| 1 | Mise en place, design system, accès par code | fait |
| 2 | Accueil (prières et Coran réels, le reste en démo) | fait |
| 3 | Islam : prières, horaires, Coran, adhkar, Paramètres | fait |
| 4 | Progression : XP, niveaux, rangs, arbre de progression, statistiques, profil | fait |
| 5 | Perso : habitudes, to-do, concentration, objectifs | fait |
| 6 | Agence : prospects, paiements, devis/factures, mails Resend | fait |
| 7 | Synchronisation Rûh, PWA, rappels de prière, export des données | fait |
