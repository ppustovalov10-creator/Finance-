import type { Pool } from "pg";
import type { DbClient } from "./db";
import { isoToDDMMYYYY, toDDMMYYYY, dateToSortable, addDays, lastMonday, lastFriday } from "./date";
import { CATEGORIES } from "./categories";
import {
  ACHIEVEMENTS,
  DISCIPLINE_THRESHOLDS,
  KASSA_STREAK_THRESHOLDS,
  KASSA_STREAK_TIER4_TARGET,
  KASSA_STREAK_TIER4_WINDOW,
  GROWTH_THRESHOLDS,
  RESERVE_THRESHOLDS,
  GOALS_CLOSED_THRESHOLDS,
  GOALS_CLOSED_TIER4_TARGET,
  GOALS_CLOSED_TIER4_WINDOW,
  TXN_COUNT_THRESHOLDS,
  KASSA_SHIFTS_THRESHOLDS,
  INCOME_WEEKS_THRESHOLDS,
  GOALS_CREATED_THRESHOLDS,
  CUSTOM_ENVELOPES_THRESHOLDS,
  INVEST_STREAK_THRESHOLDS,
  RESERVE_TOPUPS_THRESHOLDS,
  GOAL_ONTRACK_THRESHOLDS,
  KASSA_DOUBLE_THRESHOLDS,
  INCOME_ABOVE_AVG_THRESHOLDS,
  CATEGORY_VARIETY_THRESHOLDS,
  COLD_HEAD_STREAK_THRESHOLDS,
  DESC_COUNT_THRESHOLDS,
  KASSA_NO_GAPS_COUNT_THRESHOLDS,
  KASSA_BULLSEYE_COUNT_THRESHOLDS,
  SAME_DAY_LOG_THRESHOLDS,
  GOAL_OVER_PLAN_THRESHOLDS,
  NO_MISC_THRESHOLDS,
  APP_ACTIVE_DAYS_THRESHOLDS,
  GOAL_EARLY14_THRESHOLDS,
} from "./achievements-data";

const INVEST_CATEGORY = "Инвестиции";
const MISC_CATEGORY = "Прочие расходы";

// Both a raw Pool and a transaction's PoolClient expose a compatible
// .query(text, params) — callers pass whichever they already have open, so
// achievement checks can run either standalone or inside an existing
// transaction without a second round trip.
type Queryable = Pool | DbClient;

export interface UnlockedAchievement {
  key: string;
  title: string;
  icon: string;
}

async function unlock(db: Queryable, userId: string, key: string): Promise<UnlockedAchievement | null> {
  const res = await db.query(
    `insert into user_achievements (user_id, achievement_key) values ($1, $2)
     on conflict (user_id, achievement_key) do nothing
     returning achievement_key`,
    [userId, key]
  );
  if (res.rows.length === 0) return null;
  const def = ACHIEVEMENTS.find((a) => a.key === key);
  if (!def) return null;
  return { key, title: def.title, icon: def.icon };
}

async function unlockTiers(db: Queryable, userId: string, pathKey: string, value: number, thresholds: number[]): Promise<UnlockedAchievement[]> {
  const out: UnlockedAchievement[] = [];
  for (let i = 0; i < thresholds.length; i++) {
    if (value >= thresholds[i]) {
      const r = await unlock(db, userId, `${pathKey}_tier${i + 1}`);
      if (r) out.push(r);
    }
  }
  return out;
}

// ---- generic consecutive-week streak over a list of dates that already
// satisfy whatever per-week predicate matters (sorted most-recent-first) ----
function consecutiveStreak(weekStartDatesDesc: string[]): number {
  if (weekStartDatesDesc.length === 0) return 0;
  let streak = 1;
  for (let i = 1; i < weekStartDatesDesc.length; i++) {
    if (addDays(weekStartDatesDesc[i - 1], -7) === weekStartDatesDesc[i]) streak++;
    else break;
  }
  return streak;
}

