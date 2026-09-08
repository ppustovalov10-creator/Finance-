import { NextResponse } from "next/server";
import { getAppState } from "@/lib/repo";
import { requireHermesSyncUserId } from "@/lib/hermes-sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await requireHermesSyncUserId(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const state = await getAppState(userId);
  return NextResponse.json(state, {
    headers: { "Cache-Control": "no-store" },
  });
}
