import {
  QUESTIONS,
  answerQuestion,
  buildRequirementSummary,
  createAssessmentState,
  getAssessmentProgress,
  getServiceLabel,
  scoreAssessment,
} from "./assessment.js";
import { CONTACT_CONFIG } from "./config.js";
import { getAvailableContactActions } from "./contact.js";
import { loadAssessmentDraft, saveAssessmentDraft } from "./storage.js";

const form = document.querySelector("#assessment-form");
const fieldset = document.querySelector("#assessment-question");
const legend = fieldset.querySelector("legend");
const options = document.querySelector("#answer-options");
const progressLabel = document.querySelector("#assessment-progress");
const progressFill = document.querySelector("#progress-fill");
const previousButton = document.querySelector("#previous-question");
const nextButton = document.querySelector("#next-question");
const resultPanel = document.querySelector("#assessment-result");
let state = loadAssessmentDraft(globalThis.localStorage);
let currentIndex = Math.min(getAssessmentProgress(state).answered, QUESTIONS.length - 1);

function focusSoon(element) {
  requestAnimationFrame(() => element?.focus());
}

function renderQuestion({ moveFocus = false } = {}) {
  const question = QUESTIONS[currentIndex];
  const progress = getAssessmentProgress(state);
  legend.textContent = question.legend;
  options.innerHTML = question.options.map(([value, label], index) => {
    const checked = state.answers[question.id] === value ? " checked" : "";
    return `<div class="answer-option"><input type="radio" id="answer-${currentIndex}-${index}" name="${question.id}" value="${value}"${checked}><label for="answer-${currentIndex}-${index}">${label}</label></div>`;
  }).join("");
  progressLabel.textContent = `第 ${currentIndex + 1} 題，共 ${QUESTIONS.length} 題・已完成 ${progress.answered} 題`;
  progressFill.style.width = `${(progress.answered / QUESTIONS.length) * 100}%`;
  previousButton.disabled = currentIndex === 0;
  nextButton.innerHTML = currentIndex === QUESTIONS.length - 1 ? "看我的建議 <span>→</span>" : "下一題 <span>→</span>";
  nextButton.disabled = !state.answers[question.id];
  if (moveFocus) focusSoon(legend);
}

function renderResult() {
  const result = scoreAssessment(state);
  const summary = buildRequirementSummary(state, result);
  form.hidden = true;
  resultPanel.hidden = false;
  document.querySelector("#result-service").textContent = getServiceLabel(result.primaryServiceId);
  document.querySelector("#result-reason").textContent = result.confidence === "high"
    ? "你的方向已經相當清楚。先用一個小範圍驗證，再決定完整投入。"
    : "目前資訊還不完整，先一起釐清問題會比急著選工具更有效。";
  document.querySelector("#result-first-step").textContent = result.firstStep;
  document.querySelector("#result-preparation").innerHTML = result.preparationItems.map((item) => `<li>${item}</li>`).join("");
  document.querySelector("#summary-text").value = summary;
  const actions = getAvailableContactActions({ ...result, summary }, CONTACT_CONFIG);
  document.querySelector("#contact-actions").innerHTML = actions.map((action, index) =>
    `<a href="${action.href}"${action.id === "email" ? "" : ' rel="noreferrer"'}><span>${index === 0 ? "建議・" : ""}${action.label}</span><b>↗</b></a>`,
  ).join("");
  focusSoon(document.querySelector("#result-title"));
}

options.addEventListener("change", (event) => {
  const input = event.target.closest("input[type=radio]");
  if (!input) return;
  state = answerQuestion(state, QUESTIONS[currentIndex].id, input.value);
  saveAssessmentDraft(globalThis.localStorage, state);
  renderQuestion();
});

previousButton.addEventListener("click", () => {
  currentIndex = Math.max(0, currentIndex - 1);
  renderQuestion({ moveFocus: true });
});

nextButton.addEventListener("click", () => {
  if (!state.answers[QUESTIONS[currentIndex].id]) return;
  if (currentIndex < QUESTIONS.length - 1) {
    currentIndex += 1;
    renderQuestion({ moveFocus: true });
    return;
  }
  if (getAssessmentProgress(state).complete) renderResult();
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
});

document.querySelector("#restart-assessment").addEventListener("click", () => {
  state = createAssessmentState();
  saveAssessmentDraft(globalThis.localStorage, state);
  currentIndex = 0;
  resultPanel.hidden = true;
  form.hidden = false;
  renderQuestion({ moveFocus: true });
});

if (getAssessmentProgress(state).complete) renderResult();
else renderQuestion();
