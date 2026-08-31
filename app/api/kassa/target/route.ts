import { setSalesTarget } from "@/lib/kassa-repo";
import { withUser, readJson } from "@/lib/api-helpers";

interface Body {
  targetSalary: number;
  failedPlan: boolean;
  opsTotal: number;
  opsPlan: number;
  mgrTotal: number;
  mgrPlan: number;
  choice?: "A" | "B";
}

export const POST = withUser(async (userId, req) => {
  const body = await readJson<Body>(req);
  if (!body.targetSalary || body.targetSalary <= 0) throw new Error("Укажи сумму больше нуля");
  return setSalesTarget(userId, {
    targetSalary: body.targetSalary,
    failedPlan: !!body.failedPlan,
    opsTotal: Math.max(0, Math.round(body.opsTotal || 0)),
    opsPlan: Math.max(0, Math.round(body.opsPlan || 0)),
    mgrTotal: Math.max(0, Math.round(body.mgrTotal || 0)),
    mgrPlan: Math.max(0, Math.round(body.mgrPlan || 0)),
    choice: body.choice,
  });
});
