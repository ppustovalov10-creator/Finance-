import { pool, withTransaction, type DbClient } from "./db";
import { CATEGORIES, CATEGORY_PCT, DEFAULT_IRREGULAR_CATEGORIES, ESSENTIAL_CATEGORIES, FALLBACK_CATEGORY } from "./categories";
import { isoToDDMMYYYY, ddmmyyyyToIso, lastFriday } from "./date";
import { categorize, extractKeyword } from "./categorize";
import type { AppState, Envelope, GoalLogEntry, IncomeLogEntry, ReserveLogEntry, Transaction } from "./types";
import { weeksRemainingToGoal } from "./date";
import {
  checkIncomeAchievements,
  checkReserveAchievements,
  checkGoalAchievements,
  checkTransactionAchievements,
  checkKeywordAchievements,
  type UnlockedAchievement,
} from "./achievements-repo";
export type { UnlockedAchievement };

/** Stamps completed_at the first time a goal's saved amount reaches its
 * target — idempotent, never overwrites an already-set completion. */
async function maybeCompleteGoal(client: DbClient, goalId: string, saved: number, target: number) {
  if (target > 0 && saved >= target) {
    await client.query("update goals set completed_at = now() where id = $1 and completed_at is null", [goalId]);
  }
}

async function loadEnvelopes(userId: string): Promise<Envelope[]> {
  const res = await pool.query(
    `select id, category_name, weekly_cap, is_regular, is_auto_cap, icon_key
     from envelopes where user_id = $1 order by created_at asc`,
    [userId]
  );
  return res.rows.map((r) => ({
    id: r.id,
    category: r.category_name,
    weeklyCap: r.weekly_cap === null ? null : Number(r.weekly_cap),
    isRegular: r.is_regular,
    isAutoCap: r.is_auto_cap,
    iconKey: r.icon_key,
  }));
}

export async function getAppState(userId: string): Promise<AppState> {
  const [settingsRes, reserveRes, reserveLogRes, incomeRes, goalRes, envelopes, txRes, kwRes] = await Promise.all([
    pool.query("select income_floor, survival_mode, survival_caps_backup, onboarded from settings where user_id = $1", [
      userId,
    ]),
    pool.query("select saved_amount, pct from reserve_fund where user_id = $1", [userId]),
    pool.query("select date, amount from reserve_log where user_id = $1 order by created_at asc", [userId]),
    pool.query(
      `select week_start_date, income, carry_in, goal_saved_at_week_start, reserve_saved_at_week_start
       from weekly_incomes where user_id = $1 order by week_start_date asc`,
      [userId]
    ),
    pool.query(
      "select id, name, target_amount, saved_amount, deadline_date from goals where user_id = $1 and is_active limit 1",
      [userId]
    ),
    loadEnvelopes(userId),
    pool.query(
      "select id, date, category, description, amount from transactions where user_id = $1 order by created_at desc",
      [userId]
    ),
    pool.query(
      "select category_name, keyword from category_keywords where user_id = $1 order by created_at asc",
      [userId]
    ),
  ]);

  const settings = settingsRes.rows[0] || {
    income_floor: null,
    survival_mode: false,
    survival_caps_backup: null,
    onboarded: false,
  };
  const reserveRow = reserveRes.rows[0] || { saved_amount: 0, pct: 0.05 };

  const incomeLog: IncomeLogEntry[] = incomeRes.rows.map((r) => ({
    startDate: isoToDDMMYYYY(r.week_start_date),
    income: Number(r.income),
    carryIn: Number(r.carry_in),
  }));

  const lastIncomeRow = incomeRes.rows[incomeRes.rows.length - 1];
  const currentWeek =
    incomeLog.length > 0
      ? {
          ...incomeLog[incomeLog.length - 1],
          goalSavedAtWeekStart: Number(lastIncomeRow.goal_saved_at_week_start),
          reserveSavedAtWeekStart: Number(lastIncomeRow.reserve_saved_at_week_start),
        }
      : { startDate: lastFriday(), income: null, carryIn: 0, goalSavedAtWeekStart: 0, reserveSavedAtWeekStart: 0 };

  let goal;
  if (goalRes.rows[0]) {
    const g = goalRes.rows[0];
    const logRes = await pool.query(
      "select week_start_date, planned_amount, actual_amount from goal_log where goal_id = $1 order by created_at asc",
      [g.id]
    );
    const log: GoalLogEntry[] = logRes.rows.map((r) => ({
      weekStart: isoToDDMMYYYY(r.week_start_date),
      planned: Number(r.planned_amount),
      actual: Number(r.actual_amount),
    }));
    goal = {
      id: g.id as string,
      name: g.name as string,
      target: Number(g.target_amount),
      saved: Number(g.saved_amount),
      deadlineDate: isoToDDMMYYYY(g.deadline_date),
      log,
    };
  } else {
    goal = { id: null, name: "", target: 0, saved: 0, deadlineDate: null, log: [] };
  }

  const transactions: Transaction[] = txRes.rows.map((r) => ({
    id: r.id,
    date: isoToDDMMYYYY(r.date),
    cat: r.category,
    desc: r.description,
    amount: Number(r.amount),
  }));

  const customKeywords: Record<string, string[]> = {};
  for (const r of kwRes.rows) {
    if (!customKeywords[r.category_name]) customKeywords[r.category_name] = [];
    customKeywords[r.category_name].push(r.keyword);
  }

  const categories = [...CATEGORIES];
  for (const e of envelopes) if (!categories.includes(e.category)) categories.push(e.category);
  for (const t of transactions) if (!categories.includes(t.cat)) categories.push(t.cat);

  const reserveLog: ReserveLogEntry[] = reserveLogRes.rows.map((r) => ({
    date: isoToDDMMYYYY(r.date),
    amount: Number(r.amount),
  }));

  return {
    currentWeek,
    incomeLog,
    goal,
    envelopes,
    transactions,
    categories,
    customKeywords,
    reserve: { saved: Number(reserveRow.saved_amount), pct: Number(reserveRow.pct), log: reserveLog },
    incomeFloor: settings.income_floor === null ? null : Number(settings.income_floor),
    survivalMode: settings.survival_mode,
    survivalCapsBackup: settings.survival_caps_backup,
    onboarded: settings.onboarded,
  };
}

