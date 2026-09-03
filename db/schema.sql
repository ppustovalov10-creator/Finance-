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
  -- Snapshots of goal.saved / reserve.saved at the moment this week was
  -- fixed, before that fixation's own contribution/skim applied. Lets the
  -- app show how much of the week's money is already committed (via any
  -- mechanism, including a manual "edit goal" bump) rather than spendable.
  goal_saved_at_week_start numeric not null default 0,
  reserve_saved_at_week_start numeric not null default 0,
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
  -- Stamped once, the first time saved_amount reaches target_amount. Lets a
  -- goal be "closed" while staying is_active (still shown/editable) until
  -- the user explicitly starts a new one, which archives this row instead.
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists goals_one_active_per_user on goals(user_id) where is_active;
alter table goals add column if not exists completed_at timestamptz;

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

-- "Касса" tab: a personal weekly sales-commission target, entirely separate
-- from the budget tab's income/goal tracking.
create table if not exists sales_target (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  week_start_date date not null,
  target_salary numeric not null,
  failed_plan boolean not null default false,
  ops_total int not null default 0,
  ops_plan int not null default 0,
  mgr_total int not null default 0,
  mgr_plan int not null default 0,
  required_kassa numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);

create table if not exists kassa_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  date date not null,
  amount numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists kassa_entries_user_date_idx on kassa_entries(user_id, date);

-- Achievements: a discipline/retention tool, not a decorative side feature.
-- "achievements" is a static reference table, seeded once below; the app
-- never writes to it at runtime. "user_achievements" records what a given
-- user has actually unlocked.
create table if not exists achievements (
  key text primary key,
  path text,
  tier int,
  title text not null,
  description text not null,
  icon text not null
);

create table if not exists user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  achievement_key text not null references achievements(key),
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_key)
);
create index if not exists user_achievements_user_idx on user_achievements(user_id);

