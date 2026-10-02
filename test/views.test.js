import test from "node:test";
import assert from "node:assert/strict";

import {
  renderContactActions,
  renderProofLinks,
  renderQuestion,
  renderTaskCard,
} from "../src/views.js";

const dangerous = `<img src=x onerror="alert('x')"> & "quoted" 'single'`;

test("renderQuestion labels known options, preserves selection and escapes all strings", () => {
  const html = renderQuestion({
    id: `process${dangerous}`,
    options: [["admin", "重複行政"], [dangerous, dangerous]],
  }, "admin");

  assert.match(html, /name="process/);
  assert.match(html, /value="admin" checked/);
  assert.match(html, /<label for="answer-0">重複行政<\/label>/);
  assert.match(html, /&lt;img/);
  assert.match(html, /&amp;/);
  assert.match(html, /&quot;quoted&quot;/);
  assert.match(html, /&#39;single&#39;/);
  assert.doesNotMatch(html, /<img|onerror="/);
  assert.match(renderQuestion({ id: "empty", options: [] }), /目前沒有可選答案/);
});

test("renderTaskCard exposes stable field IDs and escapes task content", () => {
  const html = renderTaskCard({
    title: dangerous,
    audienceLabel: "品牌團隊",
    painLabel: dangerous,
    quickWin: dangerous,
    firstStep: "先畫流程",
    preparationItems: [dangerous, "現況文件"],
    serviceLabel: "AI 導入",
    reason: "先小步驗證",
  });

  for (const id of ["result-audience", "result-pain", "result-quick-win", "result-service", "result-first-step", "result-preparation", "result-related-proofs"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /品牌團隊/);
  assert.match(html, /AI 導入/);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img|onerror="/);
});

test("renderProofLinks creates known data IDs, safe links and an explicit empty state", () => {
  const html = renderProofLinks([
    { id: "problem-map", title: "一頁問題地圖", href: "#offer-ladder" },
    { id: dangerous, title: dangerous, href: "#assessment" },
    { id: "unsafe", title: "不安全連結", href: `javascript:${dangerous}` },
  ]);

  assert.match(html, /data-proof-id="problem-map"/);
  assert.match(html, /href="#offer-ladder"/);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /href="javascript:|<img|onerror="/);
  assert.doesNotMatch(html, /不安全連結/);
  assert.match(renderProofLinks([]), /目前沒有相關案例/);
});

test("renderContactActions marks the recommended action and rejects unsafe URLs", () => {
  const html = renderContactActions([
    { id: "email", label: "用 Email 寄送需求摘要", href: "mailto:hello@domicotaiwan.com" },
    { id: "booking", label: "預約需求對焦", href: "https://calendar.example.com/demo" },
    { id: dangerous, label: dangerous, href: `javascript:${dangerous}` },
  ]);

  assert.match(html, /data-contact-id="email"/);
  assert.match(html, /建議・用 Email 寄送需求摘要/);
  assert.match(html, /href="mailto:hello@domicotaiwan\.com"/);
  assert.match(html, /data-contact-id="booking"/);
  assert.match(html, /rel="noreferrer"/);
  assert.doesNotMatch(html, /href="javascript:|<img|onerror="/);
  assert.match(renderContactActions([]), /目前沒有可用的聯絡方式/);
});
