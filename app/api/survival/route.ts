import { setSurvivalMode } from "@/lib/repo";
import { withUser, readJson } from "@/lib/api-helpers";

export const POST = withUser(async (userId, req) => {
  const body = await readJson<{ on: boolean }>(req);
  await setSurvivalMode(userId, !!body.on);
});
