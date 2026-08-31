import { addKassaEntry } from "@/lib/kassa-repo";
import { withUser, readJson } from "@/lib/api-helpers";

interface Body {
  amount: number;
  dateStr: string; // DD.MM.YYYY
}

export const POST = withUser(async (userId, req) => {
  const body = await readJson<Body>(req);
  if (!body.amount || body.amount <= 0) throw new Error("Сумма должна быть больше нуля");
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(body.dateStr)) throw new Error("Некорректная дата");
  return addKassaEntry(userId, body.amount, body.dateStr);
});
