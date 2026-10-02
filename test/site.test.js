import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

async function read(relativePath) {
  return readFile(resolve(root, relativePath), "utf8");
}

test("the static site exposes every service and mission without JavaScript", async () => {
  const html = await read("index.html");

  assert.match(html, /<title>豆米口科技 DOMICO LABS｜把複雜的科技，變成真的用得起來的下一步<\/title>/);
  assert.match(html, /rel="canonical" href="https:\/\/tech\.domicotaiwan\.com\/"/);
  for (const id of ["consulting", "software", "ai", "hackathon", "training", "coaching"]) {
    assert.match(html, new RegExp(`id="service-${id}"`));
  }
  for (const id of ["detective", "architect", "ai-copilot", "captain", "coach"]) {
    assert.match(html, new RegExp(`data-role="${id}"`));
  }
  assert.match(html, /href="mailto:hello@domicotaiwan\.com"/);
  assert.match(html, /<noscript>[\s\S]*hello@domicotaiwan\.com[\s\S]*<\/noscript>/);
});

test("deployment metadata and fallback page are present", async () => {
  const [manifestText, robots, sitemap, fallback, cname] = await Promise.all([
    read("manifest.webmanifest"),
    read("robots.txt"),
    read("sitemap.xml"),
    read("404.html"),
    read("CNAME"),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest.name, "豆米口科技 DOMICO LABS");
  assert.equal(manifest.lang, "zh-Hant");
  assert.equal(manifest.start_url, "./");
  assert.match(robots, /Sitemap: https:\/\/tech\.domicotaiwan\.com\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/tech\.domicotaiwan\.com\/<\/loc>/);
  assert.match(fallback, /回到豆米口科技首頁/);
  assert.equal(cname.trim(), "tech.domicotaiwan.com");
});

test("first-party assets stay portable across static hosts", async () => {
  const html = await read("index.html");
  const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((url) => !url.startsWith("#") && !url.startsWith("http") && !url.startsWith("mailto:") && !url.startsWith("data:"));

  assert.ok(urls.length >= 3);
  assert.ok(urls.every((url) => !url.startsWith("/")));
  await Promise.all(urls.filter((url) => !url.includes("?")).map((url) => access(resolve(root, url))));
});

test("the needs assessment is semantic, announced and recoverable", async () => {
  const html = await read("index.html");

  assert.match(html, /<form[^>]+id="assessment-form"/);
  assert.match(html, /<fieldset[^>]+id="assessment-question"[\s\S]*<legend/);
  assert.match(html, /id="assessment-progress"[^>]+aria-live="polite"/);
  assert.match(html, /id="assessment-result"/);
  assert.match(html, /id="copy-summary"/);
  assert.match(html, /id="restart-assessment"/);
  assert.match(html, /<script type="module" src="src\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /href=""/);
});

test("each Xiaomi mission has its own complete accessible illustration", async () => {
  const html = await read("index.html");
  const images = [
    ["xiaomi-detective.png", "偵探小米拿著放大鏡觀察需求線索"],
    ["xiaomi-architect.png", "建築師小米整理系統藍圖與積木"],
    ["xiaomi-ai-copilot.png", "AI 副駕小米和智慧助手一起整理工作流程"],
    ["xiaomi-captain.png", "隊長小米帶領團隊完成黑客松挑戰"],
    ["xiaomi-coach.png", "教練小米陪伴學員練習與前進"],
  ];

  for (const [filename, alt] of images) {
    const file = resolve(root, "images/roles", filename);
    await access(file);
    const bytes = await readFile(file);
    assert.ok(bytes.byteLength > 10_000, `${filename} must be a real illustration`);
    assert.equal(html.match(new RegExp(`src="images/roles/${filename}"`, "g"))?.length, 1);
    assert.match(html, new RegExp(`src="images/roles/${filename}"[^>]+alt="${alt}"`));
  }
});

test("every service explains fit, deliverables, exclusions and the next step", async () => {
  const html = await read("index.html");
  const serviceIds = ["consulting", "software", "ai", "hackathon", "training", "coaching"];

  for (const [index, id] of serviceIds.entries()) {
    const nextId = serviceIds[index + 1];
    const start = html.indexOf(`id="service-${id}"`);
    const end = nextId ? html.indexOf(`id="service-${nextId}"`) : html.indexOf("</div>\n    </section>", start);
    const service = html.slice(start, end);

    assert.ok(start >= 0, `missing service-${id}`);
    for (const label of ["適合情境", "交付成果", "不適合情境", "下一步"]) {
      assert.match(service, new RegExp(label), `service-${id} must explain ${label}`);
    }
  }
});

test("proof stays honest and the release includes FAQ and clear contact paths", async () => {
  const html = await read("index.html");

  assert.match(html, /本專案公開展示/);
  assert.match(html, /沒有虛構客戶/);
  assert.match(html, /<section[^>]+id="faq"/);
  assert.ok((html.match(/<details>/g) ?? []).length >= 4);
  assert.match(html, /href="https:\/\/domicotaiwan\.com\/"[^>]+aria-label="前往豆米口文創故事官網/);
  assert.match(html, /href="mailto:hello@domicotaiwan\.com"[^>]+aria-label="寄信聯絡豆米口科技/);
  assert.doesNotMatch(html, /客戶數|成功率|滿意度|客戶見證|合作品牌/);
  assert.doesNotMatch(html, /<img[^>]+(?:logo|客戶|合作品牌)/i);
});

test("the homepage exposes two audience paths and one diagnostic CTA without JavaScript", async () => {
  const html = await read("index.html");

  assert.match(html, /id="audience-picker"/);
  assert.match(html, /data-audience-id="sme"[^>]+href="\?audience=sme#assessment"/);
  assert.match(html, /data-audience-id="brand"[^>]+href="\?audience=brand#assessment"/);
  assert.match(html, /10–200 人中小企業/);
  assert.match(html, /品牌、行銷與文創團隊/);
  assert.ok((html.match(/3 分鐘小米 AI 任務診斷/g) ?? []).length >= 2);
  assert.match(html, /回答只留在這個瀏覽器/);
  assert.match(html, /mailto:hello@domicotaiwan\.com/);
});

test("the conversion journey presents proof, diagnosis and five bounded offers in order", async () => {
  const html = await read("index.html");
  const sections = ["situations", "proof-library", "assessment", "offer-ladder", "method", "services"];

  for (const [index, id] of sections.entries()) {
    const position = html.indexOf(`id="${id}"`);
    assert.ok(position >= 0, `missing ${id}`);
    if (index > 0) assert.ok(position > html.indexOf(`id="${sections[index - 1]}"`), `${id} must follow ${sections[index - 1]}`);
  }
  for (const id of ["diagnosis", "reading", "workshop", "pilot", "implementation"]) {
    assert.match(html, new RegExp(`data-offer-id="${id}"`));
  }
  for (const id of ["domico-site", "private-assessment", "problem-map"]) {
    assert.match(html, new RegExp(`data-proof-id="${id}"`));
  }
});

test("the result contains a semantic task card and short live status regions", async () => {
  const html = await read("index.html");

  assert.match(html, /id="task-card"/);
  assert.match(html, /id="result-pain"/);
  assert.match(html, /id="result-quick-win"/);
  assert.match(html, /id="result-related-proofs"/);
  assert.doesNotMatch(html, /id="task-card"[^>]+aria-live/);
  assert.match(html, /id="copy-status"[^>]+aria-live="polite"/);
});
