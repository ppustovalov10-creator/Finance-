export interface CurrentWeek {
  startDate: string; // DD.MM.YYYY
  income: number | null;
  carryIn: number;
}

export interface IncomeLogEntry {
  startDate: string;
  income: number;
  carryIn: number;
}

export interface GoalLogEntry {
  weekStart: string;
  planned: number;
  actual: number;
}

export interface Goal {
  id: string | null;
  name: string;
  target: number;
  saved: number;
  deadlineDate: string | null;
  log: GoalLogEntry[];
}

export interface Envelope {
  id: string | null; // null for synthetic (built-in, never customized) envelopes
  category: string;
  weeklyCap: number | null;
  isRegular: boolean;
  isAutoCap: boolean;
  iconKey: string | null;
}

export interface Transaction {
  id: string;
  date: string; // DD.MM.YYYY
  cat: string;
  desc: string;
  amount: number; // negative = spend, positive = income/transfer
}

export interface ReserveLogEntry {
  date: string;
  amount: number;
}

export interface Reserve {
  saved: number;
  pct: number;
  log: ReserveLogEntry[];
}

export interface AppState {
  currentWeek: CurrentWeek;
  incomeLog: IncomeLogEntry[];
  goal: Goal;
  envelopes: Envelope[];
  transactions: Transaction[];
  categories: string[];
  customKeywords: Record<string, string[]>;
  reserve: Reserve;
  incomeFloor: number | null;
  survivalMode: boolean;
  survivalCapsBackup: Record<string, number> | null;
  onboarded: boolean;
}

export function weeklyCapsOf(envelopes: Envelope[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of envelopes) {
    if (e.weeklyCap != null) out[e.category] = e.weeklyCap;
  }
  return out;
}

export function irregularCategoriesOf(envelopes: Envelope[]): string[] {
  return envelopes.filter((e) => !e.isRegular).map((e) => e.category);
}
