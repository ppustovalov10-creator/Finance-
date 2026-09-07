import { addDays, dateToSortable, daysBetween, dowName } from "./date";

export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri";
export type WeekdayTargets = Record<WeekdayKey, number>;

export interface CashEntryLike {
  id: string;
  date: string;
  amount: number;
}

const WEEKDAY_KEYS: WeekdayKey[] = ["mon", "tue", "wed", "thu", "fri"];
const KEY_BY_DOW: Record<string, WeekdayKey> = { Пн: "mon", Вт: "tue", Ср: "wed", Чт: "thu", Пт: "fri" };

export function generateWeekdayTargets(weeklyTarget: number): WeekdayTargets {
  const total = Math.max(0, weeklyTarget);
  const base = Math.floor(total / 5);
  const remainder = total - base * 5;
  return { mon: base + remainder, tue: base, wed: base, thu: base, fri: base };
}

/** Distribute a newly selected target only over Mon–Fri days that have not passed. */
export function generateRemainingWeekdayTargets(weeklyTarget: number, today: string): WeekdayTargets {
  const todayIndex = WEEKDAY_KEYS.indexOf(KEY_BY_DOW[dowName(today)]);
  if (todayIndex < 0) return { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0 };
  const remaining = WEEKDAY_KEYS.slice(todayIndex);
  const total = Math.max(0, Math.round(weeklyTarget));
  const base = Math.floor(total / remaining.length);
  let remainder = total - base * remaining.length;
  const result: WeekdayTargets = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0 };
  for (const key of remaining) { result[key] = base + (remainder > 0 ? 1 : 0); remainder -= 1; }
  return result;
}

export function dailyCashTarget(targets: WeekdayTargets, date: string): number {
  return targets[KEY_BY_DOW[dowName(date)]] || 0;
}

export function aggregateCashWeek(entries: CashEntryLike[], mondayDate: string) {
  const days = WEEKDAY_KEYS.map((key, index) => {
    const date = addDays(mondayDate, index);
    const amount = entries.filter((entry) => entry.date === date).reduce((sum, entry) => sum + entry.amount, 0);
    return { key, date, amount };
  });
  return { days, weeklyTotal: days.reduce((sum, day) => sum + day.amount, 0) };
}

export function cashWeekStart(date: string): string {
  const dow = dowName(date);
  const offset = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].indexOf(dow);
  return addDays(date, -Math.max(0, offset));
}

export function entriesInCashWeek(entries: CashEntryLike[], mondayDate: string): CashEntryLike[] {
  const friday = addDays(mondayDate, 4);
  return entries.filter((entry) => dateToSortable(entry.date) >= dateToSortable(mondayDate) && dateToSortable(entry.date) <= dateToSortable(friday));
}

export function calcCashProgress(input: { weeklyCash: number; weeklyTarget: number; salary: number; salaryTarget: number }) {
  const pct = (value: number, target: number) => (target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0);
  return { cashPercent: pct(input.weeklyCash, input.weeklyTarget), salaryPercent: pct(input.salary, input.salaryTarget) };
}

export function salaryTierPercent(weeklyCash: number): number {
  if (weeklyCash < 70_000) return 0;
  if (weeklyCash < 100_000) return 0.025;
  if (weeklyCash < 120_000) return 0.05;
  if (weeklyCash < 140_000) return 0.06;
  if (weeklyCash < 160_000) return 0.07;
  if (weeklyCash < 180_000) return 0.075;
  if (weeklyCash < 200_000) return 0.08;
  if (weeklyCash < 220_000) return 0.085;
  if (weeklyCash < 240_000) return 0.09;
  if (weeklyCash < 260_000) return 0.095;
  if (weeklyCash < 280_000) return 0.1;
  if (weeklyCash < 300_000) return 0.105;
  return 0.11;
}

export interface SalaryInput {
  weeklyCash: number;
  failedPlan: boolean;
  opsTotal: number;
  opsPlan: number;
  managersTotal: number;
  managersPlan: number;
}

export function calculateSalary(input: SalaryInput): number {
  const opsPlan = Math.min(Math.max(0, input.opsPlan), Math.max(0, input.opsTotal));
  const managersPlan = Math.min(Math.max(0, input.managersPlan), Math.max(0, input.managersTotal));
  return Math.round(
    Math.max(0, input.weeklyCash) * salaryTierPercent(input.weeklyCash) +
      (input.failedPlan ? 0 : 5_000) +
      Math.max(0, input.opsTotal) * 500 +
      opsPlan * 500 +
      Math.max(0, input.managersTotal) * 1_000 +
      managersPlan * 1_000
  );
}


export interface CashScenarioOption {
  name: "Минималка" | "Средний" | "Герой-красавчик";
  multiplier: number; weeklyCash: number; minimumWeeklyCash: number; mandatoryWeekly: number;
  goalContribution: number; weeks: number; completionDate: string | null;
}

export function cashScenarioOptions(input: { today: string; goal: { target: number; saved: number; deadlineDate: string | null }; envelopes: { weeklyCap: number | null; isRegular: boolean }[]; salary: Omit<SalaryInput, "weeklyCash">; multipliers: number[] }): CashScenarioOption[] {
  const mandatoryWeekly = input.envelopes.reduce((sum, envelope) => sum + (envelope.isRegular && envelope.weeklyCap != null ? Math.max(0, envelope.weeklyCap) : 0), 0);
  const goalLeft = Math.max(0, input.goal.target - input.goal.saved);
  const deadlineDays = input.goal.deadlineDate ? Math.max(0, daysBetween(input.today, input.goal.deadlineDate)) : 7;
  const weeks = Math.max(1, deadlineDays / 7);
  const goalContribution = goalLeft / weeks;
  const minimumWeeklyCash = lowestCashForSalary(mandatoryWeekly + goalContribution, input.salary);
  const labels: CashScenarioOption["name"][] = ["Минималка", "Средний", "Герой-красавчик"];
  return input.multipliers.slice(0, 3).map((rawMultiplier, index) => {
    const multiplier = Math.max(0, Number.isFinite(rawMultiplier) ? rawMultiplier : 1);
    const completionWeeks = multiplier > 0 ? weeks / multiplier : Infinity;
    return { name: labels[index], multiplier, weeklyCash: Math.ceil(minimumWeeklyCash * multiplier), minimumWeeklyCash, mandatoryWeekly, goalContribution, weeks, completionDate: input.goal.deadlineDate && Number.isFinite(completionWeeks) ? addDays(input.today, Math.ceil(completionWeeks * 7)) : null };
  });
}

function lowestCashForSalary(requiredSalary: number, salary: Omit<SalaryInput, "weeklyCash">): number {
  if (calculateSalary({ weeklyCash: 0, ...salary }) >= requiredSalary) return 0;
  let high = 1;
  while (calculateSalary({ weeklyCash: high, ...salary }) < requiredSalary) high *= 2;
  let low = 0;
  while (low < high) { const mid = Math.floor((low + high) / 2); if (calculateSalary({ weeklyCash: mid, ...salary }) >= requiredSalary) high = mid; else low = mid + 1; }
  return low;
}
