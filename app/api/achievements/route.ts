import { pool } from "@/lib/db";
import { getAchievementsOverview } from "@/lib/achievements-repo";
import { ACHIEVEMENTS } from "@/lib/achievements-data";
import { withUser } from "@/lib/api-helpers";

export const GET = withUser(async (userId) => {
  const overview = await getAchievementsOverview(pool, userId);
  return { achievements: ACHIEVEMENTS, ...overview };
});
