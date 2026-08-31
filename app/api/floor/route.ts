import { updateFloor } from "@/lib/repo";
import { withUser, readJson } from "@/lib/api-helpers";

export const PUT = withUser(async (userId, req) => {
  const body = await readJson<{ value: number }>(req);
  if (!body.value || body.value <= 0) throw new Error("Значение должно быть больше нуля");
  await updateFloor(userId, body.value);
});
