// Static reference data for the achievements system — titles, descriptions,
// icons, and the numeric thresholds that both the seed migration and the
// checking logic (achievements-repo.ts) read from. Single source of truth:
// keep this in sync with the `achievements` table seed in db/schema.sql.

export interface AchievementDef {
  key: string;
  path: string | null; // path name, or null for one-off situational achievements
  tier: number | null; // 1-4 for tiered paths, null for situational
  title: string;
  description: string;
  icon: string;
}

export const TIER_ICONS = ["🥉", "🥈", "🥇", "💎"];

export const DISCIPLINE_THRESHOLDS = [4, 13, 26, 52];
export const KASSA_STREAK_THRESHOLDS = [3, 8, 16]; // tier 4 uses a separate 40-of-52 rule
export const KASSA_STREAK_TIER4_TARGET = 40;
export const KASSA_STREAK_TIER4_WINDOW = 52;
export const GROWTH_THRESHOLDS = [10, 25, 50, 100]; // percent
export const RESERVE_THRESHOLDS = [1, 4, 13, 26]; // weeks of average income
export const GOALS_CLOSED_THRESHOLDS = [1, 3, 5]; // tier 4 uses a separate "10 in last 52 weeks" rule
export const GOALS_CLOSED_TIER4_TARGET = 10;
export const GOALS_CLOSED_TIER4_WINDOW = 52;

