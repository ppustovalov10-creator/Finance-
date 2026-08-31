import { completeOnboarding, skipOnboarding } from "@/lib/repo";
import { withUser, readJson } from "@/lib/api-helpers";
import { isValidDDMMYYYY } from "@/lib/date";

interface Body {
  skip?: boolean;
  goalName: string;
  goalTarget: number;
  goalDeadline: string;
  weekDate: string;
  income: number;
}

export const POST = withUser(async (userId, req) => {
  const body = await readJson<Body>(req);
  if (body.skip) {
    await skipOnboarding(userId);
    return;
  }
  const goalName = (body.goalName || "").trim();
  if (!goalName) throw new Error("Дай цели название");
  if (!body.goalTarget || body.goalTarget <= 0) throw new Error("Сумма должна быть больше нуля");
  if (!isValidDDMMYYYY(body.goalDeadline)) throw new Error("Дата в формате ДД.ММ.ГГГГ");
  if (!isValidDDMMYYYY(body.weekDate)) throw new Error("Дата в формате ДД.ММ.ГГГГ");
  if (!body.income || body.income <= 0) throw new Error("Доход должен быть больше нуля");
  await completeOnboarding(userId, {
    goalName,
    goalTarget: body.goalTarget,
    goalDeadline: body.goalDeadline,
    weekDate: body.weekDate,
    income: body.income,
  });
});
