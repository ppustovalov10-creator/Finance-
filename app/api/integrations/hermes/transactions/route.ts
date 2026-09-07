import { NextResponse } from "next/server";
import { addExternalTransaction } from "@/lib/repo";
import { parseHermesTransaction, requireHermesSyncUserId, type HermesTransactionInput } from "@/lib/hermes-sync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = requireHermesSyncUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as HermesTransactionInput;
    const transaction = parseHermesTransaction(body);
    const result = await addExternalTransaction(userId, {
      amount: transaction.amount,
      desc: transaction.description,
      dateStr: transaction.dateStr,
      externalSource: "hermes",
      externalId: transaction.externalId,
    });
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Некорректный запрос";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
