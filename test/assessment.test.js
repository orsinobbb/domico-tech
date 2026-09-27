import test from "node:test";
import assert from "node:assert/strict";

import {
  QUESTIONS,
  answerQuestion,
  buildRequirementSummary,
  createAssessmentState,
  getAssessmentProgress,
  scoreAssessment,
} from "../src/assessment.js";

const routes = [
  ["consulting", { goal: "clarify", obstacle: "direction", format: "advice" }],
  ["software", { goal: "build", obstacle: "process", format: "delivery" }],
  ["ai", { goal: "adopt-ai", obstacle: "adoption", format: "mixed" }],
  ["hackathon", { goal: "run-event", obstacle: "facilitation", format: "workshop", timeline: "fixed-date" }],
  ["training", { goal: "learn", obstacle: "skills", format: "workshop" }],
  ["coaching", { goal: "grow", obstacle: "direction", format: "coaching", team: "solo" }],
];

function stateWith(overrides = {}, reverse = false) {
  const answers = {
    goal: "clarify",
    stage: "idea",
    team: "small",
    timeline: "quarter",
    obstacle: "direction",
    format: "advice",
    ...overrides,
  };
  const entries = Object.entries(answers);
  return (reverse ? entries.reverse() : entries).reduce(
    (state, [id, value]) => answerQuestion(state, id, value),
    createAssessmentState(),
  );
}

test("six answered questions produce a complete assessment", () => {
  assert.equal(QUESTIONS.length, 6);
  assert.deepEqual(getAssessmentProgress(createAssessmentState()), { answered: 0, total: 6, complete: false });
  assert.deepEqual(getAssessmentProgress(stateWith()), { answered: 6, total: 6, complete: true });
});

test("representative answers route to each of the six services", () => {
  for (const [serviceId, answers] of routes) {
    assert.equal(scoreAssessment(stateWith(answers)).primaryServiceId, serviceId);
  }
});

test("answer order does not change the recommendation", () => {
  const answers = { goal: "adopt-ai", obstacle: "adoption", format: "mixed" };

  assert.deepEqual(scoreAssessment(stateWith(answers)), scoreAssessment(stateWith(answers, true)));
});

test("missing and unknown answers return a safe clarification route", () => {
  const state = createAssessmentState();
  state.answers.goal = "not-a-real-option";

  assert.deepEqual(scoreAssessment(state), {
    primaryServiceId: "consulting",
    secondaryServiceId: null,
    obstacle: "還需要一起釐清真正的阻礙",
    firstStep: "先列出一件最想改善的日常工作，再一起確認問題邊界。",
    preparationItems: ["目前最卡的一件事", "誰每天會遇到它", "希望三個月後有什麼不同"],
    confidence: "low",
  });
});

test("requirement summary carries the chosen context and actionable recommendation", () => {
  const state = stateWith({ goal: "adopt-ai", stage: "manual", obstacle: "adoption", format: "mixed" });
  const summary = buildRequirementSummary(state, scoreAssessment(state));

  assert.match(summary, /目標：把 AI 放進真實工作流程/);
  assert.match(summary, /現況：目前主要靠人工或零散工具/);
  assert.match(summary, /阻礙：團隊不知道怎麼真正採用/);
  assert.match(summary, /建議路線：AI 導入與工作流設計/);
  assert.match(summary, /第一步：挑一個高頻、低風險的流程做兩週試點/);
  assert.match(summary, /預約前可準備/);
});