// Longest run of consecutive (7-day-step) weeks ANYWHERE in the history,
// not just the one trailing the most recent entry. Unlock checks use this
// — an achievement earned via a streak that happened at some point stays
// earned even after a later gap breaks it (achievements never get
// revoked), and this is also what makes a backfill/reconcile pass correct
// for a user who already had a qualifying streak before this feature, or
// before any given tier existed, even if their live streak has since
// dropped. The *trailing* streak (consecutiveStreak above) is still what's
// shown as "current progress" toward a tier not yet reached.
function maxConsecutiveStreak(weekStartDates: string[]): number {
  if (weekStartDates.length === 0) return 0;
  const sorted = [...weekStartDates].sort((a, b) => (dateToSortable(a) < dateToSortable(b) ? -1 : 1));
  let best = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (addDays(sorted[i - 1], 7) === sorted[i]) current++;
    else current = 1;
    best = Math.max(best, current);
  }
  return best;
}

function mondayOf(dateStr: string): string {
  const [d, m, y] = dateStr.split(".").map(Number);
  const jsDate = new Date(y, m - 1, d);
  const day = jsDate.getDay();
  const diff = day === 0 ? 6 : day - 1;
  jsDate.setDate(jsDate.getDate() - diff);
  return toDDMMYYYY(jsDate);
}

// Same as lastFriday() in date.ts but for an arbitrary date, not just
// "now" — the budget/goal tab's week always starts on a Friday, so this is
// how any transaction date maps onto "which budget week was this in".
function fridayOf(dateStr: string): string {
  const [d, m, y] = dateStr.split(".").map(Number);
  const jsDate = new Date(y, m - 1, d);
  const day = jsDate.getDay(); // 0=Sun..6=Sat, Friday=5
  const diff = day >= 5 ? day - 5 : day + 2;
  jsDate.setDate(jsDate.getDate() - diff);
  return toDDMMYYYY(jsDate);
}

// ============================================================
// Path 1 + Path 3 — after a weekly_incomes save
// ============================================================
export async function checkIncomeAchievements(db: Queryable, userId: string): Promise<UnlockedAchievement[]> {
  const res = await db.query(`select week_start_date, income from weekly_incomes where user_id = $1 order by week_start_date asc`, [userId]);
  const rows = res.rows.map((r) => ({ weekStartDate: isoToDDMMYYYY(r.week_start_date), income: Number(r.income) }));
  if (rows.length === 0) return [];

  const bestStreak = maxConsecutiveStreak(rows.map((r) => r.weekStartDate));
  // Best-ever growth vs the very first recorded week, not just the latest
  // week — same reasoning as the streak above: a peak that already
  // happened stays earned even if income has since come back down.
  const firstIncome = rows[0].income;
  const bestGrowthPct = firstIncome > 0 ? Math.max(0, ...rows.map((r) => ((r.income - firstIncome) / firstIncome) * 100)) : 0;

  const out = [
    ...(await unlockTiers(db, userId, "discipline", bestStreak, DISCIPLINE_THRESHOLDS)),
    ...(await unlockTiers(db, userId, "income_growth", bestGrowthPct, GROWTH_THRESHOLDS)),
    ...(await unlockTiers(db, userId, "income_weeks", rows.length, INCOME_WEEKS_THRESHOLDS)),
  ];

  // Недель дохода выше своего собственного среднего на тот момент.
  let aboveAvgCount = 0;
  for (let i = 1; i < rows.length; i++) {
    const priorAvg = rows.slice(0, i).reduce((s, r) => s + r.income, 0) / i;
    if (rows[i].income > priorAvg) aboveAvgCount++;
  }
  out.push(...(await unlockTiers(db, userId, "income_above_avg", aboveAvgCount, INCOME_ABOVE_AVG_THRESHOLDS)));

  // Разных дней активности в приложении вообще (доход/касса/траты).
  const activeDaysRes = await db.query(
    `select count(distinct d)::int as n from (
       select date as d from transactions where user_id = $1
       union
       select date as d from kassa_entries where user_id = $1
       union
       select week_start_date as d from weekly_incomes where user_id = $1
     ) x`,
    [userId]
  );
  out.push(...(await unlockTiers(db, userId, "app_active_days", Number(activeDaysRes.rows[0].n), APP_ACTIVE_DAYS_THRESHOLDS)));

  return out;
}

