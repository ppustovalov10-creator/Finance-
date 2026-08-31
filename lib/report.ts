import type { AppState } from "./types";
import { fmt } from "./format";
import { spentSince } from "./calc";
import { dateToSortable } from "./date";
import { weeklyCapsOf } from "./types";

/** Ported 1:1 from buildReportText(). */
export function buildReportText(state: AppState): string {
  const week = state.currentWeek;
  const spent = spentSince(state.transactions, week.startDate);
  const available = (week.income || 0) + (week.carryIn || 0);
  const remaining = available - spent;
  const pct = state.goal.target > 0 ? Math.min(100, (state.goal.saved / state.goal.target) * 100) : 0;

  const caps = weeklyCapsOf(state.envelopes);
  const weekStartSortable = dateToSortable(week.startDate);
  const byCat: Record<string, number> = {};
  state.transactions.forEach((t) => {
    if (t.amount < 0 && dateToSortable(t.date) >= weekStartSortable) {
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

  return [
    `ОТЧЁТ ЗА НЕДЕЛЮ (с ${week.startDate})`,
    `Дата отчёта: ${new Date().toLocaleDateString("ru-RU")}`,
    ``,
    `Доход: ${fmt(week.income || 0)}${week.carryIn ? ` (+ остаток ${fmt(week.carryIn)})` : ""}`,
    `Потрачено: ${fmt(-spent)}`,
    `Остаток на неделю: ${fmt(remaining)}`,
    ``,
    `Цель «${state.goal.name}»: ${pct.toFixed(0)}% (${fmt(state.goal.saved)} из ${fmt(state.goal.target)}, дедлайн ${state.goal.deadlineDate})`,
    `Подушка безопасности: ${fmt(state.reserve.saved)}`,
    `Доход-пол: ${state.incomeFloor != null ? fmt(state.incomeFloor) : "не задан"}${state.survivalMode ? " — РЕЖИМ ВЫЖИВАНИЯ ВКЛЮЧЁН" : ""}`,
    ``,
    `Траты по конвертам:`,
    catLines || "  (пока пусто)",
  ].join("\n");
}
