// Popup renderers. `pop` is the panel's open popup descriptor {type, ...}; `p` the panel.
import { t, locale } from "./i18n.js";
import { html, nothing } from "lit";
import { icon, isOn, unavailable, num, relTime, domain, setpoint } from "./util.js";
import { name, deviceName } from "./model.js";
import { pagesFor } from "./pages.js";
import { keypad, bars } from "./extras.js";
import { eventWhen, timeline, applianceState, applianceMonth, noRemote } from "./extras2.js";
import { dishHelper, litterBox, wasteColor, wasteWhen, condText, condSvg, label, camStream, attFilter, ATT_FILTERS, mediaView, lightCaps, batteryOf, groupMembers, cardType } from "./cards.js";
import { roomPresets, snapshot, applyPreset, presetMatches, installUpdate, pendingUpdates } from "./features.js";
import { modeList, toggleMode } from "./extras3.js";
import { field, text, select, check } from "./settings.js";
import { LANGUAGES } from "./i18n.js";
import { addPopup, canEdit, isBuiltin, TPL_ASK, groupCandidates, graphCandidates, hoursLabel } from "./edit.js";
import { templateOf } from "./cards.js";
import { GRAPH_HOURS } from "./graph.js";
import { usagePopup, USAGE_PROVIDERS } from "./usage.js";
import { costsBig, costsPopup } from "./costs.js";
import { heatInfo, heatInfoTitle } from "./heating.js";
import { siblings, maintenance, vacTask, vacStatus, VAC_LABELS, BUSY } from "./vacuum.js";
import { isMA, favTiles, searchBox, queueList, movePills } from "./music.js";
import "./peoplemap.js";

const entityOf = pop => pop.type === "cardcfg" ? pop.key : pop.e?.id || pop.s?.entity_id || pop.st?.id || pop.a?.id || (pop.type === "weather" ? CUR?.p?.home?.weather?.entity_id : null) || null;
/** header buttons: ⋯ (card options) when the popup belongs to an entity, and close */
const hbtns = (p, pop) => html`<span class="hb">${entityOf(pop) && pop.type !== "cardcfg" ? html`<button class=${pop.menu ? "on" : ""} title=${t("Opties")} @click=${ev => { ev.stopPropagation(); p.openPopup({ ...pop, menu: !pop.menu, form: false }); }}><ha-icon icon="mdi:dots-horizontal"></ha-icon></button>` : nothing}<button data-close title=${t("Sluiten")}><img src=${icon("close")} alt="sluiten" data-close></button></span>`;
/** the ••• menu: a dropdown under the button (desktop) or a sheet at the bottom (phone), outside .popup so its scroll box can't clip it */
function optionsMenu(p, pop) {
  const id = entityOf(pop), dev = id.startsWith("device:") ? id.slice(7) : p.hass.entities?.[id]?.device_id;
  const pageKey = p.room?.id || "home", onPage = p.pageCards(pageKey).some(c => c.key === id);
  const item = (mdi, lbl, sub, go) => html`<a @click=${ev => { ev.stopPropagation(); go(); }}><ha-icon icon=${mdi}></ha-icon><span>${lbl}${sub ? html`<small>${sub}</small>` : nothing}</span></a>`;
  return html`<div class="pmenu" @click=${ev => { ev.stopPropagation(); if (ev.target === ev.currentTarget) p.openPopup({ ...pop, menu: false }); }}>
    <div class="who"><ha-icon icon=${pop.e?.state?.attributes?.icon || "mdi:tune-variant"}></ha-icon><div><b>${label(p, pop.e || { id, state: p.hass.states[id] })}</b><small>${p.room?.name || t("Thuis")} · ${id}</small></div></div>
    ${item("mdi:tune", t("Kaart instellen"), t("naam, weergave, gedrag, knoppen"), () => p.openPopup({ ...pop, menu: false, form: true }))}
    ${item("mdi:open-in-new", t("Openen in Home Assistant"), id.startsWith("device:") ? t("apparaatpagina") : id, () => { p.popup = null; id.startsWith("device:") ? p.goPath(`/config/devices/device/${dev}`) : p.moreInfo(id); })}
    ${dev && !id.startsWith("device:") ? item("mdi:chip", t("Apparaat openen"), deviceName(p.hass, dev), () => { p.popup = null; p.goPath(`/config/devices/device/${dev}`); }) : nothing}
    ${onPage ? html`<div class="sep"></div>${item("mdi:eye-off-outline", t("Verbergen op deze pagina"), t("terug te vinden via Pagina instellen"), () => { const pc = p.layerPage(pageKey); p.savePage(pageKey, { ...pc, hidden: [...new Set([...(pc.hidden || []), id])] }); p.popup = null; })}` : nothing}
    <button class="cancel" @click=${() => p.openPopup({ ...pop, menu: false })}>${t("Annuleren")}</button>
  </div>`;
}
const li = (mdi, label, value, { on = false, sub = "", onclick = null, svg = null, img = null } = {}) =>
  html`<li class="${on ? "on" : ""} ${onclick ? "tap" : ""}" @click=${onclick || nothing}>${img ? html`<img class="avatar" src=${img} alt="">` : svg ? html`<img class="ico" src=${icon(svg)} alt="">` : html`<ha-icon icon=${mdi}></ha-icon>`}<div>${label}${sub ? html`<small>${sub}</small>` : nothing}</div><span class="st">${value}</span></li>`;
const range = (label, v, oninput, { min = 0, max = 100, unit = "%" } = {}) =>
  html`<div class="prow"><span>${label}</span><b>${v}${unit}</b><input type="range" min=${min} max=${max} .value=${String(v)} @change=${e => oninput(+e.target.value)}></div>`;
const modes = (items, cls = "") => html`<div class="modes ${cls}">${items.map(m => html`<button class=${m.on ? "on" : ""} @click=${m.go}>${m.label}</button>`)}</div>`;

