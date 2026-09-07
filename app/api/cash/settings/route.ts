import { updateCashSettings } from "@/lib/repo";
import { withUser, readJson } from "@/lib/api-helpers";
import type { CashSettings } from "@/lib/types";

export const PUT = withUser(async (userId, req) => {
  const body = await readJson<CashSettings>(req);
  const values = [body.weeklyTarget, body.opsTotal, body.opsPlan, body.managersTotal, body.managersPlan, ...Object.values(body.weekdayTargets || {})];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) throw new Error("Настройки должны быть неотрицательными числами");
  return updateCashSettings(userId, body);
});
