import { pool } from "@/lib/db";
import {
  getAchievementsOverview,
  checkIncomeAchievements,
  checkReserveAchievements,
  checkGoalAchievements,
  checkKassaAchievements,
  checkKeywordAchievements,
  checkTransactionAchievements,
} from "@/lib/achievements-repo";
import { ACHIEVEMENTS } from "@/lib/achievements-data";
import { withUser } from "@/lib/api-helpers";

export const GET = withUser(async (userId) => {
  // Every check function only ever *adds* a user_achievements row when its
  // condition is actually met right now (on-conflict-do-nothing, so it's
  // safe to call repeatedly) — so re-running all of them here reconciles
  // anything that was already true in the user's existing data before this
  // feature shipped (or before any single check function existed), not
  // just things that happen from this point on. categoryEdited is false
  // here since "Сам поймал" is inherently about the edit action itself,
  // which isn't reconstructable from stored state alone.
  const newAchievements = [
    ...(await checkIncomeAchievements(pool, userId)),
    ...(await checkReserveAchievements(pool, userId)),
    ...(await checkGoalAchievements(pool, userId)),
    ...(await checkKassaAchievements(pool, userId)),
    ...(await checkKeywordAchievements(pool, userId)),
    ...(await checkTransactionAchievements(pool, userId, false)),
  ];
  const overview = await getAchievementsOverview(pool, userId);
  return { achievements: ACHIEVEMENTS, ...overview, newAchievements };
});
