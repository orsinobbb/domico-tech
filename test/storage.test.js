import test from "node:test";
import assert from "node:assert/strict";

import { createAssessmentState } from "../src/assessment.js";
import { loadAssessmentDraft, saveAssessmentDraft } from "../src/storage.js";

function memoryStorage(initialValue = null) {
  let value = initialValue;
  return {
    getItem() { return value; },
    setItem(_key, nextValue) { value = nextValue; },
  };
}

test("assessment draft round-trips only known answers", () => {
  const storage = memoryStorage();
  const state = { version: 1, answers: { goal: "adopt-ai", stage: "manual", privateNote: "do not save" } };

  assert.equal(saveAssessmentDraft(storage, state), true);
  assert.deepEqual(loadAssessmentDraft(storage), {
    version: 1,
    answers: { goal: "adopt-ai", stage: "manual" },
  });
});

test("damaged JSON and wrong versions safely return an empty draft", () => {
  assert.deepEqual(loadAssessmentDraft(memoryStorage("not-json")), createAssessmentState());
  assert.deepEqual(loadAssessmentDraft(memoryStorage('{"version":99,"answers":{"goal":"build"}}')), createAssessmentState());
});

test("blocked storage never interrupts the assessment", () => {
  const blocked = {
    getItem() { throw new Error("denied"); },
    setItem() { throw new Error("denied"); },
  };

  assert.deepEqual(loadAssessmentDraft(blocked), createAssessmentState());
  assert.equal(saveAssessmentDraft(blocked, createAssessmentState()), false);
});

test("unknown question values are dropped while loading", () => {
  const saved = JSON.stringify({ version: 1, answers: { goal: "wrong", format: "advice", unknown: "value" } });

  assert.deepEqual(loadAssessmentDraft(memoryStorage(saved)), {
    version: 1,
    answers: { format: "advice" },
  });
});
