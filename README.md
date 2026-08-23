# ☕ FKS Industrie — Gestion d'usine de café (Côte d'Ivoire)

Application web **installable (PWA)** : achats de café vert → torréfaction → conditionnement → ventes, caisse (Espèces + Mobile Money), paie ivoirienne officielle, compte d'exploitation mensuel, exports Excel/Sage 100, rapports par email.

**Aucun serveur requis pour fonctionner** : l'application complète tient dans `index.html` (+ icônes). Fonctionne hors ligne ; les données restent sur l'appareil (mode local) ou sur **Supabase** (mode en ligne, multi-appareils).

## 🚀 Mise en ligne (GitHub Pages)

1. Ce dépôt est en ligne : **Settings → Pages → Source : Deploy from a branch → branche `main`, dossier `/ (root)` → Save**.
2. Attendez ~1 minute. L'application est disponible à l'adresse :
   `https://<votre-nom-utilisateur>.github.io/<nom-du-dépôt>/`
3. Ouvrez ce lien sur un téléphone → menu du navigateur → **« Ajouter à l'écran d'accueil »** : l'appli s'installe comme une vraie application (icône, plein écran, hors ligne).

## 🔌 Passage en mode en ligne (Supabase, facultatif mais recommandé)

1. Créez un projet sur [supabase.com](https://supabase.com) (gratuit).
2. **SQL Editor** → collez le contenu de [`schema.sql`](schema.sql) → exécutez (19 tables + sécurité RLS).
3. Dans l'application : bouton **🔌 Connexion Supabase** (écran de connexion) → collez l'URL du projet et la clé `anon` (Settings → API).
4. Créez un utilisateur dans **Authentication → Users** (e-mail + mot de passe), puis connectez-vous.
5. (Facultatif) Emails au boss avec pièce jointe : déployez la fonction [`supabase/functions/send-report`](supabase/functions/send-report/index.ts) et définissez les secrets `RESEND_API_KEY`, `REPORT_KEY`, `EMAIL_FROM`.

Le premier compte connecté devient le gestionnaire ; les comptes restreints (caissier, chef commercial, chef production) se créent dans **Réglages → Comptes à accès restreint**.

## 📁 Contenu du dépôt

| Fichier | Rôle |
|---|---|
| `index.html` | **L'application complète** (une seule page, autonome) |
| `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png` | Installation PWA + fonctionnement hors ligne |
| `schema.sql` | Base de données Supabase (19 tables) |
| `supabase/functions/send-report/` | Fonction d'envoi des rapports par email (Resend) |
| `WORKFLOWS.md` | **Le workflow complet à tous les niveaux** (terrain → validation → mensuel) |
| `GUIDE.md` | Guide d'utilisation écran par écran |
| `SPECIFICATIONS.md` | Spécifications techniques et historique des versions |
| `tests/` | Suites de tests automatisés (103 contrôles) |

## 📖 Documentation

- **Par où commencer** : lisez [`WORKFLOWS.md`](WORKFLOWS.md) — le parcours de chaque acteur, du terrain au rapport mensuel.
- Démonstration intégrée : bouton « ☕ Essayer avec les données de démonstration » sur l'écran de connexion.

## ⚖️ Licence & crédits

Code applicatif : réalisé pour FKS Industrie. Génération de QR codes : bibliothèque [QR Code Generator](https://www.nayuki.io/page/qr-code-generator-library) de Project Nayuki (MIT), incluse dans `index.html`.
