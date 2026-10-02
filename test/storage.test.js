import test from "node:test";
import assert from "node:assert/strict";

import { createAssessmentState } from "../src/assessment.js";
import { ASSESSMENT_STORAGE_KEY, loadAssessmentDraft, saveAssessmentDraft } from "../src/storage.js";

function memoryStorage(initialValue = null) {
  let value = initialValue;
  let key = null;
  return {
    getItem(nextKey) { key = nextKey; return value; },
    setItem(nextKey, nextValue) { key = nextKey; value = nextValue; },
    snapshot() { return { key, value }; },
  };
}

test("v2 assessment draft round-trips only seven known answers", () => {
  const storage = memoryStorage();
  const state = {
    version: 2,
    answers: {
      audience: "brand",
      process: "content",
      frequency: "daily",
      impact: "inconsistent-quality",
      tools: "manual",
      role: "decision-maker",
      timeline: "month",
      privateNote: "must not persist",
    },
  };

  assert.equal(saveAssessmentDraft(storage, state), true);
  assert.equal(ASSESSMENT_STORAGE_KEY, "domico-labs-assessment-v2");
  assert.equal(storage.snapshot().key, "domico-labs-assessment-v2");
  assert.deepEqual(loadAssessmentDraft(storage), {
    version: 2,
    answers: {
      audience: "brand",
      process: "content",
      frequency: "daily",
      impact: "inconsistent-quality",
      tools: "manual",
      role: "decision-maker",
      timeline: "month",
    },
  });
  assert.equal("privateNote" in loadAssessmentDraft(storage).answers, false);
});

test("v1, unknown versions and damaged JSON return an empty v2 draft", () => {
  assert.deepEqual(loadAssessmentDraft(memoryStorage('{"version":1,"answers":{"goal":"build"}}')), createAssessmentState());
  assert.deepEqual(loadAssessmentDraft(memoryStorage('{"version":99,"answers":{"audience":"sme"}}')), createAssessmentState());
  assert.deepEqual(loadAssessmentDraft(memoryStorage("not-json")), createAssessmentState());
});

test("blocked storage never interrupts the assessment", () => {
  const blocked = {
    getItem() { throw new Error("denied"); },
    setItem() { throw new Error("denied"); },
  };

  assert.deepEqual(loadAssessmentDraft(blocked), createAssessmentState());
  assert.equal(saveAssessmentDraft(blocked, createAssessmentState()), false);
});

test("unknown question values and fields are dropped while loading", () => {
  const saved = JSON.stringify({
    version: 2,
    answers: { audience: "wrong", process: "content", role: "decision-maker", unknown: "value" },
  });

  assert.deepEqual(loadAssessmentDraft(memoryStorage(saved)), {
    version: 2,
    answers: { process: "content", role: "decision-maker" },
  });
});
