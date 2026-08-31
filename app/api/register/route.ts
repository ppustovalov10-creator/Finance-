import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { withTransaction } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email || "")
    .trim()
    .toLowerCase();
  const password = String(body?.password || "");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Введите корректный email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Пароль должен быть не короче 8 символов" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await withTransaction(async (client) => {
      const res = await client.query<{ id: string }>(
        "insert into users (email, password_hash) values ($1, $2) returning id",
        [email, passwordHash]
      );
      const userId = res.rows[0].id;
      // Honestly-empty starting state: no goal, no income, no envelopes.
      await client.query(
        "insert into settings (user_id, onboarded) values ($1, false)",
        [userId]
      );
      await client.query("insert into reserve_fund (user_id, saved_amount, pct) values ($1, 0, 0.05)", [userId]);
    });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23505") {
      return NextResponse.json({ error: "Такой email уже зарегистрирован" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Не удалось создать аккаунт" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
