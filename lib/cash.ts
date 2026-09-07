import { addDays, dateToSortable, dowName } from "./date";

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
