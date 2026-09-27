import test from "node:test";
import assert from "node:assert/strict";

import { CONTACT_CONFIG } from "../src/config.js";
import { buildMailto, getAvailableContactActions, resolveContactRoute } from "../src/contact.js";

const allChannels = {
  email: "hello@domicotaiwan.com",
  lineUrl: "https://lin.ee/domico-demo",
  bookingUrl: "https://calendar.app.google/domico-demo",
};

test("default config exposes email only until public links are verified", () => {
  assert.deepEqual(CONTACT_CONFIG, {
    email: "hello@domicotaiwan.com",
    lineUrl: "",
    bookingUrl: "",
  });
});

test("low-confidence questions prefer LINE while clear projects prefer booking", () => {
  assert.equal(resolveContactRoute({ confidence: "low" }, allChannels), "line");
  assert.equal(resolveContactRoute({ confidence: "high" }, allChannels), "booking");
});

test("attachments and formal proposals always prefer email", () => {
  assert.equal(resolveContactRoute({ confidence: "high", needsAttachments: true }, allChannels), "email");
  assert.equal(resolveContactRoute({ confidence: "high", contactIntent: "formal" }, allChannels), "email");
});

test("missing or unsafe external links disappear and safely fall back to email", () => {
  const unsafe = { email: "hello@domicotaiwan.com", lineUrl: "javascript:alert(1)", bookingUrl: "" };

  assert.equal(resolveContactRoute({ confidence: "low" }, unsafe), "email");
  assert.deepEqual(getAvailableContactActions({ confidence: "low" }, unsafe).map(({ id }) => id), ["email"]);
});

test("mailto preserves Chinese, line breaks, hash and ampersand exactly", () => {
  const summary = "目標：AI #客服\n限制：研發 & 營運一起確認";
  const mailto = new URL(buildMailto(summary, "ai", "hello@domicotaiwan.com"));

  assert.equal(mailto.protocol, "mailto:");
  assert.equal(mailto.pathname, "hello@domicotaiwan.com");
  assert.equal(mailto.searchParams.get("subject"), "[豆米口科技] AI 導入與工作流設計需求摘要");
  assert.equal(mailto.searchParams.get("body"), summary);
});

test("available actions put the recommended channel first without hiding alternatives", () => {
  assert.deepEqual(
    getAvailableContactActions({ confidence: "high" }, allChannels).map(({ id }) => id),
    ["booking", "line", "email"],
  );
});
