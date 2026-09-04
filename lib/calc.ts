import { addDays, dateToSortable, dowName, weeksRemainingToGoal } from "./date";
import type { AppState, Envelope, Transaction } from "./types";
import { weeklyCapsOf, irregularCategoriesOf } from "./types";
import { fmt } from "./format";

export interface WeeklyTargetResult {
  base: number;
  regularEntries: [string, number][];
  irregularEntries: [string, number][];
  goalLeft: number;
  weeks: number;
  goalContribution: number;
  bufferAmt: number;
  target: number;
}

/**
 * Ported 1:1 from renderWeeklyTarget(). "Irregular" envelopes (clothing,
 * health by default) are tracked and capped but excluded from the base spend
 * that drives the weekly earn target.
 */
export function calcWeeklyTarget(state: AppState): WeeklyTargetResult {
  const caps = weeklyCapsOf(state.envelopes);
  const irregular = irregularCategoriesOf(state.envelopes);
  const regularEntries = Object.entries(caps).filter(([cat]) => !irregular.includes(cat));
  const irregularEntries = Object.entries(caps).filter(([cat]) => irregular.includes(cat));
  const base = regularEntries.reduce((a, [, v]) => a + v, 0);
  const goalLeft = Math.max(0, state.goal.target - state.goal.saved);
  const weeks = weeksRemainingToGoal(state.currentWeek.startDate, state.goal.deadlineDate);
  const goalContribution = goalLeft / weeks;
  const beforeBuffer = base + goalContribution;
  const target = beforeBuffer * 1.1;
  const bufferAmt = target - beforeBuffer;
  return { base, regularEntries, irregularEntries, goalLeft, weeks, goalContribution, bufferAmt, target };
}

export interface Tier {
  key: "min" | "mid" | "hero";
  emoji: string;
  name: string;
  amount: number;
  sub: string;
}

const TIERS = [
  { key: "min" as const, emoji: "😌", name: "Минималка", mult: 1, note: "план по дедлайну" },
  { key: "mid" as const, emoji: "💪", name: "Средняя", mult: 1.5, note: "закроешь раньше" },
  { key: "hero" as const, emoji: "🚀", name: "Герой-красавчик", mult: 2, note: "максимальный рывок" },
];

/** Ported 1:1 from renderTierCards(). Returns null when no goal is set, and
 * 'done' when the goal is already reached. */
export function calcTierCards(
  base: number,
  goalLeft: number,
  weeksRemaining: number,
  baseContribution: number,
  deadlineDate: string | null,
  hasGoal: boolean
): { status: "no-goal" } | { status: "done" } | { status: "ok"; tiers: Tier[] } {
  if (!hasGoal) return { status: "no-goal" };
  if (goalLeft <= 0) return { status: "done" };
  const tiers = TIERS.map((t) => {
    const contribution = baseContribution * t.mult;
    const amount = (base + contribution) * 1.1;
    const weeksNeeded = contribution > 0 ? goalLeft / contribution : weeksRemaining;
    const deltaWeeks = weeksRemaining - weeksNeeded;
    const daysEarlier = Math.round(deltaWeeks * 7);
    const sub =
      t.mult === 1
        ? `точно к ${deadlineDate}`
        : daysEarlier > 0
          ? `на ~${daysEarlier} дн. раньше срока`
          : t.note;
    return { key: t.key, emoji: t.emoji, name: t.name, amount, sub };
  });
  return { status: "ok", tiers };
}

export interface DayInfo {
  dateStr: string;
  dow: string;
  isToday: boolean;
  isFuture: boolean;
  dayTotal: number;
  dayTx: Transaction[];
  comment: string;
  commentClass: "" | "ok" | "warn";
}