// ============================================================
// Path 4 — after reserve_fund / reserve_log changes
// ============================================================
export async function checkReserveAchievements(db: Queryable, userId: string): Promise<UnlockedAchievement[]> {
  const [reserveRes, avgRes, logRes] = await Promise.all([
    db.query(`select saved_amount from reserve_fund where user_id = $1`, [userId]),
    db.query(`select avg(income) as avg_income from weekly_incomes where user_id = $1`, [userId]),
    db.query(`select amount, created_at from reserve_log where user_id = $1 order by created_at asc`, [userId]),
  ]);
  const saved = reserveRes.rows[0] ? Number(reserveRes.rows[0].saved_amount) : 0;
  const avgIncome = avgRes.rows[0]?.avg_income != null ? Number(avgRes.rows[0].avg_income) : 0;
  const cushionWeeks = avgIncome > 0 ? saved / avgIncome : 0;

  const out = await unlockTiers(db, userId, "reserve_cushion", cushionWeeks, RESERVE_THRESHOLDS);

  if (saved > 0) {
    const r = await unlock(db, userId, "reserve_first_egg");
    if (r) out.push(r);
  }

  const log = logRes.rows.map((r) => ({ amount: Number(r.amount), createdAt: new Date(r.created_at).getTime() }));
  const firstNegative = log.find((r) => r.amount < 0);
  if (firstNegative && log.some((r) => r.amount > 0 && r.createdAt > firstNegative.createdAt)) {
    const r = await unlock(db, userId, "reserve_purposeful");
    if (r) out.push(r);
  }

  const topupsCount = log.filter((r) => r.amount > 0).length;
  out.push(...(await unlockTiers(db, userId, "reserve_topups", topupsCount, RESERVE_TOPUPS_THRESHOLDS)));

  return out;
}

// ============================================================
// Path 5 + situational "Цели" — after goals.saved_amount changes
// ============================================================
export async function checkGoalAchievements(db: Queryable, userId: string): Promise<UnlockedAchievement[]> {
  const goalsRes = await db.query(
    `select target_amount, deadline_date, completed_at from goals where user_id = $1 and completed_at is not null`,
    [userId]
  );
  const closed = goalsRes.rows.map((r) => ({
    targetAmount: Number(r.target_amount),
    deadlineDate: r.deadline_date as string, // ISO
    completedAt: new Date(r.completed_at).getTime(),
  }));

  const out = await unlockTiers(db, userId, "goals_closed", closed.length, GOALS_CLOSED_THRESHOLDS);
  const cutoff = Date.now() - GOALS_CLOSED_TIER4_WINDOW * 7 * 86400000;
  if (closed.filter((g) => g.completedAt >= cutoff).length >= GOALS_CLOSED_TIER4_TARGET) {
    const r = await unlock(db, userId, "goals_closed_tier4");
    if (r) out.push(r);
  }

  const anyGoalRes = await db.query(`select count(*)::int as n from goals where user_id = $1`, [userId]);
  const goalsCreatedCount = Number(anyGoalRes.rows[0].n);
  if (goalsCreatedCount >= 1) {
    const r = await unlock(db, userId, "goal_first_seed");
    if (r) out.push(r);
  }
  out.push(...(await unlockTiers(db, userId, "goals_created", goalsCreatedCount, GOALS_CREATED_THRESHOLDS)));

  if (closed.length >= 1) {
    const r = await unlock(db, userId, "goal_first_finish");
    if (r) out.push(r);
  }

  let earlyDays14Count = 0;
  for (const g of closed) {
    const deadlineMs = new Date(g.deadlineDate).getTime();
    if (deadlineMs - g.completedAt >= 7 * 86400000) {
      const r = await unlock(db, userId, "goal_beat_deadline");
      if (r) out.push(r);
    }
    if (deadlineMs - g.completedAt >= 14 * 86400000) earlyDays14Count++;
  }
  out.push(...(await unlockTiers(db, userId, "goal_early14", earlyDays14Count, GOAL_EARLY14_THRESHOLDS)));

  // Взнос в цель по неделям, across every goal this user has ever had —
  // "план выполнен" and "план перевыполнен на 20%+" milestone counts.
  const logRes = await db.query(
    `select gl.planned_amount, gl.actual_amount from goal_log gl
     join goals g on g.id = gl.goal_id
     where g.user_id = $1`,
    [userId]
  );
  const logRows = logRes.rows.map((r) => ({ planned: Number(r.planned_amount), actual: Number(r.actual_amount) }));
  const ontrackCount = logRows.filter((r) => r.actual >= r.planned).length;
  const overPlanCount = logRows.filter((r) => r.actual >= r.planned * 1.2).length;
  out.push(...(await unlockTiers(db, userId, "goal_ontrack", ontrackCount, GOAL_ONTRACK_THRESHOLDS)));
  out.push(...(await unlockTiers(db, userId, "goal_over_plan", overPlanCount, GOAL_OVER_PLAN_THRESHOLDS)));

  // "Американские горки": some goal_log row with actual < planned, for a
  // goal that still closed before its own deadline.
  const rollercoasterRes = await db.query(
    `select 1 from goals g
     join goal_log gl on gl.goal_id = g.id
     where g.user_id = $1 and g.completed_at is not null
       and g.completed_at <= (g.deadline_date + interval '1 day')
       and gl.actual_amount < gl.planned_amount
     limit 1`,
    [userId]
  );
  if (rollercoasterRes.rows.length > 0) {
    const r = await unlock(db, userId, "goal_rollercoaster");
    if (r) out.push(r);
  }

  return out;
}

