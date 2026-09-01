import { addKeyword, removeKeyword } from "@/lib/repo";
import { withUser, readJson } from "@/lib/api-helpers";

interface Body {
  category: string;
  keyword: string;
}

export const POST = withUser(async (userId, req) => {
  const body = await readJson<Body>(req);
  const keyword = (body.keyword || "").trim().toLowerCase();
  if (!keyword || !body.category) throw new Error("Пустое слово");
  return addKeyword(userId, body.category, keyword);
});

export const DELETE = withUser(async (userId, req) => {
  const body = await readJson<Body>(req);
  if (!body.keyword || !body.category) throw new Error("Пустое слово");
  await removeKeyword(userId, body.category, body.keyword);
});
