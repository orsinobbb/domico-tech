import { parseAttribution } from "./attribution.js";

export const FUNNEL_EVENT_NAMES = Object.freeze([
  "audience_selected",
  "assessment_started",
  "assessment_completed",
  "task_card_copied",
  "proof_opened",
  "contact_selected",
]);

const EVENT_NAME_SET = new Set(FUNNEL_EVENT_NAMES);
const PAYLOAD_KEYS = ["audienceId", "painId", "serviceId", "leadTier", "contactId", "proofId", "questionId", "currentStep"];

function sanitizePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  return Object.fromEntries(PAYLOAD_KEYS.flatMap((key) => {
    const value = payload[key];
    if (key === "currentStep" && Number.isInteger(value) && value >= 0) return [[key, value]];
    if (key !== "currentStep" && typeof value === "string" && value.length <= 100) return [[key, value]];
    return [];
  }));
}

function sanitizeAttribution(attribution) {
  if (!attribution || typeof attribution !== "object" || Array.isArray(attribution)) return {};
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(attribution)) {
    if (typeof value === "string") params.set(key, value);
  }
  return parseAttribution(params);
}

export function buildFunnelEvent(name, payload = {}, attribution = {}) {
  if (!EVENT_NAME_SET.has(name)) return null;
  return {
    name,
    payload: sanitizePayload(payload),
    attribution: sanitizeAttribution(attribution),
  };
}

export function emitFunnelEvent(target, event) {
  if (!event || !EVENT_NAME_SET.has(event.name) || typeof target?.dispatchEvent !== "function") return false;
  target.dispatchEvent(new CustomEvent("domico:funnel", { detail: event }));
  return true;
}
