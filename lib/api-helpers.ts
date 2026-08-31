import { NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "./require-user";

export function withUser<T>(handler: (userId: string, req: Request) => Promise<T>) {
  return async (req: Request) => {
    try {
      const userId = await requireUserId();
      const result = await handler(userId, req);
      if (result instanceof NextResponse) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (e) {
      if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      console.error(e);
      const message = e instanceof Error ? e.message : "internal_error";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  };
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  const body = await req.json().catch(() => null);
  if (!body) throw new Error("Некорректный запрос");
  return body as T;
}
