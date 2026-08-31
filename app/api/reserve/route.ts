import { updateReserve } from "@/lib/repo";
import { withUser, readJson } from "@/lib/api-helpers";

interface Body {
  pctPercent: number; // 0-100 as entered by the user
  saved: number;
  withdraw: number | null;
  isNewMoney?: boolean;
}

export const PUT = withUser(async (userId, req) => {
  const body = await readJson<Body>(req);
  if (isNaN(body.pctPercent) || body.pctPercent < 0 || body.pctPercent > 100) {
    throw new Error("% должен быть от 0 до 100");
  }
  if (isNaN(body.saved) || body.saved < 0) throw new Error("Накоплено — число от нуля");
  await updateReserve(userId, {
    pct: body.pctPercent / 100,
    saved: body.saved,
    withdraw: body.withdraw && body.withdraw > 0 ? body.withdraw : null,
    isNewMoney: !!body.isNewMoney,
  });
});
