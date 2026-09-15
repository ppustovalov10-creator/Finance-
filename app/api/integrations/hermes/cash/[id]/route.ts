import { NextResponse } from "next/server";
import { deleteExternalCashEntry } from "@/lib/repo";
import { requireHermesSyncUserId } from "@/lib/hermes-sync";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const rawBody = await request.text();
  const userId = await requireHermesSyncUserId(request, rawBody);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await deleteExternalCashEntry(userId, (await context.params).id);
  return NextResponse.json({ deleted: true });
}