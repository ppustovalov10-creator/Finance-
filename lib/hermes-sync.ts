import { timingSafeEqual } from "node:crypto";

export interface HermesTransactionInput {
  amount: number;
  description: string;
  date: string;
  externalId: string;
}

export interface HermesTransaction {
  amount: number;
  description: string;
  dateStr: string;
  externalId: string;
}

export function isAuthorizedHermesRequest(request: Request, token: string): boolean {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;

  const supplied = authorization.slice("Bearer ".length);
  const expectedBuffer = Buffer.from(token);
  const suppliedBuffer = Buffer.from(supplied);

  return (
    expectedBuffer.length > 0 &&
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

export function requireHermesSyncUserId(request: Request): string | null {
  const token = process.env.HERMES_SYNC_TOKEN;
  const userId = process.env.HERMES_SYNC_USER_ID;
  if (!token || !userId || !isAuthorizedHermesRequest(request, token)) return null;
  return userId;
}

export function parseHermesTransaction(input: HermesTransactionInput): HermesTransaction {
  const amount = Number(input.amount);
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const dateStr = typeof input.date === "string" ? input.date : "";
  const externalId = typeof input.externalId === "string" ? input.externalId.trim() : "";

  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Некорректная сумма");
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) throw new Error("Некорректная дата");
  if (!externalId) throw new Error("Не указан внешний идентификатор операции");

  return { amount, description, dateStr, externalId };
}
