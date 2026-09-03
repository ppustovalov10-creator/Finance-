import { addTransaction } from "@/lib/repo";
import { withUser, readJson } from "@/lib/api-helpers";

interface Body {
  amount: number;
  desc: string;
  dateStr: string; // DD.MM.YYYY
  cat?: string;
}

export const POST = withUser(async (userId, req) => {
  const body = await readJson<Body>(req);
  if (!body.amount || body.amount <= 0) {
    throw new Error("Не вижу сумму — впиши число больше нуля");
  }
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(body.dateStr)) throw new Error("Некорректная дата");
  return addTransaction(userId, { amount: body.amount, desc: (body.desc || "").trim(), dateStr: body.dateStr, cat: body.cat });
});
