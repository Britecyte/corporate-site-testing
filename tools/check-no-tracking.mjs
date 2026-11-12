#!/usr/bin/env node
/**
 * No-tracking guard. The testing sites must never send analytics, beacons, form
 * posts or any write to a live service. This loads both sites in headless Chrome,
 * exercises nav clicks, buttons, provider search and the contact form, and blocks
 * every request that is not on the allowlist. It fails if anything tried to:
 *   - make a POST/PUT/PATCH/DELETE request or send a beacon, anywhere
 *   - contact a host that is not allowlisted (analytics, formsubmit, onrender, etc.)
 *
 *     cd corporate-site-testing/tools && npm run check:no-tracking
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL || "http://127.0.0.1:8002";
const CHROME = process.env.CHROME_PATH || [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
].find(existsSync);

// Read-only hosts the pages legitimately use. Place search sends the typed text to the
// two geocoders; map tiles and fonts are plain GETs. Nothing here receives writes.
const ALLOWED_HOSTS = new Set([
  "127.0.0.1", "localhost",
  "tile.openstreetmap.org", "a.tile.openstreetmap.org", "b.tile.openstreetmap.org", "c.tile.openstreetmap.org",
  "nominatim.openstreetmap.org", "api.zippopotam.us",
  "fonts.googleapis.com", "fonts.gstatic.com",
]);

const problems = [];
const seen = new Map();

async function serverUp() { try { return (await fetch(BASE + "/")).ok; } catch { return false; } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function watch(page, label) {
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.protocol === "data:" || url.protocol === "blob:") return req.continue();
    const method = req.method();
    const host = url.hostname;
    seen.set(`${label} ${host}`, (seen.get(`${label} ${host}`) || 0) + 1);
    const write = !["GET", "HEAD", "OPTIONS"].includes(method);
    const allowed = ALLOWED_HOSTS.has(host);
    if (write || !allowed) {
      problems.push(`${label}: ${write ? method + " " : ""}request to ${req.url().slice(0, 110)}${allowed ? "" : "  (host not allowlisted)"}`);
      return req.abort();   // never let a test leak
    }
    req.continue();
  });
  // Beacons and xhr that bypass request events are still caught above; also trap the API directly.
  await page.evaluateOnNewDocument(() => {
    const trap = (name) => { window.__sent = window.__sent || []; window.__sent.push(name); };
    const orig = navigator.sendBeacon?.bind(navigator);
    navigator.sendBeacon = (...a) => { trap("sendBeacon " + a[0]); return false; };
    void orig;
  });
}

async function run() {
  if (!CHROME) throw new Error("No Chrome found. Set CHROME_PATH.");
  let server;
  if (!(await serverUp())) {
    server = spawn("python3", ["serve.py"], { cwd: ROOT, stdio: "ignore" });
    for (let i = 0; i < 30 && !(await serverUp()); i++) await sleep(200);
  }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  // Tabs opened by links (target=_blank) are closed; their requests are blocked anyway.
  browser.on("targetcreated", async (t) => { try { if (t.opener()) (await t.page())?.close(); } catch {} });
  try {
    for (const site of ["britecyte", "lipoderma"]) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await watch(page, site);
      await page.goto(`${BASE}/${site}/`, { waitUntil: "networkidle0" });
      await sleep(800);

      // Click every in-page link and button-ish control once.
      const anchors = await page.$$eval("a[href]", (as) => as.map((a, i) => ({ i, href: a.getAttribute("href") })).filter((a) => /^#/.test(a.href)));
      for (const a of anchors.slice(0, 25)) await page.evaluate((i) => document.querySelectorAll("a[href]")[i].click(), a.i);
      await page.evaluate(() => document.querySelectorAll("button:not([type=submit])").forEach((b) => { try { b.click(); } catch {} }));
      await sleep(400);

      if (site === "lipoderma") {
        await page.evaluate(() => document.getElementById("providers")?.scrollIntoView());
        await sleep(1200);
        await page.type("#provider-search", "chernoff", { delay: 20 }).catch(() => {});
        await sleep(1200);
        await page.evaluate(() => document.querySelectorAll(".provider-item .p-main, .provider-item .p-btn").forEach((e) => { e.addEventListener("click", (ev) => ev.preventDefault(), { once: true }); e.click(); }));
        await page.evaluate(() => document.querySelector("[data-provider-locate]")?.click());
      } else {
        // Fill and submit the contact form.
        const filled = await page.evaluate(() => {
          const f = document.querySelector("[data-contact-form]"); if (!f) return false;
          f.querySelectorAll("input:not([type=hidden]):not([type=submit]), textarea").forEach((el) => { if (!el.value) el.value = el.type === "email" ? "test@example.com" : "test"; });
          f.requestSubmit(); return true;
        });
        if (!filled) problems.push("britecyte: contact form not found (guard cannot cover it)");
        await sleep(1200);
      }
      const beacons = await page.evaluate(() => window.__sent || []);
      beacons.forEach((b) => problems.push(`${site}: ${b}`));
      const endpoints = await page.evaluate(() => Object.keys(window).filter((k) => /ANALYTICS_ENDPOINT|CONTACT_ENDPOINT/.test(k)));
      if (endpoints.length) problems.push(`${site}: window sets ${endpoints.join(", ")} (tracking is meant to be opt-in only)`);
      await page.close();
    }
  } finally {
    await browser.close();
    server?.kill();
  }
  console.log("Hosts contacted:");
  [...seen.entries()].sort().forEach(([k, n]) => console.log(`  ${k}  x${n}`));
  console.log(problems.length
    ? `\n${problems.length} tracking problem(s):\n  ` + [...new Set(problems)].join("\n  ")
    : "\nNo-tracking check passed: no analytics, no writes, only allowlisted read-only hosts.");
  process.exit(problems.length ? 1 : 0);
}
run().catch((e) => { console.error(e); process.exit(2); });