/** Ported 1:1 from renderDayBreakdown(). */
export function calcDayBreakdown(state: AppState, base: number, now: Date = new Date()): DayInfo[] {
  const week = state.currentWeek;
  const todayStr = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
  const caps = weeklyCapsOf(state.envelopes);

  let cumulative = 0;
  const dailyPace = base / 7;
  const days: DayInfo[] = [];
  for (let i = 0; i < 7; i++) {
    const dateStr = addDays(week.startDate, i);
    const isFuture = dateToSortable(dateStr) > dateToSortable(todayStr);
    const dayTx = state.transactions.filter((t) => t.date === dateStr && t.amount < 0);
    const dayTotal = dayTx.reduce((s, t) => s + Math.abs(t.amount), 0);
    if (!isFuture) cumulative += dayTotal;
    const isToday = dateStr === todayStr;

    let comment = "";
    let commentClass: "" | "ok" | "warn" = "";
    if (isFuture) {
      comment = "";
    } else if (dayTotal === 0) {
      comment = "Трат не было — день в плюс к плану.";
      commentClass = "ok";
    } else {
      const catsToday = [...new Set(dayTx.map((t) => t.cat))];
      const overCats: { cat: string; spentInCat: number; cap: number }[] = [];
      catsToday.forEach((cat) => {
        const cap = caps[cat];
        if (cap === undefined) return;
        const spentInCat = state.transactions
          .filter(
            (t) =>
              t.cat === cat &&
              t.amount < 0 &&
              dateToSortable(t.date) >= dateToSortable(week.startDate) &&
              dateToSortable(t.date) <= dateToSortable(dateStr)
          )
          .reduce((s, t) => s + Math.abs(t.amount), 0);
        if (spentInCat > cap) overCats.push({ cat, spentInCat, cap });
      });

      const expectedPace = dailyPace * (i + 1);
      const onPace = cumulative <= expectedPace;

      if (overCats.length > 0) {
        const list = overCats.map((o) => `«${o.cat}» на ${fmt(o.spentInCat - o.cap)}`).join(", ");
        comment = `Превышен лимит конверта: ${list}. Общий темп недели ${onPace ? "пока в норме" : "тоже просел"}.`;
        commentClass = "warn";
      } else if (onPace) {
        comment = `В рамках плана. Накопленные траты недели: ${fmt(cumulative)} из ожидаемых ${fmt(expectedPace)} к этому дню.`;
        commentClass = "ok";
      } else {
        const over = cumulative - expectedPace;
        comment = `Общий темп превышен на ${fmt(over)}, хотя по конвертам лимиты не нарушены — где-то траты крупнее обычного.`;
        commentClass = "warn";
      }
    }

    days.push({ dateStr, dow: dowName(dateStr), isToday, isFuture, dayTotal, dayTx, comment, commentClass });
  }
  return days;
}

export function recalcCapsFromIncome(income: number, pct: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  if (!income || income <= 0) return out;
  Object.entries(pct).forEach(([cat, p]) => {
    out[cat] = Math.round(income * p);
  });
  return out;
}

export function suggestedFloor(incomeLog: { income: number }[]): number | null {
  if (!incomeLog || incomeLog.length === 0) return null;
  return Math.min(...incomeLog.map((w) => w.income));
}

export function spentSince(transactions: Transaction[], sinceDateStr: string): number {
  const sortable = dateToSortable(sinceDateStr);
  return transactions
    .filter((t) => t.amount < 0 && dateToSortable(t.date) >= sortable)
    .reduce((s, t) => s + Math.abs(t.amount), 0);
}

/** Same as spentSince but bounded on both ends — needed for a past week's
 * report, where "since startDate" alone would also pull in every later
 * week's spending. */
export function spentBetween(transactions: Transaction[], startDateStr: string, endDateStr: string): number {
  const startSortable = dateToSortable(startDateStr);
  const endSortable = dateToSortable(endDateStr);
  return transactions
    .filter((t) => t.amount < 0 && dateToSortable(t.date) >= startSortable && dateToSortable(t.date) <= endSortable)
    .reduce((s, t) => s + Math.abs(t.amount), 0);
}

export interface CommittedThisWeek {
  goalContribution: number;
  reserveContribution: number;
  total: number;
}

/**
 * Money already committed this week via a goal contribution or the reserve
 * auto-skim logged against the current week's start date — it's no longer
 * spendable even though it never became a `transactions` row, so it has to
 * come off the weekly balance the same way a spend would.
 */
export function committedThisWeek(state: AppState): CommittedThisWeek {
  // Delta since the snapshot taken when this week was fixed — catches money
  // committed to the goal or reserve however it got there: the
  // income-fixation flow's own contribution field, the reserve auto-skim,
  // or a manual edit via "Изменить цель" / "Подушка безопасности" that
  // never touches goal_log/reserve_log at all.
  const goalContribution = state.goal.saved - state.currentWeek.goalSavedAtWeekStart;
  const reserveContribution = state.reserve.saved - state.currentWeek.reserveSavedAtWeekStart;
  return { goalContribution, reserveContribution, total: goalContribution + reserveContribution };
}

export function categoryTotalsThisWeek(state: AppState): Record<string, number> {
  const sortable = dateToSortable(state.currentWeek.startDate);
  const byCat: Record<string, number> = {};
  state.transactions.forEach((t) => {
    if (t.amount < 0 && dateToSortable(t.date) >= sortable) {
      byCat[t.cat] = (byCat[t.cat] || 0) + Math.abs(t.amount);
    }
  });
  return byCat;
}

export function envelopeCategoriesForView(state: AppState): string[] {
  const caps = weeklyCapsOf(state.envelopes);
  const byCat = categoryTotalsThisWeek(state);
  const allEnvelopeCats = state.envelopes.map((e) => e.category);
  const all = new Set<string>([...Object.keys(caps), ...Object.keys(byCat), ...allEnvelopeCats]);
  return [...all].sort((a, b) => {
    const capA = caps[a] !== undefined ? 0 : 1;
    const capB = caps[b] !== undefined ? 0 : 1;
    if (capA !== capB) return capA - capB;
    return (byCat[b] || 0) - (byCat[a] || 0);
  });
}

export function envelopeMeta(state: AppState, category: string): Envelope | null {
  return state.envelopes.find((e) => e.category === category) || null;
}
