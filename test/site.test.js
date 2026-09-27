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
  const [manifestText, robots, sitemap, fallback] = await Promise.all([
    read("manifest.webmanifest"),
    read("robots.txt"),
    read("sitemap.xml"),
    read("404.html"),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest.name, "豆米口科技 DOMICO LABS");
  assert.equal(manifest.lang, "zh-Hant");
  assert.equal(manifest.start_url, "./");
  assert.match(robots, /Sitemap: https:\/\/tech\.domicotaiwan\.com\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/tech\.domicotaiwan\.com\/<\/loc>/);
  assert.match(fallback, /回到豆米口科技首頁/);
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
