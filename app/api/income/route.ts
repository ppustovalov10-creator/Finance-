import { fixWeeklyIncome } from "@/lib/repo";
import { withUser, readJson } from "@/lib/api-helpers";
import { isValidDDMMYYYY } from "@/lib/date";

interface Body {
  dateVal: string;
  incomeVal: number;
  carryInVal: number;
  goalSavedVal: number;
}

export const POST = withUser(async (userId, req) => {
  const body = await readJson<Body>(req);
  if (!isValidDDMMYYYY(body.dateVal)) throw new Error("Дата должна быть в формате ДД.ММ.ГГГГ");
  if (!body.incomeVal || body.incomeVal <= 0) throw new Error("Укажи доход больше нуля");
  return fixWeeklyIncome(userId, {
    dateVal: body.dateVal,
    incomeVal: body.incomeVal,
    carryInVal: body.carryInVal || 0,
    goalSavedVal: body.goalSavedVal || 0,
  });
});
