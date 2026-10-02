import test from "node:test";
import assert from "node:assert/strict";

import { FUNNEL_EVENT_NAMES, buildFunnelEvent, emitFunnelEvent } from "../src/funnel-events.js";

test("only the six approved funnel event names are accepted", () => {
  assert.deepEqual(FUNNEL_EVENT_NAMES, [
    "audience_selected",
    "assessment_started",
    "assessment_completed",
    "task_card_copied",
    "proof_opened",
    "contact_selected",
  ]);
  assert.equal(buildFunnelEvent("unknown_event", {}, {}), null);
});

test("event details keep funnel dimensions and remove personal data", () => {
  const event = buildFunnelEvent("assessment_completed", {
    audienceId: "brand",
    painId: "content",
    serviceId: "ai",
    leadTier: "priority",
    currentStep: 7,
    name: "王小明",
    email: "private@example.com",
    phone: "0900000000",
    summary: "confidential",
    freeText: "secret",
  }, { utm_source: "linkedin", email: "private@example.com" });

  assert.deepEqual(event, {
    name: "assessment_completed",
    payload: {
      audienceId: "brand",
      painId: "content",
      serviceId: "ai",
      leadTier: "priority",
      currentStep: 7,
    },
    attribution: { utm_source: "linkedin" },
  });
  assert.doesNotMatch(JSON.stringify(event), /王小明|private@example|0900000000|confidential|secret/);
});

test("emitFunnelEvent dispatches approved events once and ignores null", () => {
  const seen = [];
  const target = { dispatchEvent(event) { seen.push(event); return true; } };
  const event = buildFunnelEvent("audience_selected", { audienceId: "sme" }, {});

  assert.equal(emitFunnelEvent(target, event), true);
  assert.equal(emitFunnelEvent(target, null), false);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].type, "domico:funnel");
  assert.deepEqual(seen[0].detail, event);
});
