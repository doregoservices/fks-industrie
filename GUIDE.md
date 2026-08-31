# ☕ CaféPro — Guide de démarrage (français)

Bienvenue ! Ce guide vous accompagne pas à pas : essai immédiat, mise en ligne, connexion Supabase, réglages, utilisation quotidienne.

---

## 1. Essayer immédiatement (2 minutes)

1. Ouvrez `index.html` (double-clic, ou via l'aperçu).
2. Touchez **« ☕ Essayer avec les données de démonstration »**.
3. L'application s'ouvre avec des données fictives : achats, torréfactions, ventes, caisse, employés, avances…
4. Naviguez partout : tableau de bord, production, caisse, paie, exports. Rien ne peut casser — vous pourrez tout réinitialiser dans **Réglages**.

> En mode démo, les données restent **sur l'appareil** (navigateur). Elles ne partent nulle part.

---

## 2. Mettre l'application en ligne

L'application est un site statique : **un seul dossier à héberger gratuitement**.

### Option Netlify (la plus simple)
1. Allez sur [app.netlify.com/drop](https://app.netlify.com/drop) (créez un compte gratuit si besoin).
2. **Glissez-déposez le dossier `usine-cafe`** entier.
3. Vous recevez une adresse du type `https://votre-usine.netlify.app` → c'est votre application en ligne, accessible depuis n'importe quel téléphone.

*(Alternatives : Vercel, Cloudflare Pages — même principe.)*

---

## 3. Connecter Supabase (données conservées en ligne)

Vous avez déjà un projet Supabase — parfait :

1. Dans Supabase → **SQL Editor** → *New query* : collez tout le contenu de **`schema.sql`** (fourni dans ce dossier) → **Run**. ✅ Les tables et la sécurité sont créées, avec les 5 produits.
2. Dans Supabase → **Authentication → Users → Add user** : créez votre compte gestionnaire (email + mot de passe, case *Auto Confirm* cochée).
3. Dans Supabase → **Project Settings → API** : copiez **Project URL** et la clé **anon public**.
4. Dans l'application → écran de connexion → **« 🔌 Connexion Supabase »** → collez URL + clé → Enregistrer.
5. Connectez-vous avec l'email/mot de passe créés. ✅ Toutes les données sont maintenant enregistrées en ligne.

> Sécurité : les formulaires publics peuvent uniquement *déposer* des saisies en attente. Seuls les comptes connectés lisent ou modifient les données.

---

## 4. Premiers réglages (30 minutes)

| Quoi | Où | Détail |
|---|---|---|
| Nom de la société | **Réglages** | Affiché en haut de l'app |
| Produits | **Produits** | Les 5 existants + ajoutez/renomez/désactivez librement |
| Commerciales | **Commerciaux** | Ajoutez chaque vendeuse → bouton **🔗 Lien** → envoyez-le par WhatsApp |
| Lien production / caisse | **Commerciaux → Autres liens** | 1 lien atelier + 1 lien caisse (créés en 1 clic, révocables) |
| Comptes Sage | **Réglages → Correspondance des comptes** | Pré-remplit les numéros dans l'export ; laissez vide pour les ajouter plus tard dans Excel |
| Taux de paie | **Réglages → Taux de paie** | CNPS, plafond, barème IRPP/ITS — **à faire valider par votre comptable** |

### Le lien d'une commerciale
Elle reçoit le lien (WhatsApp). Elle l'ouvre puis **menu du navigateur → « Ajouter à l'écran d'accueil »** : elle a maintenant une icône « Mes ventes » sur son téléphone. Aucun compte, aucun mot de passe. Si elle quitte l'entreprise : régénérez le lien (l'ancien meurt immédiatement).

---

## 5. Utilisation quotidienne

1. **Matin** : ouvrez **À valider** (badge rouge) → examinez les saisies de la veille → **Valider** ou **Rejeter**.
2. **Achats de café vert** : écran **Achats vert** → le règlement part automatiquement dans la caisse.
3. **Production** : écran **Production** (ou le lien atelier) → ① kg verts → kg torréfiés ; ② **Machines** : kg torréfiés consommés → kg obtenus par **type de café** (moulu premium, standard, grains…) ; ③ **Conditionnement** : quantités par produit — les types de café et emballages sont déduits **automatiquement** selon les recettes. *Pertes et rendements réels se calculent seuls à chaque étape — aucun barème fixe nécessaire.*
3 bis. **📦 Stocks** : un seul écran pour tout voir — café vert (+ valeur au coût moyen), torréfié, types de café, produits finis (produits/vendus/stock + alertes ⚠️), emballages (+ valeur). Bouton direct depuis l'accueil.
4. **Caisse** : opérations courantes + boutons **Envoi ventes direction** / **Appro direction reçue** (marquées « OD », elles ne polluent pas Sage).
5. **Fin de mois** : **Paie → Paie du mois** → complétez absences/heures sup/primes → générer → vérifier → **Clôturer & payer** (écriture de salaires automatique dans la caisse).

### Exports Excel (écran **Exports**)
| Export | Contenu |
|---|---|
| **Point complet des stocks** | Café vert, torréfié, **types de café transformés**, produits finis, **emballages**, rendements (torréfaction + machines), mouvements détaillés |
| **Sage 100 — 6 journaux** | **8 feuilles** : `Synthèse` (contrôle) + un feuillet par journal — **VE Ventes, AC Achats, CA Caisse, BQ Banque/Mobile Money, PA Paie, OD Opérations diverses** — écritures équilibrées `Date/Journal/Compte/Libellé/Débit/Crédit`, + `Mouvements` (détail). Fourni en **.xlsx et .csv global** prêt à importer |

**Classement automatique (aucun double comptage)** : ventes (comptant + crédit → VE, créances au 4111) · encaissements de crédits → CA/BQ (4111) · achats café vert & emballages → AC · achats non réglés → AC (dette 4011) · paies clôturées → PA (661 + 6641 / 422 + 431 + 4472), leur règlement en caisse passe au 422 · transferts avec la direction et apports → OD (585 / 101).

**Comptes conformes au SYSCOHADA révisé (AUDCIF, applicable 2018)** : 702 produits finis · 6021 café vert (matière première) · 6081 emballages perdus · 622 locations · 612/611 transports · 6042 carburant · 6052 électricité · 624 entretien · 661 salaires · 6641 charges sociales CNPS · 6412 patente · 6414/6415 FDFP · 571 caisse · **5521 Mobile Money (monnaie électronique)** · 4111 clients · 4011 fournisseurs · 422 rémunérations dues · 4211 avances · 431 CNPS · 4472 impôts sur salaires · **585 virements de fonds** · 101 capital. Migration automatique depuis les anciens numéros ; **toute personnalisation existante est conservée**. Tous modifiables dans **Réglages → Correspondance des comptes**.

**Écran Produits** : « 🛍️ Produits » dans le menu — créer / modifier / désactiver un produit fini (prix, poids, type de café consommé, emballages) et gérer les types de café produits par les machines.

**✏️ Modifier une saisie** : bouton **✎** sur les opérations de caisse, achats, ventes, ajustements et torréfactions — stocks, caisse et écritures liées sont recalculés automatiquement (aucun doublon). Employés, produits, types de café et immobilisations disposent déjà de leur bouton Modifier.

**Logo société** : Réglages → Société — les images lourdes sont **réduites automatiquement** ; le logo s'affiche dans l'app, les emails au boss et est **embarqué dans chaque export Excel** (haut de la première feuille).
| **Ventes** | Détail, synthèse par commerciale, par produit |
| **Paie** | Journal de paie mensuel + bulletins détaillés (CNPS, CMU, ITS, RICF, FDFP, coût employeur) |
| **Compte d'exploitation mensuel** | Écran **Exploitation** : résultat, ventes, achats consommés, charges par nature, personnel, annexes stocks + trésorerie. S'ouvre dans Excel **et** Google Sheets |
| **Design des fichiers** | Tous les exports Excel sont mis en forme automatiquement : bandeau de titre brun café, en-têtes de colonnes colorées et figées au défilement, lignes zébrées, totaux encadrés, nombres formatés — avec la signature « Réalisé par Doregoservices » en pied de chaque feuille |

Pour Sage : ouvrez le csv global `Sage_6_journaux_*.csv` (séparateur `;`), vérifiez la colonne **Compte** puis importez — chaque journal (VE, AC, CA, BQ, PA, OD) est déjà étiqueté et équilibré.

### 🏗️ Immobilisations et amortissements
Écran **Immobili.** : enregistrez vos équipements (torréfacteur, moulin, groupe électrogène, véhicules…) avec coût, valeur résiduelle et durée. L'application calcule la **dotation mensuelle** (amortissement linéaire), le cumulé et la **valeur nette comptable**, et déduit automatiquement l'amortissement dans le compte d'exploitation.

### 📈 Compte d'exploitation par grandes masses
Chaque mois, l'écran **Exploitation** présente :
- **Produits** : ventes + variation de stock de produits finis + variation du café transformé (semi-finis des machines)
- **Charges — 5 grandes masses** : ① achats consommés (café vert, emballages) ② services externes (loyer, transport, carburant, électricité, entretien, divers) ③ charges de personnel (bruts + CNPS patronal + CMU + FDFP) ④ impôts et taxes (patente, TOM…) ⑤ dotations aux amortissements
- **Résultat d'exploitation → − impôt sur les bénéfices (taux paramétrable, 25 % par défaut) → résultat net**
- **CAF / cash-flow** = résultat net + dotations (non décaissées)
- **Flux de trésorerie réel du mois** (encaissements − décaissements, OD direction isolées) et écart résultat ↔ trésorerie expliqué (créances, stocks, dotations)
- Chaque catégorie de dépense est **affectable à sa grande masse** dans Réglages → Correspondance des comptes.
- **🔬 Analyse par produit (comptabilité analytique)** : pour chaque produit — quantités vendues, CA, coût unitaire (recette café au coût semi-fini + emballages au CMP), coût vendu, **marge brute et % marge**, part du CA. Incluse dans le rapport mensuel Excel (feuille « Analyse produits ») et l'email au boss.

- **💰 Coût de revient complet** : les charges indirectes du mois (personnel, services, impôts, amortissements) sont réparties au prorata des unités produites → chaque produit affiche son coût de revient complet et sa **marge nette** (en plus de la marge brute matière), à l'écran et dans la feuille Excel « Analyse produits ».
### ⚙️ Machines de transformation (types de café)
Entre la torréfaction et le conditionnement, les **machines** (broyeur, moulin, assembleuse…) produisent les différents **types de café** :
1. **Réglages d'abord** : écran **Produits** → carte *Types de café transformés* → créez vos types (« Moulu premium », « Moulu standard », « Grains (non moulu) »…).
2. **Sur chaque produit fini**, choisissez le **type** et les **kg consommés par unité** (ex. sachet 1 kg → 1 kg de « Moulu premium » ; 500 g → 0,5 kg).
3. **Chaque jour/lot** : onglet **⚙️ Transformation** → kg torréfiés consommés par les machines + kg **réellement obtenus** par type. Perte et rendement machines s'affichent instantanément.
4. Le **conditionnement** n'a plus rien à peser : il déduit les types selon les recettes (et refuse si le stock d'un type est insuffisant) ; les **ajustements** acceptent aussi le niveau « Café transformé » pour les recomptes.
5. L'**exploitation** valorise ces semi-finis au coût moyen du vert consommé et leur variation entre dans les produits du mois ; l'export « Mouv. stocks » détaille vert → torréfié → types → produits finis.

### 🏷️ Emballages
Écran **Emballages** : articles (sachets, étiquettes, cartons…), achats (avec sortie de caisse automatique optionnelle), sorties/pertes, valeur du stock au coût moyen. Sur chaque **produit**, définissez la **nomenclature** (ex. 1 sachet + 1 étiquette par unité) : chaque conditionnement consomme alors les emballages **automatiquement**.

### 📤 Points quotidiens & rapport mensuel par email
- **Point quotidien** : dès que toutes les ventes d'une journée sont validées, le point part **automatiquement** sur l'email du boss (si configuré) : ventes par commerciale, encaissements, caisse du jour — avec fichier Excel joint.
- **Une commerciale en retard ?** Dans son formulaire, la date du point peut être changée (jusqu'à **7 jours en arrière**). Une nouvelle saisie pour une même journée **remplace** celle qui est encore en attente (jamais celle déjà validée — dans ce cas elle devient un « complément » à valider). Si un point déjà envoyé est complété, l'app vous le signale pour **renvoyer la version à jour**.
- **Fin de mois** : l'écran **Exploitation** génère le rapport mensuel (compte d'exploitation par grandes masses + cash-flow + immobilisations + mouvements de TOUS les stocks + ventes + caisse + paie) et l'envoie au boss. Un rappel s'affiche en début de mois tant qu'il n'est pas envoyé.

**Configuration de l'email (une seule fois)** — voir la section 6 bis ci-dessous.

---

## 6. Installer sur téléphone (PWA)

- **Android** (Chrome) : ouvrez l'adresse → menu ⋮ → **« Ajouter à l'écran d'accueil »** / **« Installer l'application »**.
- **iPhone** (Safari) : bouton Partager → **« Sur l'écran d'accueil »**.
- L'application s'ouvre ensuite plein écran, comme une vraie app, et **fonctionne hors-ligne** (les saisies des formulaires sont gardées sur le téléphone puis envoyées dès le retour du réseau).

---

## 6 bis. Activer l'envoi automatique des emails

1. Créez un compte gratuit sur [resend.com](https://resend.com) → copiez votre clé API (`re_...`). 100 emails/jour offerts — largement suffisant.
2. Supabase → **Edge Functions** → *New Function* → nom : **send-report** → collez le fichier `supabase/functions/send-report/index.ts` → **Deploy**.
3. Dans les **Secrets** de la fonction : `RESEND_API_KEY` (votre clé), `REPORT_KEY` (un mot de passe secret que vous choisissez), `EMAIL_FROM` (ex. `CafePro <onboarding@resend.dev>`).
4. Application → **Réglages → 📧 Envoi des rapports** : email du boss + le `REPORT_KEY` choisi → Enregistrer → **Envoyer un email de test**.

> Sans cette configuration, les boutons **« ✉️ Préparer l'email »** téléchargent le fichier Excel et ouvrent votre messagerie avec un brouillon prêt à envoyer.

**Dépannage (l'app affiche toujours la cause exacte)** :
- « fonction NON DÉPLOYÉE » → l'étape 2 (Edge Functions) n'a pas été faite ;
- « REPORT_KEY invalide » → le mot de passe diffère entre les Secrets Supabase et Réglages → 📧 ;
- « projet en pause » → les projets gratuits Supabase se mettent en pause après ~1 semaine d'inactivité : relancez-le (bouton *Restore*) dans la console Supabase ;
- **Réglages → 🔍 Vérifier la base** teste directement les 21 tables : si des tables manquent, il fournit le SQL de réparation tout prêt à copier-coller.

### 👥 Paie — taux Côte d'Ivoire en vigueur (réforme ITS du 1<sup>er</sup> janvier 2024)
Préconfigurés dans l'application (modifiables dans Réglages, **à faire valider par votre comptable**) :

| Prélèvement | Taux | Base / plafond |
|---|---|---|
| CNPS retraite (salarié) | 6,30 % | plafond 3 375 000 F/mois |
| CNPS retraite (employeur) | 7,70 % | idem |
| Prestations familiales (employeur) | 5,00 % | plafond 70 000 F |
| Maternité (employeur) | 0,75 % | plafond 70 000 F |
| Accidents du travail (employeur) | 2 à 5 % (indicate : 3 %) | plafond 70 000 F |
| CMU | 1 000 F/mois | 500 F salarié + 500 F employeur |
| FDFP (employeur) | TA 0,4 % + TFPC 1,2 % = 1,6 % | masse salariale |
| **ITS (DGI, sur le brut)** | 0 % ≤ 75 000 · 16 % ≤ 240 000 · 21 % ≤ 800 000 · 24 % ≤ 2,4 M · 28 % ≤ 8 M · 32 % au-delà | barème progressif mensuel |
| Réduction RICF | − 5 500 F par demi-part (plafond 44 000 F) | demi-parts par employé (fiche employé) |

Déductions déclaratives : bordereau CNPS mensuel, reversement ITS à la DGI (avant le 10), **DISA** (CNPS) et **État 301** (DGI) en fin d'année.

## 7. Bon à savoir

- **Mobile Money** : deux caisses suivies en parallèle (Espèces / MoMo). Les transferts avec le patron sont tracés mais tagués **non imputables** — ils partent dans la feuille OD, prêts à être traités en virement interne (58x) si votre comptable le souhaite.
- **Ventes à crédit** : lors d'une vente, choisissez « À crédit » + nom du client. L'écran **Impayés** liste les créances avec un bouton **Encaisser**.
- **Compte d'exploitation** : méthode des achats consommés (SI + achats − SF au coût moyen pondéré) ; produits finis valorisés au coût matière ; opérations OD avec la direction exclues du résultat.
- **Sauvegarde** : écran Exports → **Sauvegarde complète (JSON)** — à faire régulièrement (ou laissez Supabase gérer vos données en ligne).
- **Réinitialiser la démo** : Réglages → zone sensible (n'efface pas les données Supabase).

**Répartition conseillée des rôles** : les commerciales et l'atelier saisissent via leurs liens ; le caissier via le lien caisse ou l'app ; **vous seul validez** et gérez paie/exports.

## 8. Version 4 — Exploitation détaillée, rôles, QR codes

### Personnel : le détail dans le tableau d'exploitation
Quand la paie du mois est clôturée, la masse « Personnel » affiche ligne par ligne :
**salaires bruts** → (mémo, inclus dans le brut) **CNPS salarié**, **CMU salarié**, **ITS salarié**, **= salaires nets versés**, **dont primes et bonus** → puis les charges ajoutées : **CNPS patronal** (retraite + PF + maternité + AT + CMU employeur) et **FDFP patronal**. Tout sort directement des bulletins de paie officiellement calculés.

### Impôts et taxes : patente, TEE, ITS reconnus automatiquement
Les sorties de caisse de la catégorie Impôts et taxes sont ventilées selon le libellé : écrivez « Patente … », « TEE … » ou « ITS … » dans l'opération de caisse et la ligne correspondante apparaît dans l'exploitation. Les autres libellés restent groupés.

### Créer vos propres lignes
Dans l'écran Exploitation, chaque masse Personnel et Impôts et taxes a un bouton **＋ Créer une ligne** (gestionnaire uniquement) : libellé + montant, valable pour le mois affiché (ex. « ITS patronal », « TEOM », « Prime exceptionnelle »). Les lignes créées sont marquées « ligne créée », s'ajoutent au total de la masse, se supprinent d'un clic (✕) et partent dans l'Excel mensuel.

### Comparatif 12 mois
En bas de l'écran Exploitation : graphique en barres (bleu = ventes, vert = résultat net) + tableau des 12 derniers mois (ventes, résultat net, CAF, flux de trésorerie), mois courant surligné. Également une feuille **« 12 mois »** dans l'Excel mensuel (avec ligne TOTAL) et un tableau récapitulatif dans l'email au boss.

### Comptes à accès restreint (Réglages → Comptes à accès restreint)
- **Caissier** : Accueil + Caisse. **Chef commercial** : Accueil, Ventes, Commerciaux, Impayés, Produits. **Chef production** : Accueil, Achats vert, Production, Produits, Emballages, Immobilisations. **Gestionnaire (PIN principal)** : tout.
- Chaque compte a son **code PIN personnel** (mode local) ; en mode Supabase, on peut lier un e-mail au profil. La navigation et l'accès direct par URL sont filtrés ; les écrans financiers (paie, exploitation, exports, réglages) restent réservés au gestionnaire.

### QR codes
Les fenêtres « Lien de … » (commerciales, production, caisse) affichent un **QR code** du lien : la personne scanne avec sa caméra, sans retaper l'adresse. Génération intégrée (librairie QR intégrée à l'app, aucune connexion requise).

## 9. Revue complète (limites, années, données)

**Aucune limite d'années** : les mois sont gérés par calcul pur (janvier − 1 = décembre de l'année précédente, etc.), testé de 1998 à 2100. Ventes, exploitations mensuelles, comparatifs 12 mois et amortissements longue durée (ex. 8 ans = 96 mois soldés automatiquement) fonctionnent sur n'importe quel horizon.

**Sauvegarde & restauration** (écran Exports → Divers) : la sauvegarde JSON couvre les **19 tables** (stocks, ventes, caisse, paie, emballages, immobilisations, liens, réglages, journal des envois). Le bouton **♻️ Restaurer une sauvegarde** relit un fichier : les éléments déjà présents (même id) ne sont pas dupliqués, les réglages sont remplacés — pratique pour changer de téléphone ou repartir d'une copie.

**Performance** : les données sont lues une seule fois par affissage puis réutilisées (le comparatif 12 mois faisait ~200 lectures, il en fait ~7) ; toute écriture rafraîchit immédiatement le cache.

**Limites pratiques connues** (sans impact pour un usage normal) :
- Mode local uniquement : le stockage du navigateur (~5 Mo) peut saturer après plusieurs années — d'où l'intérêt du mode en ligne Supabase (sans limite) et des sauvegardes régulières ;
- Taux de paie (barème ITS 2024, CNPS…) modifiables dans Réglages — pensez à les ajuster si la Loi de Finances change ;
- Les gros montants sont formatés jusqu'aux milliards de FCFA sans perte de précision.

## 10. Confort d'utilisation (mobile d'abord)

- **Barre d'onglets en bas (téléphone)** : les 4 écrans principaux de votre rôle + bouton **Menu** (tous les écrans autorisés). Sur ordinateur, la navigation reste en haut.
- **Actions rapides sur l'accueil** : gros boutons *Vendre · Acheter du vert · Caisse · Produire* — adaptés au profil connecté (le caissier ne voit que Caisse, le chef production Produire, etc.).
- **Clavier numérique automatique** sur tous les champs de montants et quantités (saisie FCFA plus rapide, moins d'erreurs).
- **Indicateur « 📡 Hors ligne »** dès que la connexion coupe (reprise automatique à la reconnexion) ; le bouton **📥 Installer** apparaît quand le téléphone propose d'installer l'application.
- **Menu par rôle** : chaque profil ne voit que ses écrans, partout (barre du haut, onglets du bas, menu).
