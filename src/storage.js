import { QUESTIONS, answerQuestion, createAssessmentState } from "./assessment.js";

export const ASSESSMENT_STORAGE_KEY = "domico-labs-assessment-v1";

function sanitizeState(value) {
  let state = createAssessmentState();
  if (value?.version !== 1 || !value.answers || typeof value.answers !== "object") return state;
  for (const { id } of QUESTIONS) state = answerQuestion(state, id, value.answers[id]);
  return state;
}

export function loadAssessmentDraft(storage) {
  try {
    const raw = storage?.getItem(ASSESSMENT_STORAGE_KEY);
    return raw ? sanitizeState(JSON.parse(raw)) : createAssessmentState();
  } catch {
    return createAssessmentState();
  }
}

export function saveAssessmentDraft(storage, state) {
  try {
    storage?.setItem(ASSESSMENT_STORAGE_KEY, JSON.stringify(sanitizeState(state)));
    return Boolean(storage);
  } catch {
    return false;
  }
}
