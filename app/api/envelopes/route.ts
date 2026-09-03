import { createEnvelope, getAppState } from "@/lib/repo";
import { withUser, readJson } from "@/lib/api-helpers";

interface Body {
  name: string;
  iconKey: string;
  cap: number | null;
}

export const POST = withUser(async (userId, req) => {
  const body = await readJson<Body>(req);
  const name = (body.name || "").trim();
  if (!name) throw new Error("Дай конверту название");
  const state = await getAppState(userId);
  // Check actual envelope rows, not state.categories — that list also
  // includes every category name ever seen in a transaction plus the
  // built-in CATEGORIES seed (e.g. "Инвестиции"), so it can name-collide
  // with a category that has no envelope of its own yet.
  if (state.envelopes.some((e) => e.category === name)) throw new Error("Конверт с таким названием уже есть");
  if (body.cap != null && (!body.cap || body.cap < 0)) throw new Error("Лимит должен быть больше нуля или пустым");
  return createEnvelope(userId, { name, iconKey: body.iconKey || "tag", cap: body.cap ?? null });
});
