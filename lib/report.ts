import type { AppState } from "./types";
import { fmt } from "./format";
import { spentBetween } from "./calc";
import { addDays, dateToSortable } from "./date";
import { weeklyCapsOf } from "./types";

/**
 * Builds the copy-to-chat report for one week. Defaults to the current
 * week (unchanged from the original behavior: live goal %/reserve total,
 * since "now" IS this week); pass any other `weekStartDate` from
 * state.incomeLog to get a past week's report instead — spend and
 * category totals are bounded to that week's own 7 days, and the goal/
 * reserve lines switch to "what happened this week" (from goal_log /
 * reserve_log) since showing today's running totals in a report about a
 * past week would mix two different points in time.
 */
export function buildReportText(state: AppState, weekStartDate?: string): string {
  const startDate = weekStartDate || state.currentWeek.startDate;
  const isCurrent = startDate === state.currentWeek.startDate;
  const weekEntry = isCurrent
    ? { startDate, income: state.currentWeek.income, carryIn: state.currentWeek.carryIn }
    : state.incomeLog.find((w) => w.startDate === startDate);
  if (!weekEntry) return `Неделя с ${startDate} не найдена в истории.`;

  const endDate = addDays(startDate, 6);
  const spent = spentBetween(state.transactions, startDate, endDate);
  const available = (weekEntry.income || 0) + (weekEntry.carryIn || 0);
  const remaining = available - spent;

  const caps = weeklyCapsOf(state.envelopes);
  const startSortable = dateToSortable(startDate);
  const endSortable = dateToSortable(endDate);
  const byCat: Record<string, number> = {};
  state.transactions.forEach((t) => {
    const d = dateToSortable(t.date);
    if (t.amount < 0 && d >= startSortable && d <= endSortable) {
      byCat[t.cat] = (byCat[t.cat] || 0) + Math.abs(t.amount);
    }
  });
  const catLines = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => {
      const cap = caps[cat];
      return `  • ${cat}: ${fmt(-amt)}${cap !== undefined ? ` из ${fmt(cap)}` : ""}`;
    })
    .join("\n");

  let goalLine: string;
  let reserveLine: string;
  if (isCurrent) {
    const pct = state.goal.target > 0 ? Math.min(100, (state.goal.saved / state.goal.target) * 100) : 0;
    goalLine = `Цель «${state.goal.name}»: ${pct.toFixed(0)}% (${fmt(state.goal.saved)} из ${fmt(state.goal.target)}, дедлайн ${state.goal.deadlineDate})`;
    reserveLine = `Подушка безопасности: ${fmt(state.reserve.saved)}`;
  } else {
    const goalWeek = state.goal.log.find((l) => l.weekStart === startDate);
    goalLine = goalWeek
      ? `Взнос в цель «${state.goal.name}» на этой неделе: план ${fmt(goalWeek.planned)}, отложено ${fmt(goalWeek.actual)}`
      : `Взнос в цель «${state.goal.name}»: за эту неделю данных нет`;
    const reserveWeek = state.reserve.log
      .filter((l) => dateToSortable(l.date) >= startSortable && dateToSortable(l.date) <= endSortable)
      .reduce((s, l) => s + l.amount, 0);
    reserveLine = `Подушка безопасности: ${reserveWeek >= 0 ? "+" : ""}${fmt(reserveWeek)} за эту неделю`;
  }

  const lines = [
    `ОТЧЁТ ЗА НЕДЕЛЮ (с ${startDate})${isCurrent ? "" : " — архив"}`,
    `Дата отчёта: ${new Date().toLocaleDateString("ru-RU")}`,
    ``,
    `Доход: ${fmt(weekEntry.income || 0)}${weekEntry.carryIn ? ` (+ остаток ${fmt(weekEntry.carryIn)})` : ""}`,
    `Потрачено: ${fmt(-spent)}`,
    `Остаток на неделю: ${fmt(remaining)}`,
    ``,
    goalLine,
    reserveLine,
  ];
  if (isCurrent) {
    lines.push(
      `Доход-пол: ${state.incomeFloor != null ? fmt(state.incomeFloor) : "не задан"}${state.survivalMode ? " — РЕЖИМ ВЫЖИВАНИЯ ВКЛЮЧЁН" : ""}`
    );
  }
  lines.push(``, `Траты по конвертам:`, catLines || "  (пока пусто)");
  return lines.join("\n");
}
