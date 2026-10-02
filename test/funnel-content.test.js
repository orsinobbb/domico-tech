import test from "node:test";
import assert from "node:assert/strict";

import {
  AUDIENCE_CONTENT,
  OFFER_STEPS,
  PROOF_ITEMS,
  buildTaskCard,
  getAudienceContent,
  normalizeAudienceId,
  selectProofItems,
} from "../src/funnel-content.js";

test("SME and brand paths speak to their distinct business outcomes", () => {
  assert.match(AUDIENCE_CONTENT.sme.value, /省時間/);
  assert.match(AUDIENCE_CONTENT.sme.value, /減少錯誤/);
  assert.match(AUDIENCE_CONTENT.sme.value, /交接/);
  assert.match(AUDIENCE_CONTENT.brand.value, /內容協作/);
  assert.match(AUDIENCE_CONTENT.brand.value, /品牌一致/);
  assert.match(AUDIENCE_CONTENT.brand.value, /顧客旅程/);
});

test("unknown audience input always resolves to the general path", () => {
  for (const value of [undefined, null, "", "enterprise", "<img src=x>", {}, []]) {
    assert.equal(normalizeAudienceId(value), "general");
    assert.equal(getAudienceContent(value).id, "general");
    assert.doesNotMatch(JSON.stringify(getAudienceContent(value)), /<img|enterprise/);
  }
  assert.equal(normalizeAudienceId("sme"), "sme");
  assert.equal(normalizeAudienceId("brand"), "brand");
});

test("offer ladder moves from diagnosis to implementation in five bounded steps", () => {
  assert.deepEqual(OFFER_STEPS.map(({ id }) => id), ["diagnosis", "reading", "workshop", "pilot", "implementation"]);
  assert.match(OFFER_STEPS[0].label, /3 分鐘/);
  assert.match(OFFER_STEPS[1].label, /30 分鐘/);
  assert.match(OFFER_STEPS[2].label, /付費/);
  assert.match(OFFER_STEPS[3].label, /兩週/);
  assert.match(OFFER_STEPS[4].label, /客製開發|AI 導入/);
});

test("proof selection returns no more than two known relevant items", () => {
  assert.deepEqual(PROOF_ITEMS.map(({ id }) => id), ["domico-site", "private-assessment", "problem-map"]);

  const selected = selectProofItems({ audienceId: "brand", primaryServiceId: "ai" });

  assert.ok(selected.length <= 2);
  assert.ok(selected.every(({ id }) => ["domico-site", "private-assessment", "problem-map"].includes(id)));
  assert.ok(selected.some(({ id }) => id === "private-assessment"));
  assert.equal(selectProofItems({ audienceId: "invalid", primaryServiceId: "invalid" }, 99).length, 3);
  assert.deepEqual(selectProofItems({}, 0), []);
});

test("task cards carry useful next steps without copying personal or free-form fields", () => {
  const state = {
    version: 2,
    answers: {
      audience: "brand",
      process: "content",
      name: "王小明",
      email: "private@example.com",
      phone: "0900000000",
      freeText: "未公開企劃",
    },
  };
  const result = {
    audienceId: "brand",
    painId: "content",
    primaryServiceId: "ai",
    quickWin: "先比較一份素材的人工與 AI 協作結果。",
    firstStep: "進行兩週概念驗證。",
    preparationItems: ["一份去識別化素材", "目前製作流程"],
  };

  const card = buildTaskCard(state, result);
  const serialized = JSON.stringify(card);

  assert.deepEqual(Object.keys(card), ["title", "audienceLabel", "painLabel", "quickWin", "firstStep", "proofIds", "preparationItems"]);
  assert.equal(card.audienceLabel, "品牌、行銷與文創團隊");
  assert.equal(card.painLabel, "品牌內容與行銷素材");
  assert.equal(card.quickWin, result.quickWin);
  assert.equal(card.firstStep, result.firstStep);
  assert.deepEqual(card.preparationItems, result.preparationItems);
  assert.ok(card.proofIds.length <= 2);
  for (const secret of ["王小明", "private@example.com", "0900000000", "未公開企劃"]) assert.doesNotMatch(serialized, new RegExp(secret));
});
