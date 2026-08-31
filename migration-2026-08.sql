-- ══════════════════════════════════════════════════════════════════
-- MIGRATION COMPLÈTE FKS Industrie v3 — Supabase SQL Editor → Run
-- Sûr : create/alter IF NOT EXISTS uniquement — aucune donnée perdue.
-- Corrige : purchases.status, roastings.estimated, pay_slips (11 col paie).
-- ══════════════════════════════════════════════════════════════════

create table if not exists settings(
  key text primary key,
  value text
);
alter table settings add column if not exists key text;
alter table settings add column if not exists value text;

create table if not exists products(
  id text primary key,
  created_at timestamptz default now(),
  name text not null,
  weight_g numeric default 0,
  unit text default 'sachet',
  price numeric default 0,
  alert_min numeric default 0,
  active boolean default true,
  packaging jsonb,
  type_id text,
  type_name text,
  type_kg numeric,
  recipes jsonb
);
alter table products add column if not exists id text;
alter table products add column if not exists created_at timestamptz;
alter table products add column if not exists name text;
alter table products add column if not exists weight_g numeric;
alter table products add column if not exists unit text;
alter table products add column if not exists price numeric;
alter table products add column if not exists alert_min numeric;
alter table products add column if not exists active boolean;
alter table products add column if not exists packaging jsonb;
alter table products add column if not exists type_id text;
alter table products add column if not exists type_name text;
alter table products add column if not exists type_kg numeric;
alter table products add column if not exists recipes jsonb;

create table if not exists purchases(
  id text primary key,
  created_at timestamptz default now(),
  date date not null,
  supplier text,
  qty_kg numeric not null,
  price_per_kg numeric default 0,
  amount numeric default 0,
  pay_method text default 'cash',
  status text default 'validated',
  note text
);
alter table purchases add column if not exists id text;
alter table purchases add column if not exists created_at timestamptz;
alter table purchases add column if not exists date date;
alter table purchases add column if not exists supplier text;
alter table purchases add column if not exists qty_kg numeric;
alter table purchases add column if not exists price_per_kg numeric;
alter table purchases add column if not exists amount numeric;
alter table purchases add column if not exists pay_method text;
alter table purchases add column if not exists status text;
alter table purchases add column if not exists note text;

create table if not exists coffee_types(
  id text primary key,
  created_at timestamptz default now(),
  name text not null,
  alert_min numeric default 0,
  active boolean default true
);
alter table coffee_types add column if not exists id text;
alter table coffee_types add column if not exists created_at timestamptz;
alter table coffee_types add column if not exists name text;
alter table coffee_types add column if not exists alert_min numeric;
alter table coffee_types add column if not exists active boolean;

create table if not exists transformations(
  id text primary key,
  created_at timestamptz default now(),
  date date not null,
  roasted_used numeric not null,
  lines jsonb default '[]',
  operator text,
  note text,
  source text,
  status text default 'validated'
);
alter table transformations add column if not exists id text;
alter table transformations add column if not exists created_at timestamptz;
alter table transformations add column if not exists date date;
alter table transformations add column if not exists roasted_used numeric;
alter table transformations add column if not exists lines jsonb;
alter table transformations add column if not exists operator text;
alter table transformations add column if not exists note text;
alter table transformations add column if not exists source text;
alter table transformations add column if not exists status text;

create table if not exists roastings(
  id text primary key,
  created_at timestamptz default now(),
  date date not null,
  green_in numeric not null,
  roasted_out numeric not null,
  estimated boolean default false,
  operator text,
  note text,
  source text default 'admin'
);
alter table roastings add column if not exists id text;
alter table roastings add column if not exists created_at timestamptz;
alter table roastings add column if not exists date date;
alter table roastings add column if not exists green_in numeric;
alter table roastings add column if not exists roasted_out numeric;
alter table roastings add column if not exists estimated boolean;
alter table roastings add column if not exists operator text;
alter table roastings add column if not exists note text;
alter table roastings add column if not exists source text;

create table if not exists productions(
  id text primary key,
  created_at timestamptz default now(),
  date date not null,
  roasted_used numeric not null,
  lines jsonb default '[]',
  type_lines jsonb,
  operator text,
  note text,
  source text default 'admin'
);
alter table productions add column if not exists id text;
alter table productions add column if not exists created_at timestamptz;
alter table productions add column if not exists date date;
alter table productions add column if not exists roasted_used numeric;
alter table productions add column if not exists lines jsonb;
alter table productions add column if not exists type_lines jsonb;
alter table productions add column if not exists operator text;
alter table productions add column if not exists note text;
alter table productions add column if not exists source text;