export const ACHIEVEMENTS: AchievementDef[] = [
  // Путь 1: Без права на слабину
  { key: "discipline_tier1", path: "Без права на слабину", tier: 1, icon: "🥉", title: "Встал — значит, будет касса", description: "4 недели подряд фиксируешь доход без пропусков" },
  { key: "discipline_tier2", path: "Без права на слабину", tier: 2, icon: "🥈", title: "13 недель без нытья", description: "13 недель подряд фиксируешь доход без пропусков" },
  { key: "discipline_tier3", path: "Без права на слабину", tier: 3, icon: "🥇", title: "Расписание — не предложение", description: "26 недель подряд фиксируешь доход без пропусков" },
  { key: "discipline_tier4", path: "Без права на слабину", tier: 4, icon: "💎", title: "365 дней подряд, ноль отмазок", description: "52 недели подряд фиксируешь доход без пропусков" },

  // Путь 2: Касса не ждёт
  { key: "kassa_streak_tier1", path: "Касса не ждёт", tier: 1, icon: "🥉", title: "Разогнался", description: "3 недели подряд план по кассе выполнен" },
  { key: "kassa_streak_tier2", path: "Касса не ждёт", tier: 2, icon: "🥈", title: "В темпе, детка", description: "8 недель подряд план по кассе выполнен" },
  { key: "kassa_streak_tier3", path: "Касса не ждёт", tier: 3, icon: "🥇", title: "Касса кипит", description: "16 недель подряд план по кассе выполнен" },
  { key: "kassa_streak_tier4", path: "Касса не ждёт", tier: 4, icon: "💎", title: "Продажи как дыхание — не думая", description: "40 из последних 52 недель план по кассе выполнен" },

  // Путь 3: Деньги любят наглых
  { key: "income_growth_tier1", path: "Деньги любят наглых", tier: 1, icon: "🥉", title: "Первая заявка на успех", description: "Доход вырос на 10%+ от самой первой зафиксированной недели" },
  { key: "income_growth_tier2", path: "Деньги любят наглых", tier: 2, icon: "🥈", title: "Доход подрос, эго тоже", description: "Доход вырос на 25%+ от самой первой зафиксированной недели" },
  { key: "income_growth_tier3", path: "Деньги любят наглых", tier: 3, icon: "🥇", title: "×1.5 и без объяснений", description: "Доход вырос на 50%+ от самой первой зафиксированной недели" },
  { key: "income_growth_tier4", path: "Деньги любят наглых", tier: 4, icon: "💎", title: "Удвоил — и это не предел", description: "Доход вырос на 100%+ от самой первой зафиксированной недели" },

  // Путь 4: Меня не сломать
  { key: "reserve_cushion_tier1", path: "Меня не сломать", tier: 1, icon: "🥉", title: "Первая заначка", description: "Подушка ≥ 1 недельного дохода" },
  { key: "reserve_cushion_tier2", path: "Меня не сломать", tier: 2, icon: "🥈", title: "Месяц безопасности куплен", description: "Подушка ≥ 4 недельных доходов (~месяц)" },
  { key: "reserve_cushion_tier3", path: "Меня не сломать", tier: 3, icon: "🥇", title: "Мне плевать на форс-мажоры", description: "Подушка ≥ 13 недельных доходов (~3 месяца)" },
  { key: "reserve_cushion_tier4", path: "Меня не сломать", tier: 4, icon: "💎", title: "Непотопляем", description: "Подушка ≥ 26 недельных доходов (~полгода)" },

  // Путь 5: Коллекционирую победы
  { key: "goals_closed_tier1", path: "Коллекционирую победы", tier: 1, icon: "🥉", title: "Вошёл во вкус", description: "1 закрытая цель" },
  { key: "goals_closed_tier2", path: "Коллекционирую победы", tier: 2, icon: "🥈", title: "Три из трёх — не совпадение", description: "3 закрытые цели" },
  { key: "goals_closed_tier3", path: "Коллекционирую победы", tier: 3, icon: "🥇", title: "Я не играю, я выигрываю", description: "5 закрытых целей" },
  { key: "goals_closed_tier4", path: "Коллекционирую победы", tier: 4, icon: "💎", title: "Кто-то ещё сомневается?", description: "10 закрытых целей за последние 52 недели" },

  // Ситуационные — Касса
  { key: "kassa_bullseye", path: null, tier: null, icon: "🎯", title: "В яблочко", description: "День закрыт на 99–101% от дневной цели недели" },
  { key: "kassa_explosion", path: null, tier: null, icon: "💥", title: "Взрыв кассы", description: "Касса за неделю ≥ 150% от плана" },
  { key: "kassa_volcano", path: null, tier: null, icon: "🌋", title: "Личный вулкан", description: "Касса за неделю минимум на 20% больше любой предыдущей недели" },
  { key: "kassa_bounce", path: null, tier: null, icon: "🩹", title: "Отскок", description: "После проваленной недели сразу же выполнен план" },
  { key: "kassa_no_gaps", path: null, tier: null, icon: "📆", title: "Без дыр", description: "Касса внесена все 5 рабочих дней недели" },

  // Ситуационные — Цели
  { key: "goal_first_seed", path: null, tier: null, icon: "🌱", title: "Посадил семя", description: "Создана первая цель" },
  { key: "goal_first_finish", path: null, tier: null, icon: "🏁", title: "Финишная лента", description: "Закрыта первая цель" },
  { key: "goal_beat_deadline", path: null, tier: null, icon: "⏱️", title: "Обогнал дедлайн", description: "Цель закрыта минимум за 7 дней до дедлайна" },
  { key: "goal_rollercoaster", path: null, tier: null, icon: "🎢", title: "Американские горки", description: "Была просевшая неделя по цели, но цель всё равно закрыта до дедлайна" },

  // Ситуационные — Бюджетная дисциплина
  { key: "budget_cold_head", path: null, tier: null, icon: "🧊", title: "Холодная голова", description: "Неделя закрыта без превышения ни одного конверта" },
  { key: "budget_caught_myself", path: null, tier: null, icon: "🕵️", title: "Сам поймал", description: "Вручную поправлена категория уже сохранённой траты" },
  { key: "budget_own_system", path: null, tier: null, icon: "🏷️", title: "Своя система", description: "Настроено 3+ ключевых слова для авто-категоризации" },

  // Ситуационные — Подушка
  { key: "reserve_first_egg", path: null, tier: null, icon: "🥚", title: "Первое яйцо в гнезде", description: "Подушка впервые стала больше нуля" },
  { key: "reserve_purposeful", path: null, tier: null, icon: "🧗", title: "По назначению", description: "После снятия из подушки на форс-мажор отчисления возобновились" },
];
