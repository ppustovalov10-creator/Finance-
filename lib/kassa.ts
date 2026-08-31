// "Касса" — a personal weekly sales-commission target, independent of the
// budget tab. Business formula is fixed company-wide (not user-configurable).

import { addDays, dateToSortable, dowName, toDDMMYYYY } from "./date";
import { fmt } from "./format";

export interface Tier {
  min: number;
  max: number | null; // null = no upper bound (top tier)
  percent: number;
}

// Weekly commission-rate scale. Do not change the numbers.
export const KASSA_TIERS: Tier[] = [
  { min: 0, max: 69999, percent: 0 },
  { min: 70000, max: 99999, percent: 2.5 },
  { min: 100000, max: 119999, percent: 5 },
  { min: 120000, max: 139999, percent: 6 },
  { min: 140000, max: 159999, percent: 7 },
  { min: 160000, max: 179999, percent: 7.5 },
  { min: 180000, max: 199999, percent: 8 },
  { min: 200000, max: 219999, percent: 8.5 },
  { min: 220000, max: 239999, percent: 9 },
  { min: 240000, max: 259999, percent: 9.5 },
  { min: 260000, max: 279999, percent: 10 },
  { min: 280000, max: 299999, percent: 10.5 },
  { min: 300000, max: null, percent: 11 },
];

export const BASE_SALARY = 5000;
export const OPS_RATE = 500;
export const MGR_RATE = 1000;

export interface TeamInputs {
  failedPlan: boolean;
  opsTotal: number;
  opsPlan: number;
  mgrTotal: number;
  mgrPlan: number;
}

export function computeBonuses(input: TeamInputs) {
  const baseSalary = input.failedPlan ? 0 : BASE_SALARY;
  // Both fields carry the same per-head rate — that's the company formula as
  // given, not a typo: a flat "has a team" bonus plus a matching "team hit
  // plan" bonus, each counted per head.
  const opBonus = (input.opsTotal + input.opsPlan) * OPS_RATE;
  const mgrBonus = (input.mgrTotal + input.mgrPlan) * MGR_RATE;
  return { baseSalary, opBonus, mgrBonus };
}

export function tierForKassa(kassa: number): Tier {
  for (const t of KASSA_TIERS) {
    if (kassa >= t.min && (t.max === null || kassa <= t.max)) return t;
  }
  return KASSA_TIERS[KASSA_TIERS.length - 1];
}

export function commissionForKassa(kassa: number): number {
  const tier = tierForKassa(kassa);
  return (kassa * tier.percent) / 100;
}

export function salaryForKassa(kassa: number, baseSalary: number, opBonus: number, mgrBonus: number): number {
  return baseSalary + opBonus + mgrBonus + commissionForKassa(kassa);
}

export type KassaCalcResult =
  | { status: "covered"; baseSalary: number; opBonus: number; mgrBonus: number }
  | { status: "exact"; requiredKassa: number; baseSalary: number; opBonus: number; mgrBonus: number }
  | {
      status: "gap";
      optionA: { kassa: number; salary: number };
      optionB: { kassa: number; salary: number };
      baseSalary: number;
      opBonus: number;
      mgrBonus: number;
    };

