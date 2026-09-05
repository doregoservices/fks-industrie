# ☕ FKS Industrie — Workflow complet, à tous les niveaux

> Le parcours de chaque acteur, du terrain jusqu'au rapport mensuel du boss.
> **Règle d'or : rien ne bouge dans les stocks ni la caisse tant que le gestionnaire n'a pas validé.**

---

## 🗺️ Vue d'ensemble

```
┌───────────────── TERRAIN (sans compte, par lien + QR) ─────────────────┐
│  Commerciale (ventes)     Chef production (atelier)      Caissier      │
│  lien /f/<token>          lien /f/<token>                lien /f/...   │
│        │                        │                           │          │
│        └────────────┬───────────┴───────────────────────────┘          │
│                     ▼  (file d'attente si hors réseau)                 │
│            📥 À VALIDER (écran du gestionnaire)                        │
└─────────────────────────────┬──────────────────────────────────────────┘
                              ▼  validation
┌──────────────────── GESTION (application + PIN) ───────────────────────┐
│ Stocks vert/torréfié/PF/emballages · Caisse Espèces+MoMo · Impayés    │
│ Paie CI · Exploitation mensuelle · Exports Excel/Sage · Emails boss   │
└─────────────────────────────┬──────────────────────────────────────────┘
                              ▼
              📊 Point quotidien + Rapport mensuel (email)
              📗 Excel (7 classeurs) · Sauvegarde JSON (19 tables)
```

---

## Niveau 1 — Le terrain : saisir sans compte (liens + QR)

| Acteur | Reçoit | Saisit | Contraintes |
|---|---|---|---|
| **Commerciale** | Lien personnel + QR (écran Commerciaux) | Son point du jour : produits, quantités, mode de paiement (espèces / MoMo / **crédit + nom du client**) | 1 point/jour ; rattrapage **7 jours** en arrière ; fonctionne **hors réseau** (envoi auto au retour du réseau) |
| **Chef production** | Lien production + QR (écran Réglages → liens) | **Torréfaction** : kg vert entrés, kg torréfiés sortis (perte/rendement calculés) · **Machines / transformation** : kg torréfiés consommés → kg obtenus par type de café · **Conditionnement** : quantités par produit fini | Types de café et emballages déduits automatiquement selon les recettes et nomenclatures |
| **Caissier** | Lien caisse + QR | Entrées / sorties Espèces ou MoMo, catégorie, libellé | Les opérations avec la direction partent en **OD** (non imputables) |

- Un lien peut être **révoqué ou désactivé** à tout moment (plus personne ne saisit avec).
- Le QR code s'affiche dans la fenêtre du lien : la personne scanne, l'appli s'ouvre, elle l'ajoute à son écran d'accueil.

## Niveau 2 — Le gestionnaire : valider et piloter (quotidien)

1. Ouvrir l'appli (PIN) → l'**Accueil** montre les alertes : saisies en attente, stock bas, créances à encaisser, rapport mensuel non envoyé.
2. **📥 À valider** : examiner chaque saisie (déjà convertie en opérations prêtes) → **Valider** (stocks + caisse mis à jour) ou **Refuser** (retour à la commerciale).
3. Quand toutes les ventes d'une journée sont validées → le **point quotidien part automatiquement par email** au boss (si email configuré) ; renvoi manuel possible.
4. Actions rapides de l'accueil : 🛒 Vendre · 🛁 Acheter du vert · 💰 Caisse · 🏭 Produire.

## Niveau 3 — Le processus physique de l'usine

```
ACHAT VERT ──▶ STOCK VERT ──▶ TORRÉFACTION ──▶ STOCK TORRÉFIÉ ──▶ MACHINES DE TRANSFORMATION ──▶ CONDITIONNEMENT ──▶ PRODUITS FINIS
(fournisseur,   (kg, coût      (rendement       (kg)              (broyage, mouture…) :      (par produit,       (5 produits,
 kg, prix F)     moyen pondéré)  RÉEL mesuré)                       TYPES de café obtenus      recette auto :      extensibles)
                                                                  (moulu premium, grains…)   type + emballages)
                                                                                                                          │
                                                                                                            VENTES (comptant / crédit)
                                                                                                                          │
                                                                                                              IMPAYÉS → Encaisser → Caisse
```

- **Achats consommés** du mois = stock initial + achats − stock final (coût moyen pondéré) : pas de charges faussées par le stock dormant.
- **Rendement réel UNIQUE** : la torréfaction est la seule pesée (kg verts → kg torréfiés). Les machines sont utilisées mais **on ne pèse plus entre torréfaction et machines** : le **conditionnement** consomme directement le torréfié (une seule saisie : kg torréfiés + unités produites).
- Chaque **produit fini** déclare sa **recette en kg de café par unité** (ex. sachet 1 kg = 1 kg de café ; 500 g = 0,5 kg) : le stock de torréfié et les emballages sont déduits automatiquement — plus d'étape intermédiaire, plus de types de café à gérer.
- **Écran 📦 Stocks** : vue consolidée temps réel (vert, torréfié, produits finis, emballages + valeurs + alertes seuils).
- Alertes automatiques quand un produit fini ou un emballage passe sous son seuil.
- **Immobilisations** : registre + dotation mensuelle automatique (linéaire, plafonnée, soldée seule).

