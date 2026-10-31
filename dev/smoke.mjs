// Render smoke test: loads a built bundle into jsdom, renders a room and the settings page against a made-up home and
// walks the settings layers (household + personal). Exits 1 on any failure. `node dev/smoke.mjs dist-dev/tomte-dev.js tomte-panel-dev`
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";

const [file = "dist-dev/tomte-dev.js", tag = "tomte-panel-dev"] = process.argv.slice(2);
const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost/tomte/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
w.ResizeObserver = class { observe() {} disconnect() {} }; w.IntersectionObserver = class { observe() {} disconnect() {} };
w.fetch = async () => ({ ok: false, headers: { get: () => null } });
const origWarn = console.warn; console.warn = () => {};
w.eval(`window.__errs=[]; window.addEventListener('error',e=>window.__errs.push(String(e.message)));`);
const code = readFileSync(file, "utf8").replaceAll("import.meta.url", '"http://localhost/local/tomte/bundle.js"');
const fails = [];
const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) fails.push(what); };
try { w.eval(code); } catch (e) { console.log("FAIL bundle does not load:", e.message); process.exit(1); }
check(!!w.customElements.get(tag), `element <${tag}> is defined`);

const mk = (id, state, attrs = {}) => ({ entity_id: id, state, attributes: attrs, last_changed: new Date().toISOString(), last_updated: new Date().toISOString(), context: {} });
const states = {
  "light.a": mk("light.a", "on", { friendly_name: "Lamp" }), "light.b": mk("light.b", "off", { friendly_name: "Bank" }),
  "vacuum.robbie": mk("vacuum.robbie", "docked", { friendly_name: "Robbie", rooms: [{ id: 1, name: "Woonkamer" }, { id: 3, name: "Keuken" }] }),
  "sensor.robbie_battery": mk("sensor.robbie_battery", "87", { unit_of_measurement: "%" }),
  "sensor.robbie_filter_remaining": mk("sensor.robbie_filter_remaining", "0"),
  "switch.cat_clean": mk("switch.cat_clean", "off", { friendly_name: "Kattenbak Clean" }), "switch.cat_empty": mk("switch.cat_empty", "off", { friendly_name: "Kattenbak Empty" }), "switch.cat_deodorize": mk("switch.cat_deodorize", "off", { friendly_name: "Kattenbak Deodorize" }),
  "sensor.claude_5_h_session": mk("sensor.claude_5_h_session", "84.0", { friendly_name: "Claude · 5 h session", unit_of_measurement: "%", session_resets_at: new Date(Date.now() + 175 * 60000).toISOString(), last_success_at: new Date().toISOString(), state: "ok" }),
  "sensor.claude_week": mk("sensor.claude_week", "54.0", { friendly_name: "Claude · week", unit_of_measurement: "%", weekly_resets_at: new Date(Date.now() + 4.5 * 86400000).toISOString(), last_success_at: new Date().toISOString(), state: "ok" }),
  "sensor.chatgpt_5_h_session": mk("sensor.chatgpt_5_h_session", "0.0", { friendly_name: "ChatGPT · 5 h session", unit_of_measurement: "%", session_resets_at: new Date(Date.now() + 250 * 60000).toISOString(), last_success_at: new Date().toISOString(), state: "ok" }),
  "sensor.chatgpt_week": mk("sensor.chatgpt_week", "0.0", { friendly_name: "ChatGPT · week", unit_of_measurement: "%", weekly_resets_at: new Date(Date.now() + 6 * 86400000).toISOString(), last_success_at: new Date().toISOString(), state: "ok" }),
  "media_player.mass": mk("media_player.mass", "playing", { friendly_name: "Keuken speaker", media_title: "Dreams", mass_player_type: "player", source: "Music Assistant Queue", active_queue: "q1", volume_level: .3 }),
  "media_player.mass_2": mk("media_player.mass_2", "idle", { friendly_name: "Zolder speaker", mass_player_type: "player", volume_level: .3 }),
  "media_player.tv": mk("media_player.tv", "on", { friendly_name: "TV", volume_level: .2 }),
  "climate.nest": mk("climate.nest", "heat", { temperature: 20, current_temperature: 19, friendly_name: "Nest", hvac_modes: ["heat", "off"] }),
};
const reg = (id, dev) => ({ entity_id: id, area_id: "huiskamer", device_id: dev });
const entities = Object.fromEntries(Object.keys(states).map(id => [id, reg(id, /robbie/.test(id) ? "dv1" : /cat_/.test(id) ? "dv2" : undefined)]));
const devices = { dv1: { id: "dv1", name: "Robbie", serial_number: "T2280" }, dv2: { id: "dv2", name: "Kattenbak" } };
// settings start under the OLD key names (hacasa_nova*): the panel must read them and then write the new ones (tomte*)
const dev = /-dev$/.test(tag), NEW = dev ? "tomte_dev" : "tomte", OLD = dev ? "hacasa_nova_dev" : "hacasa_nova";
const sets = [], data = { sys: { [OLD]: { v: 2, meta: { rev: 3 }, config: { pages: { huiskamer: { hidden: ["light.zzz"], title: "Huis", add: ["claude", "chatgpt"] } } } } }, user: { [OLD]: { setupDone: true, pages: { huiskamer: { order: ["b", "a"] } } } } };
const store = { get sys() { return data.sys[NEW] ?? data.sys[OLD]; }, get user() { return data.user[NEW] ?? data.user[OLD]; } };
const el = w.document.createElement(tag);
el.hass = { states, entities, devices, areas: { huiskamer: { area_id: "huiskamer", name: "Huiskamer" } }, floors: {}, user: { name: "Test", is_admin: true }, language: "nl", locale: { language: "nl" }, themes: {}, config: { unit_system: {} },
  callWS: async m => {
    if (m.type === "frontend/get_system_data") return { value: data.sys[m.key] ?? null };
    if (m.type === "frontend/get_user_data") return { value: data.user[m.key] ?? null };
    if (m.type === "frontend/set_system_data") { data.sys[m.key] = m.value; sets.push(`sys:${m.key}`); return null; }
    if (m.type === "frontend/set_user_data") { data.user[m.key] = m.value; sets.push(`user:${m.key}`); return null; }
    if (m.type === "config_entries/get") return [{ entry_id: "ma1", state: "loaded" }];
    if (m.type === "call_service" && m.domain === "music_assistant") {
      const fav = { media_type: "playlist", uri: "library://playlist/1", name: "Vrijdagavond", image: null }, hit = { media_type: "track", uri: "library://track/2", name: "Go Your Own Way", image: null, artists: [{ name: "Fleetwood Mac" }] };
      if (m.service === "get_library") return { response: { items: m.service_data.media_type === "playlist" ? [fav] : [] } };
      if (m.service === "search") return { response: { tracks: [hit], artists: [], albums: [], playlists: [], radio: [] } };
      if (m.service === "get_queue") return { response: { [m.target.entity_id]: { items: 4, current_item: { media_item: { media_type: "track", name: "Dreams", uri: "x" } }, next_item: { media_item: { media_type: "track", name: "Rhiannon", uri: "y" } } } } };
    }
    return null;
  }, callService: async () => {}, connection: { subscribeMessage: () => Promise.resolve(() => {}), subscribeEvents: () => Promise.resolve(() => {}) }, formatEntityState: s => s.state };
