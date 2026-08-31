import { pool } from "./db";
import { isoToDDMMYYYY, ddmmyyyyToIso, lastFriday, addDays } from "./date";
import { computeRequiredKassa, resolveRequiredKassa, type TeamInputs } from "./kassa";
import type { KassaState, SalesTarget, KassaEntry } from "./kassa";

export async function getKassaState(userId: string): Promise<KassaState> {
  const weekStartDate = lastFriday();
  const weekIso = ddmmyyyyToIso(weekStartDate);
  const weekEndIso = ddmmyyyyToIso(addDays(weekStartDate, 6));

  const [targetRes, entriesRes] = await Promise.all([
    pool.query(
      `select id, target_salary, failed_plan, ops_total, ops_plan, mgr_total, mgr_plan, required_kassa
       from sales_target where user_id = $1 and week_start_date = $2`,
      [userId, weekIso]
    ),
    pool.query(
      `select id, date, amount from kassa_entries
       where user_id = $1 and date >= $2 and date <= $3 order by created_at desc`,
      [userId, weekIso, weekEndIso]
    ),
  ]);

  const row = targetRes.rows[0];
  const target: SalesTarget | null = row
    ? {
        id: row.id,
        weekStartDate,
        targetSalary: Number(row.target_salary),
        failedPlan: row.failed_plan,
        opsTotal: row.ops_total,
        opsPlan: row.ops_plan,
        mgrTotal: row.mgr_total,
        mgrPlan: row.mgr_plan,
        requiredKassa: Number(row.required_kassa),
      }
    : null;

  const entries: KassaEntry[] = entriesRes.rows.map((r) => ({
    id: r.id,
    date: isoToDDMMYYYY(r.date),
    amount: Number(r.amount),
  }));

  return { weekStartDate, target, entries };
}

export interface SetTargetInput {
  targetSalary: number;
  failedPlan: boolean;
  opsTotal: number;
  opsPlan: number;
  mgrTotal: number;
  mgrPlan: number;
  choice?: "A" | "B";
}

export type SetTargetResult =
  | { needsChoice: true; result: ReturnType<typeof computeRequiredKassa> }
  | { needsChoice: false; requiredKassa: number };

export async function setSalesTarget(userId: string, input: SetTargetInput): Promise<SetTargetResult> {
  const team: TeamInputs = {
    failedPlan: input.failedPlan,
    opsTotal: input.opsTotal,
    opsPlan: input.opsPlan,
    mgrTotal: input.mgrTotal,
    mgrPlan: input.mgrPlan,
  };
  const result = computeRequiredKassa(input.targetSalary, team);
  if (result.status === "gap" && !input.choice) {
    return { needsChoice: true, result };
  }
  const requiredKassa = Math.round(resolveRequiredKassa(result, input.choice));

  const weekIso = ddmmyyyyToIso(lastFriday());
  await pool.query(
    `insert into sales_target
       (user_id, week_start_date, target_salary, failed_plan, ops_total, ops_plan, mgr_total, mgr_plan, required_kassa)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     on conflict (user_id, week_start_date) do update set
       target_salary = $3, failed_plan = $4, ops_total = $5, ops_plan = $6,
       mgr_total = $7, mgr_plan = $8, required_kassa = $9`,
    [
      userId,
      weekIso,
      input.targetSalary,
      input.failedPlan,
      input.opsTotal,
      input.opsPlan,
      input.mgrTotal,
      input.mgrPlan,
      requiredKassa,
    ]
  );
  return { needsChoice: false, requiredKassa };
}

export async function addKassaEntry(userId: string, amount: number, dateStr: string) {
  const res = await pool.query("insert into kassa_entries (user_id, date, amount) values ($1, $2, $3) returning id", [
    userId,
    ddmmyyyyToIso(dateStr),
    amount,
  ]);
  return { id: res.rows[0].id as string };
}

export async function updateKassaEntry(userId: string, id: string, amount: number, dateStr: string) {
  await pool.query("update kassa_entries set amount = $3, date = $4 where id = $1 and user_id = $2", [
    id,
    userId,
    amount,
    ddmmyyyyToIso(dateStr),
  ]);
}

export async function deleteKassaEntry(userId: string, id: string) {
  await pool.query("delete from kassa_entries where id = $1 and user_id = $2", [id, userId]);
}
