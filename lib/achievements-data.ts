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

// ---- 20 additional 3-step milestone series (60 achievements), all
// derived from data already tracked — no schema changes beyond the
// achievements themselves. Each series reuses unlockTiers() the same way
// the 5 paths above do; they just aren't shown in the path-progress grid.
export const TXN_COUNT_THRESHOLDS = [50, 200, 500];
export const KASSA_SHIFTS_THRESHOLDS = [25, 75, 150];
export const INCOME_WEEKS_THRESHOLDS = [10, 26, 52];
export const GOALS_CREATED_THRESHOLDS = [2, 5, 10];
export const CUSTOM_ENVELOPES_THRESHOLDS = [1, 3, 6];
export const INVEST_STREAK_THRESHOLDS = [4, 12, 26];
export const RESERVE_TOPUPS_THRESHOLDS = [5, 15, 40];
export const GOAL_ONTRACK_THRESHOLDS = [4, 12, 26];
export const KASSA_DOUBLE_THRESHOLDS = [1, 5, 15];
export const INCOME_ABOVE_AVG_THRESHOLDS = [5, 15, 30];
export const CATEGORY_VARIETY_THRESHOLDS = [5, 8, 12];
export const COLD_HEAD_STREAK_THRESHOLDS = [2, 4, 8];
export const DESC_COUNT_THRESHOLDS = [20, 75, 200];
export const KASSA_NO_GAPS_COUNT_THRESHOLDS = [4, 12, 26];
export const KASSA_BULLSEYE_COUNT_THRESHOLDS = [3, 10, 25];
export const SAME_DAY_LOG_THRESHOLDS = [20, 75, 200];
export const GOAL_OVER_PLAN_THRESHOLDS = [2, 6, 15];
export const NO_MISC_THRESHOLDS = [4, 12, 26];
export const APP_ACTIVE_DAYS_THRESHOLDS = [30, 90, 180];
export const GOAL_EARLY14_THRESHOLDS = [1, 3, 6];

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
  { key: "reserve_topups_tier1", path: null, tier: null, icon: "🪙", title: "Пять вкладов в спокойствие", description: "5 пополнений подушки безопасности" },
  { key: "reserve_topups_tier2", path: null, tier: null, icon: "🛡️", title: "Пятнадцать — уже рефлекс", description: "15 пополнений подушки безопасности" },
  { key: "reserve_topups_tier3", path: null, tier: null, icon: "🏰", title: "Сорок раз укрепил тыл", description: "40 пополнений подушки безопасности" },

  // Ситуационные — Марафон (общий стаж и объём работы в приложении)
  { key: "txn_count_tier1", path: null, tier: null, icon: "🧾", title: "Полтинник операций", description: "50 записанных трат" },
  { key: "txn_count_tier2", path: null, tier: null, icon: "📚", title: "Двести за спиной", description: "200 записанных трат" },
  { key: "txn_count_tier3", path: null, tier: null, icon: "🗂️", title: "Система из пятисот", description: "500 записанных трат" },
  { key: "kassa_shifts_tier1", path: null, tier: null, icon: "🔧", title: "Четверть сотни смен", description: "25 отработанных смен с кассой" },
  { key: "kassa_shifts_tier2", path: null, tier: null, icon: "⚙️", title: "Три четверти сотни", description: "75 отработанных смен с кассой" },
  { key: "kassa_shifts_tier3", path: null, tier: null, icon: "🏭", title: "Полторы сотни — это стаж", description: "150 отработанных смен с кассой" },
  { key: "income_weeks_tier1", path: null, tier: null, icon: "🗓️", title: "Десять недель в системе", description: "10 недель с зафиксированным доходом" },
  { key: "income_weeks_tier2", path: null, tier: null, icon: "📘", title: "Полгода учёта", description: "26 недель с зафиксированным доходом" },
  { key: "income_weeks_tier3", path: null, tier: null, icon: "📗", title: "Год честного учёта", description: "52 недели с зафиксированным доходом" },
  { key: "app_active_days_tier1", path: null, tier: null, icon: "📱", title: "Месяц с приложением", description: "30 разных дней активности в приложении" },
  { key: "app_active_days_tier2", path: null, tier: null, icon: "🤝", title: "Три месяца вместе", description: "90 разных дней активности в приложении" },
  { key: "app_active_days_tier3", path: null, tier: null, icon: "🔗", title: "Полгода как единое целое", description: "180 разных дней активности в приложении" },

  // Ситуационные — Цели: новые рубежи
  { key: "goals_created_tier1", path: null, tier: null, icon: "🎯", title: "Не одна цель — уже привычка", description: "2 цели поставлено за всё время" },
  { key: "goals_created_tier2", path: null, tier: null, icon: "🧭", title: "Пять целей — уже характер", description: "5 целей поставлено за всё время" },
  { key: "goals_created_tier3", path: null, tier: null, icon: "🏆", title: "Фабрика мечт", description: "10 целей поставлено за всё время" },
  { key: "goal_ontrack_tier1", path: null, tier: null, icon: "✅", title: "Четыре недели точно по плану", description: "4 недели взнос в цель ≥ плана" },
  { key: "goal_ontrack_tier2", path: null, tier: null, icon: "📐", title: "Двенадцать недель дисциплины", description: "12 недель взнос в цель ≥ плана" },
  { key: "goal_ontrack_tier3", path: null, tier: null, icon: "🏅", title: "Полгода — взнос всегда вовремя", description: "26 недель взнос в цель ≥ плана" },
  { key: "goal_over_plan_tier1", path: null, tier: null, icon: "💪", title: "На 20% больше плана", description: "2 недели взнос в цель на 20%+ больше плана" },
  { key: "goal_over_plan_tier2", path: null, tier: null, icon: "🏗️", title: "С запасом", description: "6 недель взнос в цель на 20%+ больше плана" },
  { key: "goal_over_plan_tier3", path: null, tier: null, icon: "🚀", title: "На опережение", description: "15 недель взнос в цель на 20%+ больше плана" },
  { key: "goal_early14_tier1", path: null, tier: null, icon: "⏩", title: "На две недели раньше", description: "Цель закрыта минимум за 14 дней до дедлайна" },
  { key: "goal_early14_tier2", path: null, tier: null, icon: "⏰", title: "Трижды обогнал часы", description: "3 цели закрыты минимум за 14 дней до дедлайна" },
  { key: "goal_early14_tier3", path: null, tier: null, icon: "🏆", title: "Шесть побед над дедлайном", description: "6 целей закрыто минимум за 14 дней до дедлайна" },

  // Ситуационные — Касса: сверх плана
  { key: "kassa_double_tier1", path: null, tier: null, icon: "🚀", title: "Двойной план", description: "Неделя с кассой ≥ 200% от плана" },
  { key: "kassa_double_tier2", path: null, tier: null, icon: "🔥", title: "Пять недель кратного перевыполнения", description: "5 недель с кассой ≥ 200% от плана" },
  { key: "kassa_double_tier3", path: null, tier: null, icon: "🌟", title: "Пятнадцать недель огня", description: "15 недель с кассой ≥ 200% от плана" },
  { key: "kassa_no_gaps_count_tier1", path: null, tier: null, icon: "🧩", title: "Четыре недели без дыр", description: "4 недели, где касса внесена все рабочие дни" },
  { key: "kassa_no_gaps_count_tier2", path: null, tier: null, icon: "⛓️", title: "Двенадцать недель железной рутины", description: "12 недель, где касса внесена все рабочие дни" },
  { key: "kassa_no_gaps_count_tier3", path: null, tier: null, icon: "🏛️", title: "Полгода без единого пропуска", description: "26 недель, где касса внесена все рабочие дни" },
  { key: "kassa_bullseye_count_tier1", path: null, tier: null, icon: "🎯", title: "Три точных попадания", description: "3 дня закрыты ровно по дневной цели" },
  { key: "kassa_bullseye_count_tier2", path: null, tier: null, icon: "🏹", title: "Десять точных дней", description: "10 дней закрыты ровно по дневной цели" },
  { key: "kassa_bullseye_count_tier3", path: null, tier: null, icon: "🥇", title: "Снайперская выучка", description: "25 дней закрыты ровно по дневной цели" },

  // Ситуационные — Бюджетная дисциплина: новые рубежи
  { key: "custom_envelopes_tier1", path: null, tier: null, icon: "✂️", title: "Свой конверт", description: "Создан 1 конверт под свою жизнь" },
  { key: "custom_envelopes_tier2", path: null, tier: null, icon: "🧵", title: "Три своих конверта", description: "Создано 3 своих конверта" },
  { key: "custom_envelopes_tier3", path: null, tier: null, icon: "🎨", title: "Полная кастомизация", description: "Создано 6 своих конвертов" },
  { key: "category_variety_tier1", path: null, tier: null, icon: "🗃️", title: "Пять категорий в деле", description: "Траты записаны в 5+ разных категориях" },
  { key: "category_variety_tier2", path: null, tier: null, icon: "🗄️", title: "Восемь категорий под контролем", description: "Траты записаны в 8+ разных категориях" },
  { key: "category_variety_tier3", path: null, tier: null, icon: "🌈", title: "Полный охват", description: "Траты записаны в 12+ разных категориях" },
  { key: "cold_head_streak_tier1", path: null, tier: null, icon: "🧊", title: "Две недели без превышений", description: "2 недели подряд без превышения ни одного конверта" },
  { key: "cold_head_streak_tier2", path: null, tier: null, icon: "❄️", title: "Месяц под контролем", description: "4 недели подряд без превышения ни одного конверта" },
  { key: "cold_head_streak_tier3", path: null, tier: null, icon: "🥶", title: "Два месяца дисциплины", description: "8 недель подряд без превышения ни одного конверта" },
  { key: "desc_count_tier1", path: null, tier: null, icon: "📝", title: "Пишу, на что трачу", description: "20 трат с описанием" },
  { key: "desc_count_tier2", path: null, tier: null, icon: "📖", title: "Дневник трат", description: "75 трат с описанием" },
  { key: "desc_count_tier3", path: null, tier: null, icon: "📜", title: "Летопись расходов", description: "200 трат с описанием" },
  { key: "same_day_log_tier1", path: null, tier: null, icon: "⏱️", title: "Записываю день в день", description: "20 трат записаны в день покупки" },
  { key: "same_day_log_tier2", path: null, tier: null, icon: "⏳", title: "Без отговорок", description: "75 трат записаны в день покупки" },
  { key: "same_day_log_tier3", path: null, tier: null, icon: "🕰️", title: "Без опозданий", description: "200 трат записаны в день покупки" },
  { key: "no_misc_tier1", path: null, tier: null, icon: "🎯", title: "Ни разу не «прочее»", description: "4 недели без единой траты в «Прочие расходы»" },
  { key: "no_misc_tier2", path: null, tier: null, icon: "🔬", title: "Точная категоризация", description: "12 недель без единой траты в «Прочие расходы»" },
  { key: "no_misc_tier3", path: null, tier: null, icon: "🗃️", title: "Всё по полочкам", description: "26 недель без единой траты в «Прочие расходы»" },

  // Ситуационные — Инвестиции
  { key: "invest_streak_tier1", path: null, tier: null, icon: "💰", title: "Плачу себе первым", description: "4 недели подряд отложено в «Инвестиции»" },
  { key: "invest_streak_tier2", path: null, tier: null, icon: "📈", title: "Инвестирую стабильно", description: "12 недель подряд отложено в «Инвестиции»" },
  { key: "invest_streak_tier3", path: null, tier: null, icon: "💎", title: "Полгода без пропусков", description: "26 недель подряд отложено в «Инвестиции»" },

  // Ситуационные — Доход: новые рубежи
  { key: "income_above_avg_tier1", path: null, tier: null, icon: "📊", title: "Выше своей нормы", description: "5 недель дохода выше собственного среднего" },
  { key: "income_above_avg_tier2", path: null, tier: null, icon: "📈", title: "Пятнадцать недель роста", description: "15 недель дохода выше собственного среднего" },
  { key: "income_above_avg_tier3", path: null, tier: null, icon: "🌤️", title: "Тридцать недель над планкой", description: "30 недель дохода выше собственного среднего" },
];
