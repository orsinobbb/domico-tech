import test from "node:test";
import assert from "node:assert/strict";

import { loadAttribution, parseAttribution, saveAttribution } from "../src/attribution.js";

function memoryStorage(initialValue = null) {
  let value = initialValue;
  return {
    getItem() { return value; },
    setItem(_key, nextValue) { value = nextValue; },
  };
}

test("attribution keeps only UTM fields and sanitizes every value", () => {
  const params = new URLSearchParams({
    utm_source: "partner\nnewsletter",
    utm_medium: "social",
    utm_campaign: "x".repeat(120),
    utm_content: "case-a",
    utm_term: "ai consultant",
    email: "private@example.com",
    unknown: "discard-me",
  });

  assert.deepEqual(parseAttribution(params), {
    utm_source: "partnernewsletter",
    utm_medium: "social",
    utm_campaign: "x".repeat(100),
    utm_content: "case-a",
    utm_term: "ai consultant",
  });
});

test("empty and malformed attribution input returns an empty object", () => {
  for (const input of [undefined, null, "", {}, [], 42]) assert.deepEqual(parseAttribution(input), {});
});

test("attribution round-trips through session storage without accepting extra fields", () => {
  const storage = memoryStorage();
  assert.equal(saveAttribution(storage, { utm_source: "linkedin", email: "private@example.com" }), true);
  assert.deepEqual(loadAttribution(storage), { utm_source: "linkedin" });
});

test("damaged or blocked session storage safely returns no attribution", () => {
  const blocked = {
    getItem() { throw new Error("denied"); },
    setItem() { throw new Error("denied"); },
  };

  assert.deepEqual(loadAttribution(memoryStorage("not-json")), {});
  assert.deepEqual(loadAttribution(memoryStorage(JSON.stringify(["utm_source", "wrong"]))), {});
  assert.deepEqual(loadAttribution(blocked), {});
  assert.equal(saveAttribution(blocked, { utm_source: "partner" }), false);
});
