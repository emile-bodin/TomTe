// Run after npm run build: CHROMIUM=<browser path> node dev/office-check.mjs
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import puppeteer from "puppeteer-core";

const root = process.cwd(), out = resolve("dist-dev/office-check");
mkdirSync(out, { recursive: true });
const server = createServer((req, res) => {
  const path = resolve(root, "." + req.url.split("?")[0]);
  if (!path.startsWith(root + "/") && !path.startsWith(root + "\\")) { res.writeHead(403).end(); return; }
  try { res.setHeader("Content-Type", extname(path) === ".js" ? "text/javascript" : "text/html"); res.end(readFileSync(path)); }
  catch { res.writeHead(404).end(); }
}).listen(0, "127.0.0.1");
await new Promise(r => server.once("listening", r));
let browser;
try {
  browser = await puppeteer.launch({ executablePath: process.env.CHROMIUM, headless: true });
  const page = await browser.newPage(), errors = [];
  await page.evaluateOnNewDocument(() => localStorage.setItem("mock:tomte", JSON.stringify({ setupDone: true, hintSeen: true })));
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/dev/index.html?shot`);
  await page.waitForFunction(() => document.querySelector("tomte-panel")?.shadowRoot);
  await page.evaluate(async () => {
    const p = document.querySelector("tomte-panel"), states = { ...p.hass.states };
    const add = (id, state, attributes = {}) => { states[id] = { entity_id: id, state, attributes }; };
    add("input_boolean.kantoor_werksessie_actief", "off");
    add("input_boolean.kantoor_licht_pauze", "off");
    add("input_boolean.emile_work_from_home", "on");
    add("automation.tag_tag_kantoor_is_gescand", "on");
    add("script.kantoor_werk_klaar", "off");
    add("binary_sensor.kantoor_aanwezigheid_presence", "on");
    add("sensor.kantoor_aanwezigheid_illuminance", "58");
    add("sensor.kantoor_aanwezigheid_temperature", "21.3");
    add("sensor.kantoor_aanwezigheid_humidity", "50.1");
    add("sensor.kantoor_aanwezigheid_battery", "100");
    add("sensor.kantoor_aanwezigheid_last_seen", new Date().toISOString());
    add("switch.kantoor_schermen", "on");
    add("light.plafond_kantoor_light", "on", { brightness: 150 });
    add("light.led_bureau", "on", { brightness: 100 });
    add("input_number.kantoor_lux_donker", "30");
    add("input_number.kantoor_lux_licht", "150");
    p.hass = { ...p.hass, states }; p.route = { prefix: "/tomte", path: "/automation" }; p.settings = false;
    window.calls = []; p.call = (...args) => window.calls.push(args);
    await p.updateComplete;
  });
  for (const width of [390, 1200]) {
    await page.setViewport({ width, height: 1000 });
    await new Promise(r => setTimeout(r, 300));
    assert.equal(await page.evaluate(() => document.querySelector("tomte-panel").shadowRoot.querySelector(".phead h1").textContent), "Automation");
    const overflow = await page.evaluate(() => {
      const el = document.querySelector("tomte-panel").shadowRoot.querySelector(".page");
      return el.scrollWidth > el.clientWidth + 1;
    });
    assert.equal(overflow, false, `Page overflow at ${width}px`);
    await page.screenshot({ path: resolve(out, `automation-${width}.png`), fullPage: true });
    await page.evaluate(() => document.querySelector("tomte-panel").shadowRoot.querySelector(".office-readings").scrollIntoView({ block: "center" }));
    await page.screenshot({ path: resolve(out, `automation-sensors-${width}.png`), fullPage: true });
    await page.evaluate(() => { document.querySelector("tomte-panel").shadowRoot.querySelector(".page").scrollTop = 0; });
  }
  await page.evaluate(() => document.querySelector("tomte-panel").shadowRoot.querySelector(".ptools button").click());
  assert.deepEqual(await page.evaluate(() => window.calls.pop()), ["automation", "trigger", { entity_id: "automation.tag_tag_kantoor_is_gescand", skip_condition: false }]);
  await page.evaluate(async () => {
    const p = document.querySelector("tomte-panel");
    p.hass = { ...p.hass, states: { ...p.hass.states, "input_boolean.kantoor_werksessie_actief": { entity_id: "input_boolean.kantoor_werksessie_actief", state: "on", attributes: {} } } };
    await p.updateComplete;
    p.shadowRoot.querySelector(".ptools button").click();
  });
  assert.deepEqual(await page.evaluate(() => window.calls.pop()), ["script", "turn_on", { entity_id: "script.kantoor_werk_klaar" }]);
  await page.evaluate(async () => {
    const p = document.querySelector("tomte-panel");
    p.hass = { ...p.hass, states: { ...p.hass.states, "script.kantoor_werk_klaar": { entity_id: "script.kantoor_werk_klaar", state: "unavailable", attributes: {} } } };
    await p.updateComplete;
  });
  assert.equal(await page.evaluate(() => document.querySelector("tomte-panel").shadowRoot.querySelector(".ptools button").disabled), true);
  await page.evaluate(() => {
    const input = document.querySelector("tomte-panel").shadowRoot.querySelector("input[type=range]");
    input.value = "70"; input.dispatchEvent(new Event("change"));
  });
  assert.deepEqual(await page.evaluate(() => window.calls.pop()), ["light", "turn_on", { entity_id: "light.plafond_kantoor_light", brightness_pct: 70 }]);
  await page.evaluate(() => {
    const input = document.querySelector("tomte-panel").shadowRoot.querySelector("input[type=range]");
    input.value = "0"; input.dispatchEvent(new Event("change"));
  });
  assert.deepEqual(await page.evaluate(() => window.calls.pop()), ["light", "turn_off", { entity_id: "light.plafond_kantoor_light" }]);
  await page.evaluate(() => {
    const input = document.querySelector("tomte-panel").shadowRoot.querySelector("input[type=number]");
    input.value = "40"; input.dispatchEvent(new Event("change"));
  });
  assert.deepEqual(await page.evaluate(() => window.calls.pop()), ["input_number", "set_value", { entity_id: "input_number.kantoor_lux_donker", value: 40 }]);
  await page.evaluate(async () => {
    const p = document.querySelector("tomte-panel"), states = { ...p.hass.states };
    states["timer.kantoor_afwezigheid"] = { entity_id: "timer.kantoor_afwezigheid", state: "active", attributes: { finishes_at: new Date(Date.now() + 120000).toISOString() } };
    states["binary_sensor.kantoor_aanwezigheid_presence"] = { entity_id: "binary_sensor.kantoor_aanwezigheid_presence", state: "off", attributes: {} };
    states["input_boolean.kantoor_licht_pauze"] = { entity_id: "input_boolean.kantoor_licht_pauze", state: "on", attributes: {} };
    p.hass = { ...p.hass, states }; await p.updateComplete;
    [...p.shadowRoot.querySelectorAll(".office-inset button")].find(b => b.textContent.includes("Resume automatic")).click();
  });
  assert.deepEqual(await page.evaluate(() => window.calls.pop()), ["input_boolean", "turn_off", { entity_id: "input_boolean.kantoor_licht_pauze" }]);
  assert.equal(await page.evaluate(() => document.querySelector("tomte-panel").shadowRoot.querySelector("progress").value), 2);
  await page.screenshot({ path: resolve(out, "automation-pause-1200.png"), fullPage: true });
  await page.evaluate(async () => {
    const p = document.querySelector("tomte-panel"), id = "binary_sensor.kantoor_aanwezigheid_presence";
    p.hass = { ...p.hass, states: { ...p.hass.states, [id]: { ...p.hass.states[id], state: "unavailable" } } };
    await p.updateComplete;
  });
  assert.equal(await page.evaluate(() => document.querySelector("tomte-panel").shadowRoot.querySelector("progress")), null);
  assert.deepEqual(errors, []);
  console.log(`Office checks passed; screenshots: ${out}`);
} finally {
  await browser?.close(); server.close();
}