// ============================================================
// Path 2 + situational "Касса" — after kassa_entries changes
// ============================================================
async function loadKassaHistory(db: Queryable, userId: string) {
  const [targetsRes, entriesRes] = await Promise.all([
    db.query(`select week_start_date, required_kassa from sales_target where user_id = $1 order by week_start_date desc`, [userId]),
    db.query(`select date, amount from kassa_entries where user_id = $1 order by date asc`, [userId]),
  ]);
  const targets = targetsRes.rows.map((r) => ({ weekStartDate: isoToDDMMYYYY(r.week_start_date), requiredKassa: Number(r.required_kassa) }));
  const entries = entriesRes.rows.map((r) => ({ date: isoToDDMMYYYY(r.date), amount: Number(r.amount) }));
  return { targets, entries };
}

function weekTotal(entries: { date: string; amount: number }[], weekStartDate: string): number {
  const weekEndDate = addDays(weekStartDate, 6);
  return entries
    .filter((e) => dateToSortable(e.date) >= dateToSortable(weekStartDate) && dateToSortable(e.date) <= dateToSortable(weekEndDate))
    .reduce((s, e) => s + e.amount, 0);
}

export async function checkKassaAchievements(db: Queryable, userId: string): Promise<UnlockedAchievement[]> {
  const { targets, entries } = await loadKassaHistory(db, userId); // targets: desc by week
  const weeklyStatus = targets.map((t) => {
    const total = weekTotal(entries, t.weekStartDate);
    return { weekStartDate: t.weekStartDate, requiredKassa: t.requiredKassa, total, met: total >= t.requiredKassa };
  });

  const out: UnlockedAchievement[] = [];

  // Path 2: longest-ever run of consecutive met weeks anywhere in the
  // history (same reasoning as maxConsecutiveStreak above) — a streak
  // that already happened stays earned even after a later gap or miss.
  let bestKassaStreak = 0;
  let kassaRun = 0;
  let prevWeekDate: string | null = null;
  for (const w of [...weeklyStatus].reverse()) {
    // ascending order
    if (w.met && prevWeekDate !== null && addDays(prevWeekDate, 7) === w.weekStartDate) {
      kassaRun++;
    } else if (w.met) {
      kassaRun = 1;
    } else {
      kassaRun = 0;
    }
    bestKassaStreak = Math.max(bestKassaStreak, kassaRun);
    prevWeekDate = w.weekStartDate;
  }
  out.push(...(await unlockTiers(db, userId, "kassa_streak", bestKassaStreak, KASSA_STREAK_THRESHOLDS)));

  const cutoffSortable = dateToSortable(addDays(lastMonday(), -(KASSA_STREAK_TIER4_WINDOW - 1) * 7));
  const metInWindow = weeklyStatus.filter((w) => w.met && dateToSortable(w.weekStartDate) >= cutoffSortable).length;
  if (metInWindow >= KASSA_STREAK_TIER4_TARGET) {
    const r = await unlock(db, userId, "kassa_streak_tier4");
    if (r) out.push(r);
  }

  // Всего отработанных смен (distinct дней с записями кассы, всё время).
  out.push(...(await unlockTiers(db, userId, "kassa_shifts", new Set(entries.map((e) => e.date)).size, KASSA_SHIFTS_THRESHOLDS)));

  // Недель с кассой ≥ 200% от плана.
  out.push(
    ...(await unlockTiers(
      db,
      userId,
      "kassa_double",
      weeklyStatus.filter((w) => w.requiredKassa > 0 && w.total >= w.requiredKassa * 2).length,
      KASSA_DOUBLE_THRESHOLDS
    ))
  );

  // В яблочко: any single day 99-101% of that week's flat daily target —
  // counts every qualifying day (not just the first) for the count series,
  // while the one-off achievement still only fires once, on the first.
  let bullseyeDayCount = 0;
  for (const t of targets) {
    const dailyTarget = t.requiredKassa / 5;
    if (dailyTarget <= 0) continue;
    const byDay: Record<string, number> = {};
    for (const e of entries) {
      if (dateToSortable(e.date) >= dateToSortable(t.weekStartDate) && dateToSortable(e.date) <= dateToSortable(addDays(t.weekStartDate, 6))) {
        byDay[e.date] = (byDay[e.date] || 0) + e.amount;
      }
    }
    for (const total of Object.values(byDay)) {
      if (total >= dailyTarget * 0.99 && total <= dailyTarget * 1.01) {
        bullseyeDayCount++;
        if (bullseyeDayCount === 1) {
          const r = await unlock(db, userId, "kassa_bullseye");
          if (r) out.push(r);
        }
      }
    }
  }
  out.push(...(await unlockTiers(db, userId, "kassa_bullseye_count", bullseyeDayCount, KASSA_BULLSEYE_COUNT_THRESHOLDS)));

  // Взрыв кассы: any week >= 150% of its own required kassa
  if (weeklyStatus.some((w) => w.requiredKassa > 0 && w.total >= w.requiredKassa * 1.5)) {
    const r = await unlock(db, userId, "kassa_explosion");
    if (r) out.push(r);
  }

  // Личный вулкан + Без дыр: bucket ALL entries by calendar week regardless
  // of whether that week has a sales_target row.
  const byWeek: Record<string, { total: number; days: Set<string> }> = {};
  for (const e of entries) {
    const wk = mondayOf(e.date);
    if (!byWeek[wk]) byWeek[wk] = { total: 0, days: new Set() };
    byWeek[wk].total += e.amount;
    byWeek[wk].days.add(e.date);
  }
  const weekKeys = Object.keys(byWeek).sort((a, b) => (dateToSortable(a) < dateToSortable(b) ? -1 : 1));
  for (let i = 1; i < weekKeys.length; i++) {
    const priorMax = Math.max(...weekKeys.slice(0, i).map((k) => byWeek[k].total));
    if (priorMax > 0 && byWeek[weekKeys[i]].total >= priorMax * 1.2) {
      const r = await unlock(db, userId, "kassa_volcano");
      if (r) out.push(r);
      break;
    }
  }
  let noGapsCount = 0;
  for (const wk of weekKeys) {
    const workDays = [0, 1, 2, 3, 4].map((i) => addDays(wk, i));
    if (workDays.every((d) => byWeek[wk].days.has(d))) {
      noGapsCount++;
      if (noGapsCount === 1) {
        const r = await unlock(db, userId, "kassa_no_gaps");
        if (r) out.push(r);
      }
    }
  }
  out.push(...(await unlockTiers(db, userId, "kassa_no_gaps_count", noGapsCount, KASSA_NO_GAPS_COUNT_THRESHOLDS)));

  // Отскок: two sales_target weeks exactly 7 days apart, earlier failed, later met
  for (let i = 0; i < weeklyStatus.length - 1; i++) {
    const later = weeklyStatus[i];
    const earlier = weeklyStatus[i + 1];
    if (addDays(earlier.weekStartDate, 7) === later.weekStartDate && !earlier.met && later.met) {
      const r = await unlock(db, userId, "kassa_bounce");
      if (r) out.push(r);
      break;
    }
  }

  return out;
}

