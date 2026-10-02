const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;

export const ATTRIBUTION_STORAGE_KEY = "domico-labs-attribution-v1";

function cleanValue(value) {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL_CHARACTERS, "").trim().slice(0, 100);
}

function sanitizeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(UTM_KEYS.flatMap((key) => {
    const cleaned = cleanValue(value[key]);
    return cleaned ? [[key, cleaned]] : [];
  }));
}

export function parseAttribution(searchParams) {
  if (!(searchParams instanceof URLSearchParams)) return {};
  return Object.fromEntries(UTM_KEYS.flatMap((key) => {
    const cleaned = cleanValue(searchParams.get(key));
    return cleaned ? [[key, cleaned]] : [];
  }));
}

export function loadAttribution(storage) {
  try {
    const raw = storage?.getItem(ATTRIBUTION_STORAGE_KEY);
    return raw ? sanitizeObject(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function saveAttribution(storage, attribution) {
  try {
    storage?.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(sanitizeObject(attribution)));
    return Boolean(storage);
  } catch {
    return false;
  }
}