create table if not exists adjustments(
  id text primary key,
  created_at timestamptz default now(),
  date date not null,
  level text not null,            -- green | roasted | product
  product_id text,
  name text,
  qty numeric not null,
  reason text,
  type_id text
);
alter table adjustments add column if not exists id text;
alter table adjustments add column if not exists created_at timestamptz;
alter table adjustments add column if not exists date date;
alter table adjustments add column if not exists level text;
alter table adjustments add column if not exists product_id text;
alter table adjustments add column if not exists name text;
alter table adjustments add column if not exists qty numeric;
alter table adjustments add column if not exists reason text;
alter table adjustments add column if not exists type_id text;

create table if not exists sales_agents(
  id text primary key,
  created_at timestamptz default now(),
  name text not null,
  phone text,
  token text unique not null,
  active boolean default true
);
alter table sales_agents add column if not exists id text;
alter table sales_agents add column if not exists created_at timestamptz;
alter table sales_agents add column if not exists name text;
alter table sales_agents add column if not exists phone text;
alter table sales_agents add column if not exists token text unique;
alter table sales_agents add column if not exists active boolean;

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
alter table sales add column if not exists id text;
alter table sales add column if not exists created_at timestamptz;
alter table sales add column if not exists date date;
alter table sales add column if not exists agent_id text;
alter table sales add column if not exists agent_name text;
alter table sales add column if not exists pay_mode text;
alter table sales add column if not exists client text;
alter table sales add column if not exists total numeric;
alter table sales add column if not exists lines jsonb;
alter table sales add column if not exists source text;
alter table sales add column if not exists status text;
alter table sales add column if not exists credit_status text;
alter table sales add column if not exists paid_date date;

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
alter table cash_entries add column if not exists id text;
alter table cash_entries add column if not exists created_at timestamptz;
alter table cash_entries add column if not exists date date;
alter table cash_entries add column if not exists type text;
alter table cash_entries add column if not exists account text;
alter table cash_entries add column if not exists category text;
alter table cash_entries add column if not exists label text;
alter table cash_entries add column if not exists amount numeric;
alter table cash_entries add column if not exists imputable boolean;
alter table cash_entries add column if not exists od text;
alter table cash_entries add column if not exists ref text;
alter table cash_entries add column if not exists source text;
alter table cash_entries add column if not exists status text;

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
alter table employees add column if not exists id text;
alter table employees add column if not exists created_at timestamptz;
alter table employees add column if not exists name text;
alter table employees add column if not exists position text;
alter table employees add column if not exists phone text;
alter table employees add column if not exists hire_date date;
alter table employees add column if not exists salary_type text;
alter table employees add column if not exists base_salary numeric;
alter table employees add column if not exists transport numeric;
alter table employees add column if not exists housing numeric;
alter table employees add column if not exists active boolean;

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
alter table advances add column if not exists id text;
alter table advances add column if not exists created_at timestamptz;
alter table advances add column if not exists employee_id text;
alter table advances add column if not exists employee_name text;
alter table advances add column if not exists date date;
alter table advances add column if not exists amount numeric;
alter table advances add column if not exists note text;
alter table advances add column if not exists run_id text;

create table if not exists pay_runs(
  id text primary key,
  created_at timestamptz default now(),
  period text not null,           -- YYYY-MM
  status text default 'open',
  paid_date date,
  account text,
  total_net numeric default 0
);
alter table pay_runs add column if not exists id text;
alter table pay_runs add column if not exists created_at timestamptz;
alter table pay_runs add column if not exists period text;
alter table pay_runs add column if not exists status text;
alter table pay_runs add column if not exists paid_date date;
alter table pay_runs add column if not exists account text;
alter table pay_runs add column if not exists total_net numeric;

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
  its_gross numeric default 0,
  its numeric default 0,
  ricf numeric default 0,
  cmu numeric default 0,
  cmu_er numeric default 0,
  cnps_er numeric default 0,
  pf numeric default 0,
  mat numeric default 0,
  at numeric default 0,
  fdfp numeric default 0,
  cout_employeur numeric default 0,
  paid boolean default false
);
alter table pay_slips add column if not exists id text;
alter table pay_slips add column if not exists created_at timestamptz;
alter table pay_slips add column if not exists run_id text;
alter table pay_slips add column if not exists run_period text;
alter table pay_slips add column if not exists employee_id text;
alter table pay_slips add column if not exists employee_name text;
alter table pay_slips add column if not exists position text;
alter table pay_slips add column if not exists base numeric;
alter table pay_slips add column if not exists transport numeric;
alter table pay_slips add column if not exists housing numeric;
alter table pay_slips add column if not exists bonus numeric;
alter table pay_slips add column if not exists ot_hours numeric;
alter table pay_slips add column if not exists absence_days numeric;
alter table pay_slips add column if not exists abs_ded numeric;
alter table pay_slips add column if not exists brut_ap numeric;
alter table pay_slips add column if not exists cnps_base numeric;
alter table pay_slips add column if not exists cnps numeric;
alter table pay_slips add column if not exists taxable numeric;
alter table pay_slips add column if not exists irpp numeric;
alter table pay_slips add column if not exists other numeric;
alter table pay_slips add column if not exists advances numeric;
alter table pay_slips add column if not exists net numeric;
alter table pay_slips add column if not exists cnps_employer numeric;
alter table pay_slips add column if not exists its_gross numeric;
alter table pay_slips add column if not exists its numeric;
alter table pay_slips add column if not exists ricf numeric;
alter table pay_slips add column if not exists cmu numeric;
alter table pay_slips add column if not exists cmu_er numeric;
alter table pay_slips add column if not exists cnps_er numeric;
alter table pay_slips add column if not exists pf numeric;
alter table pay_slips add column if not exists mat numeric;
alter table pay_slips add column if not exists at numeric;
alter table pay_slips add column if not exists fdfp numeric;
alter table pay_slips add column if not exists cout_employeur numeric;
alter table pay_slips add column if not exists paid boolean;

