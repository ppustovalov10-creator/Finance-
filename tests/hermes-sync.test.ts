import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import {
  buildHermesSigningPayload,
  isAuthorizedHermesRequest,
  isAuthorizedHermesSignature,
  parseHermesTransaction,
} from "@/lib/hermes-sync";

test("accepts an exact Bearer integration token", () => {
  const request = new Request("https://example.test/api/integrations/hermes/state", {
    headers: { authorization: "Bearer long-random-token" },
  });

  assert.equal(isAuthorizedHermesRequest(request, "long-random-token"), true);
});

test("rejects a missing, malformed, or different integration token", () => {
  const noHeader = new Request("https://example.test");
  const malformed = new Request("https://example.test", {
    headers: { authorization: "Token long-random-token" },
  });
  const different = new Request("https://example.test", {
    headers: { authorization: "Bearer another-token" },
  });

  assert.equal(isAuthorizedHermesRequest(noHeader, "long-random-token"), false);
  assert.equal(isAuthorizedHermesRequest(malformed, "long-random-token"), false);
  assert.equal(isAuthorizedHermesRequest(different, "long-random-token"), false);
});

test("accepts a complete external transaction and normalizes its description", () => {
  assert.deepEqual(
    parseHermesTransaction({
      amount: 500,
      description: "  Такси до дома  ",
      date: "07.09.2026",
      externalId: "telegram:6248812067:123",
    }),
    {
      amount: 500,
      description: "Такси до дома",
      dateStr: "07.09.2026",
      externalId: "telegram:6248812067:123",
    }
  );
});

test("rejects an external transaction without a valid amount, date, or external id", () => {
  assert.throws(() => parseHermesTransaction({ amount: 0, description: "Такси", date: "07.09.2026", externalId: "a" }));
  assert.throws(() => parseHermesTransaction({ amount: 500, description: "Такси", date: "2026-09-07", externalId: "a" }));
  assert.throws(() => parseHermesTransaction({ amount: 500, description: "Такси", date: "07.09.2026", externalId: "" }));
});

test("accepts a fresh Ed25519 signature only for the exact HTTP request", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const body = JSON.stringify({ amount: 300, description: "Обед", date: "08.09.2026", externalId: "telegram:6248812067:300" });
  const timestamp = "1788900000000";
  const url = "https://example.test/api/integrations/hermes/transactions";
  const signature = sign(null, buildHermesSigningPayload("POST", new URL(url).pathname, timestamp, body), privateKey).toString("base64");
  const request = new Request(url, { method: "POST", headers: { "x-hermes-timestamp": timestamp, "x-hermes-signature": signature } });

  assert.equal(isAuthorizedHermesSignature(request, body, publicKey.export({ type: "spki", format: "pem" }).toString(), 1788900000000), true);
  assert.equal(isAuthorizedHermesSignature(request, `${body} `, publicKey.export({ type: "spki", format: "pem" }).toString(), 1788900000000), false);
  assert.equal(isAuthorizedHermesSignature(request, body, publicKey.export({ type: "spki", format: "pem" }).toString(), 1788900360001), false);
});
