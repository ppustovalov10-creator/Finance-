import { updateGoal } from "@/lib/repo";
import { withUser, readJson } from "@/lib/api-helpers";
import { isValidDDMMYYYY } from "@/lib/date";

interface Body {
  name: string;
  target: number;
  saved: number;
  deadlineDate: string;
  isNewMoney?: boolean;
  startNew?: boolean;
}

export const PUT = withUser(async (userId, req) => {
  const body = await readJson<Body>(req);
  const name = (body.name || "").trim();
  if (!name) throw new Error("Дай цели название");
  if (!body.target || body.target <= 0) throw new Error("Целевая сумма должна быть больше нуля");
  if (body.saved == null || isNaN(body.saved) || body.saved < 0) throw new Error("Накоплено — число от нуля");
  if (!isValidDDMMYYYY(body.deadlineDate)) throw new Error("Дедлайн в формате ДД.ММ.ГГГГ, например 09.10.2026");
  return updateGoal(userId, {
    name,
    target: body.target,
    saved: body.saved,
    deadlineDate: body.deadlineDate,
    isNewMoney: !!body.isNewMoney,
    startNew: !!body.startNew,
  });
});
