// Layout audit: renders the mock home (dev/index.html) in a real browser at several sizes and measures every card, so the
// card layout contract can be checked instead of eyeballed. For each card it records the region boxes (icon, corner, name,
// status, bottom line, controls, sliders, sub-content …) relative to the card, and reports overlaps between regions and regions
// sticking out of the card. Screenshots go to the output folder.
//
//   npm run build && node dev/layout-audit.mjs                       report + screenshots in /tmp/tomte-layout
//   node dev/layout-audit.mjs --out dir --save base.json              also write the measurements
//   node dev/layout-audit.mjs --compare base.json                     list what changed against a saved run
//   node dev/layout-audit.mjs --only phone,desktop-rows2              a subset of the scenarios
//   node dev/layout-audit.mjs --sheets test_lab                       contact sheets: every card of that page, one picture per scenario
// Needs Chromium (CHROMIUM=/usr/bin/chromium) and puppeteer-core; uses dist/tomte.js, so build first.
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import puppeteer from "puppeteer-core";

const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const sheetPages = (arg("--sheets") || "").split(",").filter(Boolean), out = resolve(arg("--out", "/tmp/tomte-layout")), saveTo = arg("--save"), compareTo = arg("--compare"), only = (arg("--only") || "").split(",").filter(Boolean);
mkdirSync(out, { recursive: true });

const SCENARIOS = [
  { name: "desktop", w: 1440, h: 900 },
  { name: "desktop-rows2", w: 1440, h: 900, rows2: true },
  { name: "desktop-small-rows2", w: 1100, h: 700, rows2: true },
  { name: "tablet", w: 820, h: 1180 },
  { name: "tablet-rows2", w: 820, h: 1180, rows2: true },
  { name: "phone", w: 390, h: 844 },
  { name: "phone-rows2", w: 390, h: 844, rows2: true },
].filter(s => !only.length || only.includes(s.name));
const PAGES = ["", "living_room", "kitchen", "bedroom", "dressing_room", "landing", "attic", "test_lab"];   // test_lab: long names, unavailable and awkward cards (?lab)
// lights cards in every size, with long names and unreachable lights
const LAB_LAMPS = [["light.floor_lamp", "light.lab_long_on", "light.lab_long_off", "light.lab_unavailable"], ["light.floor_lamp", "light.ceiling_light_living_room", "light.spots_tv_meubel"], ["light.floor_lamp", "light.lab_long_off"], ["light.lab_long_on"], ["light.lab_unavailable"]].map((members, i) => ({ id: "lamps" + i, name: i ? "Lights" : "Lights with a name that is far too long", style: "lamps", room: "test_lab", members }));
const LAB_VALUES = ["claude", "chatgpt", "sensor.lab_temp", "sensor.lab_long_value", "sensor.lab_text_value", "sensor.lab_unavailable_value"];   // value cards are added by hand to a page
// the regions of a card; two of them overlapping (or sticking out of the card) is a layout defect, except the pairs listed as allowed
const REGIONS = [".i", ".c", ".n", ".s", ".lbl", ".ctl", ".socks", ".seg", ".slider", ".vslider", ".rail", ".subc", ".prog", ".spk", ".bat", ".meta", ".gl", ".appi"];
const ALLOWED = [["i", "appi"], ["c", "ua"], ["n", "gl"], ["s", "gl"], ["c", "rail"], ["c", "vslider"], ["ctl", "rail"]];

