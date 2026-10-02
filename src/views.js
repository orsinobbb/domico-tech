function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeHref(value) {
  if (typeof value !== "string") return "";
  if (/^#[A-Za-z][\w-]*$/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "mailto:" ? url.href : "";
  } catch {
    return "";
  }
}

export function renderQuestion(question, selectedValue = "") {
  if (!Array.isArray(question?.options) || question.options.length === 0) {
    return '<p class="empty-state">目前沒有可選答案，請稍後再試。</p>';
  }
  const questionId = escapeHtml(question.id);
  return question.options.map((option, index) => {
    const [value, label] = Array.isArray(option) ? option : ["", ""];
    const checked = value === selectedValue ? " checked" : "";
    return `<div class="answer-option"><input type="radio" id="answer-${index}" name="${questionId}" value="${escapeHtml(value)}"${checked}><label for="answer-${index}">${escapeHtml(label)}</label></div>`;
  }).join("");
}

export function renderTaskCard(taskCard = {}) {
  const preparationItems = Array.isArray(taskCard.preparationItems) ? taskCard.preparationItems : [];
  const preparation = preparationItems.length
    ? preparationItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>先帶著目前最卡的一件事就好。</li>";

  return `
    <p class="task-card-title">${escapeHtml(taskCard.title)}</p>
    <p class="task-card-audience"><span>你的情境</span><strong id="result-audience">${escapeHtml(taskCard.audienceLabel)}</strong></p>
    <div>
      <span>目前最值得處理的阻礙</span>
      <h4 id="result-pain">${escapeHtml(taskCard.painLabel)}</h4>
      <p id="result-reason">${escapeHtml(taskCard.reason)}</p>
    </div>
    <div>
      <span>現在就能做的快速改善</span>
      <p id="result-quick-win">${escapeHtml(taskCard.quickWin)}</p>
    </div>
    <div class="result-route"><span>建議路線</span><strong id="result-service">${escapeHtml(taskCard.serviceLabel)}</strong></div>
    <div class="result-columns">
      <div><span>先做這一步</span><p id="result-first-step">${escapeHtml(taskCard.firstStep)}</p></div>
      <div><span>先準備這些</span><ul id="result-preparation">${preparation}</ul></div>
    </div>
    <div class="related-proofs">
      <span>和你的情境相關</span>
      <nav id="result-related-proofs" aria-label="相關作品與方法"></nav>
    </div>`;
}

export function renderProofLinks(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return '<p class="empty-state">目前沒有相關案例，先帶著任務單繼續。</p>';
  }
  const links = items.flatMap((item) => {
    const href = safeHref(item?.href);
    if (!href) return [];
    return [`<a data-proof-id="${escapeHtml(item.id)}" href="${escapeHtml(href)}"><span>${escapeHtml(item.title)}</span><b aria-hidden="true">→</b></a>`];
  });
  return links.length ? links.join("") : '<p class="empty-state">目前沒有相關案例，先帶著任務單繼續。</p>';
}

export function renderContactActions(actions = []) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return '<p class="empty-state">目前沒有可用的聯絡方式，請先複製需求摘要。</p>';
  }
  const links = actions.flatMap((action, index) => {
    const href = safeHref(action?.href);
    if (!href) return [];
    const external = href.startsWith("https:") ? ' rel="noreferrer"' : "";
    const prefix = index === 0 ? "建議・" : "";
    return [`<a data-contact-id="${escapeHtml(action.id)}" href="${escapeHtml(href)}"${external}><span>${prefix}${escapeHtml(action.label)}</span><b aria-hidden="true">↗</b></a>`];
  });
  return links.length ? links.join("") : '<p class="empty-state">目前沒有可用的聯絡方式，請先複製需求摘要。</p>';
}