async function upsertEnvelopeCap(
  client: DbClient,
  userId: string,
  category: string,
  cap: number,
  isAutoCap: boolean,
  isRegularDefault: boolean
) {
  await client.query(
    `insert into envelopes (user_id, category_name, weekly_cap, is_auto_cap, is_regular)
     values ($1, $2, $3, $4, $5)
     on conflict (user_id, category_name)
     do update set weekly_cap = excluded.weekly_cap, is_auto_cap = $4`,
    [userId, category, cap, isAutoCap, isRegularDefault]
  );
}

/** Ported from recalcCapsFromIncome(income, onlyAuto). */
async function recalcCapsFromIncome(client: DbClient, userId: string, income: number, onlyAuto: boolean) {
  if (!income || income <= 0) return;
  const existing = await client.query("select category_name, is_auto_cap from envelopes where user_id = $1", [
    userId,
  ]);
  const autoMap = new Map(existing.rows.map((r) => [r.category_name as string, r.is_auto_cap as boolean]));

  for (const [cat, pct] of Object.entries(CATEGORY_PCT)) {
    const newCap = Math.round(income * pct);
    const hasRow = autoMap.has(cat);
    if (onlyAuto && hasRow && autoMap.get(cat) === false) continue; // user edited this one manually — leave it
    const isRegularDefault = !DEFAULT_IRREGULAR_CATEGORIES.includes(cat);
    await upsertEnvelopeCap(client, userId, cat, newCap, true, isRegularDefault);
  }
}

export async function recalcCapsForced(userId: string) {
  const state = await getAppState(userId);
  if (!state.currentWeek.income) return { ok: false as const, error: "Сначала зафиксируй доход за неделю" };
  await withTransaction(async (client) => {
    await recalcCapsFromIncome(client, userId, state.currentWeek.income as number, false);
  });
  return { ok: true as const };
}

interface FixIncomeInput {
  dateVal: string; // DD.MM.YYYY
  incomeVal: number;
  carryInVal: number;
  goalSavedVal: number;
}

