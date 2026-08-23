-- ============================================================
-- CaféPro — Schéma Supabase (à exécuter dans SQL Editor)
-- Copiez tout ce fichier, collez-le dans Supabase → SQL Editor → Run
-- ============================================================

create table if not exists settings(
  key text primary key,
  value text
);
create table if not exists products(
  id text primary key,
  created_at timestamptz default now(),
  name text not null,
  weight_g numeric default 0,
  unit text default 'sachet',
  price numeric default 0,
  alert_min numeric default 0,
  active boolean default true
);
create table if not exists purchases(
  id text primary key,
  created_at timestamptz default now(),
  date date not null,
  supplier text,
  qty_kg numeric not null,
  price_per_kg numeric default 0,
  amount numeric default 0,
  pay_method text default 'cash',
  note text
);
create table if not exists roastings(
  id text primary key,
  created_at timestamptz default now(),
  date date not null,
  green_in numeric not null,
  roasted_out numeric not null,
  operator text,
  note text,
  source text default 'admin'
);
create table if not exists productions(
  id text primary key,
  created_at timestamptz default now(),
  date date not null,
  roasted_used numeric not null,
  lines jsonb default '[]',
  operator text,
  note text,
  source text default 'admin'
);
create table if not exists adjustments(
  id text primary key,
  created_at timestamptz default now(),
  date date not null,
  level text not null,            -- green | roasted | product
  product_id text,
  name text,
  qty numeric not null,
  reason text
);
create table if not exists sales_agents(
  id text primary key,
  created_at timestamptz default now(),
  name text not null,
  phone text,
  token text unique not null,
  active boolean default true
);
create table if not exists sales(
  id text primary key,
  created_at timestamptz default now(),
  date date not null,
  agent_id text,
  agent_name text,
  pay_mode text default 'cash',   -- cash | momo | credit
  client text,
  total numeric default 0,
  lines jsonb default '[]',
  source text default 'admin',
  status text default 'validated',
  credit_status text default 'paid',
  paid_date date
);
create table if not exists cash_entries(
  id text primary key,
  created_at timestamptz default now(),
  date date not null,
  type text not null,             -- in | out
  account text default 'cash',    -- cash | momo
  category text,
  label text,
  amount numeric not null,
  imputable boolean default true,
  od text,                        -- transfer | funding (direction)
  ref text,
  source text default 'admin',
  status text default 'validated'
);
create table if not exists employees(
  id text primary key,
  created_at timestamptz default now(),
  name text not null,
  position text,
  phone text,
  hire_date date,
  salary_type text default 'monthly',
  base_salary numeric default 0,
  transport numeric default 0,
  housing numeric default 0,
  active boolean default true
);
create table if not exists advances(
  id text primary key,
  created_at timestamptz default now(),
  employee_id text,
  employee_name text,
  date date not null,
  amount numeric not null,
  note text,
  run_id text
);
create table if not exists pay_runs(
  id text primary key,
  created_at timestamptz default now(),
  period text not null,           -- YYYY-MM
  status text default 'open',
  paid_date date,
  account text,
  total_net numeric default 0
);
create table if not exists pay_slips(
  id text primary key,
  created_at timestamptz default now(),
  run_id text not null,
  run_period text,
  employee_id text,
  employee_name text,
  position text,
  base numeric default 0,
  transport numeric default 0,
  housing numeric default 0,
  bonus numeric default 0,
  ot_hours numeric default 0,
  absence_days numeric default 0,
  abs_ded numeric default 0,
  brut_ap numeric default 0,
  cnps_base numeric default 0,
  cnps numeric default 0,
  taxable numeric default 0,
  irpp numeric default 0,
  other numeric default 0,
  advances numeric default 0,
  net numeric default 0,
  cnps_employer numeric default 0,
  paid boolean default false
);
create table if not exists pending_entries(
  id text primary key,
  created_at timestamptz default now(),
  source_type text not null,      -- sales | roasting | production | caisse
  source_name text,
  payload jsonb,
  status text default 'pending',
  reviewed_at timestamptz
);
create table if not exists form_tokens(
  id text primary key,
  created_at timestamptz default now(),
  type text not null,             -- production | caisse
  name text,
  token text unique not null,
  active boolean default true
);

