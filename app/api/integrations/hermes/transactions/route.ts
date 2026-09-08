import { NextResponse } from "next/server";
import { addExternalTransaction } from "@/lib/repo";
import { parseHermesTransaction, requireHermesSyncUserId, type HermesTransactionInput } from "@/lib/hermes-sync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const userId = await requireHermesSyncUserId(request, rawBody);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = JSON.parse(rawBody) as HermesTransactionInput;
    const transaction = parseHermesTransaction(body);
    const result = await addExternalTransaction(userId, {
      amount: transaction.amount,
      desc: transaction.description,
      dateStr: transaction.dateStr,
      category: transaction.category,
      externalSource: "hermes",
      externalId: transaction.externalId,
    });
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Некорректный запрос";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
