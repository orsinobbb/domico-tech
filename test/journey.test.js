import test from "node:test";
import assert from "node:assert/strict";

import { QUESTIONS, answerQuestion, createAssessmentState } from "../src/assessment.js";
import { createJourneyState, transitionJourney } from "../src/journey.js";

const completeAnswers = {
  audience: "sme",
  process: "admin",
  frequency: "daily",
  impact: "lost-time",
  tools: "manual",
  role: "decision-maker",
  timeline: "month",
};

function completedAssessment(overrides = {}) {
  return Object.entries({ ...completeAnswers, ...overrides }).reduce(
    (state, [questionId, value]) => answerQuestion(state, questionId, value),
    createAssessmentState(),
  );
}

test("createJourneyState always exposes the fixed state shape", () => {
  assert.deepEqual(createJourneyState(createAssessmentState()), {
    assessmentState: { version: 2, answers: {} },
    currentIndex: 0,
    mode: "questions",
    lastEventName: null,
  });

  assert.deepEqual(createJourneyState(completedAssessment()), {
    assessmentState: completedAssessment(),
    currentIndex: QUESTIONS.length - 1,
    mode: "result",
    lastEventName: null,
  });
});

test("audience selection, answers and navigation produce one event per real transition", () => {
  let journey = createJourneyState(createAssessmentState());
  journey = transitionJourney(journey, { type: "SELECT_AUDIENCE", value: "brand" });
  assert.equal(journey.assessmentState.answers.audience, "brand");
  assert.equal(journey.lastEventName, "audience_selected");

  journey = transitionJourney(journey, { type: "SELECT_AUDIENCE", value: "brand" });
  assert.equal(journey.lastEventName, null);
  journey = transitionJourney(journey, { type: "NEXT" });
  assert.equal(journey.currentIndex, 1);

  journey = transitionJourney(journey, { type: "ANSWER", questionId: "process", value: "content" });
  assert.equal(journey.assessmentState.answers.process, "content");
  assert.equal(journey.lastEventName, "assessment_started");
  journey = transitionJourney(journey, { type: "ANSWER", questionId: "process", value: "content" });
  assert.equal(journey.lastEventName, null);

  journey = transitionJourney(journey, { type: "PREVIOUS" });
  assert.equal(journey.currentIndex, 0);
  assert.equal(journey.lastEventName, null);
});

test("invalid and repeated actions do not advance or repeat events", () => {
  const initial = createJourneyState(createAssessmentState());
  const invalidAudience = transitionJourney(initial, { type: "SELECT_AUDIENCE", value: "<script>" });
  const unansweredNext = transitionJourney(initial, { type: "NEXT" });
  const unknown = transitionJourney(initial, { type: "NOPE" });

  assert.deepEqual(invalidAudience, initial);
  assert.deepEqual(unansweredNext, initial);
  assert.deepEqual(unknown, initial);
  assert.equal(invalidAudience.lastEventName, null);
});

test("a completed result can be reopened, changed and rebuilt without stale answers", () => {
  let journey = createJourneyState(completedAssessment());
  assert.equal(journey.mode, "result");

  journey = transitionJourney(journey, { type: "PREVIOUS" });
  assert.equal(journey.mode, "questions");
  assert.equal(journey.currentIndex, QUESTIONS.length - 1);

  journey = transitionJourney(journey, { type: "ANSWER", questionId: "timeline", value: "exploring" });
  assert.equal(journey.mode, "questions");
  assert.equal(journey.assessmentState.answers.timeline, "exploring");

  journey = transitionJourney(journey, { type: "SHOW_RESULT" });
  assert.equal(journey.mode, "result");
  assert.equal(journey.lastEventName, "assessment_completed");
  assert.equal(journey.assessmentState.answers.timeline, "exploring");

  const repeated = transitionJourney(journey, { type: "SHOW_RESULT" });
  assert.equal(repeated.lastEventName, null);
});

test("restart returns to a blank v2 assessment at the first question", () => {
  const restarted = transitionJourney(createJourneyState(completedAssessment()), { type: "RESTART" });

  assert.deepEqual(restarted, {
    assessmentState: { version: 2, answers: {} },
    currentIndex: 0,
    mode: "questions",
    lastEventName: null,
  });
});
