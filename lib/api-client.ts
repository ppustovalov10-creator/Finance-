import type { AppState } from "./types";
import type { KassaState, KassaCalcResult } from "./kassa";
import type { AchievementDef, Rarity } from "./achievements-data";

export class ApiError extends Error {}

export interface NewAchievement {
  key: string;
  title: string;
  icon: string;
  rarity: Rarity;
}

// Any API response can carry a `newAchievements` array (set server-side by
// whichever mutation just unlocked something) — call() surfaces those to a
// single listener rather than threading the field through every route's
// return type, so any part of the UI can trigger a toast without its own
// plumbing.
let achievementListener: ((list: NewAchievement[]) => void) | null = null;
export function onNewAchievements(cb: (list: NewAchievement[]) => void) {
  achievementListener = cb;
}

async function call<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || "Что-то пошло не так");
  if (Array.isArray(data?.newAchievements) && data.newAchievements.length > 0) {
    achievementListener?.(data.newAchievements);
  }
  return data as T;
}

export const api = {
  getState: () => call<AppState>("/api/state", "GET"),
  fixIncome: (b: { dateVal: string; incomeVal: number; carryInVal: number; goalSavedVal: number }) =>
    call("/api/income", "POST", b),
  updateGoal: (b: { name: string; target: number; saved: number; deadlineDate: string; isNewMoney?: boolean; startNew?: boolean }) =>
    call("/api/goal", "PUT", b),
  addTransaction: (b: { amount: number; desc: string; dateStr: string; cat?: string }) =>
    call<{ id: string; cat: string }>("/api/transactions", "POST", b),
  updateTransaction: (
    id: string,
    b: { amount: number; desc: string; dateStr: string; cat: string; remember: boolean }
  ) => call<{ learned: string | null }>(`/api/transactions/${id}`, "PUT", b),
  deleteTransaction: (id: string) => call(`/api/transactions/${id}`, "DELETE"),
  createEnvelope: (b: { name: string; iconKey: string; cap: number | null }) => call("/api/envelopes", "POST", b),
  updateEnvelope: (category: string, b: { newName: string; cap: number | null; isRegular: boolean }) =>
    call(`/api/envelopes/${encodeURIComponent(category)}`, "PUT", b),
  deleteEnvelope: (category: string) => call(`/api/envelopes/${encodeURIComponent(category)}`, "DELETE"),
  recalcCaps: () => call("/api/envelopes/recalc", "POST"),
  addKeyword: (category: string, keyword: string) => call("/api/keywords", "POST", { category, keyword }),
  removeKeyword: (category: string, keyword: string) => call("/api/keywords", "DELETE", { category, keyword }),
  updateFloor: (value: number) => call("/api/floor", "PUT", { value }),
  updateReserve: (b: { pctPercent: number; saved: number; withdraw: number | null; isNewMoney?: boolean }) =>
    call("/api/reserve", "PUT", b),
  setSurvival: (on: boolean) => call("/api/survival", "POST", { on }),
  onboardingFinish: (b: {
    goalName: string;
    goalTarget: number;
    goalDeadline: string;
    weekDate: string;
    income: number;
  }) => call("/api/onboarding", "POST", b),
  onboardingSkip: () => call("/api/onboarding", "POST", { skip: true }),

  getKassaState: () => call<KassaState>("/api/kassa/state", "GET"),
  setSalesTarget: (b: {
    targetSalary: number;
    failedPlan: boolean;
    opsTotal: number;
    opsPlan: number;
    mgrTotal: number;
    mgrPlan: number;
    choice?: "A" | "B";
  }) => call<{ needsChoice: true; result: KassaCalcResult } | { needsChoice: false; requiredKassa: number }>(
    "/api/kassa/target",
    "POST",
    b
  ),
  addKassaEntry: (b: { amount: number; dateStr: string }) =>
    call<{ id: string }>("/api/kassa/entries", "POST", b),
  updateKassaEntry: (id: string, b: { amount: number; dateStr: string }) =>
    call(`/api/kassa/entries/${id}`, "PUT", b),
  deleteKassaEntry: (id: string) => call(`/api/kassa/entries/${id}`, "DELETE"),

  getAchievements: () =>
    call<{
      achievements: AchievementDef[];
      unlockedCount: number;
      totalCount: number;
      unlocked: Record<string, string>;
      pathProgress: Record<string, number>;
      kassaMetInWindow: number;
      goalsClosedInWindow: number;
    }>("/api/achievements", "GET"),
};
