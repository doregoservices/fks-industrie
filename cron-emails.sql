-- ══════════════════════════════════════════════════════════════════
-- CAFÉPRO — ENVOIS AUTOMATIQUES AU BOSS (pg_cron)
--   • Point quotidien : TOUS LES JOURS à 22h00 (heure de Côte d'Ivoire)
--     → part même si des commerciales n'ont pas envoyé ; l'email liste
--       les commerciales manquantes. Anti-doublon : si le point était
--       déjà parti (tout validé plus tôt), le 22h ne renvoie rien.
--   • Rapport mensuel : le 3 de chaque mois à 10h00 (mois précédent)
--   • Envoi manuel avant l'heure : toujours possible depuis l'app.
--
-- PRÉREQUIS (une seule fois) :
--   1. Edge Function « send-report » déployée en v2 (fournie)
--   2. Secrets de la fonction : BOSS_EMAIL + SUPABASE_SERVICE_ROLE_KEY
--      (en plus de RESEND_API_KEY, REPORT_KEY, EMAIL_FROM déjà en place)
--
-- À coller dans Supabase → SQL Editor → Run. Rejouable sans risque.
--
-- ⚠️ Remplacez COLLEZ-VOTRE-REPORT-KEY par votre clé d'envoi (le « REPORT_KEY »
-- des secrets de la fonction) AVANT de lancer. Ne committez jamais la vraie clé
-- (ce fichier vit dans un dépôt public).
-- ══════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Nettoyage des versions précédentes éventuelles (sans erreur si absentes)
select cron.unschedule('fks-point-quotidien') where exists (select 1 from cron.job where jobname='fks-point-quotidien');
select cron.unschedule('fks-rapport-mensuel')  where exists (select 1 from cron.job where jobname='fks-rapport-mensuel');

-- ── Point quotidien à 22h00 (l'heure du serveur = heure CI, GMT+0) ──
select cron.schedule('fks-point-quotidien', '0 22 * * *', $$
select net.http_post(
  request := 'https://pyfbczuxcqcyebwnghqi.supabase.co/functions/v1/send-report',
  headers := jsonb_build_object('Content-Type','application/json','x-report-key','COLLEZ-VOTRE-REPORT-KEY'),
  body    := jsonb_build_object('mode','daily')
);
$$);

-- ── Rapport mensuel le 3 à 10h00 ──
select cron.schedule('fks-rapport-mensuel', '0 10 3 * *', $$
select net.http_post(
  request := 'https://pyfbczuxcqcyebwnghqi.supabase.co/functions/v1/send-report',
  headers := jsonb_build_object('Content-Type','application/json','x-report-key','COLLEZ-VOTRE-REPORT-KEY'),
  body    := jsonb_build_object('mode','monthly')
);
$$);

-- Vérification : lister les tâches programmées
select jobname, schedule, active from cron.job;
