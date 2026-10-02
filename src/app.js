import {
  QUESTIONS,
  buildRequirementSummary,
  getAssessmentProgress,
  getServiceLabel,
  scoreAssessment,
} from "./assessment.js";
import { loadAttribution, parseAttribution, saveAttribution } from "./attribution.js";
import { CONTACT_CONFIG } from "./config.js";
import { getAvailableContactActions } from "./contact.js";
import { buildFunnelEvent, emitFunnelEvent } from "./funnel-events.js";
import {
  buildTaskCard,
  getAudienceContent,
  normalizeAudienceId,
  selectProofItems,
} from "./funnel-content.js";
import { createJourneyState, transitionJourney } from "./journey.js";
import { loadAssessmentDraft, saveAssessmentDraft } from "./storage.js";
import {
  renderContactActions,
  renderProofLinks,
  renderQuestion as renderQuestionMarkup,
  renderTaskCard,
} from "./views.js";

const form = document.querySelector("#assessment-form");
const fieldset = document.querySelector("#assessment-question");
const legend = fieldset.querySelector("legend");
const options = document.querySelector("#answer-options");
const progressLabel = document.querySelector("#assessment-progress");
const progressFill = document.querySelector("#progress-fill");
const previousButton = document.querySelector("#previous-question");
const nextButton = document.querySelector("#next-question");
const resultPanel = document.querySelector("#assessment-result");
const taskCardElement = document.querySelector("#task-card");
const audiencePicker = document.querySelector("#audience-picker");
const headline = document.querySelector("[data-audience-copy=headline]");
const heroLead = document.querySelector("[data-audience-copy=value]");
const pageUrl = new URL(globalThis.location.href);
const queryAudience = normalizeAudienceId(pageUrl.searchParams.get("audience"));
const queryAttribution = parseAttribution(pageUrl.searchParams);
const attribution = { ...loadAttribution(globalThis.sessionStorage), ...queryAttribution };

saveAttribution(globalThis.sessionStorage, attribution);

let journey = createJourneyState(loadAssessmentDraft(globalThis.localStorage));
if (queryAudience !== "general") {
  journey = transitionJourney(journey, { type: "SELECT_AUDIENCE", value: queryAudience });
  journey = { ...journey, lastEventName: null };
}

function focusSoon(element) {
  requestAnimationFrame(() => element?.focus());
}

function applyAudienceContent(audienceId) {
  if (audienceId === "general") return;
  const content = getAudienceContent(audienceId);
  headline.textContent = content.headline;
  heroLead.textContent = content.value;
  for (const choice of audiencePicker.querySelectorAll("[data-audience-id]")) {
    const selected = choice.dataset.audienceId === content.id;
    choice.classList.toggle("is-selected", selected);
    if (selected) choice.setAttribute("aria-current", "true");
    else choice.removeAttribute("aria-current");
  }
}

function updateAudienceUrl(audienceId) {
  const url = new URL(globalThis.location.href);
  url.searchParams.set("audience", audienceId);
  url.hash = "assessment";
  globalThis.history.replaceState(null, "", url);
}

function emitLatestEvent(extraPayload = {}) {
  if (!journey.lastEventName) return;
  const result = scoreAssessment(journey.assessmentState);
  const event = buildFunnelEvent(journey.lastEventName, {
    audienceId: result.audienceId,
    painId: result.painId,
    serviceId: result.primaryServiceId,
    leadTier: result.leadTier,
    currentStep: journey.currentIndex + 1,
    ...extraPayload,
  }, attribution);
  emitFunnelEvent(document, event);
  journey = { ...journey, lastEventName: null };
}

function saveJourney() {
  saveAssessmentDraft(globalThis.localStorage, journey.assessmentState);
}

function showQuestionMode() {
  form.hidden = false;
  resultPanel.hidden = true;
}

function renderQuestionView({ moveFocus = false } = {}) {
  const question = QUESTIONS[journey.currentIndex];
  const progress = getAssessmentProgress(journey.assessmentState);
  showQuestionMode();
  legend.textContent = question.legend;
  options.innerHTML = renderQuestionMarkup(question, journey.assessmentState.answers[question.id]);
  progressLabel.textContent = `第 ${journey.currentIndex + 1} 題，共 ${QUESTIONS.length} 題・已完成 ${progress.answered} 題`;
  progressFill.style.width = `${(progress.answered / QUESTIONS.length) * 100}%`;
  previousButton.disabled = journey.currentIndex === 0;
  nextButton.textContent = journey.currentIndex === QUESTIONS.length - 1 ? "看我的建議 →" : "下一題 →";
  nextButton.disabled = !journey.assessmentState.answers[question.id];
  if (moveFocus) focusSoon(legend);
}

