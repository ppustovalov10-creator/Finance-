import type { AppState } from "./types";

export class ApiError extends Error {}

async function call<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || "Что-то пошло не так");
  return data as T;
}

export const api = {
  getState: () => call<AppState>("/api/state", "GET"),
  fixIncome: (b: { dateVal: string; incomeVal: number; carryInVal: number; goalSavedVal: number }) =>
    call("/api/income", "POST", b),
  updateGoal: (b: { name: string; target: number; saved: number; deadlineDate: string }) =>
    call("/api/goal", "PUT", b),
  addTransaction: (b: { amount: number; desc: string; dateStr: string }) =>
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
  updateReserve: (b: { pctPercent: number; saved: number; withdraw: number | null }) =>
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
};
