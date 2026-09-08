import { createPublicKey, timingSafeEqual, verify } from "node:crypto";

const HERMES_SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

export const HERMES_SIGNING_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEArd93NVeQKqAMfahdkqWwl9yyQ+rjzg1lUj9wRCsKONQ=
-----END PUBLIC KEY-----`;

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

export function buildHermesSigningPayload(method: string, pathname: string, timestamp: string, body: string): Buffer {
  return Buffer.from(`${method.toUpperCase()}\n${pathname}\n${timestamp}\n${body}`, "utf8");
}

export function isAuthorizedHermesSignature(
  request: Request,
  body: string,
  publicKey = HERMES_SIGNING_PUBLIC_KEY,
  now = Date.now()
): boolean {
  const timestamp = request.headers.get("x-hermes-timestamp");
  const encodedSignature = request.headers.get("x-hermes-signature");
  if (!timestamp || !encodedSignature || !/^\d{13}$/.test(timestamp)) return false;

  const signedAt = Number(timestamp);
  if (!Number.isSafeInteger(signedAt) || Math.abs(now - signedAt) > HERMES_SIGNATURE_MAX_AGE_MS) return false;

  try {
    const signature = Buffer.from(encodedSignature, "base64");
    if (signature.length === 0) return false;
    const payload = buildHermesSigningPayload(request.method, new URL(request.url).pathname, timestamp, body);
    return verify(null, payload, createPublicKey(publicKey), signature);
  } catch {
    return false;
  }
}

export async function requireHermesSyncUserId(request: Request, rawBody = ""): Promise<string | null> {
  const token = process.env.HERMES_SYNC_TOKEN;
  const userId = process.env.HERMES_SYNC_USER_ID;
  if (!userId) return null;

  const isBearerAuthorized = Boolean(token && isAuthorizedHermesRequest(request, token));
  if (isBearerAuthorized || isAuthorizedHermesSignature(request, rawBody)) return userId;
  return null;
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
