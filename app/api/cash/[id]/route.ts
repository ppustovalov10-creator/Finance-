import { deleteCashEntry, updateCashEntry } from "@/lib/repo";
import { withUser, readJson } from "@/lib/api-helpers";
import { isValidDDMMYYYY } from "@/lib/date";

export const PUT = withUser(async (userId, req, context: { params: Promise<{ id: string }> }) => {
  const body = await readJson<{ date: string; amount: number }>(req);
  if (!isValidDDMMYYYY(body.date) || !Number.isFinite(body.amount) || body.amount <= 0) throw new Error("Укажи корректные дату и сумму больше нуля");
  await updateCashEntry(userId, (await context.params).id, body);
  return { ok: true };
});

export const DELETE = withUser(async (userId, _req, context: { params: Promise<{ id: string }> }) => {
  await deleteCashEntry(userId, (await context.params).id);
  return { ok: true };
});