el.route = { path: "/huiskamer", prefix: "/tomte" }; el.panel = { url_path: "tomte" }; el.narrow = false;
w.document.body.appendChild(el);
const settle = async (ms = 400) => { await new Promise(r => setTimeout(r, ms)); await el.updateComplete; };
await settle(1500);
const html = () => el.shadowRoot?.innerHTML || "";
check(html().length > 20000, `room page renders (${html().length} chars)`);
check(/Robbie/.test(html()), "robot vacuum card");
check(/socks/.test(html()) && /Reinigen/.test(html()), "litter box card");
const lit = el.shadowRoot.querySelector(".card.litter");
check(!!lit && lit.querySelectorAll(".socks button").length >= 3 && !lit.querySelector(".socks small") && !!lit.querySelector(".socks button[title=\"Reinigen\"]"), "litter box card: icon buttons only (no label text), the name is the tooltip");
check(/vdot/.test(html()), "maintenance dot on the vacuum card");
check(/ChatGPT/.test(html()) && /0 %/.test(html()) && /4 u 10 min/.test(html()), "ChatGPT card with its own sensors (not mixed up with Claude)");
check(/Claude Code/.test(html()) && /84 %/.test(html()) && /54 %/.test(html()) && /2 u 55 min/.test(html()), "Claude Code card with session and week from the sensors");
check(/class="m warn"/.test(html()) && /class="m ok"/.test(html()), "Claude Code card: 84 % is a warning, 54 % is fine");
check(el.scope === "global", "an administrator with household settings edits the household");
check(JSON.stringify(el.config.pages.huiskamer) === JSON.stringify({ hidden: ["light.zzz"], title: "Huis", add: ["claude", "chatgpt"], order: ["b", "a"] }), "layers merge per field");

