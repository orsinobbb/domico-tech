const SERVICE_ORDER = ["consulting", "software", "ai", "hackathon", "training", "coaching"];

export const QUESTIONS = Object.freeze([
  {
    id: "goal",
    legend: "現在最想推進什麼？",
    options: [
      ["clarify", "先釐清方向"], ["build", "開發或重整系統"], ["adopt-ai", "把 AI 放進真實工作流程"],
      ["run-event", "辦一場有成果的黑客松"], ["learn", "讓團隊學會新能力"], ["grow", "需要持續陪跑"],
    ],
  },
  {
    id: "stage",
    legend: "事情目前走到哪裡？",
    options: [["idea", "還是一個想法"], ["manual", "目前主要靠人工或零散工具"], ["existing", "已有系統但不好用"], ["pilot", "做過小型試驗"], ["scaling", "準備擴大使用"]],
  },
  {
    id: "team",
    legend: "誰會一起參與？",
    options: [["solo", "我自己"], ["small", "2–8 人小團隊"], ["cross-functional", "跨部門團隊"], ["enterprise", "組織或企業"]],
  },
  {
    id: "timeline",
    legend: "希望什麼時候看見進展？",
    options: [["explore", "先探索，不急著定案"], ["quarter", "三個月內"], ["month", "一個月內"], ["fixed-date", "有不能移動的日期"]],
  },
  {
    id: "obstacle",
    legend: "目前最大的阻礙是什麼？",
    options: [["direction", "方向與優先順序"], ["process", "流程或系統斷裂"], ["capacity", "缺少實作人力"], ["adoption", "團隊不知道怎麼真正採用"], ["skills", "能力或共同語言不足"], ["facilitation", "大家難以一起做出成果"]],
  },
  {
    id: "format",
    legend: "你希望我們怎麼加入？",
    options: [["advice", "一起診斷與決策"], ["delivery", "協助設計與開發"], ["workshop", "帶領團隊共同實作"], ["coaching", "定期一對一或小組陪跑"], ["mixed", "診斷、實作與陪跑一起規劃"]],
  },
]);

const labels = Object.fromEntries(QUESTIONS.flatMap((question) => question.options));
const validOptions = new Map(QUESTIONS.map((question) => [question.id, new Set(question.options.map(([value]) => value))]));

const serviceMeta = {
  consulting: { label: "需求診斷與技術顧問", firstStep: "先畫出目標、使用者、限制與目前做法的一頁問題地圖。" },
  software: { label: "軟體與數位產品開發", firstStep: "先選一條最常發生的流程，定義一個可測試的最小版本。" },
  ai: { label: "AI 導入與工作流設計", firstStep: "挑一個高頻、低風險的流程做兩週試點。" },
  hackathon: { label: "黑客松企劃與落地", firstStep: "先確定活動後誰會接住成果，再回推題目與評審方式。" },
  training: { label: "開班教學與企業內訓", firstStep: "先選一個課後立刻會用到的真實任務，據此設計練習。" },
  coaching: { label: "團體與個人教練", firstStep: "先定義兩週內能完成的一個小行動與回顧節點。" },
};

const weights = {
  goal: { clarify: { consulting: 6 }, build: { software: 6 }, "adopt-ai": { ai: 6 }, "run-event": { hackathon: 6 }, learn: { training: 6 }, grow: { coaching: 6 } },
  stage: { idea: { consulting: 2, coaching: 1 }, manual: { software: 1, ai: 2 }, existing: { software: 3, consulting: 1 }, pilot: { ai: 2, coaching: 1 }, scaling: { training: 2, consulting: 1 } },
  team: { solo: { coaching: 2 }, small: { software: 1, coaching: 1 }, "cross-functional": { consulting: 1, hackathon: 2 }, enterprise: { training: 2, consulting: 1 } },
  timeline: { explore: { consulting: 2, coaching: 1 }, quarter: { software: 1, ai: 1 }, month: { software: 2, training: 1 }, "fixed-date": { hackathon: 3, training: 1 } },
  obstacle: { direction: { consulting: 3, coaching: 2 }, process: { software: 3 }, capacity: { software: 2, consulting: 1 }, adoption: { ai: 3, training: 1 }, skills: { training: 3, coaching: 1 }, facilitation: { hackathon: 3, coaching: 1 } },
  format: { advice: { consulting: 3 }, delivery: { software: 3 }, workshop: { training: 2, hackathon: 2 }, coaching: { coaching: 3 }, mixed: { ai: 2, consulting: 1, software: 1 } },
};

export function createAssessmentState() {
  return { version: 1, answers: {} };
}

export function answerQuestion(state, questionId, value) {
  if (!validOptions.get(questionId)?.has(value)) return state;
  return { ...state, version: 1, answers: { ...state.answers, [questionId]: value } };
}

export function getAssessmentProgress(state) {
  const answered = QUESTIONS.filter(({ id }) => validOptions.get(id).has(state?.answers?.[id])).length;
  return { answered, total: QUESTIONS.length, complete: answered === QUESTIONS.length };
}

export function scoreAssessment(state) {
  const progress = getAssessmentProgress(state);
  if (progress.answered < 4) {
    return {
      primaryServiceId: "consulting",
      secondaryServiceId: null,
      obstacle: "還需要一起釐清真正的阻礙",
      firstStep: "先列出一件最想改善的日常工作，再一起確認問題邊界。",
      preparationItems: ["目前最卡的一件事", "誰每天會遇到它", "希望三個月後有什麼不同"],
      confidence: "low",
    };
  }

  const scores = Object.fromEntries(SERVICE_ORDER.map((id) => [id, 0]));
  for (const [questionId, value] of Object.entries(state.answers)) {
    if (!validOptions.get(questionId)?.has(value)) continue;
    for (const [serviceId, score] of Object.entries(weights[questionId]?.[value] ?? {})) scores[serviceId] += score;
  }
  const ranked = SERVICE_ORDER.map((id, index) => ({ id, score: scores[id], index }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const primaryServiceId = ranked[0].id;
  const secondaryServiceId = ranked[1].score > 0 ? ranked[1].id : null;

  return {
    primaryServiceId,
    secondaryServiceId,
    obstacle: labels[state.answers.obstacle] ?? "還需要一起釐清真正的阻礙",
    firstStep: serviceMeta[primaryServiceId].firstStep,
    preparationItems: ["目前流程或做法的簡單描述", "會參與決策與使用的人", "可接受的時程與限制"],
    confidence: progress.complete ? "high" : "medium",
  };
}

export function buildRequirementSummary(state, result) {
  const value = (id, fallback = "尚未回答") => labels[state?.answers?.[id]] ?? fallback;
  const preparation = result.preparationItems.map((item) => `- ${item}`).join("\n");
  return [
    "豆米口科技需求摘要",
    `目標：${value("goal")}`,
    `現況：${value("stage")}`,
    `團隊：${value("team")}`,
    `時程：${value("timeline")}`,
    `阻礙：${value("obstacle", result.obstacle)}`,
    `偏好的合作方式：${value("format")}`,
    `建議路線：${serviceMeta[result.primaryServiceId].label}`,
    `第一步：${result.firstStep}`,
    "預約前可準備：",
    preparation,
  ].join("\n");
}

export function getServiceLabel(serviceId) {
  return serviceMeta[serviceId]?.label ?? serviceMeta.consulting.label;
}
