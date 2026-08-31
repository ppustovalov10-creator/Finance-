import { getAppState } from "@/lib/repo";
import { withUser } from "@/lib/api-helpers";

export const GET = withUser(async (userId) => getAppState(userId));
