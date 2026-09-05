// Date helpers ported 1:1 from the prototype. Dates are stored/passed around
// as DD.MM.YYYY strings everywhere, exactly like the original, to keep the
// arithmetic identical (avoids timezone surprises from ISO parsing).

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function toDDMMYYYY(d: Date) {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function isoToDDMMYYYY(iso: string) {
  // iso: YYYY-MM-DD (as stored in Postgres date columns / <input type=date>)
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function ddmmyyyyToIso(dateStr: string) {
  const [d, m, y] = dateStr.split(".");
  return `${y}-${m}-${d}`;
}

export function isValidDDMMYYYY(dateStr: string) {
  return /^\d{2}\.\d{2}\.\d{4}$/.test(dateStr);
}

export function lastFriday(now: Date = new Date()): string {
  const d = new Date(now);
  const day = d.getDay(); // 0=Sun..6=Sat, Friday=5
  const diff = day >= 5 ? day - 5 : day + 2;
  d.setDate(d.getDate() - diff);
  return toDDMMYYYY(d);
}

/** Start of the current Mon-Sun work week (used by the Kassa tab — its own,
 * separate week concept from the budget tab's Friday-anchored payday week). */
export function lastMonday(now: Date = new Date()): string {
  const d = new Date(now);
  const day = d.getDay(); // 0=Sun..6=Sat, Monday=1
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return toDDMMYYYY(d);
}

/**
 * Касса treats a day as done at 21:00, not midnight — entering a sale at
 * 22:00 shouldn't reopen "today"'s already-closed target, and from 21:00
 * on, "today" for Kassa purposes should already be tomorrow. Kassa only
 * runs Mon-Fri (see workingDaysOfWeek in lib/kassa.ts), so on a Friday
 * evening or over the weekend this rolls straight through to the next
 * working day/week — callers that derive "today" or "this week's Monday"
 * for Kassa should use this instead of `now` directly.
 */
export function kassaEffectiveNow(now: Date = new Date()): Date {
  if (now.getHours() < 21) return now;
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  return d;
}

/**
 * Which Friday-anchored budget week must already have its income fixed,
 * right now — the payday cutoff is Friday 21:00. Before that time on a
 * Friday, last week's fixed income still counts; from that moment on
 * (including all of Saturday through the next Thursday), this week's
 * Friday needs its own fresh entry.
 */
export function requiredIncomeWeekStart(now: Date = new Date()): string {
  const friday = lastFriday(now);
  const [d, m, y] = friday.split(".").map(Number);
  const cutoff = new Date(y, m - 1, d, 21, 0, 0, 0);
  return now.getTime() >= cutoff.getTime() ? friday : addDays(friday, -7);
}

export function daysUntil(dateStr: string, now: Date = new Date()): number {
  const [d, m, y] = dateStr.split(".").map(Number);
  const target = new Date(y, m - 1, d);
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86400000));
}

export function addDays(dateStr: string, n: number): string {
  const [d, m, y] = dateStr.split(".").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return toDDMMYYYY(dt);
}

export function daysBetween(fromStr: string, toStr: string): number {
  const [fd, fm, fy] = fromStr.split(".").map(Number);
  const [td, tm, ty] = toStr.split(".").map(Number);
  const from = new Date(fy, fm - 1, fd);
  const to = new Date(ty, tm - 1, td);
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 86400000));
}

/**
 * Weeks remaining until the goal deadline, counted from the START OF THE
 * CURRENT WORKING WEEK (currentWeekStartDate) — NOT from today.
 *
 * This is a deliberate, previously-fixed bug: counting from "today" makes the
 * "need to earn" number creep up every single day between paydays even though
 * nothing about the plan changed. Counting from the week's own start date
 * keeps it stable all week and only moves when a new week is fixed. Do not
 * revert this to `daysUntil(deadline)`.
 */
export function weeksRemainingToGoal(currentWeekStartDate: string, deadlineDate: string | null): number {
  if (!deadlineDate) return 1;
  const days = daysBetween(currentWeekStartDate, deadlineDate);
  return Math.max(1, days / 7);
}

export function dateToSortable(d: string): string {
  const [dd, mm, yy] = d.split(".");
  return `${yy}${mm}${dd}`;
}

const DOW_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
export function dowName(dateStr: string): string {
  const [d, m, y] = dateStr.split(".").map(Number);
  const jsDay = new Date(y, m - 1, d).getDay();
  return DOW_NAMES[(jsDay + 6) % 7];
}

export const DOW_FULL = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
