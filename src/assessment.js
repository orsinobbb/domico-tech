export const ASSESSMENT_VERSION = 2;

const SERVICE_ORDER = ["consulting", "ai", "software"];

export const QUESTIONS = Object.freeze([
  {
    id: "audience",
    legend: "哪一種情境最接近你的團隊？",
    options: [["sme", "10–200 人的中小企業"], ["brand", "品牌、行銷或文創團隊"]],
  },
  {
    id: "process",
    legend: "現在最想減輕哪一種工作？",
    options: [
      ["admin", "重複行政與資料整理"], ["handoff", "跨工具或跨部門交接"],
      ["customer", "客服與知識查找"], ["reporting", "報表與數據整理"],
      ["content", "品牌內容與行銷素材"], ["campaigns", "活動與顧客旅程執行"],
      ["unsure", "還不確定，想先釐清"],
    ],
  },
  {
    id: "frequency",
    legend: "這件事多久會發生一次？",
    options: [["daily", "每天"], ["weekly", "每週"], ["monthly", "每月"], ["occasional", "偶爾或專案期間"]],
  },
  {
    id: "impact",
    legend: "目前最大的影響是什麼？",
    options: [
      ["lost-time", "耗掉太多時間"], ["errors", "容易出錯或重工"],
      ["missed-revenue", "錯失營收或服務機會"], ["inconsistent-quality", "品質與品牌表現不穩定"],
      ["unclear", "影響還不確定"],
    ],
  },
  {
    id: "tools",
    legend: "目前主要怎麼完成？",
    options: [
      ["manual", "多數靠人工"], ["spreadsheets", "試算表與文件"],
      ["many-tools", "多個工具來回切換"], ["existing-system", "已有系統但不順"],
      ["unsure", "不確定該從哪個工具開始"],
    ],
  },
  {
    id: "role",
    legend: "你在這項改善中扮演什麼角色？",
    options: [
      ["decision-maker", "我能決定是否推進"], ["recommender", "我會評估並提出建議"],
      ["operator", "我是實際使用或執行者"], ["explorer", "我先替團隊了解可能性"],
    ],
  },
  {
    id: "timeline",
    legend: "希望什麼時候看見第一個成果？",
    options: [["month", "一個月內"], ["quarter", "三個月內"], ["half-year", "半年內"], ["exploring", "先探索，不急著定案"]],
  },
]);

const labels = Object.fromEntries(QUESTIONS.flatMap((question) => question.options));
const validOptions = new Map(QUESTIONS.map((question) => [question.id, new Set(question.options.map(([value]) => value))]));

const serviceMeta = {
  consulting: {
    label: "AI 機會盤點與技術顧問",
    quickWin: "先記錄一週內最常重複的工作，以及每次大約花多少時間。",
    firstStep: "用一頁問題地圖對齊目標、流程、限制與最值得驗證的機會。",
  },
  ai: {
    label: "AI 導入與工作流設計",
    quickWin: "挑一份不含敏感資料的真實素材，先比較人工與 AI 協作後的時間和品質。",
    firstStep: "選一個高頻、低風險流程進行兩週概念驗證。",
  },
  software: {
    label: "軟體與數位產品開發",
    quickWin: "先畫出資料從輸入、處理到交付的三個節點，標記重複輸入的位置。",
    firstStep: "先定義一條可測試的核心流程與最小版本，再決定完整開發範圍。",
  },
  hackathon: { label: "黑客松企劃與落地" },
  training: { label: "開班教學與企業內訓" },
  coaching: { label: "團體與個人教練" },
};

const processWeights = {
  admin: { ai: 3, software: 1 },
  handoff: { software: 3, consulting: 1 },
  customer: { ai: 3, consulting: 1 },
  reporting: { software: 3, ai: 1 },
  content: { ai: 3 },
  campaigns: { software: 2, ai: 1 },
  unsure: { consulting: 4 },
};

const toolWeights = {
  manual: { ai: 2, consulting: 1 },
  spreadsheets: { software: 2, ai: 1 },
  "many-tools": { software: 3, consulting: 1 },
  "existing-system": { software: 2, consulting: 1 },
  unsure: { consulting: 2 },
};

