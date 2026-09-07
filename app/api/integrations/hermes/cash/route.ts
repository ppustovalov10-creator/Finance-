import { NextResponse } from "next/server";
import { addExternalCashEntry } from "@/lib/repo";
import { isValidDDMMYYYY } from "@/lib/date";
import { requireHermesSyncUserId } from "@/lib/hermes-sync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = requireHermesSyncUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { amount: number; date: string; externalId: string };
    const amount = Number(body.amount);
    const externalId = typeof body.externalId === "string" ? body.externalId.trim() : "";
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Некорректная сумма кассы");
    if (!isValidDDMMYYYY(body.date)) throw new Error("Некорректная дата");
    if (!externalId) throw new Error("Не указан внешний идентификатор кассы");

    const result = await addExternalCashEntry(userId, { amount, date: body.date, externalSource: "hermes", externalId });
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Некорректный запрос";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