export async function fixWeeklyIncome(userId: string, input: FixIncomeInput) {
  const iso = ddmmyyyyToIso(input.dateVal);

  return withTransaction(async (client) => {
    // planned contribution needs the state as of *before* this fixation
    const state = await getAppState(userId);
    const plannedContribution =
      state.goal.target > 0
        ? Math.max(0, state.goal.target - state.goal.saved) /
          weeksRemainingToGoal(state.currentWeek.startDate, state.goal.deadlineDate)
        : 0;

    // Snapshot goal.saved / reserve.saved as they stood right before this
    // fixation — only takes effect on the first fixation of this week; a
    // correction to an already-fixed week leaves the original snapshot
    // alone (it's excluded from the ON CONFLICT update).
    await client.query(
      `insert into weekly_incomes
         (user_id, week_start_date, income, carry_in, goal_saved_at_week_start, reserve_saved_at_week_start)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (user_id, week_start_date) do update set income = $3, carry_in = $4`,
      [userId, iso, input.incomeVal, input.carryInVal, state.goal.saved, state.reserve.saved]
    );

    await recalcCapsFromIncome(client, userId, input.incomeVal, true);

    const reserveRes = await client.query("select pct from reserve_fund where user_id = $1", [userId]);
    const pct = reserveRes.rows[0] ? Number(reserveRes.rows[0].pct) : 0;
    if (pct > 0) {
      const skim = Math.round(input.incomeVal * pct);
      await client.query("update reserve_fund set saved_amount = saved_amount + $2 where user_id = $1", [
        userId,
        skim,
      ]);
      await client.query("insert into reserve_log (user_id, date, amount) values ($1, $2, $3)", [
        userId,
        iso,
        skim,
      ]);
      await client.query(
        `delete from reserve_log where id in (
           select id from reserve_log where user_id = $1 order by created_at desc offset 30
         )`,
        [userId]
      );
    }

    if (input.goalSavedVal > 0 && state.goal.id) {
      await client.query("update goals set saved_amount = saved_amount + $2 where id = $1", [
        state.goal.id,
        input.goalSavedVal,
      ]);
      await client.query(
        "insert into goal_log (goal_id, week_start_date, planned_amount, actual_amount) values ($1, $2, $3, $4)",
        [state.goal.id, iso, Math.round(plannedContribution), input.goalSavedVal]
      );
      await client.query(
        `delete from goal_log where id in (
           select id from goal_log where goal_id = $1 order by created_at desc offset 20
         )`,
        [state.goal.id]
      );
      await maybeCompleteGoal(client, state.goal.id, state.goal.saved + input.goalSavedVal, state.goal.target);
    }

    const newAchievements: UnlockedAchievement[] = [
      ...(await checkIncomeAchievements(client, userId)),
      ...(await checkReserveAchievements(client, userId)),
      ...(input.goalSavedVal > 0 ? await checkGoalAchievements(client, userId) : []),
    ];
    return { newAchievements };
  });
}

export async function skipOnboarding(userId: string) {
  await pool.query(
    `insert into settings (user_id, onboarded) values ($1, true)
     on conflict (user_id) do update set onboarded = true`,
    [userId]
  );
}

interface OnboardingInput {
  goalName: string;
  goalTarget: number;
  goalDeadline: string; // DD.MM.YYYY
  weekDate: string; // DD.MM.YYYY
  income: number;
}

export async function completeOnboarding(userId: string, input: OnboardingInput) {
  await withTransaction(async (client) => {
    const existingGoal = await client.query("select id from goals where user_id = $1 and is_active limit 1", [
      userId,
    ]);
    if (existingGoal.rows.length === 0) {
      await client.query(
        `insert into goals (user_id, name, target_amount, saved_amount, deadline_date, is_active)
         values ($1, $2, $3, 0, $4, true)`,
        [userId, input.goalName, input.goalTarget, ddmmyyyyToIso(input.goalDeadline)]
      );
    } else {
      await client.query(
        "update goals set name = $2, target_amount = $3, saved_amount = 0, deadline_date = $4 where id = $1",
        [existingGoal.rows[0].id, input.goalName, input.goalTarget, ddmmyyyyToIso(input.goalDeadline)]
      );
    }

    const iso = ddmmyyyyToIso(input.weekDate);
    // Onboarding always creates the goal at saved=0 and reserve starts at 0
    // too, so the pre-fixation snapshot for this very first week is 0/0.
    await client.query(
      `insert into weekly_incomes
         (user_id, week_start_date, income, carry_in, goal_saved_at_week_start, reserve_saved_at_week_start)
       values ($1, $2, $3, 0, 0, 0)
       on conflict (user_id, week_start_date) do update set income = $3, carry_in = 0`,
      [userId, iso, input.income]
    );

    await recalcCapsFromIncome(client, userId, input.income, false);

    const reserveRes = await client.query("select pct, saved_amount from reserve_fund where user_id = $1", [
      userId,
    ]);
    const pct = reserveRes.rows[0] ? Number(reserveRes.rows[0].pct) : 0.05;
    const skim = Math.round(input.income * pct);
    await client.query(
      `insert into reserve_fund (user_id, saved_amount, pct) values ($1, $2, $3)
       on conflict (user_id) do update set saved_amount = reserve_fund.saved_amount + $2`,
      [userId, skim, pct]
    );
    await client.query("insert into reserve_log (user_id, date, amount) values ($1, $2, $3)", [userId, iso, skim]);

    await client.query(
      `insert into settings (user_id, onboarded) values ($1, true)
       on conflict (user_id) do update set onboarded = true`,
      [userId]
    );

    await checkIncomeAchievements(client, userId);
    await checkReserveAchievements(client, userId);
    await checkGoalAchievements(client, userId);
  });
}