create table if not exists packaging_items(
  id text primary key,
  created_at timestamptz default now(),
  name text not null,
  unit text default 'unité',
  alert_min numeric default 0,
  active boolean default true
);
create table if not exists packaging_entries(
  id text primary key,
  created_at timestamptz default now(),
  date date not null,
  type text not null,             -- in | out
  qty numeric not null,
  unit_cost numeric default 0,
  amount numeric default 0,
  reason text,
  ref text,
  item_id text,
  item_name text,
  source text default 'admin',
  status text default 'validated'
);
create table if not exists assets(
  id text primary key,
  created_at timestamptz default now(),
  name text not null,
  category text,
  acq_date date,
  cost numeric default 0,
  salvage numeric default 0,
  life_years numeric default 5,
  active boolean default true,
  note text
);
create table if not exists email_log(
  id text primary key,
  created_at timestamptz default now(),
  kind text not null,             -- daily | monthly
  ref text,                       -- date (YYYY-MM-DD) ou période (YYYY-MM)
  sent_at timestamptz,
  status text,                    -- sent | failed | update_pending
  detail text
);
alter table products add column if not exists packaging jsonb default '[]';
alter table employees add column if not exists tax_shares numeric default 2;
alter table pay_slips add column if not exists its_gross numeric default 0;
alter table pay_slips add column if not exists ricf numeric default 0;
alter table pay_slips add column if not exists its numeric default 0;
alter table pay_slips add column if not exists cmu numeric default 0;
alter table pay_slips add column if not exists cnps_er numeric default 0;
alter table pay_slips add column if not exists pf numeric default 0;
alter table pay_slips add column if not exists mat numeric default 0;
alter table pay_slips add column if not exists at numeric default 0;
alter table pay_slips add column if not exists cmu_er numeric default 0;
alter table pay_slips add column if not exists fdfp numeric default 0;
alter table pay_slips add column if not exists cout_employeur numeric default 0;

-- ============================================================
-- Sécurité RLS
-- ============================================================
alter table settings        enable row level security;
alter table products        enable row level security;
alter table purchases       enable row level security;
alter table roastings       enable row level security;
alter table productions     enable row level security;
alter table adjustments     enable row level security;
alter table sales_agents    enable row level security;
alter table sales           enable row level security;
alter table cash_entries    enable row level security;
alter table employees       enable row level security;
alter table advances        enable row level security;
alter table pay_runs        enable row level security;
alter table pay_slips       enable row level security;
alter table pending_entries enable row level security;
alter table form_tokens     enable row level security;
alter table packaging_items enable row level security;
alter table packaging_entries enable row level security;
alter table email_log       enable row level security;
alter table assets          enable row level security;

-- Le gestionnaire connecté a tous les droits
do $$
declare t text;
begin
  foreach t in array array['settings','products','purchases','roastings','productions','adjustments','sales_agents','sales','cash_entries','employees','advances','pay_runs','pay_slips','pending_entries','form_tokens','packaging_items','packaging_entries','email_log','assets']
  loop
    execute format('drop policy if exists "gestionnaire_full" on %I;', t);
    execute format('create policy "gestionnaire_full" on %I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- Formulaires publics (sans compte) : inscription dans la file + consultation minimale
drop policy if exists "form_insert" on pending_entries;
create policy "form_insert" on pending_entries
  for insert to anon with check (status = 'pending');

drop policy if exists "form_products" on products;
create policy "form_products" on products
  for select to anon using (active = true);

drop policy if exists "form_agents" on sales_agents;
create policy "form_agents" on sales_agents
  for select to anon using (true);

drop policy if exists "form_tokens_select" on form_tokens;
create policy "form_tokens_select" on form_tokens
  for select to anon using (true);

-- ============================================================
-- Données de départ : les 5 produits
-- ============================================================
insert into products(id, name, weight_g, price, alert_min, active) values
  ('prod-moulu-1kg',    'Café moulu 1 kg',                      1000, 8000, 20, true),
  ('prod-moulu-500g',   'Café moulu 500 g',                      500, 4500, 20, true),
  ('prod-grain-1kg',    'Café grain 1 kg',                      1000, 9000, 20, true),
  ('prod-gingembre',    'Café saveur gingembre 500 g',           500, 5000, 20, true),
  ('prod-poivre-guinee','Café saveur poivre de Guinée 500 g',    500, 5000, 20, true)
on conflict (id) do nothing;

insert into settings(key, value) values
  ('company',    '{"name":"FKS Industrie","logo":""}'),
  ('journal_code','"CA"')
on conflict (key) do nothing;
