import { updateKassaEntry, deleteKassaEntry } from "@/lib/kassa-repo";
import { withUser, readJson } from "@/lib/api-helpers";

interface Body {
  amount: number;
  dateStr: string;
}

export const PUT = withUser(async (userId, req) => {
  const id = new URL(req.url).pathname.split("/").pop() as string;
  const body = await readJson<Body>(req);
  if (!body.amount || body.amount <= 0) throw new Error("Сумма должна быть больше нуля");
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(body.dateStr)) throw new Error("Некорректная дата");
  return updateKassaEntry(userId, id, body.amount, body.dateStr);
});

export const DELETE = withUser(async (userId, req) => {
  const id = new URL(req.url).pathname.split("/").pop() as string;
  await deleteKassaEntry(userId, id);
});
