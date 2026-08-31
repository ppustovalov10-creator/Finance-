import { updateEnvelope, deleteEnvelope, getAppState } from "@/lib/repo";
import { withUser, readJson } from "@/lib/api-helpers";

interface Body {
  newName: string;
  cap: number | null;
  isRegular: boolean;
}

export const PUT = withUser(async (userId, req) => {
  const category = decodeURIComponent(new URL(req.url).pathname.split("/").pop() as string);
  const body = await readJson<Body>(req);
  const newName = (body.newName || "").trim();
  if (!newName) throw new Error("Название не может быть пустым");
  if (newName !== category) {
    const state = await getAppState(userId);
    if (state.categories.includes(newName)) {
      throw new Error("Конверт с таким названием уже есть — выбери другое имя");
    }
  }
  if (body.cap != null && (!body.cap || body.cap < 0)) throw new Error("Лимит должен быть больше нуля или пустым");
  await updateEnvelope(userId, category, { newName, cap: body.cap ?? null, isRegular: !!body.isRegular });
});

export const DELETE = withUser(async (userId, req) => {
  const category = decodeURIComponent(new URL(req.url).pathname.split("/").pop() as string);
  await deleteEnvelope(userId, category);
});
