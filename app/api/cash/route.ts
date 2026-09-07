import { addCashEntry } from "@/lib/repo";
import { withUser, readJson } from "@/lib/api-helpers";
import { isValidDDMMYYYY } from "@/lib/date";

export const POST = withUser(async (userId, req) => {
  const body = await readJson<{ date: string; amount: number }>(req);
  if (!isValidDDMMYYYY(body.date) || !body.amount || body.amount <= 0) throw new Error("Укажи корректные дату и сумму больше нуля");
  return addCashEntry(userId, body);
});
