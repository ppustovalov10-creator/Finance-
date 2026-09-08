#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { sign } from "node:crypto";

const [resource, bodyJson] = process.argv.slice(2);
const baseUrl = process.env.FINANCE_APP_URL?.replace(/\/$/, "");
const privateKeyPath = process.env.HERMES_SIGNING_PRIVATE_KEY ?? "D:/hermes-homes/pasha/home/.hermes-finance-sync/signing-private.pem";

if (!baseUrl) throw new Error("Не задан FINANCE_APP_URL");
if (!resource || !bodyJson) throw new Error("Использование: node scripts/hermes-finance-sync.mjs <transactions|cash|income|state> '<JSON>'");
if (!/^(transactions|cash|income|state)$/.test(resource)) throw new Error("Неизвестный ресурс интеграции");

const path = `/api/integrations/hermes/${resource}`;
const method = resource === "state" ? "GET" : "POST";
const body = method === "GET" ? "" : JSON.stringify(JSON.parse(bodyJson));
const timestamp = String(Date.now());
const payload = Buffer.from(`${method}\n${path}\n${timestamp}\n${body}`, "utf8");
const signature = sign(null, payload, readFileSync(privateKeyPath)).toString("base64");
const response = await fetch(`${baseUrl}${path}`, {
  method,
  headers: {
    "content-type": "application/json",
    "x-hermes-timestamp": timestamp,
    "x-hermes-signature": signature,
  },
  body: method === "GET" ? undefined : body,
});

const responseBody = await response.text();
console.log(JSON.stringify({ status: response.status, body: responseBody }, null, 2));
if (!response.ok) process.exitCode = 1;
