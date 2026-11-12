#!/usr/bin/env node
/**
 * Scroll guard for both sites. Run after ANY edit to layout, CSS, nav, or sections:
 *
 *     cd corporate-site-testing/tools && npm install && npm run check:scroll
 *
 * For every in-page nav target, at desktop and phone sizes, it asserts:
 *   1. the section top lands flush under the header (not 16px low, not hidden behind it)
 *   2. the scroll is one direction, no bounce or double scroll
 *   3. the page has no horizontal overflow and no nested scroll trap on html/body
 *   4. the active nav item is the section you jumped to (when the site marks one)
 *   5. (britecyte) every top-aligned section puts its first heading the same distance under the header
 * Exits non-zero on any failure so it can gate commits or CI.
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
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find(existsSync);

const SITES = [
  { name: "britecyte", url: `${BASE}/britecyte/`, uniformGap: true },
  { name: "lipoderma", url: `${BASE}/lipoderma/`, uniformGap: false },
];
const VIEWPORTS = [
  { label: "desktop 1140x688", width: 1140, height: 688, mobile: false },
  { label: "desktop 1440x900", width: 1440, height: 900, mobile: false },
  { label: "phone 390x844", width: 390, height: 844, mobile: true },
];
const TOL = 1.5;
const failures = [];
const fail = (msg) => { failures.push(msg); console.log("  FAIL", msg); };

async function serverUp() {
  try { return (await fetch(BASE + "/")).ok; } catch { return false; }
}

async function settle(page) {
  // Wait for the jump to begin (or time out if the page was already there),
  // then poll until scrollY stops changing, recording the path.
  return page.evaluate(() => new Promise((resolve) => {
    const path = []; const start = Math.round(scrollY); let began = false; let still = 0; let last = start; let ticks = 0;
    const iv = setInterval(() => {
      ticks++;
      const y = Math.round(scrollY); path.push(y);
      if (y !== start) began = true;
      still = y === last ? still + 1 : 0; last = y;
      const waitedForStart = began || ticks > 40;          // up to 1.6s for the jump to start
      if ((waitedForStart && still >= 10) || ticks > 220) { clearInterval(iv); resolve(path); }
    }, 40);
  }));
}

function reversals(path) {
  let n = 0;
  for (let i = 2; i < path.length; i++) {
    const a = path[i - 1] - path[i - 2], b = path[i] - path[i - 1];
    if (a * b < 0 && Math.abs(a) > 2 && Math.abs(b) > 2) n++;
  }
  return n;
}

async function run() {
  if (!CHROME) throw new Error("No Chrome found. Set CHROME_PATH.");
  let server;
  if (!(await serverUp())) {
    server = spawn("python3", ["serve.py"], { cwd: ROOT, stdio: "ignore" });
    for (let i = 0; i < 30 && !(await serverUp()); i++) await new Promise((r) => setTimeout(r, 200));
  }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    for (const site of SITES) {
      for (const vp of VIEWPORTS) {
        console.log(`\n${site.name} @ ${vp.label}`);
        const page = await browser.newPage();
        await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: 1 });
        await page.goto(site.url, { waitUntil: "networkidle0" });
        await new Promise((r) => setTimeout(r, 600));

        const info = await page.evaluate(() => {
          const header = document.querySelector("header");
          const ids = [...new Set([...document.querySelectorAll("header a[href^='#'], nav a[href^='#'], footer a[href^='#']")]
            .map((a) => a.getAttribute("href").slice(1)))].filter((id) => id && document.getElementById(id));
          const de = document.documentElement;
          return {
            hh: header.getBoundingClientRect().height,
            ids,
            pad: parseFloat(getComputedStyle(de).scrollPaddingTop) || 0,
            overflowX: de.scrollWidth - de.clientWidth,
            htmlOY: getComputedStyle(de).overflowY, bodyOY: getComputedStyle(document.body).overflowY,
          };
        });

        if (Math.abs(info.pad - info.hh) > TOL) fail(`scroll-padding-top ${info.pad}px != header ${info.hh}px (anchors will land misaligned)`);
        if (info.overflowX > 1) fail(`horizontal overflow ${info.overflowX}px`);
        if (/(auto|scroll)/.test(info.htmlOY) && /(auto|scroll)/.test(info.bodyOY)) fail("html and body are both scrollers (double scroll)");

        const gaps = [];
        for (const id of info.ids) {
          // Reset to the top instantly and wait until the page is really there
          // (and any hash is cleared) so every jump starts from the same state.
          await page.evaluate(() => { document.documentElement.style.setProperty("scroll-behavior", "auto", "important"); history.replaceState(null, "", location.pathname); });
          for (let i = 0; i < 40; i++) {
            await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
            if ((await page.evaluate(() => Math.round(scrollY))) === 0) break;
            await new Promise((r) => setTimeout(r, 100));
          }
          await new Promise((r) => setTimeout(r, 300));
          await page.evaluate(() => { document.documentElement.style.removeProperty("scroll-behavior"); });

          const selector = `header a[href='#${id}']`;
          const hasLink = !vp.mobile && (await page.$(selector));
          const startPath = page.evaluate(() => { window.__p = []; });
          await startPath;
          if (hasLink) await page.evaluate((s) => document.querySelector(s).click(), selector);
          else await page.evaluate((i) => { location.hash = i; }, id);
          const pathY = await settle(page);

          const r = await page.evaluate((i) => {
            const t = document.getElementById(i);
            const header = document.querySelector("header").getBoundingClientRect().height;
            const h = [...t.querySelectorAll("h1,h2")].find((e) => e.getBoundingClientRect().height > 0);
            const active = document.querySelector("header a.is-active, nav a.is-active, nav a[aria-current]")?.getAttribute("href");
            const markedAny = !!document.querySelector("header a.is-active, nav a.is-active, nav a[aria-current]");
            return { top: t.getBoundingClientRect().top, header, headingGap: h ? h.getBoundingClientRect().top - header : null,
                     height: t.getBoundingClientRect().height, active, markedAny, maxScroll: document.documentElement.scrollHeight - innerHeight, y: scrollY };
          }, id);

          const atEnd = Math.abs(r.y - r.maxScroll) <= 1;      // last section can't scroll further
          const flush = Math.abs(r.top - r.header) <= TOL;
          if (!flush && !(atEnd && r.top > r.header)) fail(`#${id}: lands at ${r.top.toFixed(1)}px, header is ${r.header}px`);
          const rev = reversals(pathY);
          if (rev > 0) fail(`#${id}: scroll bounced (${rev} direction changes)`);
          if (r.markedAny && r.active !== `#${id}` && !atEnd) fail(`#${id}: nav highlights ${r.active}`);
          if (site.uniformGap && vp.width >= vp.height && !["hero", "about"].includes(id) && r.headingGap != null) gaps.push([id, r.headingGap]);
          const good = (flush || (atEnd && r.top > r.header)) && rev === 0;
          console.log(`  ${good ? "ok  " : "BAD "} #${id.padEnd(16)} top=${r.top.toFixed(0)} gap=${r.headingGap == null ? "-" : r.headingGap.toFixed(0)}${rev ? " BOUNCE" : ""}`);
        }
        if (gaps.length > 1) {
          const vals = gaps.map((g) => g[1]);
          if (Math.max(...vals) - Math.min(...vals) > 2) fail(`uneven section padding after jump: ${gaps.map((g) => `${g[0]}=${g[1].toFixed(0)}`).join(" ")}`);
        }
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server?.kill();
  }
  console.log(failures.length ? `\n${failures.length} scroll problem(s). Fix before committing.` : "\nScroll check passed: all sites, all sizes.");
  process.exit(failures.length ? 1 : 0);
}
run().catch((e) => { console.error(e); process.exit(2); });
