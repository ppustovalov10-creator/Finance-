import assert from "node:assert/strict";
import test from "node:test";
import { isAuthorizedHermesRequest, parseHermesTransaction } from "@/lib/hermes-sync";

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
