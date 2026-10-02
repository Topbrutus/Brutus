#!/usr/bin/env node
import { adaptBrotoculateurStatus } from "../src/brotoculateur-input-adapter.mjs";

const raw = process.argv[2] ?? "http://127.0.0.1:8778/api/status";
let url;
try {
  url = new URL(raw);
} catch {
  throw new Error("BROToculateur probe requires a valid URL");
}

const loopback =
  url.protocol === "http:" &&
  (url.hostname === "127.0.0.1" || url.hostname === "localhost");

if (!loopback) {
  throw new Error("BROToculateur probe v0.1 accepts loopback HTTP only");
}
if (url.pathname !== "/api/status") {
  throw new Error("BROToculateur probe v0.1 accepts /api/status only");
}
if (url.username || url.password) {
  throw new Error("BROToculateur probe rejects URL credentials");
}

const response = await fetch(url, {
  method: "GET",
  redirect: "error",
  headers: {
    Accept: "application/json"
  }
});

if (!response.ok) {
  throw new Error(`BROToculateur status HTTP ${response.status}`);
}

const status = await response.json();
const packet = adaptBrotoculateurStatus(status);
process.stdout.write(JSON.stringify(packet, null, 2) + "\n");