export async function updateGoal(
  userId: string,
  input: { name: string; target: number; saved: number; deadlineDate: string; isNewMoney?: boolean; startNew?: boolean }
) {
  return withTransaction(async (client) => {
    const existing = await client.query(
      "select id, saved_amount from goals where user_id = $1 and is_active limit 1",
      [userId]
    );
    const iso = ddmmyyyyToIso(input.deadlineDate);
    let goalId: string;
    let oldSaved: number;
    if (existing.rows.length === 0) {
      const ins = await client.query(
        `insert into goals (user_id, name, target_amount, saved_amount, deadline_date, is_active)
         values ($1, $2, $3, $4, $5, true) returning id`,
        [userId, input.name, input.target, input.saved, iso]
      );
      goalId = ins.rows[0].id;
      oldSaved = 0;
    } else if (input.startNew) {
      // A completed goal only ever gets replaced explicitly — never
      // inferred from an ordinary edit — so archive the old one and start
      // a fresh row rather than overwriting it in place.
      await client.query("update goals set is_active = false where id = $1", [existing.rows[0].id]);
      const ins = await client.query(
        `insert into goals (user_id, name, target_amount, saved_amount, deadline_date, is_active)
         values ($1, $2, $3, $4, $5, true) returning id`,
        [userId, input.name, input.target, input.saved, iso]
      );
      goalId = ins.rows[0].id;
      oldSaved = 0;
    } else {
      await client.query(
        "update goals set name = $2, target_amount = $3, saved_amount = $4, deadline_date = $5 where id = $1",
        [existing.rows[0].id, input.name, input.target, input.saved, iso]
      );
      goalId = existing.rows[0].id;
      oldSaved = Number(existing.rows[0].saved_amount);
    }

    // A manual "Уже накоплено всего" edit defaults to a bookkeeping
    // correction (e.g. recording money saved before the app was used) —
    // it must not eat into this week's spendable balance. Bump the current
    // week's snapshot by the same delta so committedThisWeek() nets to zero
    // for it. Only an explicit "this is new money set aside this week" opt-in
    // (isNewMoney) skips this and lets the edit count as a real contribution.
    if (!input.isNewMoney) {
      const delta = input.saved - oldSaved;
      if (delta !== 0) {
        await client.query(
          `update weekly_incomes set goal_saved_at_week_start = goal_saved_at_week_start + $2
           where user_id = $1 and week_start_date = (select max(week_start_date) from weekly_incomes where user_id = $1)`,
          [userId, delta]
        );
      }
    }

    await maybeCompleteGoal(client, goalId, input.saved, input.target);
    const newAchievements = await checkGoalAchievements(client, userId);
    return { newAchievements };
  });
}

export async function addTransaction(
  userId: string,
  input: { amount: number; desc: string; dateStr: string }
) {
  const state = await getAppState(userId);
  const cat = categorize(input.desc, state.customKeywords);
  const iso = ddmmyyyyToIso(input.dateStr);
  const res = await pool.query(
    `insert into transactions (user_id, date, category, description, amount)
     values ($1, $2, $3, $4, $5) returning id`,
    [userId, iso, cat, input.desc || "без описания", -Math.abs(input.amount)]
  );
  const newAchievements = await checkTransactionAchievements(pool, userId, false);
  return { id: res.rows[0].id as string, cat, newAchievements };
}

