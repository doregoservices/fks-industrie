# ☕ CaféPro — Cahier des charges & architecture (v1)

> **Titre provisoire** : CaféPro (modifiable)
> **Client** : Usine de transformation de café (Abidjan, Côte d'Ivoire) — achat de café vert, torréfaction, conditionnement en produits finis.
> **Devise** : FCFA (XOF)
> **Date** : Août 2026

---

## 1. Objectifs

Une application web **simple, rapide, installable sur téléphone (PWA)**, hébergée en ligne, avec les données centralisées sur **Supabase**, qui permet de :

1. Suivre les **stocks à plusieurs niveaux** (café vert → café torréfié → produits finis) avec les **rendements réels** (aucun barème fixe nécessaire).
2. Enregistrer les **ventes des commerciaux** via une procédure spéciale : **des liens de saisie, sans accès à l'application**.
3. Enregistrer la **production** (torréfaction + conditionnement) de la même manière.
4. Tenir le **journal de caisse**, y compris les **opérations Mobile Money avec la direction** (envoi des ventes au boss / approvisionnements reçus), classées à part car non imputables directement en comptabilité.
5. Produire automatiquement des **fichiers Excel (.xlsx)** : point complet des stocks, journal de caisse **prêt pour Sage 100** (il suffit d'ajouter les numéros de compte, pré-remplissables), ventes, rendements, paie.
6. Gérer **complètement la paie** dans l'application.

---

## 2. Acteurs et modèle d'accès (recommandation)

### Principe : « Liens de saisie + file de validation »

| Acteur | Accès à l'app ? | Moyen | Ce qu'il fait |
|---|---|---|---|
| **Commerciale** | ❌ Non | **Lien unique personnel** (`/f/xxxxx`) posé sur son écran d'accueil | Saisit ses ventes en 30 secondes |
| **Chef de production** | ❌ Non | **Lien production** (1 ou 2 liens) | Saisit torréfaction et conditionnement (entrées/sorties réelles) |
| **Caissier(ère)** | ❌ Non (ou léger) | **Lien caisse** | Saisit entrées/sorties d'espèces et Mobile Money |
| **Manager / Gérant / Vous** | ✅ Oui | Compte + mot de passe (Supabase Auth) | Valide les saisies, gère tout, exports, paie |

### Pourquoi un lien **par commerciale** (et pas un seul lien pour tous) ?
- **Attribution** : chaque vente est rattachée automatiquement à la bonne commerciale (stats individuelles, commissions éventuelles).
- **Pas de compte ni mot de passe** à gérer pour elles ; le lien fonctionne sur n'importe quel téléphone (QR code ou « Ajouter à l'écran d'accueil »).
- **Révocable** individuellement (départ d'une commerciale = on coupe son lien, sans toucher aux autres).

### La file de validation (double sécurité)
Toutes les saisies faites via un lien arrivent dans une **file « En attente »**. Le manager ouvre l'application, voit chaque saisie (vente, lot de torréfaction, mouvement de caisse…), **corrige si besoin, puis valide**. Seules les saisies validées mettent à jour les stocks, la caisse et les états. Les saisies rejetées restent archivées.

> Le mode « une seule personne saisit tout » est également prévu (compte restreint à une zone : commercial / production / caisse). Les deux modes peuvent coexister.

---

## 3. Processus métier

### 3.1 Achats de café vert
- Date, fournisseur, **quantité en kg**, prix au kg, montant total, moyen de paiement (espèces / Mobile Money / autre).
- Génère automatiquement une **sortie de caisse** catégorisée « Achat café vert ».

### 3.2 Torréfaction (pas de barème fixe → rendement réel)
Chaque session enregistre :
- **Entrée** : x kg de café vert
- **Sortie** : y kg de café torréfié
- **Perte** = x − y (calculée automatiquement)
- **Rendement** = y / x (calculé, et moyenne sur la période)

### 3.3 Conditionnement en produits finis
Chaque session enregistre :
- **Consommation** : z kg de café torréfié
- **Production** : n unités de chaque produit (Café moulu 1 kg, Café moulu 500 g, Café grain, Café saveur gingembre, Café saveur poivre de Guinée, …)
- Déchets/emballages perdus éventuels.
- **Rendement réel par produit** (kg torréfié utilisés par unité produite, moyenne automatique).

> Les produits sont **paramétrables** : l'usine peut ajouter, renommer, désactiver un produit à tout moment (la liste des 5 n'est pas figée).

### 3.4 Ventes des commerciaux
- Par lien personnel : date, lignes de produits (produit + quantité), montant encaissé, mode de paiement (espèces / Mobile Money).
- Le prix peut être saisi ou proposé depuis la fiche produit.
- Statistiques par commerciale : ventes du jour, de la semaine, du mois.

### 3.5 Caisse & opérations Mobile Money avec la direction
Deux comptes de trésorerie suivis en parallèle : **Espèces** et **Mobile Money** (Orange Money / MTN / Wave).

| Opération | Effet | Classement Sage |
|---|---|---|
| Vente encaissée espèces | + Espèces | Imputable (ventes) |
| Vente encaissée Mobile Money | + Mobile Money | Imputable (ventes) |
| Achat café vert, transport, etc. | − Espèces/MoMo | Imputable (charges) |
| **Envoi des ventes du jour au boss (MoMo)** | − Mobile Money | **OD « Virement direction » — non imputable** (ou virement interne 58x selon votre préférence) |
| **Approvisionnement reçu du boss** | + Espèces/Mobile Money | **OD « Dotation direction » — non imputable** |
| Salaires versés | − Espèces/MoMo | Imputable (661) |

Les opérations avec la direction sont **taguées « OD »** et exportées dans une **feuille séparée** du classeur Excel, hors du journal Sage — tout en gardant les soldes de caisse exacts dans l'application.

### 3.6 Paie (module complet)
- **Fiches employés** : nom, poste, type (mensuel / journalier / à la pièce), salaire de base, primes récurrentes (transport, logement…), date d'embauche, statut.
- **Éléments de paie mensuelle** : primes exceptionnelles, heures supplémentaires, absences/retards (optionnel), **avances sur salaire** (suivies dans le mois, déduites automatiquement).
- **Retenues sociales/fiscales** : au choix — paie simple (retenues libres) **ou** module ivoirien (CNPS, IRPP/ITS) avec **taux et barèmes 100 % paramétrables** (à faire valider par votre comptable).
- **Bulletins de paie** générés par mois, **clôture mensuelle** en un clic, et **écriture de salaires injectée automatiquement dans le journal de caisse**.
- **Journal de paie** exportable sur Excel.

---

## 4. Niveaux de stock — formules

```
STOCK CAFÉ VERT (kg)      = Σ achats (kg)              − Σ kg verts torréfiés
STOCK TORRÉFIÉ (kg)       = Σ kg torréfiés produits    − Σ kg torréfiés conditionnés
STOCK PRODUIT FINI (u)    = Σ unités produites         − Σ unités vendues − dons/déchets + retours

RENDEMENT TORRÉFACTION   = Σ kg torréfiés produits / Σ kg verts torréfiés   (session & moyenne période)
RENDEMENT CONDITIONNEMENT= kg torréfiés consommés / unités produites, par produit
```

Alertes de stock bas paramétrables par produit. Chaque mouvement est traçable (qui a saisi, quand, validé par qui).

---

## 5. Journal de caisse & export Sage 100

### Classeur « Journal de caisse » (xlsx + csv)
- Feuille **SAGE** : `Date | Journal (code) | Compte | Libellé | Débit | Crédit`
  - Les **numéros de compte** sont pré-remplissables via une **table de correspondance** (catégorie d'opération → compte général), modifiable dans Paramètres. Sinon la colonne reste vide, prête à compléter.
  - Sélection de la période (jour / semaine / mois / custom).
- Feuille **OD Mobile Money** : les envois/dotations avec la direction (exclues du journal Sage ou en virement interne, au choix).
- Feuille **Détail mouvements** : toutes opérations avec catégories, moyens de paiement, soldes Espèces / MoMo.

### Autres exports Excel (boutons dans l'app)
| Export | Contenu |
|---|---|
| **Point complet des stocks** | 3 niveaux de stock + mouvements détaillés + rendements réels (torréfaction & conditionnement) sur la période |
| **Ventes** | Par commerciale, par produit, par jour/mois, encaissements espèces/MoMo |
| **Production** | Sessions de torréfaction & conditionnement, pertes, rendements |
| **Paie** | Journal de paie mensuel, bulletins, charges |

Les fichiers **.xlsx** sont générés directement dans le navigateur → **fonctionne même hors-ligne**.

---

## 6. Application (écrans)

### Espace Manager (avec compte)
1. **Tableau de bord** — soldes de caisse (Espèces/MoMo), stocks clés, alertes, saisies en attente.
2. **File de validation** — valider / corriger / rejeter chaque saisie reçue des liens.
3. **Achats café vert** — saisie & historique.
4. **Production** — sessions torréfaction & conditionnement, rendements.
5. **Produits** — gestion de la liste (les 5 + ajouts).
6. **Ventes & commerciaux** — statistiques, gestion des **liens** (créer, QR code, révoquer).
7. **Caisse** — journal, soldes, catégories, opérations direction.
8. **Paie** — employés, avances, bulletins mensuels, clôture.
9. **Exports Excel** — tous les classeurs.
10. **Paramètres** — correspondance comptes Sage, taux de paie, alertes stock, utilisateurs.

### Formulaires publics (par lien, sans compte) — optimisés mobile
- `/f/<lien-commerciale>` : mes ventes du jour (produits, quantités, montant, mode paiement) → confirmation avec n° de saisie.
- `/f/<lien-production>` : torréfaction (kg in → kg out) ou conditionnement (kg utilisés → unités produites).
- `/f/<lien-caisse>` : entrée/sortie, catégorie, montant, moyen.
- **Hors-ligne** : si le réseau coupe, la saisie est gardée sur le téléphone et envoyée dès le retour du réseau.

---

## 7. Base de données Supabase (schéma prévu)

| Table | Rôle |
|---|---|
| `profiles` | Utilisateurs de l'app (rôles : admin, commercial-zone, production-zone, caisse-zone) |
| `products` | Produits finis (nom, unité, prix indicatif, actif) |
| `purchases` | Achats de café vert |
| `roastings` | Sessions de torréfaction (kg in / kg out / perte / rendement) |
| `productions` | Sessions de conditionnement (kg torréfiés consommés + lignes produits) |
| `sales_agents` | Commerciaux (nom, téléphone, token du lien, actif) |
| `sales` | Ventes (agent, lignes produits, montant, mode paiement, statut validation) |
| `cash_entries` | Mouvements de caisse (catégorie, sens, moyen, imputable/OD, référence Sage) |
| `employees`, `pay_adjustments`, `advances`, `pay_runs`, `pay_slips` | Paie complète |
| `form_tokens` | Liens de saisie (token, type, propriétaire, révocable) |
| `pending_entries` | File de validation (charge utile JSON, source, statut) |

**Sécurité (RLS Supabase)** : les liens publics peuvent uniquement *insérer* dans la file (`pending_entries`) ; seuls les comptes authentifiés lisent/modifient les données. Tokens aléatoires de 32 caractères, révocables, avec limite de débit anti-abus.

---

## 8. Hébergement & installation

- **Front** : site statique (HTML/JS/PWA) — hébergeable gratuitement (Netlify / Vercel / Cloudflare Pages).
- **Données** : Supabase (offre gratuite suffisante pour démarrer : base Postgres + Auth + API).
- **Installation téléphone** : « Ajouter à l'écran d'accueil » (Android & iPhone) → l'app s'ouvre plein écran comme une vraie application. Chaque commerciale peut faire pareil avec son lien.
- **Hors-ligne** : service worker → formulaires et consultation fonctionnent sans réseau ; synchronisation automatique au retour.

---

## 9. Plan de réalisation (phases)

| Phase | Contenu |
|---|---|
| **1** | Socle : projet, configuration Supabase, produits, achats café vert |
| **2** | Production (torréfaction + conditionnement), stocks 3 niveaux, rendements |
| **3** | Ventes + liens par commerciale + file de validation |
| **4** | Caisse (Espèces/MoMo, OD direction) + **exports Excel (stocks + Sage)** |
| **5** | Paie complète + export |
| **6** | PWA hors-ligne, peaufinage, guide utilisateur (français) |

---

## 10. Décisions en attente

1. Modèle de collecte : liens individuels + validation (recommandé) / saisie centralisée / combiné ?
2. Avez-vous déjà un projet Supabase ?
3. Paie : simple ou avec retenues ivoiriennes (CNPS, IRPP/ITS) paramétrables ?
4. Ventes : 100 % comptant ou aussi à crédit (clients à suivre) ?

---

## 🆕 Version 2 — Ajouts (août 2026)

### 11. Compte d'exploitation mensuel (écran Exploitation)
Généré automatiquement (Excel + Google Sheets + email au boss) selon la méthode des **achats consommés** :
- Produits = ventes du mois + variation de stock de produits finis (valorisés au coût matière)
- Charges = achats consommés de café vert et d'emballages (SI + achats − SF au **coût moyen pondéré**) + charges externes par nature + charges de personnel (bruts + charges patronales + FDFP)
- Annexes : stocks SI→SF (vert, torréfié, produits finis, emballages), rendement torréfaction, trésorerie du mois, OD direction exclues du résultat.

### 12. Gestion des emballages
Articles (sachets, étiquettes, cartons…), achats avec sortie de caisse optionnelle, sorties/pertes, valeur au CMP, alertes stock bas, et **nomenclature par produit** : chaque conditionnement consomme automatiquement les emballages.

### 13. Ventes par lien — un point par jour
- Une nouvelle saisie pour la même journée **remplace** l'envoi précédent **tant qu'il n'est pas validé**.
- Si un point est déjà validé pour la date, la saisie devient un « complément » (validé séparément par le gestionnaire).
- Retard accepté : choix de la date jusqu'à **7 jours en arrière**.

### 14. Envois email automatiques (boss)
- **Point quotidien** : dès que toutes les ventes d'un jour sont validées → email automatique (résumé + Excel joint). Si une vente tardive est validée après envoi → signalement + **renvoi de la version à jour**.
- **Rapport mensuel** : compte d'exploitation + mouvements de tous les stocks + ventes + caisse + paie, envoyé au boss ; rappel affiché en début de mois tant qu'il n'est pas parti.
- Technique : fonction Supabase `send-report` (fournie) + clé Resend gratuite ; repli sans configuration : « ✉️ Préparer l'email » (télécharge le fichier + ouvre la messagerie). Historique dans `email_log`.

### 15. Paie — taux officiels Côte d'Ivoire (réforme ITS du 01/01/2024)
CNPS retraite 6,30 % / 7,70 % (plafond 3 375 000 F) ; prestations familiales 5 % ; maternité 0,75 % ; accidents du travail 2–5 % (plafonds 70 000 F) ; CMU 1 000 F/mois (500+500) ; FDFP 1,6 % (TA 0,4 + TFPC 1,2) ; **ITS progressif sur le brut** (0 % ≤ 75 000 ; 16 % ≤ 240 000 ; 21 % ≤ 800 000 ; 24 % ≤ 2,4 M ; 28 % ≤ 8 M ; 32 %) ; **RICF** − 5 500 F/demi-part (plafond 44 000 F, demi-parts par employé). Tous les taux sont modifiables dans Réglages et doivent être validés par le comptable. Déclarations associées : CNPS mensuelle, ITS/DGI (avant le 10), DISA, État 301.


---

## 🆕 Version 3 — Compte d'exploitation professionnel

- **Immobilisations & amortissements** : registre (coût, résiduel, durée), dotation mensuelle linéaire plafonnée, cumulé, VNC ; déduction automatique dans l'exploitation.
- **Charges structurées en 5 grandes masses** : achats consommés (via inventaire au CMP) · services externes · personnel (bruts + patronal + CMU + FDFP) · impôts et taxes · dotations aux amortissements. Affectation des catégories modifiable dans Réglages.
- **Impôts** : nouvelle catégorie « Impôts et taxes » (patente, TOM — compte 640000) + **impôt sur les bénéfices** (taux paramétrable, 25 % CI par défaut) déduit du résultat d'exploitation → **résultat net**.
- **Cash-flow** : EBE (EBITDA), **CAF** = résultat net + dotations, **flux de trésorerie réel du mois** (encaissements/décaissements, OD direction isolées) et **écart résultat ↔ trésorerie expliqué** (créances, dotations, stocks, impôt non décaissé). Feuille « Cash-flow » et « Immobilisations » ajoutées au classeur mensuel et à l'email du boss.

## 🆕 Version 4 — Détail masses, rôles, 12 mois, QR

- **computeIncome** : `personnel.det` = {cnpsS, cmuS, itsS, net, primes} issu des pay_slips clôturés ; `personnel.custom` / `impotsRows[].custom` = lignes créées (`settings.extra_lines` : {id, section:'personnel'|'impots', period, label, amount}) ajoutées aux totaux ; ventilation automatique des impôts par mot-clé du libellé de caisse (patente / TEE / ITS) via `impotBucket()`, sinon libellé de catégorie ; `impotsRows` = [{label, amount, id?, custom?}].
- **incomeRows / scExploitation** : bloc personnel détaillé (brut, mémo retenues salarié → net, primes, CNPS patronal, FDFP patronal, lignes créées marquées) ; groupes Personnel et Impôts avec bouton « ＋ Créer une ligne » (manager) et suppression ✕ (App.xlAdd/xlSave/xlDel, settings.extra_lines).
- **Comparatif 12 mois** : boucle `monthAdd(period,-i)` → computeIncome ×12 ; écran (graphique barres div + tableau), feuille Excel « 12 mois » avec TOTAL, tableau dans monthlyHtml.
- **Rôles** : `ROLE_SCREENS` {caissier, commercial, production} + manager (tout) ; `roleAllowed/roleHome/isManager` ; render() redirige vers l'écran autorisé ; nav filtrée ; pastille rôle dans la barre ; `settings.users` [{name, role, pin, email?}] créés dans Réglages (App.userAdd/userDel) ; loginLocal accepte le PIN gestionnaire ou un PIN de profil ; login Supabase hérite du rôle si e-mail associé.
- **QR** : librairie qrcodegen (MIT) intégrée en `<script>` dédié ; `qrSvg(text,px)` (SVG blanc, coins arrondis) affiché dans linkModal (commerciales) et la modale lien production/caisse.
- Tests : `tests/harness.js` (stubs navigateur + eval unique app+tests), `tests/tqr.js`, `tests/tv3.js`, `tests/tv4.js` — tous passants.

## 🆕 Revue « ultrareview » — durcissement

- **Cache DB** (`setDbAdapter`) : wrapper à version — `DB.bump()` invalide à chaque insert/update/remove et `setSetting` ; lecture : variable locale + contrôle de version pour éviter toute course avec les rendus asynchrones (bug détecté par la revue et corrigé) ; filtres {eq} appliqués localement, copie renvoyée. Effet : écran exploitation ≈ 7 lectures au lieu de ~200.
- **Sauvegarde** : 19 tables (ajout packaging_items, packaging_entries, assets, email_log qui manquaient depuis les v2/v3).
- **Restauration** : `App.impBackupPick/impPreview/impGo` — fichier JSON → confirmation → import sans doublon (id), réglages via setSetting, upsert PostgREST (Prefer merge-duplicates) en mode en ligne.
- **Quota localStorage** : repli mémoire + avertissement unique en console.
- **Preuves « années illimitées »** : tests/tyears.js (18/18) et tests/treview.js (40/40) — mois 1998→2100, amortissement 96 mois, ventes datées 2031, moisUI sans bornes.

## 🆕 Passe UX (mobile-first)

- `NAV_ITEMS`/`BTAB_IC`/`BTAB_PRI` + `bottomHtml()` : barre d'onglets fixe ≤768px (4 écrans du rôle + Menu), nav haute masquée sur mobile, safe-area iOS, toast remonté, main padding 128px, impression sans barre.
- `App.menu()` : feuille « Menu » avec écrans autorisés (roleAllowed) + identité/rôle.
- Actions rapides accueil (`roleAllowed` par bouton) : vente/achat/caisse/production.
- Pastille `📡 Hors ligne` (navigator.onLine + events online/offline → render), bouton `📥 Installer` (beforeinstallprompt + App.install avec repli instructions).
- `inputmode="numeric"` ajouté à tous les `<input type="number">` (40 champs).
- Tests : tests/tux.js (20/20) — onglets par rôle, menu filtré, actions rapides, hors ligne, installation.