## Niveau 4 — Caisse, trésorerie et export comptable

- Deux caisses suivies en parallèle : **Espèces** et **Mobile Money**.
- Chaque sortie est **catégorisée** (transport, électricité, loyer, impôts…) → mappée vers les **grandes masses** de l'exploitation et les **comptes Sage** (n° pré-remplissables dans Réglages).
- **Opérations avec la direction (MoMo)** : tracées mais **non imputables** → feuille **OD** séparée, prête pour virement interne (58x) — jamais dans le journal Sage.
- **Rapport mensuel enrichi** : le classeur Excel (et l'email au boss) comprend la **feuille « Analyse produits »** — comptabilité analytique : qtés vendues, CA, coût unitaire (recette café + emballages au CMP), coût vendu, **marge brute**, % marge, part du CA.
- **Exports** (écran Exports) : journal **SAGE** `Date|Journal|Compte|Libellé|Débit|Crédit` équilibré (CSV point-virgule, il ne reste que les n° de comptes), mouvements de stocks, ventes, paie, exploitation, **sauvegarde complète 21 tables** (+ restauration).

## Niveau 5 — La paie (mensuelle, taux officiels CI)

1. **Employés** : salaire de base, transport, logement, demi-parts fiscales, type (mensuel/journalier).
2. **Paie → Générer le mois** : bulletins calculés — CNPS 6,3 % salarié / patronal (retraite 7,7 % + PF + maternité + AT), CMU, **ITS barème 2024** (0 % ≤ 75 000 F puis 16→32 %), réduction RICF, FDFP 1,6 %, avances déduites.
3. **Vérifier** (bulletin détaillé par employé, modifiable avant clôture).
4. **Clôturer & payer** : sortie de caisse « Salaires » créée automatiquement, avances marquées payées.
5. Le détail complet (CNPS salarié/patronal, ITS salarié, nets, primes) alimente la masse **Personnel** de l'exploitation. Taux modifiables dans Réglages.

## Niveau 6 — Le mensuel : exploitation, cash-flow, rapports

- **📈 Exploitation** (choisir le mois) :
  - Produits = **ventes + variation de stock PF** (= production réelle du mois) ;
  - 5 masses : achats consommés · services externes · **personnel détaillé** · **impôts (Patente/TEE/ITS reconnus + lignes créables)** · dotations ;
  - Résultat → **IS paramétrable** (25 % par défaut) → résultat net → **EBE** → **CAF** ;
  - **Trésorerie réelle** (encaissé − décaissé + OD) et **écart résultat ↔ trésorerie expliqué** (créances, dotations, stocks, IS non décaissé) ;
  - **Comparatif 12 mois** (graphique + tableau).
- **Email au boss** : point quotidien (auto) + rapport mensuel (Excel complet en pièce jointe : exploitation, cash-flow, 12 mois, immobilisations, stocks, ventes, caisse, paie).
- Lignes créables (＋ Créer une ligne) sur Personnel et Impôts, pour le mois affiché uniquement.

## Niveau 7 — Comptes, rôles et sécurité

| Profil | Accès | Connexion |
|---|---|---|
| **Gestionnaire (boss)** | Tout | PIN principal |
| **Caissier** | Accueil, Caisse | PIN personnel |
| **Chef commercial** | Accueil, Ventes, Commerciaux, Impayés, Produits | PIN personnel |
| **Chef production** | Accueil, Achats, Production, Produits, Emballages, Immobilisations | PIN personnel |
| **Terrain** | Son seul formulaire | Lien + QR (révocable) |

- Comptes créés dans **Réglages → Comptes à accès restreint** (en mode en ligne, rattachables à un e-mail).
- Données : **local** (téléphone) ou **Supabase en ligne** (multi-appareils) ; quota local → sauvegardes régulières + restauration en 1 clic.
- **PWA installable** (bouton 📥 Installer / « Ajouter à l'écran d'accueil ») ; fonctionne hors ligne.

---

## 📆 Les rituels recommandés

| Fréquence | Quoi | Écran |
|---|---|---|
| **Chaque jour** | Valider les saisies → le point part au boss | À valider |
| **Chaque semaine** | Vérifier stocks bas + relancer impayés | Accueil / Impayés |
| **Fin de mois** | 1) Paie (générer → clôturer) 2) Exploitation + comparatif 3) Envoyer le rapport 4) Sauvegarde JSON | Paie / Exploitation / Exports |
| **Trimestre/année** | Vérifier cumuls 12 mois, taux de paie (Loi de Finances), restaurer sauvegarde de test | Exploitation / Réglages |

*Applications illimitée dans le temps : mois, années, amortissements longs et comparatifs fonctionnent sur n'importe quel horizon.*