/* ---------- dishwasher: programme, options, delayed start, maintenance and the machine's own settings ---------- */
const DISH_PROG = { auto1: "Auto 35–45°", auto2: "Auto 45–65°", auto3: "Auto 65–75°", eco50: "Eco 50°", intensiv70: "Intensief 70°", quick45: "Snel 45°", quick65: "Snel 65°", quickd: "Snel droog", prerinse: "Voorspoelen", machinecare: "MachineCare", glas40: "Glas 40°", nightwash: "Nacht", normal65: "Normaal 65°", kurz60: "Kort 60°" };
const DISH_OPT = [["half_load", "mdi:contrast-box", "Halve lading"], ["hygiene_plus", "mdi:shield-check-outline", "Hygiëne Plus"], ["intensiv_zone", "mdi:target", "Intensiefzone"], ["variospeedplus", "mdi:speedometer", "VarioSpeed Plus"], ["silence_on_demand", "mdi:volume-low", "Stil"], ["speed_on_demand", "mdi:rocket-launch-outline", "Sneller"], ["extra_dry", "mdi:hair-dryer-outline", "Extra drogen"]];
const DISH_LEVEL = { full: "Vol", ok: "Goed", low: "Bijna leeg", empty: "Leeg", almostempty: "Bijna leeg", nearlyempty: "Bijna leeg" };
function dishPanel(p, a, st, hass, title) {
  const keys = Object.keys(hass.entities || {}).filter(k => hass.entities[k].device_id === a.device && !hass.entities[k].hidden);
  const find = re => { const k = keys.find(x => re.test(x)); return k ? hass.states[k] : null; };
  const ok = z => !!z && z.state !== "unavailable";
  const live = st.st === "running" || st.st === "waiting", door = a.door ? hass.states[a.door.id] : null, doorOpen = ["open", "on"].includes(door?.state);
  const raw = z => String(z.state).split(".").pop();
  const progName = v => { const k = String(v).split("program_").pop().split(".").pop(); return DISH_PROG[k] ? t(DISH_PROG[k]) : /^favorite_/.test(k) ? t("Favoriet {n}", { n: Number(k.split("_").pop()) || "" }) : k.replace(/_/g, " ").replace(/([a-z])(\d)/g, "$1 $2").replace(/^\w/, c => c.toUpperCase()); };
  const call = (dom, svc, id, data = {}) => p.call(dom, svc, { entity_id: id, ...data });
  const grid = n => (n === 2 ? "n2" : n === 3 ? "n3" : "");
  const out = [];
  // clean / dirty / empty (the helper that the automation keeps)
  const dw = dishHelper(hass);
  if (dw) out.push(html`<div class="vh">${t("Vaat")}</div><div class="vs">${t("Schoon zodra de cyclus klaar is, vuil als de deur dicht gaat, leeg na uitruimen")}</div>${modes([["schoon", "Schoon"], ["vuil", "Vuil"], ["leeg", "Leeg"]].map(([v, l]) => ({ label: t(l), on: dw.state === v, go: () => call("input_select", "select_option", dw.entity_id, { option: v }) })), "n3")}`);
  // programme
  const prog = find(/^select\..*_selected_program$/);
  if (ok(prog) && prog.attributes.options?.length) out.push(html`<div class="vh">${t("Programma")}</div>${live ? html`<ul>${li("mdi:playlist-play", progName(prog.state), t("Bezig"), { on: true, sub: t("Kan pas na afloop gewijzigd worden") })}</ul>` : modes(prog.attributes.options.map(o => ({ label: progName(o), on: prog.state === o, go: () => call("select", "select_option", prog.entity_id, { option: o }) })), "")}`);
  // options of the cycle
  const opts = DISH_OPT.map(([k, ic, lb]) => [find(new RegExp(`^switch\\..*_${k}$`)), ic, lb]).filter(([z]) => ok(z));
  if (opts.length) out.push(html`<div class="vh">${t("Opties")}</div>${live ? html`<ul>${opts.map(([z, ic, lb]) => li(ic, t(lb), isOn(z) ? t("Aan") : t("Uit"), { on: isOn(z) }))}</ul>` : modes(opts.map(([z, ic, lb]) => ({ label: t(lb), on: isOn(z), go: () => call("switch", "toggle", z.entity_id) })), "")}`);   // the machine only takes options before the start
  // delayed start (the number counts seconds)
  const delay = find(/^number\..*_start_in$/);
  if (ok(delay) && !live) { const cur = Math.round((num(delay.state) ?? 0) / 3600), unit = delay.attributes.unit_of_measurement === "h" ? 1 : 3600, max = (delay.attributes.max ?? 86400) / (unit === 1 ? 1 : 3600);
    out.push(html`<div class="vh">${t("Start uitstellen")}</div><div class="vs">${t("Stel in en druk daarna op Start")}</div>${modes([0, 1, 2, 3, 4, 6, 9].filter(h => h <= max).map(h => ({ label: h ? `${h} ${t("u")}` : t("Nu"), on: cur === h, go: () => call("number", "set_value", delay.entity_id, { value: h * (unit === 1 ? 1 : 3600) }) })), "")}`); }
  // problems the machine reports
  const probs = keys.filter(k => /^binary_sensor\./.test(k) && hass.states[k]?.attributes.device_class === "problem" && isOn(hass.states[k]));
  if (probs.length) out.push(html`<div class="vh">${t("Meldingen")}</div><ul>${probs.map(k => li("mdi:alert-outline", (hass.states[k].attributes.friendly_name || k).replace(title, "").replace(/^Siemens Dishwasher\s*/i, "").trim(), t("Actief"), { on: true, onclick: () => p.moreInfo(k) }))}</ul>`);
  // levels and counters
  const lvl = (re, ic, lb) => { const z = find(re); return ok(z) ? li(ic, lb, t(DISH_LEVEL[raw(z)] || raw(z)), { on: /low|empty/.test(raw(z)), onclick: () => p.moreInfo(z.entity_id) }) : nothing; };
  const cnt = (re, ic, lb, fmt = v => v) => { const z = find(re); return ok(z) ? li(ic, lb, fmt(z.state), { onclick: () => p.moreInfo(z.entity_id) }) : nothing; };
  const wifi = find(/^sensor\..*_wifi_signal_strength$/), conn = find(/^binary_sensor\..*_connection$/);
  out.push(html`<div class="vh">${t("Onderhoud")}</div><ul>${lvl(/^sensor\..*_salt$/, "mdi:shaker-outline", t("Zout"))}${lvl(/^sensor\..*_rinse_aid$/, "mdi:water-opacity", t("Glansspoelmiddel"))}${cnt(/^sensor\..*_machinecare_remaining_runs$/, "mdi:wrench-clock", t("MachineCare over"), v => t("{n} beurten", { n: v }))}${cnt(/^sensor\..*_start_count$/, "mdi:counter", t("Aantal starts"), v => `${v}×`)}${ok(wifi) ? li("mdi:wifi", t("Wifi"), `${wifi.state} dBm`, { onclick: () => p.moreInfo(wifi.entity_id) }) : conn ? li("mdi:wifi-off", t("Verbinding"), isOn(conn) ? t("Verbonden") : t("Verbroken"), { on: !isOn(conn), onclick: () => p.moreInfo(conn.entity_id) }) : nothing}</ul>`);
  // the machine's own settings
  const lock = find(/^switch\..*_child_lock$/), hard = find(/^select\..*_water_hardness$/), rinse = find(/^select\..*_rinse_aid$/), water = find(/^select\..*_water_connection$/);
  const pick = (z, lbl, fmt) => ok(z) && z.attributes.options?.length ? html`<div class="vs">${lbl}</div>${modes(z.attributes.options.map(o => ({ label: fmt(o), on: z.state === o, go: () => call("select", "select_option", z.entity_id, { option: o }) })), "")}` : nothing;
  const num2 = o => String(Number(String(o).replace(/\D/g, "")));
  if (ok(lock) || ok(hard) || ok(rinse) || ok(water)) out.push(html`<div class="vh">${t("Instellingen van de vaatwasser")}</div><div class="vs">${t("Wijzigt direct op het apparaat")}</div>
    ${ok(lock) ? html`<ul>${li("mdi:lock-outline", t("Kinderslot"), isOn(lock) ? t("Aan") : t("Uit"), { on: isOn(lock), onclick: () => call("switch", "toggle", lock.entity_id) })}</ul>` : nothing}
    ${pick(hard, t("Waterhardheid"), num2)}${pick(rinse, t("Glansspoelmiddel (afgifte)"), o => o === "off" ? t("Uit") : num2(o))}${pick(water, t("Wateraansluiting"), o => o === "coldwater" ? t("Koud") : o === "hotwater" ? t("Warm") : o)}`);
  return html`${out}`;
}
let CUR = null; // current {p, pop} while rendering, so wrap() can draw the header buttons
const wrap = (title, big, sub, body) => {
  const { p, pop } = CUR;
  const form = !!(pop.form && entityOf(pop));                // popups without an entity (presets) render their own form
  if (form) { body = cardForm(p, pop); title = html`<span>${t("Kaart instellen")}<span class="rm"> · ${title}</span></span>`; sub = t("Zo ziet de kaart eruit met deze instellingen"); }
  // .pw: the popup plus its ••• menu; a click anywhere in it (outside the menu) closes the menu
  const full = pop.type === "people";                        // fills the screen around its map
  return html`<div class=${full ? "pw full" : "pw"} @click=${() => { if (pop.menu) p.openPopup({ ...pop, menu: false }); }}><div class=${form ? "popup wide cardf" : full ? "popup full" : "popup"}><h2>${title} ${hbtns(p, pop)}</h2><div class="big">${big}</div><div class="sub">${sub}</div>${body}</div>${pop.menu && entityOf(pop) ? optionsMenu(p, pop) : nothing}</div>`;
};
/** a switch whose device also has a power sensor or an operation-state sensor can be shown as an appliance (bezig / klaar) */
const applianceCapable = (p, id) => { const dev = p.hass.entities?.[id]?.device_id; return !!dev && Object.values(p.hass.entities).some(e => e.device_id === dev && e.entity_id !== id && (p.hass.states[e.entity_id]?.attributes.device_class === "power" || p.hass.states[e.entity_id]?.attributes.unit_of_measurement === "W" || e.translation_key === "operation_state" || /_operation_state$|^sensor\..*_machine_state$/.test(e.entity_id))); };
const TICKER_KINDS = { home: { update: t("Tomte-updates"), energy: t("Energie"), waste: t("Afval"), agenda: t("Agenda"), notifications: t("Meldingen"), attention: t("Aandacht"), brain: "brAIn", doors: t("Open deuren"), weather: t("Weer"), modes: t("Modi"), appliances: t("Huishoudapparaten") }, room: { lights: t("Lampen"), doors: t("Open deuren/ramen"), media: t("Media"), battery: t("Batterij laag"), appliances: t("Huishoudapparaten") } };
/** sensible wizard defaults: what the panel already detected */
function wizardDefaults(p) {
  const h = p.config.home || {};
  return { language: p.config.language, title: p.userConfig?.title, rooms: p.rooms.map(r => r.id), roomImage: p.userConfig?.roomImage, homeImage: p.userConfig?.homeImage,
    home: { weather: p.home?.weather?.entity_id, climate: p.home?.climate?.entity_id, alarm: p.home?.alarm?.entity_id, energy: { power: h.energy?.power, today: h.energy?.today } } };
}
function cardForm(p, pop) {
  const id = entityOf(pop), cur = (p.config.cards || {})[id] || {}, draft = pop.draft || { ...cur };
  const upd = patch => p.openPopup({ ...pop, draft: { ...draft, ...patch } });
  const dom = id.split(".")[0], defs = (p.config.cardDefaults || {})[cardType(p, id)] || {}, st = p.hass.states[id];
  const appliance = pop.type === "appliance", canToggle = ["light", "switch", "input_boolean", "fan", "lock"].includes(dom) || (appliance && !!pop.a.switch);
  const hasPress = ["light", "switch", "fan", "binary_sensor", "lock", "cover", "climate", "media_player"].includes(dom) || appliance;
  const hasTpl = ["light", "switch", "fan", "binary_sensor", "lock"].includes(dom) || appliance;
  const builtin = isBuiltin(id), inst = id.startsWith("tpl:"), once = id.startsWith("tpl:once:"), tc = once ? cur.once : inst ? templateOf(p, id) : null;   // a panel card / a template instance: settings only
  const askList = once ? ["state", "label", "visible"] : (tc?.ask || []);                                   // a one-time template edits all its texts here
  // a group or graph: its definition is edited right here (pop.gd) and saved with the card settings
  const grp = id.startsWith("group:") ? (p.config.groups || []).find(g => g.id === id.slice(6)) : null, grf = id.startsWith("graph:") ? (p.config.graphs || []).find(g => g.id === id.slice(6)) : null;
  const gd = pop.gd || (grp ? { ...grp } : grf ? { ...grf } : null), gupd = patch => p.openPopup({ ...pop, gd: { ...gd, ...patch } });
  const saveMade = async () => { if (gd) await p.saveUser({ [grp ? "groups" : "graphs"]: (p.wl?.[grp ? "groups" : "graphs"] || p.config[grp ? "groups" : "graphs"] || []).map(x => x.id === gd.id ? gd : x) }); };
  // live preview: the real card, rendered with the draft (cardCfg reads p._preview while it renders)
  const pageKey = p.room?.id || "home";
  let preview = null;
  p._preview = { id, draft };
  try { preview = (p.pageCards(pageKey).find(c => c.key === id) || p.rooms.flatMap(r => p.roomCards(r)).find(c => c.key === id))?.tpl || null; } catch (e) { preview = null; } finally { p._preview = null; }
  const changed = Object.keys(draft).filter(k => draft[k] !== undefined && k !== "noAppliance").length;
  const sh = (lbl, cnt) => html`<div class="sh">${lbl}${cnt ? html`<span class="cnt">${cnt}</span>` : nothing}</div>`;
  const row = (lbl, ctrl, sub) => html`<div class="f"><span>${lbl}${sub ? html`<small>${sub}</small>` : nothing}</span>${ctrl}</div>`;
  /** pill choice; `def` is what applies when nothing is chosen (built in, or Card defaults) and picking it stores nothing */
  const seg = (key, opts, def) => html`<div class="seg">${opts.map(o => html`<button class=${(draft[key] ?? def) === o.v ? "on" : ""} @click=${() => upd({ [key]: o.v === def ? undefined : o.v })}>${o.icon ? html`<ha-icon icon=${o.icon}></ha-icon>` : nothing}${o.l}${o.v === def ? html`<sup>${t("std")}</sup>` : nothing}</button>`)}</div>`;
  const opt = (key, lbl, sub) => row(lbl, html`<input type="checkbox" .checked=${!draft[key]} @change=${e => upd({ [key]: e.target.checked ? undefined : true })}>`, sub);
  const inp = (key, ph) => html`<input type="text" .value=${draft[key] || ""} placeholder=${ph} @change=${e => upd({ [key]: e.target.value || undefined })}>`;
  const PRESS = { toggle: t("schakelen"), popup: t("details openen"), more: t("Home Assistant-dialoog"), none: t("niets") };
  const tapDef = defs.tap || (canToggle ? "toggle" : "popup"), holdDef = defs.hold || "popup";
  const caps = dom === "light" ? lightCaps(st) : null;
  // bottom line: "" is the automatic choice where the card has one (climate, plug); lights fall back to steps when dimmable
  const bottomOpts = dom === "light" ? [{ v: "none", l: t("niets") }, ...(caps.dim ? [{ v: "steps", l: t("helderheid-stappen") }] : []), ...(caps.rgb || caps.ct ? [{ v: "colors", l: t("kleuren") }] : []), { v: "today", l: t("vandaag aan (uren)") }]
    : dom === "binary_sensor" ? [{ v: "", l: t("niets") }, { v: "today", l: t("vandaag (uren)") }, { v: "graph", l: t("grafiek (aan/uit-lijn)") }]
    : dom === "climate" ? [{ v: "", l: t("automatisch (vocht of preset)") }, { v: "heating", l: t("vandaag verwarmd") }, { v: "outside", l: t("buitentemperatuur") }, { v: "none", l: t("niets") }]
    : appliance && pop.a.power && !pop.a.op ? [{ v: "", l: t("vermogenslijn") }, { v: "timer", l: t("timer (15 / 30 / 60 min)") }, { v: "cost", l: t("kosten") }, { v: "bars", l: t("verbruik per uur") }, { v: "none", l: t("niets") }] : null;
  const bottomDef = dom === "light" ? (defs.bottom || (caps.dim ? "steps" : "none")) : (defs.bottom || "");
  const bottom = draft.bottom ?? bottomDef;
  // action buttons: one row each, the row being edited (pop.act) opens
  const acts = draft.actions || [], setActs = list => upd({ actions: list.length ? list : undefined });
  const setA = (i, patch) => setActs(acts.map((a, k) => k === i ? { ...a, ...patch } : a));
  const services = Object.entries(p.hass.services || {}).flatMap(([d, s]) => Object.keys(s).map(k => `${d}.${k}`)).sort();
  const jsonOk = s => { if (!s) return true; try { JSON.parse(s); return true; } catch { return false; } };
  const tplCount = ["tplState", "tplSub", "tplFoot", "tplVisible", "visEntity"].filter(k => draft[k]).length, visMode = pop.visMode || (draft.tplVisible ? "tpl" : "simple");
  const battery = batteryOf(p, pop.e || { id, reg: p.hass.entities?.[id] });
  return html`<div class="fwrap">
    <div class="pv">
      <div class="ey">${t("Voorbeeld")}<span>${t("live")}</span></div>
      <div class="pvc">${preview || html`<div class="sub">${t("Geen voorbeeld voor deze kaart")}</div>`}</div>
      ${hasPress ? html`<div class="tip">${t("Tikken")}: <b>${PRESS[draft.tap || tapDef]}</b> · ${t("Vasthouden")}: <b>${PRESS[draft.hold || holdDef]}</b></div>` : nothing}
      <div class="prow"><span>${t("Afwijkend van Kaartstandaarden")}</span><b>${changed}</b></div>
    </div>
    <div class="form">
      <div class="grp">${sh(t("Weergave"))}
        ${builtin && !gd ? row(t("Kaart van het paneel"), html`<span class="note">${t("Naam en inhoud volgen de instellingen van het paneel; hieronder kun je de kaart op voorwaarde verbergen.")}</span>`) : nothing}
        ${grp ? html`${row(t("Naam"), html`<div class="two"><input type="text" .value=${gd.name || ""} @change=${e => gupd({ name: e.target.value || undefined })}><input type="text" .value=${gd.icon || ""} placeholder="mdi:shape-outline" @change=${e => gupd({ icon: e.target.value || undefined })}></div>`)}
          ${row(t("Stijl"), html`<div class="seg">${[["tiles", t("tegels (tikken schakelt)")], ["list", t("lijst")]].map(([v, l]) => html`<button class=${(gd.style || "tiles") === v ? "on" : ""} @click=${() => gupd({ style: v })}>${l}</button>`)}</div>`)}
          ${row(t("Onderdelen"), html`<div class="chips">${groupCandidates(p).map(c => html`<button class=${(gd.members || []).includes(c.id) ? "on" : ""} @click=${() => gupd({ members: (gd.members || []).includes(c.id) ? gd.members.filter(x => x !== c.id) : [...(gd.members || []), c.id] })}>${c.name}</button>`)}</div>`, t("{n} gekozen", { n: (gd.members || []).length }))}` : nothing}
        ${grf ? html`${row(t("Sensor"), html`<input type="text" list="hcn-numeric" .value=${gd.entity || ""} placeholder="sensor.x" @change=${e => gupd({ entity: e.target.value || undefined })}><datalist id="hcn-numeric">${graphCandidates(p).map(x => html`<option value=${x}></option>`)}</datalist>`)}
          ${row(t("Naam"), html`<input type="text" .value=${gd.name || ""} placeholder=${p.hass.states[gd.entity]?.attributes.friendly_name || ""} @change=${e => gupd({ name: e.target.value || undefined })}>`, t("leeg = naam van de sensor"))}
          ${row(t("Periode"), html`<div class="seg">${GRAPH_HOURS.map(n => html`<button class=${(+gd.hours || 24) === n ? "on" : ""} @click=${() => gupd({ hours: n })}>${hoursLabel(n)}</button>`)}</div>`)}` : nothing}
        ${!builtin ? row(t("Naam"), html`<div class="two">${inp("name", inst ? (tc?.name || "") : st?.attributes.friendly_name || (id.startsWith("device:") ? deviceName(p.hass, id.slice(7)) : ""))}${inp("icon", inst ? (tc?.icon || "mdi:code-braces") : "mdi:lightbulb-outline")}</div>`, inst ? t("leeg = zoals in de template") : t("leeg = naam en icoon uit Home Assistant")) : nothing}
        ${inst ? html`${row(t("Entiteit"), html`<input type="text" list="hcn-entities" .value=${draft.fields?.entity || ""} placeholder="sensor.x" @change=${e => upd({ fields: { ...(draft.fields || {}), entity: e.target.value || undefined } })}>`, t("voor $entity in de templates, details (vasthouden) en schakelen"))}
          ${TPL_ASK.filter(([k]) => askList.includes(k)).map(([k, l]) => row(t(l), html`<input type="text" .value=${draft.fields?.[k] || ""} placeholder=${tc?.[k] || ""} @change=${e => upd({ fields: { ...(draft.fields || {}), [k]: e.target.value || undefined } })}>`, once ? t("Jinja, live gerenderd") : t("door de template gevraagd")))}` : nothing}
        ${dom === "binary_sensor" ? row(t("Soort"), seg("kind", [{ v: "door", l: t("Deur"), icon: "mdi:door" }, { v: "window", l: t("Raam"), icon: "mdi:window-closed-variant" }, { v: "motion", l: t("Beweging"), icon: "mdi:motion-sensor" }, { v: "binary", l: t("Algemeen"), icon: "mdi:checkbox-blank-circle-outline" }], pop.kind || "binary"), t("bepaalt icoon en teksten; zichtbaar na opslaan")) : nothing}
        ${builtin || inst ? nothing : row(t("Tonen"), html`<div class="chips">${[["hideName", t("Naam")], ["hideSub", t("Ondertitel")], ["hideState", t("Staat in de hoek")]].map(([k, l]) => html`<button class=${!draft[k] ? "on" : ""} @click=${() => upd({ [k]: draft[k] ? undefined : true })}>${l}</button>`)}${battery ? html`<button class=${draft.showBattery ? "on" : ""} @click=${() => upd({ showBattery: draft.showBattery ? undefined : true })}>${t("Batterij")}</button>` : nothing}</div>`)}
        ${bottomOpts ? row(t("Onderaan"), seg("bottom", bottomOpts, bottomDef), dom === "climate" ? t("naast de doeltemperatuur; op telefoons alleen dit") : t("wat de kaart onderaan toont")) : nothing}
        ${(dom === "light" || dom === "binary_sensor") && bottom === "today" ? row(t("Weergave"), seg("todayStyle", [{ v: "", l: t("balkjes per uur") }, { v: "text", l: t("tekst") }], "")) : nothing}
        ${dom === "light" && bottom === "colors" && caps.rgb ? row(t("Kleuren"), html`<input type="text" .value=${(draft.colors || []).join(", ")} placeholder="#ffb46e, #f27a5c, #7fb6ff, #9fcf8a" @change=${e => { const l = e.target.value.split(",").map(x => x.trim()).filter(x => /^#[0-9a-f]{6}$/i.test(x)); upd({ colors: l.length ? l : undefined }); }}>`, t("hex-kleuren, gescheiden door komma's")) : nothing}
        ${dom === "light" ? opt("noColor", t("Kleur tonen"), t("kaart kleurt mee met de lamp")) : nothing}
        ${dom === "media_player" ? opt("noArt", t("Albumhoes tonen"), t("als achtergrond tijdens afspelen")) : nothing}
        ${dom === "media_player" ? row(t("Gekoppelde speler"), select(p.hass, "media_player", draft.link, v => upd({ link: v || undefined }), { empty: t("automatisch"), filter: s => s.entity_id !== id }), t("titel en hoes van deze speler, bijv. de Chromecast van dezelfde tv")) : nothing}
        ${dom === "media_player" ? opt("noIdleArt", t("Achtergrond bij stilstand"), t("de animatie uit Panel instellingen")) : nothing}
        ${dom === "climate" ? opt("noMode", t("Modus-knoppen"), t("uit / verwarmen / auto op de kaart")) : nothing}
        ${dom === "camera" ? row(t("Live beeld"), html`<input type="checkbox" .checked=${!!draft.live} @change=${e => upd({ live: e.target.checked || undefined })}>`, t("stream op de kaart i.p.v. een foto elke 10 s")) : nothing}
        ${dom === "switch" ? row(t("Vermogenssensor"), select(p.hass, "sensor", draft.power, v => upd({ power: v || undefined }), { empty: t("automatisch (zelfde apparaat)"), filter: s => s.attributes.unit_of_measurement === "W" }), t("maakt er een stekkerkaart van (watt, verbruik, timer)")) : nothing}
        ${dom === "switch" && (applianceCapable(p, id) || draft.power) ? row(t("Apparaatfuncties"), html`<input type="checkbox" .checked=${!cur.noAppliance} @change=${e => p.setApplianceMode(id, e.target.checked)}>`, t("bezig / klaar op basis van het vermogen")) : nothing}
        ${appliance ? row(t("Apparaatfuncties"), html`<input type="checkbox" .checked=${!pop.a.plain} @change=${e => p.setApplianceMode(pop.a.key, e.target.checked)}>`, pop.a.op ? t("bezig / klaar volgens het apparaat zelf") : t("bezig / klaar op basis van het vermogen")) : nothing}
        ${appliance && pop.a.power ? row(t("Drempel (W)"), html`<input type="number" .value=${String(draft.threshold ?? 5)} @change=${e => upd({ threshold: e.target.value === "" || +e.target.value === 5 ? undefined : +e.target.value })}>`, t("boven = bezig")) : nothing}
      </div>
      ${hasPress ? html`<div class="grp">${sh(t("Gedrag"))}
        ${row(t("Tikken"), seg("tap", [...(canToggle ? [{ v: "toggle", l: t("schakelen") }] : []), { v: "popup", l: t("details openen") }, { v: "more", l: t("Home Assistant-dialoog") }, { v: "none", l: t("niets") }], tapDef))}
        ${row(t("Vasthouden"), seg("hold", [{ v: "popup", l: t("details openen") }, { v: "more", l: t("Home Assistant-dialoog") }, { v: "none", l: t("niets") }], holdDef))}
      </div>
      <div class="grp">${sh(t("Actieknoppen"), t("{n} van 3", { n: acts.length }))}
        ${acts.map((a, i) => pop.act === i ? html`<div class="act open"><div class="ed">
            <label>${t("Label")}<input type="text" .value=${a.label || ""} placeholder=${t("label")} @change=${e => setA(i, { label: e.target.value || undefined })}></label>
            <label>${t("Icoon")}<input type="text" .value=${a.icon || ""} placeholder="mdi:…" @change=${e => setA(i, { icon: e.target.value || undefined })}></label>
            <label class="full">${t("Actie")}<input type="text" list="hcn-services" .value=${a.service || ""} placeholder="light.turn_on" @change=${e => setA(i, { service: e.target.value || undefined })}></label>
            <label class="full">${t("Gegevens (JSON)")}<i class=${jsonOk(a.data) ? "" : "bad"}>${a.data ? (jsonOk(a.data) ? t("geldig") : t("ongeldig")) : t("entity_id = deze kaart als je niets invult")}</i><input type="text" .value=${a.data || ""} placeholder='{"brightness_pct": 50}' @change=${e => setA(i, { data: e.target.value || undefined })}></label>
            <div class="modes n2 full"><button class="on" @click=${() => p.openPopup({ ...pop, act: null })}>${t("Klaar")}</button><button @click=${() => p.openPopup({ ...pop, act: null, draft: { ...draft, actions: acts.filter((_, k) => k !== i).length ? acts.filter((_, k) => k !== i) : undefined } })}>${t("Verwijderen")}</button></div>
          </div></div>`
        : html`<div class="act"><span class="bx">${a.icon ? html`<ha-icon icon=${a.icon}></ha-icon>` : nothing}</span><div>${a.label || t("label")}<small>${a.service || "…"}${a.data ? ` · ${a.data}` : ""}</small></div><span class="ab"><button title=${t("Bewerken")} @click=${() => p.openPopup({ ...pop, act: i })}><ha-icon icon="mdi:pencil-outline"></ha-icon></button><button title=${t("Verwijderen")} @click=${() => setActs(acts.filter((_, k) => k !== i))}><ha-icon icon="mdi:trash-can-outline"></ha-icon></button></span></div>`)}
        ${acts.length < 3 ? html`<button class="addbtn" @click=${() => p.openPopup({ ...pop, draft: { ...draft, actions: [...acts, {}] }, act: acts.length })}>+ ${t("Actie toevoegen")}</button>` : nothing}
        <datalist id="hcn-services">${services.map(s => html`<option value=${s}></option>`)}</datalist>
      </div>` : nothing}
      <div class="grp">${sh(t("Geavanceerd"))}
        <div class=${pop.adv ? "coll open" : "coll"} @click=${() => p.openPopup({ ...pop, adv: !pop.adv })}><ha-icon icon="mdi:code-braces"></ha-icon><div>${t("Templates (Jinja)")}<small>${hasTpl ? t("staat · ondertitel · onderaan · zichtbaar") : t("zichtbaar")} — ${tplCount ? t("{n} ingesteld", { n: tplCount }) : t("niets ingesteld")}</small></div><ha-icon class="chev" icon="mdi:chevron-down"></ha-icon></div>
        ${pop.adv ? html`
          ${hasTpl ? row(t("Staat (template)"), inp("tplState", "{{ states('sensor.x') }} W"), t("tekst in de hoek")) : nothing}
          ${hasTpl ? row(t("Ondertitel (template)"), inp("tplSub", "{{ relative_time(states.light.x.last_changed) }}")) : nothing}
          ${hasTpl ? row(t("Onderaan (template)"), inp("tplFoot", ""), t("vervangt de keuze hierboven")) : nothing}
          <div class="sh" style="margin-top:14px">${t("Zichtbaar")}</div>
          ${row(t("Voorwaarde"), html`<div class="seg">${[["simple", t("Eenvoudig")], ["tpl", t("Template")]].map(([v, l]) => html`<button class=${visMode === v ? "on" : ""} @click=${() => p.openPopup({ ...pop, visMode: v, draft: { ...draft, ...(v === "simple" ? { tplVisible: undefined } : { visEntity: undefined, visOp: undefined, visValue: undefined }) } })}>${l}</button>`)}</div>`, t("een verborgen kaart vind je terug in de bewerkmodus"))}
          ${visMode === "simple" ? html`
            ${row(t("Entiteit"), html`<input type="text" list="hcn-entities" .value=${draft.visEntity || ""} placeholder="sensor.x" @change=${e => upd({ visEntity: e.target.value || undefined })}>`)}
            ${row(t("Vergelijking"), html`<div class="seg">${[["", t("is")], ["ne", t("is niet")], ["gt", t("groter dan")], ["lt", t("kleiner dan")]].map(([v, l]) => html`<button class=${(draft.visOp || "") === v ? "on" : ""} @click=${() => upd({ visOp: v || undefined })}>${l}</button>`)}</div>`)}
            ${row(t("Waarde"), html`<input type="text" .value=${draft.visValue ?? ""} placeholder="on" @change=${e => upd({ visValue: e.target.value === "" ? undefined : e.target.value })}>`, t("de staat van de entiteit, bv. on, off, 21.5"))}`
          : row(t("Template"), inp("tplVisible", "{{ states('sensor.x') | int < 30 }}"), t("Jinja; onwaar is false, 0, no, off, none of leeg, alles anders is waar"))}
          ${row(t("Tonen als"), html`<div class="seg two">${[[false, t("waar")], [true, t("onwaar")]].map(([v, l]) => html`<button class=${!!draft.tplVisibleInvert === v ? "on" : ""} @click=${() => upd({ tplVisibleInvert: v || undefined })}>${l}</button>`)}</div>`, t("de kaart staat er als de voorwaarde dit oplevert"))}` : nothing}
        <datalist id="hcn-entities">${Object.keys(p.hass.states).map(x => html`<option value=${x}></option>`)}</datalist>
      </div>
    </div>
  </div>
  <div class="foot"><div class="modes n2">
    <button class="on" @click=${async () => { const a = acts.filter(x => x && x.label && x.service); await saveMade(); p.saveCardSettings(id, { ...draft, actions: a.length ? a : undefined }); }}>${t("Opslaan")}</button>
    <button @click=${() => p.saveCardSettings(id, null)}>${t("Herstel")}</button>
  </div></div>`;
}

export function renderPopup(p, pop) {
  CUR = { p, pop };
  const hass = p.hass, home = p.home, roomName = p.room?.name || t("Thuis");
  switch (pop.type) {
    case "light": {
      const s = hass.states[pop.e.id] || pop.e.state, on = isOn(s), un = unavailable(s);
      const pct = on ? Math.round((s.attributes.brightness || 255) / 2.55) : 0;
      const kelvin = s.attributes.color_temp_kelvin, kmin = s.attributes.min_color_temp_kelvin || 2000, kmax = s.attributes.max_color_temp_kelvin || 6500;
      const modesList = s.attributes.supported_color_modes || [];
      const dim = modesList.some(m => m !== "onoff"), ct = modesList.includes("color_temp"), color = modesList.some(m => ["hs", "rgb", "xy", "rgbw", "rgbww"].includes(m));
      const set = data => p.call("light", "turn_on", { entity_id: pop.e.id, ...data });
      const hs = s.attributes.hs_color || [0, 0], inColor = ["hs", "rgb", "xy", "rgbw", "rgbww"].includes(s.attributes.color_mode);
      const SW = [[t("Rood"), 0], [t("Oranje"), 30], [t("Geel"), 55], [t("Groen"), 120], [t("Blauw"), 225], [t("Paars"), 280], [t("Roze"), 330]];
      return wrap(roomName, label(p, pop.e), un ? t("Onbereikbaar") : on ? (dim ? `${t("Aan")} · ${pct}%` : t("Aan")) : t("Uit"), html`
        ${modes([{ label: on ? t("Uitschakelen") : t("Inschakelen"), on, go: () => p.call("light", "toggle", { entity_id: pop.e.id }) }], "n2")}
        ${dim ? range(t("Helderheid"), pct, v => set({ brightness_pct: v })) : nothing}
        ${color ? html`<div class="prow"><span>${t("Kleur")}</span><b>${inColor ? `${Math.round(hs[0])}°` : "–"}</b><input type="range" class="hue" min="0" max="360" .value=${String(Math.round(hs[0]))} @change=${e => set({ hs_color: [+e.target.value, Math.max(hs[1] || 0, 60)] })}></div>
          <div class="swatches">${SW.map(([n, h]) => html`<button title=${n} class=${inColor && Math.abs(hs[0] - h) < 12 ? "on" : ""} style="background:hsl(${h} 90% 55%)" @click=${() => set({ hs_color: [h, 100] })}></button>`)}<button title=${t("Wit")} class=${!inColor ? "on" : ""} style="background:#fff" @click=${() => ct ? set({ color_temp_kelvin: 4000 }) : set({ hs_color: [0, 0] })}></button></div>
          ${range(t("Verzadiging"), Math.round(hs[1] || 0), v => set({ hs_color: [hs[0], v] }))}` : nothing}
        ${ct ? html`<div class="prow"><span>${t("Kleurtemperatuur")}</span><b>${kelvin ? kelvin + " K" : "–"}</b><input type="range" class="ct" min=${kmin} max=${kmax} .value=${String(kelvin || kmin)} @change=${e => set({ color_temp_kelvin: +e.target.value })}></div>` : nothing}
        ${ct ? modes([{ label: t("Warm"), on: !inColor && kelvin && kelvin < 3200, go: () => set({ color_temp_kelvin: Math.max(kmin, 2700) }) }, { label: t("Neutraal"), on: !inColor && kelvin >= 3200 && kelvin < 4800, go: () => set({ color_temp_kelvin: 4000 }) }, { label: t("Koel"), on: !inColor && kelvin >= 4800, go: () => set({ color_temp_kelvin: Math.min(kmax, 5500) }) }], "n3") : nothing}
        <ul>${li("mdi:history", on ? t("Aan sinds") : t("Uit sinds"), relTime(s.last_changed))}${s.attributes.brightness ? li("mdi:brightness-6", t("Helderheid"), `${pct}%`) : nothing}</ul>`);
    }
    case "strip": {
      const st = pop.st, K = litterBox(p, st);
      if (K) return wrap(roomName, (p.config.cards || {})[st.id]?.name || K.title, K.status, html`
        ${(acts => acts.length ? modes(acts, "n" + acts.length) : nothing)([["clean", t("Reinigen")], ["empty", t("Legen")]].filter(([r]) => K.items.some(x => x.r === r)).map(([r, lb]) => ({ label: lb, go: () => K.items.filter(x => x.r === r).forEach(x => p.call("switch", "turn_on", { entity_id: x.s.id })) })))}
        <ul>${K.wz && !unavailable(K.wz) && K.kg != null ? li("mdi:scale", t("Gewicht"), `${Math.round(K.kg * 10) / 10} kg`) : nothing}${K.fz && !unavailable(K.fz) ? li("mdi:trash-can-outline", t("Afvalbak"), K.full ? t("Vol") : t("Niet vol"), { on: K.full }) : nothing}${K.lz && !unavailable(K.lz) ? li("mdi:timer-sand", t("Levensduur"), K.lz.state) : nothing}${K.items.map(x => { const d = x.s.state; return li(x.icon, x.name, isOn(d) ? t("Aan") : unavailable(d) ? t("Onbereikbaar") : t("Uit"), { on: isOn(d), sub: relTime(d?.last_changed), onclick: () => p.call("switch", "toggle", { entity_id: x.s.id }) }); })}</ul>`);
      return wrap(roomName, (p.config.cards || {})[st.id]?.name || (hass.devices?.[st.device]?.name_by_user || hass.devices?.[st.device]?.name || t("Stekkerdoos")), t("{n} van {m} aan", { n: st.switches.filter(e => isOn(hass.states[e.id])).length, m: st.switches.length }), html`
        ${modes([{ label: t("Alles aan"), go: () => p.call("switch", "turn_on", { entity_id: st.switches.map(e => e.id) }) }, { label: t("Alles uit"), go: () => p.call("switch", "turn_off", { entity_id: st.switches.map(e => e.id) }) }], "n2")}
        <ul>${st.switches.map(e => { const s = hass.states[e.id]; return li((p.config.cards || {})[e.id]?.icon || "mdi:power-socket-eu", label(p, e), isOn(s) ? t("Aan") : unavailable(s) ? t("Onbereikbaar") : t("Uit"), { on: isOn(s), sub: s?.attributes?.current_power_w ? `${s.attributes.current_power_w} W` : relTime(s?.last_changed), onclick: () => p.call("switch", "toggle", { entity_id: e.id }) }); })}</ul>`);
    }
    case "switch": {
      const s = hass.states[pop.e.id], on = isOn(s), d = pop.e.id.split(".")[0];
      return wrap(roomName, label(p, pop.e), on ? t("Aan") : t("Uit"), html`
        ${modes([{ label: on ? t("Uitschakelen") : t("Inschakelen"), on, go: () => p.call(d === "input_boolean" ? "input_boolean" : d === "fan" ? "fan" : "switch", "toggle", { entity_id: pop.e.id }) }], "n2")}
        <ul>${li("mdi:history", on ? t("Aan sinds") : t("Uit sinds"), relTime(s.last_changed))}${s.attributes.current_power_w ? li("mdi:flash-outline", t("Verbruik"), `${s.attributes.current_power_w} W`) : nothing}</ul>`);
    }
    case "fan": {
      const s = hass.states[pop.e.id], on = isOn(s), pct = num(s.attributes.percentage), presets = s.attributes.preset_modes || [];
      const call = (svc, data = {}) => p.call("fan", svc, { entity_id: pop.e.id, ...data });
      return wrap(roomName, label(p, pop.e), on ? `${t("Aan")}${pct != null ? " · " + pct + "%" : ""}` : t("Uit"), html`
        ${modes([{ label: on ? t("Uitschakelen") : t("Inschakelen"), on, go: () => call("toggle") }], "n2")}
        ${pct != null ? range(t("Snelheid"), pct, v => call("set_percentage", { percentage: v })) : nothing}
        ${presets.length ? modes(presets.slice(0, 4).map(m => ({ label: m, on: s.attributes.preset_mode === m, go: () => call("set_preset_mode", { preset_mode: m }) })), presets.length < 4 ? "n" + presets.length : "") : nothing}
        <ul>${li("mdi:history", on ? t("Aan sinds") : t("Uit sinds"), relTime(s.last_changed))}${s.attributes.oscillating != null ? li("mdi:arrow-oscillating", t("Oscilleren"), s.attributes.oscillating ? t("Aan") : t("Uit"), { on: s.attributes.oscillating, onclick: () => call("oscillate", { oscillating: !s.attributes.oscillating }) }) : nothing}</ul>`);
    }
    case "lock": {
      const s = hass.states[pop.e.id], locked = s.state === "locked";
      const call = svc => p.call("lock", svc, { entity_id: pop.e.id });
      return wrap(roomName, label(p, pop.e), locked ? t("Vergrendeld") : s.state === "unlocked" ? t("Ontgrendeld") : s.state, html`
        ${modes([{ label: t("Vergrendelen"), on: locked, go: () => call("lock") }, { label: t("Ontgrendelen"), on: s.state === "unlocked", go: () => call("unlock") }], "n2")}
        <ul>${li("mdi:history", t("Laatst gewijzigd"), relTime(s.last_changed))}${s.attributes.changed_by ? li("mdi:account-outline", t("Door"), s.attributes.changed_by) : nothing}</ul>`);
    }
    case "vacuum": {
      const s = hass.states[pop.e.id], x = siblings(hass, pop.e.id), call = (svc, extra = {}) => p.call("vacuum", svc, { entity_id: pop.e.id, ...extra });
      const batt = num(s.attributes.battery_level) ?? num(x.s("battery")?.state), cleaning = s.state === "cleaning", busy = BUSY.includes(s.state), docked = ["docked", "idle"].includes(s.state), err = s.state === "error";
      const area = num(x.s("cleaning_area")?.state), mins = num(x.s("cleaning_time")?.state), task = vacTask(x), room = task && task.on ? task.lbl : x.s("active_cleaning_target")?.state;
      // rooms: from the vacuum entity, else from the options of the robot's "clean room" select ("Name (ID: 3)")
      const fromAttr = (s.attributes.rooms || s.attributes.segments || []).filter(z => z && z.id != null);
      const rooms = fromAttr.length ? fromAttr : (x.sel("clean_room")?.attributes?.options || []).map(v => /^(.*) \(ID: (\d+)\)$/.exec(v)).filter(Boolean).map(m => ({ id: +m[2], name: m[1] }));
      const activeIds = (s.attributes.active_room_ids || []).map(String), cam = x.cam(), parts = maintenance(x);
      const scene = x.sel("scene_task"), scenes = scene && !unavailable(scene) ? (scene.attributes.options || []).filter(v => v !== "None") : [];
      const pick = (z, v) => p.call("select", "select_option", { entity_id: z.entity_id, option: v });
      const ok = z => z && !unavailable(z), gMode = x.sel("cleaning_mode"), gFan = x.sel("suction_level"), gWater = x.sel("water_level"), gInt = x.sel("cleaning_intensity");
      // the choices made in this popup stay local (pop.vc); they only reach the robot with a room button
      const vc = { mode: ok(gMode) ? gMode.state : null, fan: ok(gFan) ? gFan.state : null, water: ok(gWater) ? gWater.state : null, int: ok(gInt) ? gInt.state : null, ...(pop.vc || {}) };
      if (ok(gMode) && vc.mode && !(gMode.attributes.options || []).includes(vc.mode)) vc.mode = gMode.state;   // a mode this robot no longer offers
      const setVc = (k, v) => p.openPopup({ ...pop, vc: { ...vc, [k]: v } });
      const ncls = n => n === 2 ? "n2" : n === 3 ? "n3" : "";
      const choice = (k, z, lb) => {
        if (!ok(z)) return nothing;
        const op = z.attributes.options || [];
        return html`<div class="vs">${lb}</div>${modes(op.map(v => ({ label: VAC_LABELS[v] || v, on: vc[k] === v, go: () => setVc(k, v) })), ncls(op.length))}`;
      };
      const sweeps = vc.mode !== "Mop", mops = !!vc.mode && vc.mode !== "Vacuum";
      const clean = ids => call("send_command", { command: "room_clean", params: { rooms: ids.map(id => {
        const z = { id: Number(id) };
        if (vc.mode) z.clean_mode = vc.mode; if (sweeps && vc.fan) z.fan_speed = vc.fan; if (mops && vc.water) z.water_level = vc.water; if (vc.int) z.clean_intensity = vc.int;
        return z;
      }) } });
      const toggle = (k, ic, lb) => { const z = x.sw(k); return ok(z) ? li(ic, lb, z.state === "on" ? t("Aan") : t("Uit"), { on: z.state === "on", onclick: () => p.call("switch", "toggle", { entity_id: z.entity_id }) }) : nothing; };
      const press = (k, ic, lb) => { const z = x.b(k); return ok(z) ? li(ic, lb, "", { onclick: () => p.call("button", "press", { entity_id: z.entity_id }) }) : nothing; };
      const sel = (z, ic, lb) => ok(z) ? li(ic, lb, VAC_LABELS[z.state] || z.state, { onclick: () => p.moreInfo(z.entity_id) }) : nothing;
      const em = x.s("error_message")?.state;
      const sub = err && em ? em : busy ? [room && room !== "None" ? room : "", area != null ? area + " m²" : "", mins != null ? Math.round(mins) + " min" : ""].filter(Boolean).join(" · ") : batt != null ? t("Batterij {n}%", { n: batt }) : "";
      return wrap(roomName, label(p, pop.e), vacStatus(s) + (sub ? " · " + sub : ""), html`
        ${modes([{ label: cleaning ? t("Pauze") : t("Start"), on: cleaning, go: () => call(cleaning ? "pause" : "start") }, { label: t("Stop"), go: () => call("stop") }, { label: t("Dock"), go: () => call("return_to_base") }, { label: t("Zoek"), go: () => call("locate") }])}
        ${task ? html`<div class="vh">${task.on ? t("Huidige taak") : t("Laatste taak")}</div><ul>${li(task.a.kind === "scene" ? "mdi:play-circle-outline" : "mdi:floor-plan", task.lbl, "", { on: task.on, sub: task.md || (task.a.params_from === "robot" ? t("instellingen uit de app") : ""), onclick: () => p.moreInfo(task.z.entity_id) })}${li("mdi:account-arrow-right-outline", t("Gestart via"), task.src || "–", { sub: task.a.started ? relTime(task.a.started) : "" })}</ul>` : nothing}
        ${rooms.length ? html`<div class="vh">${t("Schoonmaken")}</div>
        ${choice("mode", gMode, t("Modus"))}${sweeps ? choice("fan", gFan, t("Zuigkracht")) : nothing}${mops ? choice("water", gWater, t("Water")) : nothing}${choice("int", gInt, t("Intensiteit"))}
        <div class="vs">${t("Waar")}</div>${modes([...rooms.map(z => ({ label: z.name || t("Kamer {n}", { n: z.id }), on: busy && activeIds.includes(String(z.id)), go: () => clean([z.id]) })), { label: t("Hele huis"), on: busy && rooms.length > 1 && rooms.every(z => activeIds.includes(String(z.id))), go: () => clean(rooms.map(z => z.id)) }], ncls(rooms.length + 1))}` : nothing}
        ${scenes.length ? html`<div class="vh">${t("Taken uit de app")}</div><div class="vs">${t("Gebruiken hun eigen instellingen uit de Eufy-app")}</div>${modes(scenes.map(v => ({ label: v.replace(/\s*\(ID:.*\)$/, ""), go: () => pick(scene, v) })), ncls(scenes.length))}` : nothing}
        ${cam && cam.attributes.entity_picture ? html`<div class="mart vmap" style=${`background-image:url("${cam.attributes.entity_picture}")`} @click=${() => p.moreInfo(cam.entity_id)}></div>` : nothing}
        ${docked ? html`<div class="vh">${t("Dock")}</div><ul>${press("empty_dust_bin", "mdi:delete-empty", t("Stofbak legen"))}${press("wash_mop", "mdi:water-sync", t("Dweil wassen"))}${press("dry_mop", "mdi:hair-dryer", t("Dweil drogen"))}${ok(x.s("dock_status")) ? li("mdi:home-variant-outline", t("Dock status"), x.s("dock_status").state) : nothing}</ul>` : nothing}
        ${parts.length ? html`<div class="vh">${t("Onderhoud")}</div><ul>${parts.map(m => li(m.ic, m.lb, m.v != null ? Math.round(m.v) + " u" : "–", { sub: m.v != null && m.v <= 0 ? t("Over tijd · tik om te resetten") : m.v != null && m.v < 10 ? t("Bijna op · tik om te resetten") : "", on: m.v != null && m.v <= 0, onclick: m.btn ? () => { if (confirm(t("{x} resetten na vervangen of schoonmaken?", { x: m.lb }))) p.call("button", "press", { entity_id: m.btn.entity_id }); } : null }))}</ul>` : nothing}
        <div class="vh">${t("Laatste schoonmaak en totaal")}</div>
        <ul>${area != null ? li("mdi:texture-box", t("Laatste schoonmaak"), `${area} m² · ${Math.round(mins ?? 0)} min`) : nothing}${ok(x.s("total_cleaning_count")) ? li("mdi:counter", t("Totaal"), `${x.s("total_cleaning_count").state}× · ${x.s("total_cleaning_area")?.state ?? "?"} m² · ${Math.round(num(x.s("total_cleaning_time")?.state) ?? 0)} u`) : nothing}${li("mdi:history", t("Laatst gewijzigd"), relTime(s.last_changed))}</ul>
        <div class="vh">${t("Standaard van de robot")}</div><div class="vs">${t("Voor Start en de app · wijzigt direct op de robot")}</div>
        <ul>${sel(gMode, "mdi:spray-bottle", t("Modus"))}${sel(gFan, "mdi:fan", t("Zuigkracht"))}${sel(gWater, "mdi:water", t("Water"))}${sel(gInt, "mdi:tune-vertical", t("Intensiteit"))}</ul>
        <div class="vh">${t("Instellingen")}</div>
        <ul>${toggle("auto_empty", "mdi:delete-restore", t("Automatisch legen"))}${toggle("auto_wash", "mdi:water-sync", t("Automatisch wassen"))}${sel(x.sel("dry_duration"), "mdi:hair-dryer", t("Droogtijd"))}${toggle("do_not_disturb", "mdi:sleep", t("Niet storen"))}${toggle("child_lock", "mdi:lock-outline", t("Kinderslot"))}</ul>`);
    }
    case "humidifier": {
      const s = hass.states[pop.e.id], on = isOn(s), target = num(s.attributes.humidity), cur = num(s.attributes.current_humidity), ms = s.attributes.available_modes || [];
      const call = (svc, data = {}) => p.call("humidifier", svc, { entity_id: pop.e.id, ...data });
      return wrap(roomName, label(p, pop.e), on ? t("Doel {n}%", { n: target ?? "?" }) : t("Uit"), t("Nu {v}", { v: (cur ?? "?") + "%" }), html`
        ${modes([{ label: on ? t("Uitschakelen") : t("Inschakelen"), on, go: () => call("toggle") }], "n2")}
        ${target != null ? range(t("Doelvochtigheid"), target, v => call("set_humidity", { humidity: v }), { min: s.attributes.min_humidity || 0, max: s.attributes.max_humidity || 100 }) : nothing}
        ${ms.length ? modes(ms.slice(0, 4).map(m => ({ label: m, on: s.attributes.mode === m, go: () => call("set_mode", { mode: m }) })), ms.length < 4 ? "n" + ms.length : "") : nothing}`);
    }
    case "media": {
      const v = mediaView(p, pop.e), s = v.main, vol = Math.round((s.attributes.volume_level ?? 0) * 100), on = v.playing;
      const call = (svc, data = {}) => p.call("media_player", svc, { entity_id: pop.e.id, ...data }), ctl = svc => p.call("media_player", svc, { entity_id: v.ctl });
      const big = v.title ? `${v.title}${v.artist ? " · " + v.artist : ""}` : v.app && !v.off ? v.app.name : v.off ? t("Uit") : s.state;
      // Music Assistant speaker (the card's own player or a linked one): favourites, search, queue and moving, as tabs under the controls
      const ma = [pop.e.id, ...(pop.e.linked || [])].find(id => isMA(hass, id)), tab = pop.tab || "fav";
      const MA_TABS = [["fav", t("Favorieten"), favTiles], ["search", t("Zoeken"), searchBox], ["queue", t("Wachtrij"), queueList], ["move", t("Verplaats"), movePills]];
      return wrap(roomName, label(p, pop.e), big, html`
        ${v.art && !v.off ? html`<div class="mart" style=${`background-image:url("${v.art}")`}></div>` : nothing}
        ${modes([{ label: t("Vorige"), go: () => ctl("media_previous_track") }, { label: on ? t("Pauze") : t("Speel"), on, go: () => ctl("media_play_pause") }, { label: t("Volgende"), go: () => ctl("media_next_track") }, { label: v.off ? t("Aan") : t("Uit"), go: () => call(v.off ? "turn_on" : "turn_off") }])}
        ${s.attributes.volume_level != null ? range(t("Volume"), vol, v => call("volume_set", { volume_level: v / 100 })) : nothing}
        ${ma ? html`<div class="mpop">${modes(MA_TABS.map(([k, l]) => ({ label: l, on: tab === k, go: () => p.openPopup({ ...pop, tab: k }) })), "mtabs")}${MA_TABS.find(([k]) => k === tab)[2](p, ma)}</div>` : nothing}
        <ul>${s.attributes.source_list ? s.attributes.source_list.slice(0, 8).map(src => li("mdi:import", src, "", { on: src === s.attributes.source, onclick: () => call("select_source", { source: src }) })) : nothing}
        ${v.app && !v.off ? li(v.app.icon, t("App"), v.app.name) : nothing}
        ${v.info && v.info !== s ? li("mdi:link-variant", t("Info van"), v.info.attributes.friendly_name || v.info.entity_id, { sub: t("gekoppelde speler"), onclick: () => p.moreInfo(v.info.entity_id) }) : nothing}
        ${li("mdi:history", t("Laatst gewijzigd"), relTime(s.last_changed))}</ul>`);
    }
    case "cover": {
      const s = hass.states[pop.e.id], pos = num(s.attributes.current_position);
      const call = (svc, data = {}) => p.call("cover", svc, { entity_id: pop.e.id, ...data });
      return wrap(roomName, label(p, pop.e), { open: t("Open"), closed: t("Dicht"), opening: t("Gaat open"), closing: t("Gaat dicht") }[s.state] || s.state, html`
        ${modes([{ label: t("Open"), go: () => call("open_cover") }, { label: t("Stop"), go: () => call("stop_cover") }, { label: t("Dicht"), go: () => call("close_cover") }, { label: t("Half"), go: () => call("set_cover_position", { position: 50 }) }])}
        ${pos != null ? range(t("Positie"), pos, v => call("set_cover_position", { position: v })) : nothing}
        <ul>${li("mdi:history", t("Laatst bewogen"), relTime(s.last_changed))}</ul>`);
    }
    case "climate": {
      const s = hass.states[pop.s.entity_id], target = setpoint(s), cur = num(s.attributes.current_temperature), step = s.attributes.target_temp_step || 0.5;
      const call = (svc, data = {}) => p.call("climate", svc, { entity_id: s.entity_id, ...data });
      const hv = s.attributes.hvac_modes || [], pr = s.attributes.preset_modes || [];
      const lbl = { heat: t("Verwarmen"), cool: t("Koelen"), auto: t("Auto"), heat_cool: t("Auto"), off: t("Uit"), dry: t("Drogen"), fan_only: t("Ventileren") };
      const rooms = p.rooms.filter(r => r.temp != null);
      return wrap(t("Verwarming"), target != null ? `${target.toFixed(1)}°` : s.state, `${t("Nu {v}", { v: cur != null ? cur.toFixed(1) + "°" : "?" })}${s.attributes.hvac_action ? " · " + ({ heating: t("verwarmen"), idle: t("rust"), cooling: t("koelen"), off: t("uit") }[s.attributes.hvac_action] || s.attributes.hvac_action) : ""}`, html`
        <div class="therm"><div style="font-size:15px;font-weight:600">${t("Doeltemperatuur")}</div>
          <button @click=${() => call("set_temperature", { temperature: +(target + step).toFixed(1) })}><img src=${icon("increase")} alt=""></button>
          <button class="down" @click=${() => call("set_temperature", { temperature: +(target - step).toFixed(1) })}><img src=${icon("increase")} alt=""></button></div>
        ${hv.length > 1 ? modes(hv.map(m => ({ label: lbl[m] || m, on: s.state === m, go: () => call("set_hvac_mode", { hvac_mode: m }) })), hv.length === 2 ? "n2" : hv.length === 3 ? "n3" : "") : nothing}
        ${pr.length ? modes(pr.slice(0, 4).map(m => ({ label: m, on: s.attributes.preset_mode === m, go: () => call("set_preset_mode", { preset_mode: m }) })), pr.length === 2 ? "n2" : pr.length === 3 ? "n3" : "") : nothing}
        <ul>${rooms.map(r => li("mdi:thermometer", r.name, `${r.temp.toFixed(1)}°`, { svg: "heating", onclick: () => p.go(r) }))}</ul>`);
    }
    case "sensor": {
      const s = hass.states[pop.e.id], on = isOn(s);
      const batt = p.room?.ents.battery.find(b => b.reg.device_id && b.reg.device_id === pop.e.reg.device_id);
      if (pop.history === undefined) p.loadHistory(pop);
      return wrap(roomName, label(p, pop.e), pop.kind === "motion" ? (on ? t("Beweging") : t("Geen beweging")) : on ? t("Open") : t("Dicht"), html`
        <ul>${li("mdi:history", t("Laatst gewijzigd"), relTime(s.last_changed))}${batt ? li("mdi:battery", t("Batterij"), `${batt.state.state}%`) : nothing}</ul>
        <div class="prow" style="margin-top:18px"><span>${t("Laatste 24 uur")}</span><b>${pop.history?.filter?.(r => r.s === "on").length ?? "…"}×</b></div>
        ${pop.history === undefined || pop.history === null && !pop.loaded ? html`<div class="sub">${t("Laden…")}</div>` : timeline(pop.history, pop.kind)}`);
    }
    case "agenda": {
      const evs = p.events || [];
      return wrap(t("Agenda"), evs.length ? t("{n} afspraken", { n: evs.length }) : t("Niets gepland"), t("Vandaag en morgen"), html`
        <ul>${evs.map(ev => li("mdi:calendar-blank-outline", ev.summary, "", { sub: `${eventWhen(ev)}${ev.location ? " · " + ev.location : ""}`, on: ev.start <= new Date() && ev.end > new Date() }))}</ul>`);
    }
    case "appliance": {
      const a = pop.a, cfg = (p.config.cards || {})[a.id] || {}, thr = cfg.threshold ?? 5;
      const st = applianceState(hass, a, thr), sw = a.switch ? hass.states[a.switch.id] : null, title = cfg.name || (hass.devices?.[a.device]?.name_by_user || hass.devices?.[a.device]?.name || t("Apparaat"));
      if (a.op) {
        const left = end => { const m = Math.max(0, Math.round((end - Date.now()) / 60000)); return m >= 60 ? t("nog {h} u {m} min", { h: Math.floor(m / 60), m: m % 60 }) : t("nog {m} min", { m }); };
        const fmt = e => { const s = e && hass.states[e.id]; if (!s || unavailable(s)) return null; const v = hass.formatEntityState?.(s) ?? s.state;
          return v === s.state && /_program_/.test(v) ? v.split("_program_").pop().replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()) : v; };   // untranslated "dishcare_dishwasher_program_auto_2" → "Auto 2"
        const isDish = /vaat|dish/i.test(title) || /dishwasher/i.test(a.op.id), startId = isDish ? Object.keys(hass.entities || {}).find(k => k.startsWith("button.") && hass.entities[k].device_id === a.device && /_start$/.test(k) && hass.states[k]?.state !== "unavailable") : null, prog = isDish ? null : fmt(a.program), door = a.door ? hass.states[a.door.id]?.state : null, canStop = a.stop && ["running", "waiting"].includes(st.st) && !noRemote(hass, a) && hass.states[a.stop.id] && hass.states[a.stop.id].state !== "unavailable";   // a button's normal state is "unknown"
        const btns = [...(sw && !noRemote(hass, a) ? [{ label: sw.state === "on" ? t("Uitzetten") : t("Aanzetten"), on: sw.state === "on", go: () => p.call("switch", "toggle", { entity_id: a.switch.id }) }] : []), ...(canStop ? [{ label: t("Programma stoppen"), go: () => p.call("button", "press", { entity_id: a.stop.id }) }] : []), ...(startId && ["idle", "done"].includes(st.st) && !["open", "on"].includes(door) ? [{ label: t("Start"), go: () => p.call("button", "press", { entity_id: startId }) }] : [])];
        return wrap(roomName, title, st.label, html`
          ${btns.length ? modes(btns, btns.length > 2 ? "n3" : "n2") : nothing}
          ${st.progress != null && ["running", "waiting"].includes(st.st) ? html`<div class="pbar" style="margin-top:14px;height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden"><i style="display:block;height:100%;width:${Math.max(0, Math.min(100, st.progress))}%;background:#fff"></i></div>` : nothing}
          <ul>${prog ? li("mdi:playlist-play", t("Programma"), prog, { onclick: () => p.moreInfo(a.program.id) }) : nothing}${st.job && st.st !== "off" ? li("mdi:progress-wrench", t("Fase"), st.job, { onclick: () => p.moreInfo(a.job.id) }) : nothing}${st.progress != null && !["off", "idle"].includes(st.st) ? li("mdi:progress-clock", t("Voortgang"), `${Math.round(st.progress)}%`, { onclick: () => p.moreInfo(a.progress.id) }) : nothing}${st.end ? li("mdi:clock-end", t("Klaar om"), st.end.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }), { sub: left(st.end), onclick: () => p.moreInfo(a.finish.id) }) : nothing}${st.doneAt ? li("mdi:check", t("Klaar sinds"), relTime(st.doneAt.toISOString())) : nothing}${door ? li("mdi:door", t("Deur"), door === "open" || door === "on" ? t("Open") : door === "locked" ? t("Vergrendeld") : t("Dicht"), { on: door === "open" || door === "on", onclick: () => p.moreInfo(a.door.id) }) : nothing}${(isDish ? [] : a.extra || []).map(x => { const s = hass.states[x.id]; return li("mdi:toggle-switch-outline", (s?.attributes.friendly_name || x.id).replace(title, "").trim() || x.id, isOn(s) ? t("Aan") : t("Uit"), { on: isOn(s), onclick: () => p.call("switch", "toggle", { entity_id: x.id }) }); })}${(isDish ? [] : a.flags || []).map(x => { const s = hass.states[x.id]; return li("mdi:information-variant", (s?.attributes.friendly_name || x.id).replace(title, "").trim() || x.id, unavailable(s) ? "–" : isOn(s) ? t("Aan") : t("Uit"), { on: isOn(s), onclick: () => p.moreInfo(x.id) }); })}${(mo => mo ? li("mdi:calendar-month", t("Deze maand"), mo.kw || t("{n} beurten", { n: mo.cy }), { sub: [mo.kw && mo.cy != null ? t("{n} beurten", { n: mo.cy }) : "", mo.eu].filter(Boolean).join(" · "), onclick: () => p.moreInfo(mo.cId) }) : nothing)(applianceMonth(hass, a))}${li("mdi:information-outline", t("Status"), { active: t("Actief"), idle: t("Inactief") }[hass.states[a.op.id]?.state] || fmt(a.op) || "–", { sub: relTime(hass.states[a.op.id]?.last_changed), onclick: () => p.moreInfo(a.op.id) })}</ul>${isDish ? dishPanel(p, a, st, hass, title) : nothing}`);
      }
      const ps = hass.states[a.power.id];
      return wrap(roomName, cfg.name || (hass.devices?.[a.device]?.name_by_user || hass.devices?.[a.device]?.name || t("Apparaat")), st.label, html`
        ${sw ? modes([{ label: sw.state === "on" ? t("Stekker uit") : t("Stekker aan"), on: sw.state === "on", go: () => p.call("switch", "toggle", { entity_id: a.switch.id }) }], "n2") : nothing}
        <ul>${li("mdi:flash-outline", t("Vermogen nu"), st.power != null ? `${Math.round(st.power)} W` : "–", { onclick: () => p.moreInfo(a.power.id) })}${li("mdi:tune", t("Drempel"), `${thr} W`, { sub: t("aanpassen via ⋯") })}${st.doneAt ? li("mdi:check", t("Klaar sinds"), relTime(st.doneAt.toISOString())) : nothing}${ps ? li("mdi:history", t("Laatste meting"), relTime(ps.last_updated)) : nothing}</ul>
        <div class="sub" style="margin-top:12px">${t("Bezig zolang het vermogen boven de drempel ligt; daarna \"Klaar\" tot het apparaat weer start.")}</div>`);
    }
    case "alarm": {
      const s = home.alarm; if (!s) return nothing;
      const lbl = { disarmed: t("Uitgeschakeld"), armed_home: t("Thuis"), armed_away: t("Weg"), armed_night: t("Nacht"), armed_vacation: t("Vakantie"), arming: t("Inschakelen…"), pending: t("Wachten…"), triggered: t("ALARM") };
      const needsCode = svc => !!s.attributes.code_format && (svc === "alarm_disarm" || s.attributes.code_arm_required !== false);
      const call = svc => needsCode(svc) ? p.openPopup({ ...pop, pending: svc, code: "" }) : p.call("alarm_control_panel", svc, { entity_id: s.entity_id });
      const blockers = [...home.doorsOpen, ...home.windowsOpen];
      return wrap(t("Alarm"), lbl[s.state] || s.state, s.attributes.changed_by ? t("Laatst gewijzigd door {by}, {t}", { by: s.attributes.changed_by, t: relTime(s.last_changed) }) : relTime(s.last_changed), pop.pending ? keypad(p, pop) : html`
        ${modes([{ label: t("Uit"), on: s.state === "disarmed", go: () => call("alarm_disarm") }, { label: t("Thuis"), on: s.state === "armed_home", go: () => call("alarm_arm_home") }, { label: t("Weg"), on: s.state === "armed_away", go: () => call("alarm_arm_away") }, { label: t("Nacht"), on: s.state === "armed_night", go: () => call("alarm_arm_night") }])}
        ${blockers.length ? html`<ul>${blockers.map(e => li("mdi:door-open", name(hass, e), t("Open"), { sub: e.room?.name, svg: "door" }))}</ul>` : nothing}`);
    }
    case "attention":
      { const items = attFilter(p, home.attention);
      return wrap(t("Aandacht"), `${items.length} ${items.length === 1 ? t("melding") : t("meldingen")}`, t("Apparaten, batterijen en automatiseringen"), html`
        <div class="modes att">${ATT_FILTERS.map(([k, l]) => { const n = attFilter({ attFilter: k }, home.attention).length; return html`<button class=${(p.attFilter || "all") === k ? "on" : ""} @click=${() => { p.attFilter = k; }}>${t(l)}${n ? html`<b class="cnt">${n}</b>` : nothing}</button>`; })}</div>
        <ul>${items.map(a => li(a.icon, a.name, a.kind === "battery" ? `${a.value}%` : a.kind === "unavailable" ? t("Offline") : a.kind === "notification" ? t("Sluiten") : a.kind === "update" ? t("Installeren") : a.kind === "brain" ? "brAIn" : t("Fout"), { sub: a.kind === "brain" ? "" : a.kind === "notification" ? `${a.text} · ${relTime(a.since)}` : a.kind === "update" ? a.text : `${a.room ? a.room.name + " · " : ""}${a.since ? relTime(a.since) : a.text}`, onclick: a.kind === "notification" ? () => p.call("persistent_notification", "dismiss", { notification_id: a.id }) : a.kind === "update" ? () => { const u = pendingUpdates(hass).find(x => x.id === a.id); if (u) installUpdate(p, u); } : a.room ? () => p.go(a.room) : null }))}</ul>`);
      }
    case "doors": case "windows": {
      const list = pop.type === "doors" ? [...home.doors, ...home.windows] : home.windows, open = list.filter(e => isOn(e.state)), isDoor = e => home.doors.includes(e);
      return wrap(pop.type === "doors" ? (home.windows.length && home.doors.length ? t("Deuren & ramen") : home.doors.length ? t("Deuren") : t("Ramen")) : t("Ramen"), open.length ? t("{n} open", { n: open.length }) : t("Alles dicht"), t("{n} met sensor", { n: list.length }), html`
        <ul>${list.map(e => li(isDoor(e) ? "mdi:door" : "mdi:window-closed-variant", name(hass, e), isOn(e.state) ? t("Open") : t("Dicht"), { on: isOn(e.state), sub: `${e.room.name} · ${relTime(e.state?.last_changed)}`, svg: isDoor(e) ? "door" : "window", onclick: () => p.go(e.room) }))}</ul>`);
    }
    case "lights":
      return wrap(t("Lampen"), home.lightsOn.length ? t("{n} aan", { n: home.lightsOn.length }) : t("Alles uit"), t("van {n} lampen", { n: home.lights.length }), html`
        ${home.lightsOn.length ? modes([{ label: t("Alles uit"), go: () => p.call("light", "turn_off", { entity_id: home.lightsOn.map(e => e.id) }) }], "n2") : nothing}
        <ul>${[...home.lightsOn, ...home.lights.filter(e => !isOn(e.state))].map(e => li("mdi:lightbulb-outline", name(hass, e), isOn(e.state) ? `${Math.round((e.state.attributes.brightness || 255) / 2.55)}%` : t("Uit"), { on: isOn(e.state), sub: e.room.name, svg: "lamp", onclick: () => p.call("light", "toggle", { entity_id: e.id }) }))}</ul>`);
    case "usage":
      return wrap(t("Gebruik"), USAGE_PROVIDERS[pop.provider].name, t("Sessie (5 uur)") + " · " + t("Week"), usagePopup(p, pop.provider, li));
    case "costs":
      return wrap(t("Verbruik"), costsBig(p), t("Deze maand"), costsPopup(p));
    case "heatinfo":
      return wrap(t("Verwarming"), heatInfoTitle(pop.key), t("Uitleg bij deze kaart"), heatInfo(pop.key));
    case "waste":
      return wrap(t("Afval"), home.waste[0] ? `${home.waste[0].label} ${wasteWhen(home.waste[0])}` : t("Geen data"), t("Ophaaldagen"), html`
        <ul>${home.waste.map((w, i) => li("mdi:trash-can-outline", html`<i class="dot" style="background:${wasteColor(w.label)}"></i>${w.label}`, wasteWhen(w), { on: i === 0, sub: w.days > 7 && w.date ? new Date(w.date).toLocaleDateString(locale(), { weekday: "long" }) : "" }))}</ul>`);
    case "people":
      return wrap(t("Wie is thuis"), t("{n} van {m}", { n: home.home, m: home.persons.length }), home.persons.filter(s => s.state === "home").map(s => s.attributes.friendly_name).join(", ") || t("Niemand thuis"), html`
        <hcn-people-map .hass=${hass} .ids=${home.persons.map(s => s.entity_id)}></hcn-people-map>
        <ul class="who">${home.persons.map(s => li("mdi:account-outline", s.attributes.friendly_name, s.state === "home" ? t("Thuis") : s.state === "not_home" ? t("Weg") : s.state, { on: s.state === "home", sub: relTime(s.last_changed), img: s.attributes.entity_picture || null }))}</ul>`);
    case "weather": {
      const w = home.weather, a = w.attributes, fc = pop.forecast || [], dfc = (pop.dailyForecast || []).slice(0, 7);
      const hourly = fc.filter(f => f.datetime && (new Date(f.datetime) - Date.now()) < 36e5 * 30).slice(0, 8);
      const wxi = c => html`<img class="ico" src=${icon(condSvg(c))} alt="">`;
      const rain = f => f.precipitation_probability != null ? `${Math.round(f.precipitation_probability)}%` : f.precipitation ? `${f.precipitation} mm` : "";
      const hours = hourly.length ? html`<div class="prow" style="margin-top:6px"><span>${t("Komende uren")}</span><b>${a.precipitation_unit && hourly.some(f => f.precipitation_probability != null) ? t("kans op neerslag") : ""}</b></div>
        <div class="fc hours">${hourly.map(f => html`<div>${new Date(f.datetime).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })}${wxi(f.condition)}<b>${Math.round(f.temperature)}°</b>${rain(f) ? html`<em>${rain(f)}</em>` : nothing}</div>`)}</div>` : nothing;
      const todayKey = new Date().toDateString();
      const week = dfc.length ? html`<div class="prow" style="margin-top:18px"><span>${t("Deze week")}</span><b></b></div><div class="fc week">${dfc.map(f => { const d = new Date(f.datetime), isT = d.toDateString() === todayKey;
        return html`<div class=${isT ? "today" : ""}>${isT ? t("Vandaag") : d.toLocaleDateString(locale(), { weekday: "short" })}${wxi(f.condition)}<b>${Math.round(f.temperature)}°</b>${f.templow != null ? html`<small>${Math.round(f.templow)}°</small>` : nothing}${rain(f) ? html`<em>${rain(f)}</em>` : nothing}</div>`; })}</div>` : nothing;
      const bearing = b => typeof b === "number" ? ["N", "NO", "O", "ZO", "Z", "ZW", "W", "NW"][Math.round(b / 45) % 8] : b;
      const sun = home.sun, hm = iso => new Date(iso).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
      const details = [
        a.apparent_temperature != null ? li("mdi:thermometer", t("Gevoelstemperatuur"), `${Math.round(a.apparent_temperature)}°`) : null,
        a.humidity != null ? li("mdi:water-outline", t("Luchtvochtigheid"), `${a.humidity}%`) : null,
        a.wind_speed != null ? li("mdi:weather-windy", t("Wind"), `${Math.round(a.wind_speed)} ${a.wind_speed_unit || t("km/u")}${a.wind_bearing != null ? " · " + bearing(a.wind_bearing) : ""}`) : null,
        a.pressure != null ? li("mdi:gauge", t("Luchtdruk"), `${Math.round(a.pressure)} ${a.pressure_unit || "hPa"}`) : null,
        a.uv_index != null ? li("mdi:sun-wireless-outline", t("UV-index"), `${a.uv_index}`) : null,
        a.visibility != null ? li("mdi:eye-outline", t("Zicht"), `${a.visibility} ${a.visibility_unit || "km"}`) : null,
        sun ? li("mdi:weather-sunset-up", t("Zonsopkomst"), hm(sun.attributes.next_rising)) : null,
        sun ? li("mdi:weather-sunset-down", t("Zonsondergang"), hm(sun.attributes.next_setting)) : null,
      ].filter(Boolean);
      return wrap(t("Weer"), `${Math.round(num(a.temperature) ?? 0)}° · ${condText(w.state)}`, a.attribution || "", html`
        ${hours}${week}
        ${!hourly.length && !dfc.length ? html`<div class="sub">${pop.loading ? t("Laden…") : t("Geen verwachting beschikbaar")}</div>` : nothing}
        ${details.length ? html`<ul>${details}</ul>` : nothing}`);
    }
    case "page": {
      const key = pop.key, isHome = key === "home", r = isHome ? null : p.rooms.find(x => x.id === key); if (!isHome && !r) return nothing;
      const cur = p.pageCfg(key), d = pop.draft || { ...cur, hidden: [...(cur.hidden || [])], order: [...(cur.order || [])], ticker: { ...(cur.ticker || {}) }, lines: (cur.lines || []).map(l => ({ ...l })) };
      const upd = patch => p.openPopup({ ...pop, draft: { ...d, ...patch } });
      const all = p.orderCards(p.pageCards(key), d.order), hid = new Set(d.hidden);
      const move = (i, dir) => { const keys = all.map(c => c.key), j = i + dir; if (j < 0 || j >= keys.length) return; [keys[i], keys[j]] = [keys[j], keys[i]]; upd({ order: keys }); };
      const kinds = TICKER_KINDS[isHome ? "home" : "room"];
      const defImage = isHome ? (p.config.homeImage || "") : ((p.config.roomImage || "").replace("{slug}", r.slug));
      return html`<div class="popup wide"><h2>${t("Pagina instellen")} ${hbtns(p, pop)}</h2><div class="big">${isHome ? t("Startpagina") : r.name}</div><div class="sub">${t("Titel, foto, kaarten en de meldingenregel van deze pagina")}</div>
        <div class="form">
          <label class="f"><span>${t("Titel")}</span><input type="text" .value=${d.title || ""} placeholder=${isHome ? (p.config.home?.greeting || t("automatisch (Goedemorgen …)")) : (p.hass.areas?.[key]?.name || r.name)} @change=${e => upd({ title: e.target.value || undefined })}></label>
          <label class="f"><span>${t("Foto")}<small>${t("pad of URL")}</small></span><input type="text" .value=${d.image || ""} placeholder=${defImage} @change=${e => upd({ image: e.target.value || undefined })}></label>
          ${key === "home" ? nothing : html`<label class="f"><span>${t("Kaartindeling")}<small>${t("standaard één rij; op liggende tablets en brede schermen")}</small></span><div class="seg"><button class=${(d.rows || 1) === 1 ? "on" : ""} @click=${() => upd({ rows: undefined })}>${t("Eén rij")}</button><button class=${d.rows === 2 ? "on" : ""} @click=${() => upd({ rows: 2 })}>${t("Twee rijen")}</button></div></label>`}
        </div>
        <div class="prow" style="margin-top:18px"><span>${t("Kaarten")}</span><b>${t("{a} van {b} zichtbaar", { a: all.length - hid.size, b: all.length })}</b></div>
        <ul class="plist">${all.map((c, i) => html`<li class=${hid.has(c.key) ? "off" : ""}><ha-icon icon=${hid.has(c.key) ? "mdi:eye-off-outline" : "mdi:eye-outline"}></ha-icon><div>${c.label}<small>${c.key.includes(".") || c.key.startsWith("device:") ? c.key : ""}</small></div>
          <span class="btns"><button title=${hid.has(c.key) ? t("Tonen") : t("Verbergen")} @click=${() => upd({ hidden: hid.has(c.key) ? d.hidden.filter(k => k !== c.key) : [...d.hidden, c.key] })}><ha-icon icon=${hid.has(c.key) ? "mdi:eye-outline" : "mdi:eye-off-outline"}></ha-icon></button><button title=${t("Omhoog")} ?disabled=${i === 0} @click=${() => move(i, -1)}>↑</button><button title=${t("Omlaag")} ?disabled=${i === all.length - 1} @click=${() => move(i, 1)}>↓</button></span></li>`)}
          ${!all.length ? html`<li><div>${t("Geen kaarten op deze pagina")}</div></li>` : nothing}</ul>
        <div class="prow" style="margin-top:18px"><span>${t("Meldingenregel")}</span><b>${t("tik om uit/aan te zetten")}</b></div>
        <div class="chips">${Object.entries(kinds).map(([k, l]) => html`<button class=${d.ticker[k] === false ? "" : "on"} @click=${() => upd({ ticker: { ...d.ticker, [k]: d.ticker[k] === false ? undefined : false } })}>${t(l)}</button>`)}</div>
        <div class="prow" style="margin-top:18px"><span>${t("Eigen regels")}</span><b>Jinja</b></div>
        <div class="form lines">${(d.lines || []).map((l, i) => html`<div class="lrow"><input type="text" .value=${l.icon || ""} placeholder="mdi:text" @change=${e => upd({ lines: d.lines.map((x, j) => j === i ? { ...x, icon: e.target.value || undefined } : x) })}><input type="text" .value=${l.text || ""} placeholder=${t("template, bv. {{ states('sensor.x') }} °C")} @change=${e => upd({ lines: d.lines.map((x, j) => j === i ? { ...x, text: e.target.value } : x) })}><button @click=${() => upd({ lines: d.lines.filter((_, j) => j !== i) })}>×</button></div>`)}
          <button class="addline" @click=${() => upd({ lines: [...(d.lines || []), { icon: "mdi:text", text: "" }] })}>${t("+ eigen regel")}</button></div>
        <div class="modes n3" style="margin-top:18px">
          <button class="on" @click=${() => p.savePage(key, { ...p.layerPage(key), title: d.title, image: d.image, rows: key !== "home" && d.rows === 2 ? 2 : undefined, lines: (d.lines || []).filter(l => l.text).length ? d.lines.filter(l => l.text) : undefined, hidden: d.hidden.length ? d.hidden : undefined, order: d.order.length ? d.order : undefined, ticker: Object.values(d.ticker).some(v => v === false) ? Object.fromEntries(Object.entries(d.ticker).filter(([, v]) => v === false)) : undefined })}>${t("Opslaan")}</button>
          <button @click=${() => p.savePage(key, null)}>${t("Herstel")}</button>
          <button data-close>${t("Annuleren")}</button></div></div>`;
    }
    case "wizard": {
      const d = pop.draft || wizardDefaults(p), step = pop.step || 0;
      const upd = patch => p.openPopup({ ...pop, draft: { ...d, ...patch } });
      const updHome = (k, v) => upd({ home: { ...d.home, [k]: v } }), updEnergy = (k, v) => updHome("energy", { ...(d.home.energy || {}), [k]: v });
      const goStep = s => p.openPopup({ ...pop, draft: d, step: s });
      const areas = Object.values(hass.areas || {}).sort((a, b) => a.name.localeCompare(b.name, "nl"));
      const steps = [
        { title: t("Welkom"), body: html`<div class="sub">${t("In vier stappen staat het panel klaar. Alles is later aan te passen bij Panel instellingen.")}</div><div class="form">
            ${field(t("Taal"), html`<select @change=${e => { upd({ language: e.target.value || undefined }); }}><option value="" ?selected=${!d.language}>${t("automatisch (taal van Home Assistant)")}</option>${Object.entries(LANGUAGES).map(([k, l]) => html`<option value=${k} ?selected=${d.language === k}>${l}</option>`)}</select>`)}
            ${field(t("Titel"), text(d.title, v => upd({ title: v || undefined }), t("Thuis") + "."), t("linksboven in de navigatie"))}</div>` },
        { title: t("Kamers"), body: html`<div class="sub">${t("Kies de ruimtes die als kamer in de navigatie komen. De volgorde pas je later aan bij Kamers.")}</div>
            <div class="chips">${areas.map(a => { const on = d.rooms.includes(a.area_id); return html`<button class=${on ? "on" : ""} @click=${() => upd({ rooms: on ? d.rooms.filter(x => x !== a.area_id) : [...d.rooms, a.area_id] })}>${a.name}</button>`; })}</div>
            ${!areas.length ? html`<div class="sub" style="margin-top:12px">${t("Geen ruimtes gevonden. Maak eerst ruimtes aan in Home Assistant en wijs apparaten toe.")}</div>` : nothing}` },
        { title: t("Startpagina"), body: html`<div class="sub">${t("Welke entiteiten de vaste kaarten op de startpagina gebruiken. Leeg = geen kaart.")}</div><div class="form">
            ${field(t("Weer"), select(hass, "weather", d.home.weather, v => updHome("weather", v), { empty: t("geen") }))}
            ${field(t("Thermostaat"), select(hass, "climate", d.home.climate, v => updHome("climate", v), { empty: t("geen") }))}
            ${field(t("Alarm"), select(hass, "alarm_control_panel", d.home.alarm, v => updHome("alarm", v), { empty: t("geen") }))}
            ${field(t("Vermogen"), select(hass, "sensor", d.home.energy?.power, v => updEnergy("power", v), { empty: t("geen"), filter: s => s.attributes.unit_of_measurement === "W" }), "W")}
            ${field(t("Verbruik vandaag"), select(hass, "sensor", d.home.energy?.today, v => updEnergy("today", v), { empty: t("geen"), filter: s => s.attributes.unit_of_measurement === "kWh" }), "kWh")}</div>` },
        { title: t("Foto's"), body: html`<div class="sub">${t("Een foto per kamer als achtergrond; {slug} wordt de kamernaam (bv. woonkamer.jpg). Zonder foto krijgt elke kamer een rustige kleurverloop. Per kamer aanpassen kan later via de paginainstellingen.", { slug: "{slug}" })}</div><div class="form">
            ${field(t("Kamerfoto"), text(d.roomImage, v => upd({ roomImage: v || undefined }), "/local/images/rooms/{slug}.jpg"))}
            ${field(t("Foto startpagina"), text(d.homeImage, v => upd({ homeImage: v || undefined }), "/local/images/rooms/home.jpg"))}</div>` },
      ];
      const last = step === steps.length - 1;
      return html`<div class="popup wide wiz"><h2>${t("Installatie")} · ${step + 1}/${steps.length}</h2><div class="big">${steps[step].title}</div>
        ${steps[step].body}
        <div class="wfoot"><span class="dots">${steps.map((_, i) => html`<i class=${i === step ? "on" : ""}></i>`)}</span>
          <div class="modes n3">${step > 0 ? html`<button @click=${() => goStep(step - 1)}>${t("Terug")}</button>` : html`<button @click=${() => p.finishWizard(null)}>${t("Overslaan")}</button>`}
            <span></span>
            <button class="on" @click=${() => last ? p.finishWizard(d) : goStep(step + 1)}>${last ? t("Klaar") : t("Volgende")}</button></div></div></div>`;
    }
    case "announce": {
      const q = pop.q, sp = q.speakers || [];
      const play = (list, nm) => { p.popup = null; p.showToast(t("Omroep naar {n}", { n: nm })); p.call("script", "omroep_afspelen", { message: q.message, speakers: list, chime_path: q.chime ?? "airport", end_chime_path: q.endChime ?? "", announce_volume: q.volume ?? 30 }); };
      return wrap(t("Omroep"), q.label || q.message, q.message, html`
        <ul>${sp.map(x => li("mdi:speaker", x.name, "", { onclick: () => play([x.entity], x.name) }))}
          ${sp.length > 1 ? li("mdi:speaker-multiple", t("Allemaal"), "", { onclick: () => play(sp.map(x => x.entity), t("Allemaal")) }) : nothing}</ul>`);
    }
    case "confirm":
      return html`<div class="popup"><h2>${pop.title || t("Bevestigen")} ${hbtns(p, pop)}</h2><div class="big">${pop.big}</div><div class="sub confirm-text">${pop.sub || ""}</div>
        <div class="modes n2"><button class="on" @click=${async () => { p.popup = null; try { await pop.ok(); } catch {} }}>${pop.okLabel || t("Ja")}</button><button data-close>${t("Annuleren")}</button></div></div>`;
    case "presets": {
      const r = p.rooms.find(x => x.id === pop.roomId); if (!r) return nothing;
      const list = roomPresets(p, r), d = pop.draft || {}, editing = pop.edit ? list.find(x => x.id === pop.edit) : null;
      const upd = patch => p.openPopup({ ...pop, draft: { ...d, ...patch } });
      const body = pop.form ? html`<div class="form">
          <label class="f"><span>${t("Naam")}</span><input type="text" .value=${d.name ?? editing?.name ?? ""} placeholder=${t("bv. Film, Lezen, Gezellig")} @change=${e => upd({ name: e.target.value })}></label>
          <label class="f"><span>${t("Icoon")}</span><input type="text" .value=${d.icon ?? editing?.icon ?? ""} placeholder="mdi:movie-open-outline" @change=${e => upd({ icon: e.target.value })}></label>
          <div class="sub" style="margin-top:12px">${editing ? t("Bewaart de opgeslagen lampstanden; alleen naam en icoon wijzigen.") : t("Slaat de huidige stand van {n} lampen op: aan/uit, helderheid en kleur.", { n: r.ents.lights.length })}</div>
          <div class="modes n2" style="margin-top:14px">
            <button class="on" @click=${() => p.savePreset(r, { id: editing?.id || Date.now().toString(36), name: (d.name ?? editing?.name) || t("Scène"), icon: (d.icon ?? editing?.icon) || undefined, states: editing ? editing.states : snapshot(p, r) })}>${t("Opslaan")}</button>
            <button @click=${() => p.openPopup({ type: "presets", roomId: r.id, manage: pop.manage })}>${t("Annuleren")}</button></div></div>`
        : html`${list.length ? html`<ul>${list.map(pr => li(pr.icon || "mdi:lightbulb-group-outline", pr.name, pop.manage ? t("Bewerken") : t("Activeren"), { on: !pop.manage && presetMatches(p, pr), sub: t("{n} van {m} lampen aan", { n: Object.values(pr.states).filter(v => v.on).length, m: Object.keys(pr.states).length }), onclick: () => pop.manage ? p.openPopup({ ...pop, form: true, edit: pr.id }) : applyPreset(p, pr) }))}</ul>` : html`<div class="sub" style="margin-top:14px">${t("Nog geen lichtscènes voor deze kamer. Zet de lampen zoals je ze wilt en sla die stand op.")}</div>`}
          <div class="modes ${list.length ? "n3" : "n2"}"><button class="on" @click=${() => p.openPopup({ ...pop, form: true, edit: null, draft: null })}>${t("+ Huidige stand")}</button>${list.length ? html`<button class=${pop.manage ? "on" : ""} @click=${() => p.openPopup({ ...pop, manage: !pop.manage })}>${pop.manage ? t("Klaar") : t("Bewerken")}</button>` : nothing}${list.length ? html`<button data-close>${t("Sluiten")}</button>` : html`<button data-close>${t("Sluiten")}</button>`}</div>
          ${pop.manage && list.length ? html`<ul>${list.map(pr => li("mdi:content-save-outline", pr.name, t("Overschrijven"), { sub: t("met de huidige lampstand"), onclick: () => p.savePreset(r, { ...pr, states: snapshot(p, r) }) }))}${list.map(pr => li("mdi:delete-outline", pr.name, t("Verwijderen"), { onclick: () => p.deletePreset(r, pr.id) }))}</ul>` : nothing}`;
      return wrap(r.name, t("Lichtscènes"), list.length ? t("{n} opgeslagen · tik = activeren", { n: list.length }) : t("Opgeslagen lampstanden voor deze kamer"), body);
    }
    case "energy": {
      const en = home.energy, r = (s, u) => s ? `${num(s.state)?.toLocaleString(locale())} ${u}` : "–";
      if (en.today && pop.hourly === undefined) p.loadHourly(pop);
      return wrap(t("Energie"), r(en.power, "W"), t("Nu"), html`${en.today ? html`<div class="prow" style="margin-top:6px"><span>${t("Vandaag per uur")}</span><b>${r(en.today, "kWh")}</b></div>${bars(pop.hourly === undefined ? null : pop.hourly)}` : nothing}<ul>${li("mdi:home-import-outline", t("Verbruik vandaag"), r(en.today, "kWh"))}${li("mdi:solar-power-variant-outline", t("Teruggeleverd"), r(en.returned, "kWh"))}${li("mdi:fire", t("Gas"), r(en.gas, "m³"))}</ul>`);
    }
    case "camera": {
      const s = hass.states[pop.s.entity_id] || pop.s;
      const src = camStream(s);
      const camRoom = p.rooms.find(r => r.ents.cameras.some(c => c.id === s.entity_id)), bell = p.config.home?.doorbell;
      const evIds = [...new Set([...(camRoom?.ents.motion.map(e => e.id) || []), ...((bell?.camera === s.entity_id && bell.triggers) || []).filter(id => domain(id) === "binary_sensor")])];
      if (evIds.length && pop.events === undefined && !pop.menu && !pop.form) p.loadCamEvents(pop, evIds);
      const body = pop.menu ? html`<ul class="menu-list">
          ${li("mdi:tune", t("Kaart instellen"), "", { sub: t("naam, live beeld, verbergen"), onclick: () => p.openPopup({ ...pop, menu: false, form: true }) })}
          ${li("mdi:open-in-new", t("Openen in Home Assistant"), "", { sub: s.entity_id, onclick: () => { p.popup = null; p.moreInfo(s.entity_id); } })}</ul>`
        : pop.form ? cardForm(p, pop)
        : html`${src ? html`<img class="stream" src=${src} alt="">` : html`<div class="sub">${t("Geen beeld beschikbaar")}</div>`}
          <div class="sub" style="margin-top:10px">${s.state === "recording" ? t("Neemt op") : s.state === "streaming" ? t("Live") : t("Inactief")} · ${relTime(s.last_changed)}${pop.by ? " · " + t("geopend door {by}", { by: pop.by }) : ""}</div>
          ${evIds.length ? html`<div class="prow" style="margin-top:18px"><span>${t("Beweging laatste 24 uur")}</span><b>${pop.events ? pop.events.length + "×" : "…"}</b></div>${pop.events ? timeline(pop.events, "motion") : nothing}` : nothing}`;
      return html`<div class="popup wide"><h2>${label(p, { id: s.entity_id, state: s })} ${hbtns(p, pop)}</h2>${body}</div>`;
    }
    case "tpl": {
      const list = p.draft?.templates || [], tp = list[pop.index]; if (!tp) return nothing;
      const upd = patch => { p.draft = { ...p.draft, templates: list.map((x, j) => j === pop.index ? { ...x, ...patch } : x) }; };
      const f = (lbl, ctrl, sub) => html`<label class="f"><span>${lbl}${sub ? html`<small>${sub}</small>` : nothing}</span>${ctrl}</label>`;
      const txt = (k, ph) => html`<input type="text" .value=${tp[k] || ""} placeholder=${ph} @change=${e => upd({ [k]: e.target.value || undefined })}>`;
      return html`<div class="popup wide"><h2>${t("Templatekaart")} ${hbtns(p, pop)}</h2><div class="big">${tp.name || t("Nieuwe kaart")}</div><div class="sub">${t("Een sjabloon in je bibliotheek: plaats het via Bewerken → Kaart toevoegen → Template, zo vaak je wilt. Tekst en label zijn Jinja-templates; Home Assistant rendert ze live. Opslaan gebeurt met de knop op de instellingenpagina.")}</div>
        <div class="form">
          ${f(t("Naam"), txt("name", "bv. Buiten"))}
          ${f(t("Icoon"), txt("icon", "mdi:thermometer"))}
          ${f(t("Bij het plaatsen invullen"), html`<div class="chips">${TPL_ASK.map(([k, l]) => html`<button class=${(tp.ask || []).includes(k) ? "on" : ""} @click=${() => upd({ ask: (tp.ask || []).includes(k) ? (tp.ask || []).filter(x => x !== k) : [...(tp.ask || []), k] })}>${t(l)}</button>`)}</div>`, t("deze velden vraagt de kaart als je hem op een pagina zet; wat je hier invult is dan het voorbeeld"))}
          ${f(t("Tekst"), txt("state", "{{ states('sensor.buiten_temperatuur') }} °C"), t("template voor de staat"))}
          ${f(t("Label"), txt("label", "{{ relative_time(states.sensor.x.last_changed) }} geleden"), "optioneel, kleine regel onderin")}
          ${f(t("Zichtbaar (voorwaarde)"), txt("visible", "{{ states('$entity') | int < 10 }}"), t("Jinja; onwaar is false, 0, no, off, none of leeg, alles anders is waar"))}
          ${f(t("Tonen als"), html`<div class="seg two">${[[false, t("waar")], [true, t("onwaar")]].map(([v, l]) => html`<button class=${!!tp.visibleInvert === v ? "on" : ""} @click=${() => upd({ visibleInvert: v || undefined })}>${l}</button>`)}</div>`, t("de kaart staat er als de voorwaarde dit oplevert"))}
          ${f(t("Entiteit"), html`<span class="note">${t("Wordt gekozen als je de kaart op een pagina zet. In de templates en de actie-data schrijf je $entity.")}</span>`)}
          ${f(t("Tikken"), html`<select @change=${e => upd({ tap: e.target.value || undefined })}><option value="" ?selected=${!tp.tap}>${t("details van de entiteit")}</option><option value="toggle" ?selected=${tp.tap === "toggle"}>${t("entiteit schakelen")}</option><option value="service" ?selected=${tp.tap === "service"}>${t("actie uitvoeren")}</option><option value="navigate" ?selected=${tp.tap === "navigate"}>${t("naar pad gaan")}</option></select>`)}
          ${tp.tap === "service" ? f(t("Actie"), txt("service", "light.turn_on"), "domein.service") : nothing}
          ${tp.tap === "service" ? f(t("Data"), txt("data", '{"entity_id": "light.x", "brightness_pct": 50}'), "JSON") : nothing}
          ${tp.tap === "navigate" ? f(t("Pad"), txt("path", "/energy")) : nothing}
          <div class="modes n2" style="margin-top:16px"><button class="on" @click=${() => { p.popup = null; }}>${t("Klaar")}</button><button @click=${() => { p.draft = { ...p.draft, templates: list.filter((_, j) => j !== pop.index) }; p.popup = null; }}>${t("Verwijderen")}</button></div>
        </div></div>`;
    }
    case "group": {
      const g = pop.g, m = groupMembers(p, g), on = m.filter(x => x.on).length;
      const svc = id => id.split(".")[0] === "input_boolean" ? "input_boolean" : id.split(".")[0] === "light" ? "light" : id.split(".")[0] === "fan" ? "fan" : "switch";
      return wrap(g.name, on ? t("{n} van {m} aan", { n: on, m: m.length }) : t("Alles uit"), t("tik op een onderdeel om te schakelen"), html`
        <div class="modes n2"><button @click=${() => m.forEach(x => p.call(svc(x.id), "turn_on", { entity_id: x.id }))}>${t("Alles aan")}</button><button @click=${() => m.forEach(x => p.call(svc(x.id), "turn_off", { entity_id: x.id }))}>${t("Alles uit")}</button></div>
        <ul>${m.map(x => li(x.id.startsWith("light.") ? "mdi:lightbulb-outline" : x.id.startsWith("fan.") ? "mdi:fan" : "mdi:power-socket-eu", x.name, x.on ? t("Aan") : t("Uit"), { on: x.on, svg: x.id.startsWith("light.") ? "lamp" : x.id.startsWith("fan.") ? "fan" : "plug", onclick: () => p.call(svc(x.id), "toggle", { entity_id: x.id }) }))}</ul>`);
    }
    case "add": return addPopup(p, pop);
    case "cardcfg": return wrap(roomName, p.pageCards(p.room?.id || "home").find(c => c.key === pop.key)?.label || pop.key, "", nothing);
    case "value": {
      const s = hass.states[pop.e.id] || pop.e.state, v = num(s?.state), unit = s?.attributes?.unit_of_measurement || "";
      return wrap(roomName, label(p, pop.e), unavailable(s) ? t("Onbereikbaar") : v != null ? `${s.state} ${unit}`.trim() : (s?.state || ""), html`
        <ul>${li("mdi:history", t("Laatst gewijzigd"), relTime(s?.last_changed))}${s?.attributes?.device_class ? li("mdi:tag-outline", t("Soort"), s.attributes.device_class.replace(/_/g, " ")) : nothing}</ul>`);
    }
    case "more":
      return wrap(t("Meer"), t("Overzichten"), t("Pagina's die niet bij een kamer horen"), html`
        ${modeList(p).length ? html`<div class="prow" style="margin-top:14px"><span>${t("Modi")}</span><b>${modeList(p).filter(m => m.on).map(m => m.label).join(", ") || ""}</b></div><ul style="margin-top:8px">${modeList(p).map(m => li(m.icon || "mdi:account-switch-outline", m.label, m.on ? t("Actief") : t("Uit"), { on: m.on, sub: m.s.attributes.friendly_name, onclick: () => toggleMode(p, m) }))}</ul>` : nothing}
        <div class="pages">${[...(canEdit(p) && !p.page && !p.settings ? [{ label: p.room ? t("Kamer bewerken") : t("Startpagina bewerken"), sub: t("kaarten toevoegen, verbergen en ordenen"), icon: "mdi:pencil-outline", wide: true, action: () => p.startEdit(p.room?.id || "home") }] : []), ...pagesFor(p.hass).map(([k, v]) => ({ label: t(v.label), sub: t(v.sub), icon: v.icon, path: "__" + k + "__" })), ...(p.config.more || []), { label: t("Home Assistant"), sub: t("Instellingen"), icon: "mdi:cog-outline", path: "/config" }, { label: t("Profiel"), sub: t("gebruiker en thema"), icon: "mdi:account-circle-outline", path: "/profile" }, { label: t("Panel instellingen"), sub: t("kamers, kaarten, foto's"), icon: "mdi:tune", path: "__settings__" }].map(m => html`<a class=${m.wide ? "wide" : ""} @click=${() => m.action ? m.action() : p.goPath(m.path)}><ha-icon icon=${m.icon}></ha-icon><div>${m.label}<small>${m.sub || ""}</small></div></a>`)}</div>`);
    default: return nothing;
  }
}