insert into achievements (key, path, tier, title, description, icon) values ('discipline_tier1', 'Без права на слабину', 1, 'Встал — значит, будет касса', '4 недели подряд фиксируешь доход без пропусков', '🥉') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('discipline_tier2', 'Без права на слабину', 2, '13 недель без нытья', '13 недель подряд фиксируешь доход без пропусков', '🥈') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('discipline_tier3', 'Без права на слабину', 3, 'Расписание — не предложение', '26 недель подряд фиксируешь доход без пропусков', '🥇') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('discipline_tier4', 'Без права на слабину', 4, '365 дней подряд, ноль отмазок', '52 недели подряд фиксируешь доход без пропусков', '💎') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_streak_tier1', 'Касса не ждёт', 1, 'Разогнался', '3 недели подряд план по кассе выполнен', '🥉') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_streak_tier2', 'Касса не ждёт', 2, 'В темпе, детка', '8 недель подряд план по кассе выполнен', '🥈') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_streak_tier3', 'Касса не ждёт', 3, 'Касса кипит', '16 недель подряд план по кассе выполнен', '🥇') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_streak_tier4', 'Касса не ждёт', 4, 'Продажи как дыхание — не думая', '40 из последних 52 недель план по кассе выполнен', '💎') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('income_growth_tier1', 'Деньги любят наглых', 1, 'Первая заявка на успех', 'Доход вырос на 10%+ от самой первой зафиксированной недели', '🥉') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('income_growth_tier2', 'Деньги любят наглых', 2, 'Доход подрос, эго тоже', 'Доход вырос на 25%+ от самой первой зафиксированной недели', '🥈') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('income_growth_tier3', 'Деньги любят наглых', 3, '×1.5 и без объяснений', 'Доход вырос на 50%+ от самой первой зафиксированной недели', '🥇') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('income_growth_tier4', 'Деньги любят наглых', 4, 'Удвоил — и это не предел', 'Доход вырос на 100%+ от самой первой зафиксированной недели', '💎') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('reserve_cushion_tier1', 'Меня не сломать', 1, 'Первая заначка', 'Подушка ≥ 1 недельного дохода', '🥉') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('reserve_cushion_tier2', 'Меня не сломать', 2, 'Месяц безопасности куплен', 'Подушка ≥ 4 недельных доходов (~месяц)', '🥈') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('reserve_cushion_tier3', 'Меня не сломать', 3, 'Мне плевать на форс-мажоры', 'Подушка ≥ 13 недельных доходов (~3 месяца)', '🥇') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('reserve_cushion_tier4', 'Меня не сломать', 4, 'Непотопляем', 'Подушка ≥ 26 недельных доходов (~полгода)', '💎') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('goals_closed_tier1', 'Коллекционирую победы', 1, 'Вошёл во вкус', '1 закрытая цель', '🥉') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('goals_closed_tier2', 'Коллекционирую победы', 2, 'Три из трёх — не совпадение', '3 закрытые цели', '🥈') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('goals_closed_tier3', 'Коллекционирую победы', 3, 'Я не играю, я выигрываю', '5 закрытых целей', '🥇') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('goals_closed_tier4', 'Коллекционирую победы', 4, 'Кто-то ещё сомневается?', '10 закрытых целей за последние 52 недели', '💎') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_bullseye', null, null, 'В яблочко', 'День закрыт на 99–101% от дневной цели недели', '🎯') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_explosion', null, null, 'Взрыв кассы', 'Касса за неделю ≥ 150% от плана', '💥') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_volcano', null, null, 'Личный вулкан', 'Касса за неделю минимум на 20% больше любой предыдущей недели', '🌋') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_bounce', null, null, 'Отскок', 'После проваленной недели сразу же выполнен план', '🩹') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_no_gaps', null, null, 'Без дыр', 'Касса внесена все 5 рабочих дней недели', '📆') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('goal_first_seed', null, null, 'Посадил семя', 'Создана первая цель', '🌱') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('goal_first_finish', null, null, 'Финишная лента', 'Закрыта первая цель', '🏁') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('goal_beat_deadline', null, null, 'Обогнал дедлайн', 'Цель закрыта минимум за 7 дней до дедлайна', '⏱️') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('goal_rollercoaster', null, null, 'Американские горки', 'Была просевшая неделя по цели, но цель всё равно закрыта до дедлайна', '🎢') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('budget_cold_head', null, null, 'Холодная голова', 'Неделя закрыта без превышения ни одного конверта', '🧊') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('budget_caught_myself', null, null, 'Сам поймал', 'Вручную поправлена категория уже сохранённой траты', '🕵️') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('budget_own_system', null, null, 'Своя система', 'Настроено 3+ ключевых слова для авто-категоризации', '🏷️') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('reserve_first_egg', null, null, 'Первое яйцо в гнезде', 'Подушка впервые стала больше нуля', '🥚') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('reserve_purposeful', null, null, 'По назначению', 'После снятия из подушки на форс-мажор отчисления возобновились', '🧗') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('reserve_topups_tier1', null, null, 'Пять вкладов в спокойствие', '5 пополнений подушки безопасности', '🪙') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('reserve_topups_tier2', null, null, 'Пятнадцать — уже рефлекс', '15 пополнений подушки безопасности', '🛡️') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('reserve_topups_tier3', null, null, 'Сорок раз укрепил тыл', '40 пополнений подушки безопасности', '🏰') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('txn_count_tier1', null, null, 'Полтинник операций', '50 записанных трат', '🧾') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('txn_count_tier2', null, null, 'Двести за спиной', '200 записанных трат', '📚') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('txn_count_tier3', null, null, 'Система из пятисот', '500 записанных трат', '🗂️') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_shifts_tier1', null, null, 'Четверть сотни смен', '25 отработанных смен с кассой', '🔧') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_shifts_tier2', null, null, 'Три четверти сотни', '75 отработанных смен с кассой', '⚙️') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_shifts_tier3', null, null, 'Полторы сотни — это стаж', '150 отработанных смен с кассой', '🏭') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('income_weeks_tier1', null, null, 'Десять недель в системе', '10 недель с зафиксированным доходом', '🗓️') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('income_weeks_tier2', null, null, 'Полгода учёта', '26 недель с зафиксированным доходом', '📘') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('income_weeks_tier3', null, null, 'Год честного учёта', '52 недели с зафиксированным доходом', '📗') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('app_active_days_tier1', null, null, 'Месяц с приложением', '30 разных дней активности в приложении', '📱') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('app_active_days_tier2', null, null, 'Три месяца вместе', '90 разных дней активности в приложении', '🤝') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('app_active_days_tier3', null, null, 'Полгода как единое целое', '180 разных дней активности в приложении', '🔗') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('goals_created_tier1', null, null, 'Не одна цель — уже привычка', '2 цели поставлено за всё время', '🎯') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('goals_created_tier2', null, null, 'Пять целей — уже характер', '5 целей поставлено за всё время', '🧭') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('goals_created_tier3', null, null, 'Фабрика мечт', '10 целей поставлено за всё время', '🏆') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('goal_ontrack_tier1', null, null, 'Четыре недели точно по плану', '4 недели взнос в цель ≥ плана', '✅') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('goal_ontrack_tier2', null, null, 'Двенадцать недель дисциплины', '12 недель взнос в цель ≥ плана', '📐') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('goal_ontrack_tier3', null, null, 'Полгода — взнос всегда вовремя', '26 недель взнос в цель ≥ плана', '🏅') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('goal_over_plan_tier1', null, null, 'На 20% больше плана', '2 недели взнос в цель на 20%+ больше плана', '💪') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('goal_over_plan_tier2', null, null, 'С запасом', '6 недель взнос в цель на 20%+ больше плана', '🏗️') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('goal_over_plan_tier3', null, null, 'На опережение', '15 недель взнос в цель на 20%+ больше плана', '🚀') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('goal_early14_tier1', null, null, 'На две недели раньше', 'Цель закрыта минимум за 14 дней до дедлайна', '⏩') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('goal_early14_tier2', null, null, 'Трижды обогнал часы', '3 цели закрыты минимум за 14 дней до дедлайна', '⏰') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('goal_early14_tier3', null, null, 'Шесть побед над дедлайном', '6 целей закрыто минимум за 14 дней до дедлайна', '🏆') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_double_tier1', null, null, 'Двойной план', 'Неделя с кассой ≥ 200% от плана', '🚀') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_double_tier2', null, null, 'Пять недель кратного перевыполнения', '5 недель с кассой ≥ 200% от плана', '🔥') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_double_tier3', null, null, 'Пятнадцать недель огня', '15 недель с кассой ≥ 200% от плана', '🌟') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_no_gaps_count_tier1', null, null, 'Четыре недели без дыр', '4 недели, где касса внесена все рабочие дни', '🧩') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_no_gaps_count_tier2', null, null, 'Двенадцать недель железной рутины', '12 недель, где касса внесена все рабочие дни', '⛓️') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_no_gaps_count_tier3', null, null, 'Полгода без единого пропуска', '26 недель, где касса внесена все рабочие дни', '🏛️') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_bullseye_count_tier1', null, null, 'Три точных попадания', '3 дня закрыты ровно по дневной цели', '🎯') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_bullseye_count_tier2', null, null, 'Десять точных дней', '10 дней закрыты ровно по дневной цели', '🏹') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('kassa_bullseye_count_tier3', null, null, 'Снайперская выучка', '25 дней закрыты ровно по дневной цели', '🥇') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('custom_envelopes_tier1', null, null, 'Свой конверт', 'Создан 1 конверт под свою жизнь', '✂️') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('custom_envelopes_tier2', null, null, 'Три своих конверта', 'Создано 3 своих конверта', '🧵') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('custom_envelopes_tier3', null, null, 'Полная кастомизация', 'Создано 6 своих конвертов', '🎨') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('category_variety_tier1', null, null, 'Пять категорий в деле', 'Траты записаны в 5+ разных категориях', '🗃️') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('category_variety_tier2', null, null, 'Восемь категорий под контролем', 'Траты записаны в 8+ разных категориях', '🗄️') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('category_variety_tier3', null, null, 'Полный охват', 'Траты записаны в 12+ разных категориях', '🌈') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('cold_head_streak_tier1', null, null, 'Две недели без превышений', '2 недели подряд без превышения ни одного конверта', '🧊') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('cold_head_streak_tier2', null, null, 'Месяц под контролем', '4 недели подряд без превышения ни одного конверта', '❄️') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('cold_head_streak_tier3', null, null, 'Два месяца дисциплины', '8 недель подряд без превышения ни одного конверта', '🥶') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('desc_count_tier1', null, null, 'Пишу, на что трачу', '20 трат с описанием', '📝') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('desc_count_tier2', null, null, 'Дневник трат', '75 трат с описанием', '📖') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('desc_count_tier3', null, null, 'Летопись расходов', '200 трат с описанием', '📜') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('same_day_log_tier1', null, null, 'Записываю день в день', '20 трат записаны в день покупки', '⏱️') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('same_day_log_tier2', null, null, 'Без отговорок', '75 трат записаны в день покупки', '⏳') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('same_day_log_tier3', null, null, 'Без опозданий', '200 трат записаны в день покупки', '🕰️') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('no_misc_tier1', null, null, 'Ни разу не «прочее»', '4 недели без единой траты в «Прочие расходы»', '🎯') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('no_misc_tier2', null, null, 'Точная категоризация', '12 недель без единой траты в «Прочие расходы»', '🔬') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('no_misc_tier3', null, null, 'Всё по полочкам', '26 недель без единой траты в «Прочие расходы»', '🗃️') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('invest_streak_tier1', null, null, 'Плачу себе первым', '4 недели подряд отложено в «Инвестиции»', '💰') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('invest_streak_tier2', null, null, 'Инвестирую стабильно', '12 недель подряд отложено в «Инвестиции»', '📈') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('invest_streak_tier3', null, null, 'Полгода без пропусков', '26 недель подряд отложено в «Инвестиции»', '💎') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('income_above_avg_tier1', null, null, 'Выше своей нормы', '5 недель дохода выше собственного среднего', '📊') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('income_above_avg_tier2', null, null, 'Пятнадцать недель роста', '15 недель дохода выше собственного среднего', '📈') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
insert into achievements (key, path, tier, title, description, icon) values ('income_above_avg_tier3', null, null, 'Тридцать недель над планкой', '30 недель дохода выше собственного среднего', '🌤️') on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon;