function renderResultView({ moveFocus = true } = {}) {
  const result = scoreAssessment(journey.assessmentState);
  const summary = buildRequirementSummary(journey.assessmentState, result);
  const card = buildTaskCard(journey.assessmentState, result);
  const reason = result.confidence === "high"
    ? "你的方向已經相當清楚。先用一個小範圍驗證，再決定完整投入。"
    : "目前資訊還不完整，先一起釐清問題會比急著選工具更有效。";
  const proofItems = selectProofItems(result);
  const actions = getAvailableContactActions({ ...result, summary }, CONTACT_CONFIG);

  form.hidden = true;
  resultPanel.hidden = false;
  taskCardElement.innerHTML = renderTaskCard({
    ...card,
    reason,
    serviceLabel: getServiceLabel(result.primaryServiceId),
  });
  taskCardElement.querySelector("#result-related-proofs").innerHTML = renderProofLinks(proofItems);
  document.querySelector("#summary-text").value = summary;
  document.querySelector("#copy-status").textContent = "";
  document.querySelector("#contact-actions").innerHTML = renderContactActions(actions);
  if (moveFocus) focusSoon(document.querySelector("#result-title"));
  return result;
}

audiencePicker.addEventListener("click", (event) => {
  const choice = event.target.closest("[data-audience-id]");
  if (!choice || !audiencePicker.contains(choice)) return;
  const audienceId = normalizeAudienceId(choice.dataset.audienceId);
  if (audienceId === "general") return;
  event.preventDefault();
  journey = transitionJourney(journey, { type: "SELECT_AUDIENCE", value: audienceId });
  saveJourney();
  applyAudienceContent(audienceId);
  updateAudienceUrl(audienceId);
  emitLatestEvent();
  renderQuestionView({ moveFocus: true });
  document.querySelector("#assessment").scrollIntoView({
    behavior: globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
});

options.addEventListener("change", (event) => {
  const input = event.target.closest("input[type=radio]");
  if (!input || !options.contains(input)) return;
  const question = QUESTIONS[journey.currentIndex];
  const action = question.id === "audience"
    ? { type: "SELECT_AUDIENCE", value: input.value }
    : { type: "ANSWER", questionId: question.id, value: input.value };
  journey = transitionJourney(journey, action);
  saveJourney();
  if (question.id === "audience") {
    const audienceId = normalizeAudienceId(input.value);
    applyAudienceContent(audienceId);
    updateAudienceUrl(audienceId);
  }
  emitLatestEvent({ questionId: question.id });
  renderQuestionView();
});

previousButton.addEventListener("click", () => {
  journey = transitionJourney(journey, { type: "PREVIOUS" });
  renderQuestionView({ moveFocus: true });
});

nextButton.addEventListener("click", () => {
  if (journey.currentIndex < QUESTIONS.length - 1) {
    journey = transitionJourney(journey, { type: "NEXT" });
    renderQuestionView({ moveFocus: true });
    return;
  }
  journey = transitionJourney(journey, { type: "SHOW_RESULT" });
  if (journey.mode !== "result") return;
  const result = renderResultView();
  emitLatestEvent({
    audienceId: result.audienceId,
    painId: result.painId,
    serviceId: result.primaryServiceId,
    leadTier: result.leadTier,
  });
});

document.querySelector("#edit-assessment").addEventListener("click", () => {
  journey = transitionJourney(journey, { type: "PREVIOUS" });
  renderQuestionView({ moveFocus: true });
});

document.querySelector("#copy-summary").addEventListener("click", async () => {
  const textarea = document.querySelector("#summary-text");
  const status = document.querySelector("#copy-status");
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(textarea.value);
    status.textContent = "摘要已複製，可以直接貼到 LINE、Email 或筆記裡。";
  } catch {
    textarea.focus();
    textarea.select();
    status.textContent = "已幫你選取摘要；請長按或使用鍵盤複製。";
  }
  const result = scoreAssessment(journey.assessmentState);
  emitFunnelEvent(document, buildFunnelEvent("task_card_copied", {
    audienceId: result.audienceId,
    painId: result.painId,
    serviceId: result.primaryServiceId,
    leadTier: result.leadTier,
  }, attribution));
});

document.querySelector("#restart-assessment").addEventListener("click", () => {
  journey = transitionJourney(journey, { type: "RESTART" });
  saveJourney();
  renderQuestionView({ moveFocus: true });
});

document.addEventListener("click", (event) => {
  const proof = event.target.closest("[data-proof-id]");
  if (proof && proof.querySelector("a")?.contains(event.target) || proof?.matches("a")) {
    emitFunnelEvent(document, buildFunnelEvent("proof_opened", {
      proofId: proof.dataset.proofId,
      audienceId: scoreAssessment(journey.assessmentState).audienceId,
    }, attribution));
  }
  const contact = event.target.closest("a[data-contact-id]");
  if (contact) {
    const result = scoreAssessment(journey.assessmentState);
    emitFunnelEvent(document, buildFunnelEvent("contact_selected", {
      contactId: contact.dataset.contactId,
      audienceId: result.audienceId,
      painId: result.painId,
      serviceId: result.primaryServiceId,
      leadTier: result.leadTier,
    }, attribution));
  }
});

const initialAudience = queryAudience !== "general"
  ? queryAudience
  : normalizeAudienceId(journey.assessmentState.answers.audience);
applyAudienceContent(initialAudience);
if (journey.mode === "result") renderResultView({ moveFocus: false });
else renderQuestionView();