export async function updateTransaction(
  userId: string,
  txId: string,
  input: { amount: number; desc: string; dateStr: string; cat: string; remember: boolean }
) {
  const existing = await pool.query("select category from transactions where id = $1 and user_id = $2", [
    txId,
    userId,
  ]);
  if (existing.rows.length === 0) return { learned: null as string | null, newAchievements: [] as UnlockedAchievement[] };
  const oldCat = existing.rows[0].category as string;
  const categoryEdited = input.cat !== oldCat;

  const iso = ddmmyyyyToIso(input.dateStr);
  await pool.query(
    "update transactions set amount = $3, description = $4, date = $5, category = $6 where id = $1 and user_id = $2",
    [txId, userId, -Math.abs(input.amount), input.desc || "без описания", iso, input.cat]
  );

  let learned: string | null = null;
  let keywordAchievements: UnlockedAchievement[] = [];
  if (categoryEdited && input.remember) {
    const kw = extractKeyword(input.desc);
    if (kw) {
      await pool.query(
        `insert into category_keywords (user_id, category_name, keyword) values ($1, $2, $3)
         on conflict (user_id, category_name, keyword) do nothing`,
        [userId, input.cat, kw]
      );
      learned = kw;
      keywordAchievements = await checkKeywordAchievements(pool, userId);
    }
  }
  const txAchievements = await checkTransactionAchievements(pool, userId, categoryEdited);
  return { learned, newAchievements: [...txAchievements, ...keywordAchievements] };
}

export async function deleteTransaction(userId: string, txId: string) {
  await pool.query("delete from transactions where id = $1 and user_id = $2", [txId, userId]);
}

export async function createEnvelope(
  userId: string,
  input: { name: string; iconKey: string; cap: number | null }
) {
  await pool.query(
    `insert into envelopes (user_id, category_name, weekly_cap, icon_key, is_auto_cap, is_regular)
     values ($1, $2, $3, $4, false, true)`,
    [userId, input.name, input.cap, input.iconKey]
  );
}

export async function updateEnvelope(
  userId: string,
  category: string,
  input: { newName: string; cap: number | null; isRegular: boolean }
) {
  await withTransaction(async (client) => {
    if (input.newName !== category) {
      await client.query(
        "update transactions set category = $3 where user_id = $1 and category = $2",
        [userId, category, input.newName]
      );
      await client.query(
        "update category_keywords set category_name = $3 where user_id = $1 and category_name = $2",
        [userId, category, input.newName]
      );
    }
    const existing = await client.query("select id from envelopes where user_id = $1 and category_name = $2", [
      userId,
      category,
    ]);
    if (existing.rows.length > 0) {
      await client.query(
        "update envelopes set category_name = $3, weekly_cap = $4, is_regular = $5, is_auto_cap = false where id = $1 and user_id = $2",
        [existing.rows[0].id, userId, input.newName, input.cap, input.isRegular]
      );
    } else {
      await client.query(
        `insert into envelopes (user_id, category_name, weekly_cap, is_regular, is_auto_cap)
         values ($1, $2, $3, $4, false)`,
        [userId, input.newName, input.cap, input.isRegular]
      );
    }
  });
}

export async function deleteEnvelope(userId: string, category: string) {
  await withTransaction(async (client) => {
    if (category !== FALLBACK_CATEGORY) {
      await client.query("update transactions set category = $3 where user_id = $1 and category = $2", [
        userId,
        category,
        FALLBACK_CATEGORY,
      ]);
    }
    await client.query("delete from envelopes where user_id = $1 and category_name = $2", [userId, category]);
  });
}

export async function addKeyword(userId: string, category: string, keyword: string) {
  await pool.query(
    `insert into category_keywords (user_id, category_name, keyword) values ($1, $2, $3)
     on conflict (user_id, category_name, keyword) do nothing`,
    [userId, category, keyword.trim().toLowerCase()]
  );
  const newAchievements = await checkKeywordAchievements(pool, userId);
  return { newAchievements };
}

export async function removeKeyword(userId: string, category: string, keyword: string) {
  await pool.query("delete from category_keywords where user_id = $1 and category_name = $2 and keyword = $3", [
    userId,
    category,
    keyword,
  ]);
}

