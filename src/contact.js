import { getServiceLabel } from "./assessment.js";

function safeHttps(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

export function buildMailto(summary, serviceId, email) {
  const subject = `[豆米口科技] ${getServiceLabel(serviceId)}需求摘要`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(summary)}`;
}

export function resolveContactRoute(result, config) {
  if (result?.needsAttachments || result?.contactIntent === "formal") return "email";
  if (result?.confidence === "high" && safeHttps(config?.bookingUrl)) return "booking";
  if (safeHttps(config?.lineUrl)) return "line";
  return "email";
}

export function getAvailableContactActions(result, config) {
  const actions = [];
  const bookingUrl = safeHttps(config?.bookingUrl);
  const lineUrl = safeHttps(config?.lineUrl);
  if (bookingUrl) actions.push({ id: "booking", label: "預約 30 分鐘需求對焦", href: bookingUrl });
  if (lineUrl) actions.push({ id: "line", label: "用 LINE 先問一件事", href: lineUrl });
  if (config?.email) {
    actions.push({
      id: "email",
      label: "用 Email 寄送需求摘要",
      href: buildMailto(result?.summary ?? "", result?.primaryServiceId ?? "consulting", config.email),
    });
  }
  const preferred = resolveContactRoute(result, config);
  return actions.sort((a, b) => Number(b.id === preferred) - Number(a.id === preferred));
}
