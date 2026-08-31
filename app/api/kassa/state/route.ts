import { getKassaState } from "@/lib/kassa-repo";
import { withUser } from "@/lib/api-helpers";

export const GET = withUser(async (userId) => getKassaState(userId));
