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

const baseAnswers = {
  audience: "sme",
  process: "admin",
  frequency: "weekly",
  impact: "lost-time",
  tools: "manual",
  role: "recommender",
  timeline: "quarter",
};

function stateWith(overrides = {}, reverse = false) {
  const entries = Object.entries({ ...baseAnswers, ...overrides });
  return (reverse ? entries.reverse() : entries).reduce(
    (state, [id, value]) => answerQuestion(state, id, value),
    createAssessmentState(),
  );
}

test("the v2 assessment asks the seven buyer questions in journey order", () => {
  assert.deepEqual(
    QUESTIONS.map(({ id }) => id),
    ["audience", "process", "frequency", "impact", "tools", "role", "timeline"],
  );
  assert.deepEqual(createAssessmentState(), { version: 2, answers: {} });
});

test("both target audiences can complete all seven questions", () => {
  assert.deepEqual(getAssessmentProgress(createAssessmentState()), { answered: 0, total: 7, complete: false });
  assert.deepEqual(getAssessmentProgress(stateWith({ audience: "sme" })), { answered: 7, total: 7, complete: true });
  assert.deepEqual(getAssessmentProgress(stateWith({ audience: "brand" })), { answered: 7, total: 7, complete: true });
});

test("repetitive, customer and content work route to AI", () => {
  for (const process of ["admin", "customer", "content"]) {
    assert.equal(scoreAssessment(stateWith({ process, tools: "manual" })).primaryServiceId, "ai");
  }
});

test("handoffs, reports and campaigns route to software", () => {
  const routes = [
    ["handoff", "existing-system"],
    ["reporting", "spreadsheets"],
    ["campaigns", "many-tools"],
  ];

  for (const [process, tools] of routes) {
    assert.equal(scoreAssessment(stateWith({ process, tools })).primaryServiceId, "software");
  }
});

test("unclear processes and tools route to consulting", () => {
  assert.equal(scoreAssessment(stateWith({ process: "unsure", tools: "unsure" })).primaryServiceId, "consulting");
});

test("answer insertion order does not change the recommendation", () => {
  const answers = { audience: "brand", process: "content", tools: "manual" };

  assert.deepEqual(scoreAssessment(stateWith(answers)), scoreAssessment(stateWith(answers, true)));
});

test("lead tier reflects decision authority, urgency and business impact", () => {
  assert.equal(scoreAssessment(stateWith({ role: "decision-maker", frequency: "daily", impact: "errors", timeline: "month" })).leadTier, "priority");
  assert.equal(scoreAssessment(stateWith({ role: "recommender", frequency: "weekly", impact: "lost-time", timeline: "quarter" })).leadTier, "qualified");
  assert.equal(scoreAssessment(stateWith({ role: "operator", frequency: "monthly", impact: "unclear", timeline: "exploring" })).leadTier, "nurture");
});

test("fewer than five valid answers return a complete low-confidence consulting result", () => {
  const state = createAssessmentState({ audience: "brand", process: "content", frequency: "weekly", impact: "lost-time" });

  assert.deepEqual(scoreAssessment(state), {
    audienceId: "brand",
    painId: "content",
    primaryServiceId: "consulting",
    secondaryServiceId: null,
    leadTier: "nurture",
    confidence: "low",
    obstacle: "還需要一起釐清真正的阻礙",
    quickWin: "先記錄一週內最常重複的工作，以及每次大約花多少時間。",
    firstStep: "用一頁問題地圖對齊目標、流程、限制與最值得驗證的機會。",
    preparationItems: ["目前最卡的一件事", "誰每天會遇到它", "希望三個月後有什麼不同"],
  });
});

test("directly supplied unknown audience and process values are never echoed", () => {
  const state = stateWith();
  state.answers.audience = "<img src=x>";
  state.answers.process = "<script>";

  const result = scoreAssessment(state);

  assert.equal(result.audienceId, "general");
  assert.equal(result.painId, "unsure");
});

test("requirement summary carries all buyer context and both next actions", () => {
  const state = stateWith({ audience: "brand", process: "content", frequency: "daily", impact: "inconsistent-quality", tools: "manual", role: "decision-maker", timeline: "month" });
  const result = scoreAssessment(state);
  const summary = buildRequirementSummary(state, result);

  assert.match(summary, /團隊：品牌、行銷或文創團隊/);
  assert.match(summary, /流程：品牌內容與行銷素材/);
  assert.match(summary, /頻率：每天/);
  assert.match(summary, /影響：品質與品牌表現不穩定/);
  assert.match(summary, /工具：多數靠人工/);
  assert.match(summary, /角色：我能決定是否推進/);
  assert.match(summary, /時程：一個月內/);
  assert.match(summary, /建議路線：AI 導入與工作流設計/);
  assert.match(summary, /可以先做：挑一份不含敏感資料的真實素材/);
  assert.match(summary, /第一步：選一個高頻、低風險流程進行兩週概念驗證/);
  assert.match(summary, /預約前可準備/);
});
