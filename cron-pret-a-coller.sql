-- ══════════════════════════════════════════════════════════════════
-- CAFÉPRO — ENVOIS AUTOMATIQUES AU BOSS (pg_cron) — VERSION PRÊTE
-- Point quotidien : tous les jours à 22h00 (heure de Côte d'Ivoire)
-- Rapport mensuel : le 3 de chaque mois à 10h00 (mois précédent)
--
-- ⚠️ DEUX CHOSES À FAIRE AVANT DE COLLER (aucune clé vraie ne doit vivre
--    dans ce dépôt public — prenez-les dans l'APP, pas dans un fichier) :
--   1. COLLEZ-VOTRE-CLE-ANON → la clé « anon (publique) » du projet :
--      app → ⚙️ Réglages → 🔌 Connexion Supabase → champ « Clé anon »
--      (elle commence par eyJ... — publique par conception).
--   2. COLLEZ-VOTRE-CLE-ENVOI → la clé d'envoi des rapports :
--      app → ⚙️ Réglages → 📧 Envoi des rapports → champ « Clé d'envoi
--      (REPORT_KEY) ».
--
-- PUIS : Supabase (supabase.com → votre projet pyfbczuxcqcyebwnghqi)
--   → menu SQL Editor → New query → collez TOUT ce fichier → Run.
--
-- ⚠️ FONCTION REQUISE (v2) : ce cron appelle la fonction « send-report » avec
--    mode=daily / mode=monthly. Si vous l'avez déployée AVANT le 10/09/2026,
--    recollez d'abord la nouvelle version (dépôt → supabase/functions/send-report/)
--    : l'ancienne version rejetait les appels du cron (aucun envoi possible).
-- POUR CHANGER L'HEURE (minutes possibles) : remplacez '0 22 * * *' par
--    exemple par '30 13 * * *' (= 13h30) ou '45 15 * * *' (= 15h45),
--    recollez tout ce fichier, attendez l'heure… puis recollez-le TEL QUEL
--    pour revenir à 22h00. L'heure de l'APP (Réglages → 📧) est indépendante
--    et n'agit que si l'app est ouverte ; ce cron envoie seul, app fermée.
--   Réponse attendue : 2 lignes « fks-point-quotidien » et
--   « fks-rapport-mensuel » avec active = true.
--   Rejouable sans risque (les versions précédentes sont remplacées).
-- ══════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('fks-point-quotidien') where exists (select 1 from cron.job where jobname='fks-point-quotidien');
select cron.unschedule('fks-rapport-mensuel')  where exists (select 1 from cron.job where jobname='fks-rapport-mensuel');

-- ── Point quotidien à 22h00 (heure du serveur = heure CI, GMT+0) ──
select cron.schedule('fks-point-quotidien', '0 22 * * *', $$
select net.http_post(
  request := 'https://pyfbczuxcqcyebwnghqi.supabase.co/functions/v1/send-report',
  headers := jsonb_build_object('Content-Type','application/json','apikey','COLLEZ-VOTRE-CLE-ANON','x-report-key','COLLEZ-VOTRE-CLE-ENVOI'),
  body    := jsonb_build_object('mode','daily')
);
$$);

-- ── Rapport mensuel le 3 à 10h00 ──
select cron.schedule('fks-rapport-mensuel', '0 10 3 * *', $$
select net.http_post(
  request := 'https://pyfbczuxcqcyebwnghqi.supabase.co/functions/v1/send-report',
  headers := jsonb_build_object('Content-Type','application/json','apikey','COLLEZ-VOTRE-CLE-ANON','x-report-key','COLLEZ-VOTRE-CLE-ENVOI'),
  body    := jsonb_build_object('mode','monthly')
);
$$);

-- Vérification : les 2 tâches doivent être listées avec active = true
select jobname, schedule, active from cron.job;