// ============================================================
// Situational "Бюджетная дисциплина" — after transaction add/edit
// ============================================================
export async function checkTransactionAchievements(db: Queryable, userId: string, categoryEdited: boolean): Promise<UnlockedAchievement[]> {
  const out: UnlockedAchievement[] = [];

  if (categoryEdited) {
    const r = await unlock(db, userId, "budget_caught_myself");
    if (r) out.push(r);
  }

  const [capsRes, txRes] = await Promise.all([
    db.query(`select category_name, weekly_cap from envelopes where user_id = $1 and is_regular and weekly_cap is not null`, [userId]),
    db.query(`select date, category, description, amount, created_at from transactions where user_id = $1 and amount < 0`, [userId]),
  ]);
  const txs = txRes.rows.map((r) => ({
    date: isoToDDMMYYYY(r.date as string),
    category: r.category as string,
    description: (r.description as string) || "",
    amount: Number(r.amount),
    createdAt: new Date(r.created_at as string),
  }));

  // Холодная голова: the most recently COMPLETED Friday-anchored budget week
  // (not the live one) had no regular envelope go over its cap — plus how
  // many such clean weeks run consecutively trailing back from there.
  const prevWeekStart = addDays(lastFriday(), -7);
  if (capsRes.rows.length > 0) {
    const weekSpend = (weekStart: string) => {
      const weekEnd = addDays(weekStart, 6);
      const byCat = new Map<string, number>();
      let hasAnyTx = false;
      for (const t of txs) {
        if (dateToSortable(t.date) >= dateToSortable(weekStart) && dateToSortable(t.date) <= dateToSortable(weekEnd)) {
          hasAnyTx = true;
          byCat.set(t.category, (byCat.get(t.category) || 0) + Math.abs(t.amount));
        }
      }
      return { hasAnyTx, anyOver: capsRes.rows.some((c) => (byCat.get(c.category_name as string) || 0) > Number(c.weekly_cap)) };
    };

    const prevWeek = weekSpend(prevWeekStart);
    if (prevWeek.hasAnyTx && !prevWeek.anyOver) {
      const r = await unlock(db, userId, "budget_cold_head");
      if (r) out.push(r);
    }

    let coldStreak = 0;
    let wk = prevWeekStart;
    for (;;) {
      const { hasAnyTx, anyOver } = weekSpend(wk);
      if (!hasAnyTx || anyOver) break;
      coldStreak++;
      wk = addDays(wk, -7);
    }
    out.push(...(await unlockTiers(db, userId, "cold_head_streak", coldStreak, COLD_HEAD_STREAK_THRESHOLDS)));
  }

  out.push(...(await unlockTiers(db, userId, "txn_count", txs.length, TXN_COUNT_THRESHOLDS)));

  const investWeeks = [...new Set(txs.filter((t) => t.category === INVEST_CATEGORY).map((t) => fridayOf(t.date)))];
  out.push(...(await unlockTiers(db, userId, "invest_streak", maxConsecutiveStreak(investWeeks), INVEST_STREAK_THRESHOLDS)));

  out.push(...(await unlockTiers(db, userId, "category_variety", new Set(txs.map((t) => t.category)).size, CATEGORY_VARIETY_THRESHOLDS)));

  out.push(
    ...(await unlockTiers(db, userId, "desc_count", txs.filter((t) => t.description.trim() !== "").length, DESC_COUNT_THRESHOLDS))
  );

  out.push(
    ...(await unlockTiers(
      db,
      userId,
      "same_day_log",
      txs.filter((t) => toDDMMYYYY(t.createdAt) === t.date).length,
      SAME_DAY_LOG_THRESHOLDS
    ))
  );

  const weeksWithTx = new Set(txs.map((t) => fridayOf(t.date)));
  const miscWeeks = new Set(txs.filter((t) => t.category === MISC_CATEGORY).map((t) => fridayOf(t.date)));
  out.push(
    ...(await unlockTiers(db, userId, "no_misc", [...weeksWithTx].filter((w) => !miscWeeks.has(w)).length, NO_MISC_THRESHOLDS))
  );

  return out;
}