const mime = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg" };
const server = createServer((req, res) => {
  const p = join(process.cwd(), decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(process.cwd()) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  try { res.writeHead(200, { "content-type": mime[extname(p)] || "application/octet-stream" }); res.end(readFileSync(p)); } catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;

/** runs inside the page: every card of the current page with its regions relative to the card box */
function measure(REGIONS, ALLOWED) {
  const root = document.querySelector("tomte-panel").shadowRoot, cards = [...root.querySelectorAll(".card")].filter(c => !c.closest(".sfade"));
  const rel = (r, c) => ({ x: +(r.left - c.left).toFixed(1), y: +(r.top - c.top).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) });
  return cards.map((card, idx) => {
    const cb = card.getBoundingClientRect(), cs = getComputedStyle(card), regions = {};
    const scale = card.closest(".room-scale") ? card.getBoundingClientRect().width / card.offsetWidth : 1;
    for (const sel of REGIONS) for (const el of card.querySelectorAll(":scope > " + sel + ", :scope > * > " + sel)) {
      const st = getComputedStyle(el); if (st.display === "none" || st.visibility === "hidden") continue;
      const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
      const k = sel.slice(1); (regions[k] ||= []).push(rel(r, cb));
    }
    const flat = Object.entries(regions).flatMap(([k, list]) => list.map(b => ({ k, ...b }))), overlaps = [], outside = [];
    for (let a = 0; a < flat.length; a++) {
      const A = flat[a];
      if (A.x < -1 || A.y < -1 || A.x + A.w > cb.width + 1 || A.y + A.h > cb.height + 1) outside.push(A.k);
      for (let b = a + 1; b < flat.length; b++) {
        const B = flat[b]; if (A.k === B.k || ALLOWED.some(([p, q]) => (p === A.k && q === B.k) || (p === B.k && q === A.k))) continue;
        const ix = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x), iy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
        if (ix > 2 && iy > 2) overlaps.push(`${A.k}×${B.k}`);
      }
    }
    return { i: idx, cls: [...card.classList].filter(c => c !== "card").sort().join("."), name: (card.querySelector(".n")?.textContent || card.querySelector(".s")?.textContent || "").trim().slice(0, 28),
      w: +cb.width.toFixed(1), h: +cb.height.toFixed(1), scale: +scale.toFixed(3), pad: cs.padding, regions, overlaps, outside };
  });
}

const browser = await puppeteer.launch({ executablePath: process.env.CHROMIUM || "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
const results = {};
for (const sc of SCENARIOS) {
  results[sc.name] = {};
  const page = await browser.newPage();
  await page.setViewport({ width: sc.w, height: sc.h, deviceScaleFactor: 1, hasTouch: sc.w < 900 });
  const user = { setupDone: true, hintSeen: true, groups: LAB_LAMPS, pages: Object.fromEntries(PAGES.filter(Boolean).map(r => [r, { ...(sc.rows2 ? { rows: 2 } : {}), ...(r === "test_lab" ? { add: LAB_VALUES } : {}) }])) };
  await page.evaluateOnNewDocument(u => { localStorage.setItem("mock:tomte", JSON.stringify(u)); }, user);
  for (const pg of PAGES) {
    await page.goto(`http://localhost:${port}/dev/index.html?shot&nohint&lab&appl2#/${pg}`, { waitUntil: "load", timeout: 60000 });
    await page.reload({ waitUntil: "load" });
    try { await page.waitForFunction(() => document.querySelector("tomte-panel")?.shadowRoot?.querySelector(".card"), { timeout: 15000 }); } catch { results[sc.name][pg || "home"] = { error: "no cards" }; continue; }
    await new Promise(r => setTimeout(r, 900));
    const cards = await page.evaluate(measure, REGIONS, ALLOWED);
    results[sc.name][pg || "home"] = cards;
    await page.screenshot({ path: join(out, `${sc.name}--${pg || "home"}.png`) });
    if (sheetPages.includes(pg || "home")) {   // a contact sheet: the strip laid out as a wrapping grid, so every card is on one picture
      await page.evaluate(() => {
        const st = document.createElement("style");
        st.textContent = `:host{position:static!important;overflow:visible!important;height:auto!important;display:block!important}
          .nav,.title,.banner,.bnav,.sfade,.ticker{display:none!important}
          .strip{position:static!important;display:flex!important;flex-wrap:wrap!important;overflow:visible!important;height:auto!important;width:auto!important;padding:20px!important;gap:12px!important;mask:none!important;-webkit-mask:none!important}
          .strip .room-rows,.strip .room-row{display:contents!important}
          .strip .room-cell{display:block!important}
          .strip .card{width:var(--card-w)!important}`;
        document.querySelector("tomte-panel").shadowRoot.append(st);
      });
      await new Promise(r => setTimeout(r, 400));
      const h = await page.evaluate(() => Math.ceil(document.querySelector("tomte-panel").shadowRoot.querySelector(".strip").getBoundingClientRect().bottom + 20));
      await page.setViewport({ width: sc.w, height: Math.max(sc.h, h), deviceScaleFactor: 1, hasTouch: sc.w < 900 });
      await new Promise(r => setTimeout(r, 300));
      await page.screenshot({ path: join(out, `sheet--${sc.name}--${pg || "home"}.png`) });
    }
  }
  await page.close();
}
await browser.close(); server.close();

// ---- report
let defects = 0, cardsSeen = 0;
for (const [sc, pages] of Object.entries(results)) for (const [pg, cards] of Object.entries(pages)) {
  if (cards.error) { console.log(`${sc} / ${pg}: ${cards.error}`); continue; }
  for (const c of cards) { cardsSeen++; if (c.overlaps.length || c.outside.length) { defects++; console.log(`DEFECT ${sc} / ${pg} / "${c.name}" [${c.cls}] ${c.w}x${c.h}: ${c.overlaps.length ? "overlap " + [...new Set(c.overlaps)].join(", ") : ""}${c.outside.length ? " outside " + [...new Set(c.outside)].join(", ") : ""}`); } }
}
console.log(`\n${cardsSeen} cards measured in ${Object.keys(results).length} scenarios, ${defects} with overlap or overflow. Screenshots: ${out}`);
if (saveTo) { writeFileSync(saveTo, JSON.stringify(results, null, 1)); console.log("saved " + saveTo); }
if (compareTo) {
  const base = JSON.parse(readFileSync(compareTo, "utf8")); let changed = 0;
  for (const [sc, pages] of Object.entries(results)) for (const [pg, cards] of Object.entries(pages)) {
    const was = base[sc]?.[pg]; if (!was || cards.error) continue;
    cards.forEach((c, i) => {
      const b = was[i]; if (!b) { console.log(`NEW ${sc} / ${pg} / ${c.name}`); return; }
      const diffs = [];
      for (const k of new Set([...Object.keys(c.regions), ...Object.keys(b.regions)])) {
        const A = c.regions[k] || [], B = b.regions[k] || [];
        if (A.length !== B.length) { diffs.push(`${k}: ${B.length}→${A.length}`); continue; }
        A.forEach((r, j) => { const o = B[j]; if (Math.abs(r.x - o.x) > 1 || Math.abs(r.y - o.y) > 1 || Math.abs(r.w - o.w) > 1 || Math.abs(r.h - o.h) > 1) diffs.push(`${k}[${j}] ${o.x},${o.y} ${o.w}×${o.h} → ${r.x},${r.y} ${r.w}×${r.h}`); });
      }
      if (c.pad !== b.pad) diffs.push(`padding ${b.pad} → ${c.pad}`);
      if (diffs.length) { changed++; console.log(`CHANGED ${sc} / ${pg} / "${c.name}" [${c.cls}]\n   ${diffs.join("\n   ")}`); }
    });
  }
  console.log(`\n${changed} cards changed against ${compareTo}`);
}
process.exit(defects ? 1 : 0);