create table if not exists pending_entries(
  id text primary key,
  created_at timestamptz default now(),
  source_type text not null,      -- sales | roasting | production | caisse
  source_name text,
  payload jsonb,
  status text default 'pending',
  reviewed_at timestamptz
);
alter table pending_entries add column if not exists id text;
alter table pending_entries add column if not exists created_at timestamptz;
alter table pending_entries add column if not exists source_type text;
alter table pending_entries add column if not exists source_name text;
alter table pending_entries add column if not exists payload jsonb;
alter table pending_entries add column if not exists status text;
alter table pending_entries add column if not exists reviewed_at timestamptz;

create table if not exists form_tokens(
  id text primary key,
  created_at timestamptz default now(),
  type text not null,             -- production | caisse
  name text,
  token text unique not null,
  active boolean default true
);
alter table form_tokens add column if not exists id text;
alter table form_tokens add column if not exists created_at timestamptz;
alter table form_tokens add column if not exists type text;
alter table form_tokens add column if not exists name text;
alter table form_tokens add column if not exists token text unique;
alter table form_tokens add column if not exists active boolean;

create table if not exists packaging_items(
  id text primary key,
  created_at timestamptz default now(),
  name text not null,
  unit text default 'unité',
  alert_min numeric default 0,
  active boolean default true
);
alter table packaging_items add column if not exists id text;
alter table packaging_items add column if not exists created_at timestamptz;
alter table packaging_items add column if not exists name text;
alter table packaging_items add column if not exists unit text;
alter table packaging_items add column if not exists alert_min numeric;
alter table packaging_items add column if not exists active boolean;

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
alter table packaging_entries add column if not exists id text;
alter table packaging_entries add column if not exists created_at timestamptz;
alter table packaging_entries add column if not exists date date;
alter table packaging_entries add column if not exists type text;
alter table packaging_entries add column if not exists qty numeric;
alter table packaging_entries add column if not exists unit_cost numeric;
alter table packaging_entries add column if not exists amount numeric;
alter table packaging_entries add column if not exists reason text;
alter table packaging_entries add column if not exists ref text;
alter table packaging_entries add column if not exists item_id text;
alter table packaging_entries add column if not exists item_name text;
alter table packaging_entries add column if not exists source text;
alter table packaging_entries add column if not exists status text;

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
alter table assets add column if not exists id text;
alter table assets add column if not exists created_at timestamptz;
alter table assets add column if not exists name text;
alter table assets add column if not exists category text;
alter table assets add column if not exists acq_date date;
alter table assets add column if not exists cost numeric;
alter table assets add column if not exists salvage numeric;
alter table assets add column if not exists life_years numeric;
alter table assets add column if not exists active boolean;
alter table assets add column if not exists note text;

create table if not exists email_log(
  id text primary key,
  created_at timestamptz default now(),
  kind text not null,             -- daily | monthly
  ref text,                       -- date (YYYY-MM-DD) ou période (YYYY-MM)
  sent_at timestamptz,
  status text,                    -- sent | failed | update_pending
  detail text
);
alter table email_log add column if not exists id text;
alter table email_log add column if not exists created_at timestamptz;
alter table email_log add column if not exists kind text;
alter table email_log add column if not exists ref text;
alter table email_log add column if not exists sent_at timestamptz;
alter table email_log add column if not exists status text;
alter table email_log add column if not exists detail text;

-- ============================================================
alter table settings        enable row level security;
alter table products        enable row level security;
alter table purchases       enable row level security;
alter table coffee_types     enable row level security;
alter table transformations  enable row level security;
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
  foreach t in array array['settings','products','coffee_types','purchases','roastings','transformations','productions','adjustments','sales_agents','sales','cash_entries','employees','advances','pay_runs','pay_slips','pending_entries','form_tokens','packaging_items','packaging_entries','email_log','assets']
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
--