// ============================================================
// Situational "Своя система" — after category_keywords changes
// ============================================================
export async function checkKeywordAchievements(db: Queryable, userId: string): Promise<UnlockedAchievement[]> {
  const res = await db.query(`select count(*)::int as n from category_keywords where user_id = $1`, [userId]);
  if (Number(res.rows[0].n) >= 3) {
    const r = await unlock(db, userId, "budget_own_system");
    if (r) return [r];
  }
  return [];
}

// ============================================================
// Situational "Бюджетная дисциплина" — after a new envelope is created
// ============================================================
export async function checkEnvelopeAchievements(db: Queryable, userId: string): Promise<UnlockedAchievement[]> {
  const res = await db.query(`select category_name from envelopes where user_id = $1`, [userId]);
  const customCount = res.rows.filter((r) => !CATEGORIES.includes(r.category_name as string)).length;
  return unlockTiers(db, userId, "custom_envelopes", customCount, CUSTOM_ENVELOPES_THRESHOLDS);
}

// ============================================================
// Overview for the "Достижения" screen — all defs, unlocked status/dates,
// and the current raw progress value for each of the 5 tiered paths.
// ============================================================
export interface AchievementsOverview {
  unlockedCount: number;
  totalCount: number;
  unlocked: Record<string, string>; // key -> unlocked_at ISO string
  pathProgress: Record<string, number>; // path key -> current raw metric value
  kassaMetInWindow: number; // for kassa_streak tier 4's "40 of last 52 weeks" rule
  goalsClosedInWindow: number; // for goals_closed tier 4's "10 in last 52 weeks" rule
}

