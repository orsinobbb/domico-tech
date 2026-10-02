export const AUDIENCE_CONTENT = Object.freeze({
  general: {
    id: "general",
    label: "正在找下一步的團隊",
    headline: "先找出最值得自動化的問題，再決定要不要開發。",
    value: "把模糊的科技期待，整理成一個能判斷、能驗證的下一步。",
  },
  sme: {
    id: "sme",
    label: "10–200 人中小企業",
    headline: "先從最浪費時間的流程，找回團隊做重要事情的空間。",
    value: "省時間、減少錯誤，讓流程不再只靠少數熟手，交接也能走得下去。",
  },
  brand: {
    id: "brand",
    label: "品牌、行銷與文創團隊",
    headline: "讓 AI 接住重複工作，把創意與判斷留給人。",
    value: "改善內容協作、維持品牌一致，讓顧客旅程從企劃到執行更順暢。",
  },
});

export const OFFER_STEPS = Object.freeze([
  { id: "diagnosis", label: "免費・3 分鐘 AI 任務診斷", outcome: "取得一張可帶走的小米任務單" },
  { id: "reading", label: "免費・30 分鐘需求判讀", outcome: "確認問題邊界與適合的下一步" },
  { id: "workshop", label: "付費・AI 機會盤點工作坊", outcome: "完成流程、效益、風險與優先順序" },
  { id: "pilot", label: "兩週概念驗證", outcome: "用一條真實流程確認方法是否有效" },
  { id: "implementation", label: "客製開發／AI 導入", outcome: "驗證成立後再擴大、交接與陪跑" },
]);

export const PROOF_ITEMS = Object.freeze([
  {
    id: "domico-site",
    title: "從品牌世界到互動官網",
    description: "公開展示資訊架構、互動漏斗、響應式設計與靜態部署。",
    audiences: ["sme", "brand"],
    services: ["software", "consulting"],
    href: "#proof-library",
  },
  {
    id: "private-assessment",
    title: "不先留資料的需求健檢",
    description: "回答留在瀏覽器，先取得可帶走的建議，再決定是否聯絡。",
    audiences: ["sme", "brand"],
    services: ["ai", "consulting"],
    href: "#assessment",
  },
  {
    id: "problem-map",
    title: "一頁問題地圖",
    description: "把目標、現況、限制、假設與第一個實驗放在同一張圖上。",
    audiences: ["sme", "brand"],
    services: ["consulting"],
    href: "#offer-ladder",
  },
]);

const painLabels = Object.freeze({
  admin: "重複行政與資料整理",
  handoff: "跨工具或跨部門交接",
  customer: "客服與知識查找",
  reporting: "報表與數據整理",
  content: "品牌內容與行銷素材",
  campaigns: "活動與顧客旅程執行",
  unsure: "尚待釐清的工作流程",
});

export function normalizeAudienceId(value) {
  return value === "sme" || value === "brand" ? value : "general";
}

export function getAudienceContent(audienceId) {
  return AUDIENCE_CONTENT[normalizeAudienceId(audienceId)];
}

export function selectProofItems(result, limit = 2) {
  const audienceId = normalizeAudienceId(result?.audienceId);
  const serviceId = typeof result?.primaryServiceId === "string" ? result.primaryServiceId : "";
  const safeLimit = Math.max(0, Math.min(PROOF_ITEMS.length, Number.isFinite(limit) ? Math.floor(limit) : 2));

  return [...PROOF_ITEMS]
    .map((item, index) => ({
      item,
      index,
      score: Number(item.services.includes(serviceId)) * 2 + Number(audienceId !== "general" && item.audiences.includes(audienceId)),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, safeLimit)
    .map(({ item }) => item);
}

export function buildTaskCard(_state, result) {
  const audience = getAudienceContent(result?.audienceId);
  const painId = Object.hasOwn(painLabels, result?.painId) ? result.painId : "unsure";
  return {
    title: `小米替${audience.label}整理的 AI 任務單`,
    audienceLabel: audience.label,
    painLabel: painLabels[painId],
    quickWin: result?.quickWin ?? "先記錄一週內最常重複的工作，以及每次大約花多少時間。",
    firstStep: result?.firstStep ?? "先用一頁問題地圖釐清最值得驗證的機會。",
    proofIds: selectProofItems(result).map(({ id }) => id),
    preparationItems: Array.isArray(result?.preparationItems) ? [...result.preparationItems] : [],
  };
}