/** Reverse calculation: target weekly salary -> required kassa. */
export function computeRequiredKassa(targetSalary: number, team: TeamInputs): KassaCalcResult {
  const { baseSalary, opBonus, mgrBonus } = computeBonuses(team);
  const needed = targetSalary - baseSalary - opBonus - mgrBonus;
  if (needed <= 0) return { status: "covered", baseSalary, opBonus, mgrBonus };

  // Tiny tolerance so a `needed` value that lands exactly on a tier boundary
  // (floating-point subtraction of rubles-and-fractional-percent inputs
  // rarely lands on an exact IEEE-754 value) isn't spuriously classified as
  // an unreachable gap.
  const EPS = 1e-6;

  // Direct hit: does some tier's achievable commission range contain `needed`?
  for (const tier of KASSA_TIERS) {
    if (tier.percent === 0) continue;
    const commissionMin = (tier.min * tier.percent) / 100;
    const commissionMax = tier.max === null ? null : (tier.max * tier.percent) / 100;
    if (needed >= commissionMin - EPS && (commissionMax === null || needed <= commissionMax + EPS)) {
      const requiredKassa = needed / (tier.percent / 100);
      return { status: "exact", requiredKassa, baseSalary, opBonus, mgrBonus };
    }
  }

  // Gap between tiers: no kassa produces exactly `needed` commission. Find
  // the closest achievable tier boundary below and above.
  let below: Tier | null = null;
  let above: Tier | null = null;
  for (const tier of KASSA_TIERS) {
    const commissionMin = (tier.min * tier.percent) / 100;
    const commissionMax = tier.max === null ? Infinity : (tier.max * tier.percent) / 100;
    if (commissionMax < needed - EPS) below = tier; // last match wins -> closest below
    if (commissionMin > needed + EPS && above === null) above = tier; // first match -> closest above
  }
  // `below` always resolves (the 0%/0-69999 tier's commission is always 0 <
  // needed here) and `above` always resolves (the top tier is unbounded, so
  // any needed>0 either direct-hits it above or a lower tier catches it) —
  // reaching either branch missing means KASSA_TIERS itself is malformed.
  if (!below || above === null || below.max === null) {
    throw new Error("Не удалось найти границы тарифа — проверь таблицу KASSA_TIERS");
  }

  const kassaA = below.max;
  const kassaB = above.min;
  return {
    status: "gap",
    optionA: { kassa: kassaA, salary: salaryForKassa(kassaA, baseSalary, opBonus, mgrBonus) },
    optionB: { kassa: kassaB, salary: salaryForKassa(kassaB, baseSalary, opBonus, mgrBonus) },
    baseSalary,
    opBonus,
    mgrBonus,
  };
}

export function resolveRequiredKassa(result: KassaCalcResult, choice?: "A" | "B"): number {
  if (result.status === "covered") return 0;
  if (result.status === "exact") return result.requiredKassa;
  if (choice === "A") return result.optionA.kassa;
  if (choice === "B") return result.optionB.kassa;
  throw new Error("Нужно выбрать вариант А или Б");
}

export interface SalesTarget {
  id: string;
  weekStartDate: string; // DD.MM.YYYY
  targetSalary: number;
  failedPlan: boolean;
  opsTotal: number;
  opsPlan: number;
  mgrTotal: number;
  mgrPlan: number;
  requiredKassa: number;
}

export interface KassaEntry {
  id: string;
  date: string; // DD.MM.YYYY
  amount: number;
}

export interface KassaState {
  weekStartDate: string;
  target: SalesTarget | null;
  entries: KassaEntry[];
}

export interface KassaProgress {
  totalEntered: number;
  dailyTarget: number;
  kassaPct: number; // entered / required kassa
  currentSalary: number; // salary the entered kassa would actually produce
  salaryPct: number; // currentSalary / target salary
}

/**
 * Two parallel percentages: how much of the required *kassa* has been
 * entered, and — since salary isn't linear in kassa (the commission rate
 * jumps at tier boundaries) — how much of the target *salary* that kassa
 * would actually produce right now.
 */
export function progressForTarget(target: SalesTarget, entries: KassaEntry[]): KassaProgress {
  const totalEntered = entries.reduce((s, e) => s + e.amount, 0);
  const dailyTarget = target.requiredKassa / 5;
  const kassaPct = target.requiredKassa > 0 ? (totalEntered / target.requiredKassa) * 100 : 0;
  const { baseSalary, opBonus, mgrBonus } = computeBonuses({
    failedPlan: target.failedPlan,
    opsTotal: target.opsTotal,
    opsPlan: target.opsPlan,
    mgrTotal: target.mgrTotal,
    mgrPlan: target.mgrPlan,
  });
  const currentSalary = salaryForKassa(totalEntered, baseSalary, opBonus, mgrBonus);
  const salaryPct = target.targetSalary > 0 ? (currentSalary / target.targetSalary) * 100 : 0;
  return { totalEntered, dailyTarget, kassaPct, currentSalary, salaryPct };
}