el.popup = { type: "vacuum", e: { id: "vacuum.robbie", state: states["vacuum.robbie"], reg: entities["vacuum.robbie"] } };
await settle(200);
check(/Schoonmaken/.test(html()) && /Onderhoud/.test(html()), "vacuum popup");
el.popup = { type: "usage", provider: "chatgpt" };
await settle(200);
check(/ChatGPT/.test(html()) && /Tempo/.test(html()), "ChatGPT popup");
el.popup = { type: "usage", provider: "claude" };
await settle(200);
check(/Tempo/.test(html()) && /Laatst bijgewerkt/.test(html()) && /binnen schema|boven schema/.test(html()), "Claude Code popup");
el.popup = null;

check(sets.includes(`user:${NEW}`), "personal settings are copied from the old key to the new one"); check(!sets.some(k => k.endsWith(`:${OLD}`)), "the old keys are never written");
await el.setHidden("huiskamer", "light.a", true);
check(sets.includes(`sys:${NEW}`) && JSON.stringify(data.sys[OLD].config.pages.huiskamer.hidden) === JSON.stringify(["light.zzz"]), "household save goes to the new key and leaves the old one untouched");
check(JSON.stringify(store.sys.config.pages.huiskamer) === JSON.stringify({ hidden: ["light.zzz", "light.a"], title: "Huis", add: ["claude", "chatgpt"] }), "household save stores the change");
check(store.user.pages === undefined, "household save drops the personal difference for that page");
await el.setScope("user"); await el.setHidden("huiskamer", "light.b", true);
check(el.scope === "user" && store.user.pages.huiskamer.hidden.includes("light.b") && store.sys.config.pages.huiskamer.hidden.length === 2, "personal save stays personal");

el.popup = { type: "add", key: "huiskamer", step: 1 };
await settle(200);
check(/Claude Code/.test(html()) && /ChatGPT/.test(html()), "the card picker offers Claude Code and ChatGPT when the sensors exist");
el.popup = null;
el.route = { path: "/instellingen", prefix: "/tomte" };
await settle(300);
check(/Opslag/.test(html()) && /Huis: /.test(html()), "settings page shows the storage section");
el.stab = "ai"; await settle(200);
check(/Reset sessie/.test(html()) && /Reset week/.test(html()) && /ChatGPT/.test(html()), "settings has an AI usage tab with Claude Code and ChatGPT");
el.route = { path: "/muziek", prefix: "/tomte" }; el.stab = null;
await settle(400); await settle(200);
check(/Vrijdagavond/.test(html()) && /Rhiannon/.test(html()), "Muziek page shows favourites and the queue of the playing speaker");
check(!!el.shadowRoot.querySelector(".mbar .mbtns button.main") && !!el.shadowRoot.querySelector(".mbar .mvol input[type=range]") && !!el.shadowRoot.querySelector(".ppills.mspk button.on.playing"), "Muziek page: player bar with controls and volume, the playing speaker picked and marked");
el.musicQuery = ""; el.shadowRoot.querySelector(".msearch input").value = "go"; el.shadowRoot.querySelector(".msearch input").dispatchEvent(new w.Event("input"));
await settle(700);
check(/Go Your Own Way/.test(html()), "Muziek page: search shows hits");
el.route = { path: "/huiskamer", prefix: "/tomte" };
el.popup = { type: "media", e: { id: "media_player.mass", state: states["media_player.mass"], reg: entities["media_player.mass"] } }; await settle(300);
check(/class="modes mtabs"/.test(html()) && /Vrijdagavond/.test(html()), "speaker popup of a Music Assistant player has the music tabs");
el.popup = { type: "media", e: { id: "media_player.tv", state: states["media_player.tv"], reg: entities["media_player.tv"] } }; await settle(300);
check(!/class="modes mtabs"/.test(html()), "a plain media player has no music tabs");
el.popup = null;
check(w.__errs.length === 0, `no errors thrown (${w.__errs.join("; ") || "none"})`);
console.warn = origWarn;
console.log(fails.length ? `\n${fails.length} check(s) failed` : "\nall checks passed");
process.exit(fails.length ? 1 : 0);
