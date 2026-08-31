import { recalcCapsForced } from "@/lib/repo";
import { withUser } from "@/lib/api-helpers";

export const POST = withUser(async (userId) => {
  const res = await recalcCapsForced(userId);
  if (!res.ok) throw new Error(res.error);
  return res;
});