function isWeekend(dateStr: string): boolean {
  const [d, m, y] = dateStr.split(".").map(Number);
  const jsDay = new Date(y, m - 1, d).getDay(); // 0=Sun..6=Sat
  return jsDay === 0 || jsDay === 6;
}

/**
 * Kassa's week runs Monday through Sunday (see lastMonday() in lib/date.ts —
 * a new work week, and a new target, always starts on Monday). Filtering out
 * the weekend leaves exactly Mon-Fri, in that order.
 */
export function workingDaysOfWeek(weekStartDate: string): string[] {
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dateStr = addDays(weekStartDate, i);
    if (!isWeekend(dateStr)) days.push(dateStr);
  }
  return days;
}

export interface KassaDayInfo {
  dateStr: string;
  dow: string;
  isToday: boolean;
  isFuture: boolean;
  dayTotal: number;
  dayEntries: KassaEntry[];
  dayTarget: number;
  comment: string;
  commentClass: "" | "ok" | "warn";
}

/**
 * Each day's target is recomputed from what's actually left to earn, spread
 * over the remaining working days — not a fixed 1/5th of the weekly goal.
 * A day that closes short pushes its shortfall onto the rest of the week
 * (the following days' targets rise); a day that closes over frees up the
 * rest of the week (their targets fall).
 *
 * Only *closed* days (strictly before today) are final enough to trigger
 * that redistribution — today's own entries are still coming in, so they
 * don't get to preemptively inflate or shrink tomorrow's number before the
 * day is even over. Today and every day after it therefore share one live
 * target: what's left once all closed days are accounted for, split across
 * however many days (today included) remain. That shared number only moves
 * when a new day actually closes.
 */
export function calcKassaDayBreakdown(
  weekStartDate: string,
  entries: KassaEntry[],
  requiredKassa: number,
  now: Date = new Date()
): KassaDayInfo[] {
  const todayStr = toDDMMYYYY(now);
  const todaySortable = dateToSortable(todayStr);
  const workDays = workingDaysOfWeek(weekStartDate);
  const totalDays = workDays.length;

  const dayTotals = workDays.map((dateStr) => entries.filter((e) => e.date === dateStr).reduce((s, e) => s + e.amount, 0));

  let closedCount = 0;
  let closedEntered = 0;
  workDays.forEach((dateStr, idx) => {
    if (dateToSortable(dateStr) < todaySortable) {
      closedCount = idx + 1;
      closedEntered += dayTotals[idx];
    }
  });
  const remainingFromToday = Math.max(1, totalDays - closedCount);
  const liveTarget = Math.max(0, (requiredKassa - closedEntered) / remainingFromToday);

  let enteredBefore = 0;
  return workDays.map((dateStr, idx) => {
    const isFuture = dateToSortable(dateStr) > todaySortable;
    const isToday = dateStr === todayStr;
    const isClosed = dateToSortable(dateStr) < todaySortable;
    const dayTotal = dayTotals[idx];
    const dayEntries = entries.filter((e) => e.date === dateStr);

    const dayTarget = isClosed ? Math.max(0, (requiredKassa - enteredBefore) / (totalDays - idx)) : liveTarget;

    let comment = "";
    let commentClass: "" | "ok" | "warn" = "";
    if (!isFuture) {
      if (dayTotal >= dayTarget) {
        comment = "В графике.";
        commentClass = "ok";
      } else {
        comment = `Отстаёшь на ${fmt(dayTarget - dayTotal)}, остаток перейдёт на оставшиеся дни.`;
        commentClass = "warn";
      }
    }
    if (isClosed) enteredBefore += dayTotal;

    return { dateStr, dow: dowName(dateStr), isToday, isFuture, dayTotal, dayEntries, dayTarget, comment, commentClass };
  });
}
