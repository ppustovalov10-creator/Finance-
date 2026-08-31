import { updateTransaction, deleteTransaction } from "@/lib/repo";
import { withUser, readJson } from "@/lib/api-helpers";

interface Body {
  amount: number;
  desc: string;
  dateStr: string;
  cat: string;
  remember: boolean;
}

export const PUT = withUser(async (userId, req) => {
  const id = new URL(req.url).pathname.split("/").pop() as string;
  const body = await readJson<Body>(req);
  if (!body.amount || body.amount <= 0) throw new Error("Сумма должна быть больше нуля");
  return updateTransaction(userId, id, {
    amount: body.amount,
    desc: (body.desc || "").trim(),
    dateStr: body.dateStr,
    cat: body.cat,
    remember: !!body.remember,
  });
});

export const DELETE = withUser(async (userId, req) => {
  const id = new URL(req.url).pathname.split("/").pop() as string;
  await deleteTransaction(userId, id);
});
