-- Budget app schema. Works on plain Postgres, Supabase, or Neon.
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  user_id uuid primary key references users(id) on delete cascade,
  income_floor numeric,
  survival_mode boolean not null default false,
  survival_caps_backup jsonb,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists weekly_incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  week_start_date date not null,
  income numeric not null,
  carry_in numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);
create index if not exists weekly_incomes_user_idx on weekly_incomes(user_id, week_start_date);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  target_amount numeric not null,
  saved_amount numeric not null default 0,
  deadline_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists goals_one_active_per_user on goals(user_id) where is_active;

create table if not exists goal_log (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  week_start_date date not null,
  planned_amount numeric not null,
  actual_amount numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists goal_log_goal_idx on goal_log(goal_id, created_at);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  date date not null,
  category text not null,
  description text not null default '',
  amount numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_date_idx on transactions(user_id, date);

create table if not exists envelopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  category_name text not null,
  weekly_cap numeric,
  is_regular boolean not null default true,
  is_auto_cap boolean not null default false,
  icon_key text,
  created_at timestamptz not null default now(),
  unique (user_id, category_name)
);

create table if not exists category_keywords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  category_name text not null,
  keyword text not null,
  created_at timestamptz not null default now(),
  unique (user_id, category_name, keyword)
);
create index if not exists category_keywords_user_idx on category_keywords(user_id, created_at);

create table if not exists reserve_fund (
  user_id uuid primary key references users(id) on delete cascade,
  saved_amount numeric not null default 0,
  pct numeric not null default 0.05
);

create table if not exists reserve_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  date date not null,
  amount numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists reserve_log_user_idx on reserve_log(user_id, created_at);