const leadWeights = {
  role: { "decision-maker": 2, recommender: 1 },
  frequency: { daily: 2, weekly: 1 },
  timeline: { month: 2, quarter: 1 },
  impact: { errors: 2, "missed-revenue": 2, "lost-time": 1, "inconsistent-quality": 1 },
};

export function createAssessmentState(prefill = {}) {
  let state = { version: ASSESSMENT_VERSION, answers: {} };
  for (const { id } of QUESTIONS) state = answerQuestion(state, id, prefill[id]);
  return state;
}

export function answerQuestion(state, questionId, value) {
  if (!validOptions.get(questionId)?.has(value)) return state;
  return { ...state, version: ASSESSMENT_VERSION, answers: { ...state.answers, [questionId]: value } };
}

export function getAssessmentProgress(state) {
  const answered = QUESTIONS.filter(({ id }) => validOptions.get(id).has(state?.answers?.[id])).length;
  return { answered, total: QUESTIONS.length, complete: answered === QUESTIONS.length };
}

function lowConfidenceResult(state) {
  return {
    audienceId: validOptions.get("audience").has(state?.answers?.audience) ? state.answers.audience : "general",
    painId: validOptions.get("process").has(state?.answers?.process) ? state.answers.process : "unsure",
    primaryServiceId: "consulting",
    secondaryServiceId: null,
    leadTier: "nurture",
    confidence: "low",
    obstacle: "還需要一起釐清真正的阻礙",
    quickWin: serviceMeta.consulting.quickWin,
    firstStep: serviceMeta.consulting.firstStep,
    preparationItems: ["目前最卡的一件事", "誰每天會遇到它", "希望三個月後有什麼不同"],
  };
}

export function scoreAssessment(state) {
  const progress = getAssessmentProgress(state);
  if (progress.answered < 5) return lowConfidenceResult(state);

  const scores = Object.fromEntries(SERVICE_ORDER.map((id) => [id, 0]));
  for (const source of [processWeights[state.answers.process], toolWeights[state.answers.tools]]) {
    for (const [serviceId, score] of Object.entries(source ?? {})) scores[serviceId] += score;
  }
  const ranked = SERVICE_ORDER.map((id, index) => ({ id, score: scores[id], index }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const leadScore = Object.entries(leadWeights)
    .reduce((total, [questionId, weights]) => total + (weights[state.answers[questionId]] ?? 0), 0);
  const leadTier = leadScore >= 6 ? "priority" : leadScore >= 3 ? "qualified" : "nurture";
  const primary = serviceMeta[ranked[0].id];

  return {
    audienceId: validOptions.get("audience").has(state.answers.audience) ? state.answers.audience : "general",
    painId: validOptions.get("process").has(state.answers.process) ? state.answers.process : "unsure",
    primaryServiceId: ranked[0].id,
    secondaryServiceId: ranked[1].score > 0 ? ranked[1].id : null,
    leadTier,
    confidence: progress.complete ? "high" : "medium",
    obstacle: labels[state.answers.impact] ?? "還需要一起釐清真正的阻礙",
    quickWin: primary.quickWin,
    firstStep: primary.firstStep,
    preparationItems: ["目前流程或做法的簡單描述", "會參與決策與使用的人", "可接受的時程與限制"],
  };
}

export function buildRequirementSummary(state, result) {
  const value = (id, fallback = "尚未回答") => labels[state?.answers?.[id]] ?? fallback;
  const preparation = result.preparationItems.map((item) => `- ${item}`).join("\n");
  return [
    "豆米口科技需求摘要",
    `團隊：${value("audience")}`,
    `流程：${value("process")}`,
    `頻率：${value("frequency")}`,
    `影響：${value("impact", result.obstacle)}`,
    `工具：${value("tools")}`,
    `角色：${value("role")}`,
    `時程：${value("timeline")}`,
    `建議路線：${serviceMeta[result.primaryServiceId].label}`,
    `可以先做：${result.quickWin}`,
    `第一步：${result.firstStep}`,
    "預約前可準備：",
    preparation,
  ].join("\n");
}

export function getServiceLabel(serviceId) {
  return serviceMeta[serviceId]?.label ?? serviceMeta.consulting.label;
}