export async function updateFloor(userId: string, value: number) {
  await pool.query(
    `insert into settings (user_id, income_floor) values ($1, $2)
     on conflict (user_id) do update set income_floor = $2`,
    [userId, value]
  );
}

export async function updateReserve(
  userId: string,
  input: { pct: number; saved: number; withdraw: number | null; isNewMoney?: boolean }
) {
  return withTransaction(async (client) => {
    const existing = await client.query("select saved_amount from reserve_fund where user_id = $1", [userId]);
    const oldSaved = existing.rows[0] ? Number(existing.rows[0].saved_amount) : 0;
    // Only the manual-edit portion of the change is a candidate for the
    // "correction, doesn't affect this week" treatment below — a withdraw is
    // always a real event (money leaving the reserve back into spendable
    // cash) and should keep counting normally.
    const manualDelta = input.saved - oldSaved;

    let saved = input.saved;
    if (input.withdraw && input.withdraw > 0) {
      saved = Math.max(0, saved - input.withdraw);
      await client.query("insert into reserve_log (user_id, date, amount) values ($1, current_date, $2)", [
        userId,
        -input.withdraw,
      ]);
    }
    await client.query(
      `insert into reserve_fund (user_id, saved_amount, pct) values ($1, $2, $3)
       on conflict (user_id) do update set saved_amount = $2, pct = $3`,
      [userId, saved, input.pct]
    );

    if (!input.isNewMoney && manualDelta !== 0) {
      await client.query(
        `update weekly_incomes set reserve_saved_at_week_start = reserve_saved_at_week_start + $2
         where user_id = $1 and week_start_date = (select max(week_start_date) from weekly_incomes where user_id = $1)`,
        [userId, manualDelta]
      );
    }

    const newAchievements = await checkReserveAchievements(client, userId);
    return { newAchievements };
  });
}

/** Ported 1:1 from applySurvivalMode(). */
export async function setSurvivalMode(userId: string, on: boolean) {
  await withTransaction(async (client) => {
    const state = await getAppState(userId);
    if (on) {
      const backup: Record<string, number> = {};
      for (const e of state.envelopes) if (e.weeklyCap != null) backup[e.category] = e.weeklyCap;

      for (const cat of Object.keys(backup)) {
        if (!ESSENTIAL_CATEGORIES.includes(cat)) {
          await client.query(
            "update envelopes set weekly_cap = 0 where user_id = $1 and category_name = $2",
            [userId, cat]
          );
        }
      }
      const floor = state.incomeFloor != null ? state.incomeFloor : Math.min(...state.incomeLog.map((w) => w.income));
      if (floor && isFinite(floor)) {
        for (const cat of ESSENTIAL_CATEGORIES) {
          const pct = CATEGORY_PCT[cat];
          if (pct === undefined) continue;
          const cap = Math.round(floor * pct);
          // Insert defaults to auto-cap for a brand new row; on conflict only the cap
          // value changes, leaving an existing manual/auto flag untouched (survival
          // mode never edits autoCapCategories, same as the prototype).
          await client.query(
            `insert into envelopes (user_id, category_name, weekly_cap, is_auto_cap, is_regular)
             values ($1, $2, $3, true, true)
             on conflict (user_id, category_name) do update set weekly_cap = excluded.weekly_cap`,
            [userId, cat, cap]
          );
        }
      }
      await client.query(
        `insert into settings (user_id, survival_mode, survival_caps_backup) values ($1, true, $2)
         on conflict (user_id) do update set survival_mode = true, survival_caps_backup = $2`,
        [userId, JSON.stringify(backup)]
      );
    } else {
      const backup = (state.survivalCapsBackup || {}) as Record<string, number>;
      await client.query("update envelopes set weekly_cap = null where user_id = $1", [userId]);
      for (const [cat, cap] of Object.entries(backup)) {
        await client.query("update envelopes set weekly_cap = $3 where user_id = $1 and category_name = $2", [
          userId,
          cat,
          cap,
        ]);
      }
      await client.query(
        `insert into settings (user_id, survival_mode, survival_caps_backup) values ($1, false, null)
         on conflict (user_id) do update set survival_mode = false, survival_caps_backup = null`,
        [userId]
      );
    }
  });
}
