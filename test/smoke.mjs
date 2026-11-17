// Loads every page and every written lesson in a real browser, pokes every control,
// and fails on console errors or horizontal overflow (desktop and phone).
// Usage: node test/smoke.mjs [worldId|lessonId]
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { WORLDS } from "../lib/catalog.js";

const { chromium } = createRequire(import.meta.url)("playwright");
const only = process.argv[2];
const PORT = 4199;
const server = spawn("node", ["serve.mjs"], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 600));
const base = `http://localhost:${PORT}`;
const browser = await chromium.launch();
let failed = 0, n = 0;

async function visit(path, name, poke) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => r.status() >= 400 && !r.url().includes("fonts.g") && errors.push(`${r.status()} ${r.url()}`));
  page.on("console", (m) => m.type() === "error" && !m.text().includes("fonts.g") && !m.text().includes("ERR_") && errors.push(m.text()));
  await page.goto(base + path, { waitUntil: "load" });
  await page.waitForTimeout(250);
  if (poke) await poke(page).catch((e) => errors.push("poke: " + e.message));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(120);
  const mob = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  const ok = !errors.length && !overflow && !mob;
  if (!ok) failed++;
  n++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${errors.length ? "  " + errors.join(" | ") : ""}${overflow ? "  desktop overflow" : ""}${mob ? "  phone overflow" : ""}`);
  await page.close();
}

async function pokeAll(page) {
  if (await page.$(".empty")) throw new Error("lesson missing");
  for (const r of await page.$$('input[type="range"]')) {
    await r.evaluate((el) => { for (const v of [el.min, el.max, (+el.min + +el.max) / 2]) { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); } });
  }
  for (const b of await page.$$(".seg button")) await b.click({ timeout: 800 }).catch(() => {});
  for (const b of await page.$$(".stage .btn, .stepper .btn")) await b.click({ timeout: 800 }).catch(() => {});
  for (const q of await page.$$(".predict, .qz-q")) { const c = await q.$(".choice"); if (c) await c.click({ timeout: 800 }).catch(() => {}); }
  for (const c of await page.$$(".calc")) { await (await c.$("input")).fill("1"); await (await c.$(".btn")).click(); }
  for (const svg of (await page.$$("svg.chart")).slice(0, 6)) { const b = await svg.boundingBox(); if (b) await page.mouse.move(b.x + b.width * 0.6, b.y + b.height * 0.5); }
  await page.waitForTimeout(200);
  if (!(await page.$(".quiz"))) throw new Error("no quiz");
}

const pages = [["/", "home"], ["/glossary", "glossary"], ["/practice", "practice"], ["/web", "web"]];
if (!only) for (const [p, nm] of pages) if (existsSync(`.${p === "/" ? "/index" : p}.html`)) await visit(p, nm);
for (const w of WORLDS) {
  if (!existsSync(`content/${w.id}.js`)) continue;
  for (const [id] of w.lessons) {
    if (only && only !== w.id && only !== id) continue;
    await visit(`/lesson?id=${id}`, `${w.id}/${id}`, pokeAll);
  }
}
await browser.close();
server.kill();
console.log(failed ? `${failed} of ${n} failed` : `all ${n} ok`);
process.exit(failed ? 1 : 0);
