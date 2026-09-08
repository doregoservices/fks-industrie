-- ══════════════════════════════════════════════════════════════════
-- CAFÉPRO — ENVOIS AUTOMATIQUES AU BOSS (pg_cron) — VERSION PRÊTE
-- Point quotidien : tous les jours à 22h00 (heure de Côte d'Ivoire)
-- Rapport mensuel : le 3 de chaque mois à 10h00 (mois précédent)
--
-- ⚠️ UNE SEULE CHOSE À FAIRE AVANT DE COLLER :
--   Remplacez COLLEZ-VOTRE-CLE-ANON par la clé « anon (publique) » de
--   votre projet. Pour la trouver : ouvrez l'app → ⚙️ Réglages →
--   🔌 Connexion Supabase → champ « Clé anon (publique) » → copiez-la
--   (elle commence par eyJ...). C'est la même clé que celle de l'app :
--   elle est publique par conception, aucun risque à la coller ici.
--
-- PUIS : Supabase (supabase.com → votre projet pyfbczuxcqcyebwnghqi)
--   → menu SQL Editor → New query → collez TOUT ce fichier → Run.
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
  headers := jsonb_build_object('Content-Type','application/json','apikey','COLLEZ-VOTRE-CLE-ANON','x-report-key','fks-skicsJwZNZc15Kcu'),
  body    := jsonb_build_object('mode','daily')
);
$$);

-- ── Rapport mensuel le 3 à 10h00 ──
select cron.schedule('fks-rapport-mensuel', '0 10 3 * *', $$
select net.http_post(
  request := 'https://pyfbczuxcqcyebwnghqi.supabase.co/functions/v1/send-report',
  headers := jsonb_build_object('Content-Type','application/json','apikey','COLLEZ-VOTRE-CLE-ANON','x-report-key','fks-skicsJwZNZc15Kcu'),
  body    := jsonb_build_object('mode','monthly')
);
$$);

-- Vérification : les 2 tâches doivent être listées avec active = true
select jobname, schedule, active from cron.job;
