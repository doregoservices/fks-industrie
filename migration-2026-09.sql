-- ══════════════════════════════════════════════════════════════════
-- MIGRATION v35.3 — Supabase SQL Editor → Run
-- Matricule employé saisisable à l'enregistrement + transport au prorata des absences
-- Sûr : alter add column IF NOT EXISTS uniquement — aucune donnée perdue.
-- ══════════════════════════════════════════════════════════════════

alter table employees add column if not exists matricule text;
alter table pay_slips add column if not exists matricule text;
alter table pay_slips add column if not exists transport_full numeric default 0;
