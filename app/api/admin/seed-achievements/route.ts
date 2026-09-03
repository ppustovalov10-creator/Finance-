import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ACHIEVEMENTS } from "@/lib/achievements-data";

// Internal, idempotent utility: upserts the ACHIEVEMENTS reference data
// (lib/achievements-data.ts) into the `achievements` table, mirroring the
// `insert ... on conflict (key) do update` seed block at the bottom of
// db/schema.sql. Lets a newly added achievement key go live (satisfying
// user_achievements' FK before it's ever unlocked) without a manual
// `psql -f db/schema.sql` against production. Only ever touches this one
// static reference table, never user data — safe to call repeatedly.
const ADMIN_KEY = "cef917ee1fc7dff0e0f02c19ea79e85a29f97d466eb7ac51";

export async function POST(req: Request) {
  if (req.headers.get("x-admin-key") !== ADMIN_KEY) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  for (const a of ACHIEVEMENTS) {
    await pool.query(
      `insert into achievements (key, path, tier, title, description, icon)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (key) do update set path=excluded.path, tier=excluded.tier, title=excluded.title, description=excluded.description, icon=excluded.icon`,
      [a.key, a.path, a.tier, a.title, a.description, a.icon]
    );
  }
  return NextResponse.json({ ok: true, count: ACHIEVEMENTS.length });
}