const PATH_KEYS = ["discipline", "kassa_streak", "income_growth", "reserve_cushion", "goals_closed"] as const;

export async function getAchievementsOverview(db: Queryable, userId: string): Promise<AchievementsOverview> {
  const [unlockedRes, incomeRes, kassaHistory, reserveRes, avgRes, goalsRes] = await Promise.all([
    db.query(`select achievement_key, unlocked_at from user_achievements where user_id = $1`, [userId]),
    db.query(`select week_start_date, income from weekly_incomes where user_id = $1 order by week_start_date asc`, [userId]),
    loadKassaHistory(db, userId),
    db.query(`select saved_amount from reserve_fund where user_id = $1`, [userId]),
    db.query(`select avg(income) as avg_income from weekly_incomes where user_id = $1`, [userId]),
    db.query(`select completed_at from goals where user_id = $1 and completed_at is not null`, [userId]),
  ]);

  const unlocked: Record<string, string> = {};
  for (const r of unlockedRes.rows) unlocked[r.achievement_key as string] = new Date(r.unlocked_at).toISOString();

  const incomeRows = incomeRes.rows.map((r) => ({ weekStartDate: isoToDDMMYYYY(r.week_start_date), income: Number(r.income) }));
  const disciplineStreak = consecutiveStreak([...incomeRows].reverse().map((r) => r.weekStartDate));
  const growthPct = incomeRows.length > 0 && incomeRows[0].income > 0 ? ((incomeRows[incomeRows.length - 1].income - incomeRows[0].income) / incomeRows[0].income) * 100 : 0;

  const weeklyStatus = kassaHistory.targets.map((t) => ({
    weekStartDate: t.weekStartDate,
    met: weekTotal(kassaHistory.entries, t.weekStartDate) >= t.requiredKassa,
  }));
  let kassaStreak = 0;
  for (let i = 0; i < weeklyStatus.length; i++) {
    if (!weeklyStatus[i].met) break;
    if (i > 0 && addDays(weeklyStatus[i - 1].weekStartDate, -7) !== weeklyStatus[i].weekStartDate) break;
    kassaStreak++;
  }

  const cutoffSortable = dateToSortable(addDays(lastMonday(), -(KASSA_STREAK_TIER4_WINDOW - 1) * 7));
  const kassaMetInWindow = weeklyStatus.filter((w) => w.met && dateToSortable(w.weekStartDate) >= cutoffSortable).length;

  const saved = reserveRes.rows[0] ? Number(reserveRes.rows[0].saved_amount) : 0;
  const avgIncome = avgRes.rows[0]?.avg_income != null ? Number(avgRes.rows[0].avg_income) : 0;
  const cushionWeeks = avgIncome > 0 ? saved / avgIncome : 0;

  const closedGoalsCount = goalsRes.rows.length;
  const goalsCutoff = Date.now() - GOALS_CLOSED_TIER4_WINDOW * 7 * 86400000;
  const goalsClosedInWindow = goalsRes.rows.filter((r) => new Date(r.completed_at).getTime() >= goalsCutoff).length;

  const pathProgress: Record<string, number> = {
    discipline: disciplineStreak,
    kassa_streak: kassaStreak,
    income_growth: Math.max(0, growthPct),
    reserve_cushion: cushionWeeks,
    goals_closed: closedGoalsCount,
  };

  return {
    unlockedCount: Object.keys(unlocked).length,
    totalCount: ACHIEVEMENTS.length,
    unlocked,
    pathProgress,
    kassaMetInWindow,
    goalsClosedInWindow,
  };
}

export { PATH_KEYS };
