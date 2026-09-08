import { NextResponse } from "next/server";
import { isValidDDMMYYYY } from "@/lib/date";
import { fixExternalWeeklyIncome } from "@/lib/repo";
import { requireHermesSyncUserId } from "@/lib/hermes-sync";

export const dynamic = "force-dynamic";

interface Body {
  income: number;
  date: string;
  externalId: string;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const userId = await requireHermesSyncUserId(request, rawBody);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = JSON.parse(rawBody) as Body;
    const income = Number(body.income);
    const externalId = typeof body.externalId === "string" ? body.externalId.trim() : "";
    if (!Number.isFinite(income) || income <= 0) throw new Error("Некорректная сумма дохода");
    if (!isValidDDMMYYYY(body.date)) throw new Error("Некорректная дата");
    if (!externalId) throw new Error("Не указан внешний идентификатор дохода");

    const result = await fixExternalWeeklyIncome(userId, {
      incomeVal: income,
      dateVal: body.date,
      carryInVal: 0,
      goalSavedVal: 0,
      externalSource: "hermes",
      externalId,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Некорректный запрос";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
