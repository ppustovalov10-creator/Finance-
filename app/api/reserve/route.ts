import { updateReserve } from "@/lib/repo";
import { withUser, readJson } from "@/lib/api-helpers";

interface Body {
  saved: number;
  withdraw: number | null;
  isNewMoney?: boolean;
}

export const PUT = withUser(async (userId, req) => {
  const body = await readJson<Body>(req);
  if (isNaN(body.saved) || body.saved < 0) throw new Error("Накоплено — число от нуля");
  return updateReserve(userId, {
    saved: body.saved,
    withdraw: body.withdraw && body.withdraw > 0 ? body.withdraw : null,
    isNewMoney: !!body.isNewMoney,
  });
});
