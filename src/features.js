// Quick actions, doorbell/motion camera pop-up, pending updates and per-room light presets.
import { t } from "./i18n.js";
import { html, nothing } from "lit";
import { SUFFIX, VERSION, domain, isOn, unavailable } from "./util.js";
import { pressDir } from "./cards.js";

/* ---------- quick actions (home view) ---------- */
export const QUICK_TYPES = { scene: t("Scène"), script: t("Script"), entity: t("Schakelen"), lights_off: t("Alle lampen uit"), media_off: t("Media uit"), announce: t("Omroep") };
const QUICK_ICON = { scene: "mdi:palette-outline", script: "mdi:script-text-outline", entity: "mdi:toggle-switch-outline", lights_off: "mdi:lightbulb-off-outline", media_off: "mdi:stop-circle-outline", announce: "mdi:bullhorn-outline" };
/** the chime-tts presets, for the chime before and after an announcement ("" = none) */
export const CHIMES = ["airport", "ba_dum_tss", "bells", "bells_2", "bright", "chirp", "choir", "chord", "classical", "crickets", "ding_dong", "doorbell", "drumroll", "dun_dun_dun", "error", "fanfare", "glockenspiel", "hail", "knock", "marimba", "mario_coin", "microphone_tap", "sad_trombone", "soft", "tada", "toast", "twenty_four", "whistle"];
export const chimeName = c => c.replace(/_/g, " ").replace(/^./, m => m.toUpperCase());
export const QUICK_DOMAINS = ["light", "switch", "input_boolean", "fan", "media_player", "cover", "lock", "automation"];

export function runQuick(p, q) {
  if (q.type === "announce") return p.openPopup({ type: "announce", q });   // the speakers open in a popup; the message plays on the one that is tapped
  const go = () => {
    if (q.type === "scene") return p.call("scene", "turn_on", { entity_id: q.entity });
    if (q.type === "script") return p.call("script", "turn_on", { entity_id: q.entity });
    if (q.type === "entity") return p.call("homeassistant", "toggle", { entity_id: q.entity });
    if (q.type === "lights_off") { const ids = p.home.lightsOn.map(e => e.id); return ids.length ? p.call("light", "turn_off", { entity_id: ids }) : p.showToast("Alle lampen zijn al uit"); }
    if (q.type === "media_off") { const ids = Object.values(p.hass.states).filter(s => domain(s.entity_id) === "media_player" && !["off", "standby", "unavailable", "unknown"].includes(s.state)).map(s => s.entity_id); return ids.length ? p.call("media_player", "turn_off", { entity_id: ids }) : p.showToast("Er speelt niets"); }
  };
  if (q.confirm) p.openPopup({ type: "confirm", title: t("Snelle actie"), big: q.label, sub: t("Weet je het zeker?"), okLabel: t("Ja"), ok: go });
  else go();
}
const quickOn = (p, q) => q.type === "entity" ? isOn(p.hass.states[q.entity]) : q.type === "lights_off" ? false : q.type === "media_off" ? false : false;
export function quickRow(p) {
  const list = (p.config.home?.quick || []).filter(q => q.label && (q.type === "lights_off" || q.type === "media_off" || (q.type === "announce" ? q.message && q.speakers?.length : q.entity)));
  if (!list.length) return nothing;
  return html`<div class="quick">${list.map(q => html`<button class=${quickOn(p, q) ? "on" : ""} @click=${() => runQuick(p, q)}><ha-icon icon=${q.icon || QUICK_ICON[q.type] || "mdi:flash-outline"}></ha-icon><span>${q.label}</span></button>`)}</div>`;
}

/* ---------- doorbell / motion: open the camera when a trigger fires ---------- */
export function watchTriggers(p) {
  const cfg = p.config.home?.doorbell;
  if (!cfg?.triggers?.length || !cfg.camera) { p._trigPrev = null; return; }
  const prev = p._trigPrev, cur = {}; let fired = null;
  for (const id of cfg.triggers) {
    const s = p.hass.states[id]; if (!s) continue;
    cur[id] = domain(id) === "event" ? s.state : isOn(s);           // event entities: the state is the time of the last event
    if (prev && prev[id] !== undefined && cur[id] !== prev[id] && (domain(id) === "event" || cur[id] === true)) fired = s;
  }
  p._trigPrev = cur;
  if (!fired) return;
  const cam = p.hass.states[cfg.camera]; if (!cam) return;
  p.wake();
  p.openPopup({ type: "camera", s: cam, auto: true, by: fired.attributes.friendly_name || fired.entity_id });
  clearTimeout(p._autoT);
  p._autoT = setTimeout(() => { if (p.popup?.auto) p.popup = null; }, (cfg.seconds || 30) * 1000);
}
/** candidates for the trigger chips: doorbell-like binary sensors and event entities */
export const triggerCandidates = hass => Object.values(hass.states).filter(s => (domain(s.entity_id) === "binary_sensor" && ["occupancy", "motion", "sound", "vibration", "door", "opening", undefined].includes(s.attributes.device_class)) || domain(s.entity_id) === "event")
  .sort((a, b) => (a.attributes.friendly_name || a.entity_id).localeCompare(b.attributes.friendly_name || b.entity_id, "nl"));

/* ---------- pending updates ---------- */
export function pendingUpdates(hass) {
  return Object.values(hass.states)
    .filter(s => domain(s.entity_id) === "update" && s.state === "on" && !(s.attributes.skipped_version && s.attributes.skipped_version === s.attributes.latest_version))
    .map(s => ({ s, id: s.entity_id, title: s.attributes.title || (s.attributes.friendly_name || s.entity_id).replace(/ update$/i, ""), kind: s.attributes.device_class === "firmware" ? t("Firmware") : t("Software"),
      from: s.attributes.installed_version, to: s.attributes.latest_version, busy: !!s.attributes.in_progress, pct: typeof s.attributes.update_percentage === "number" ? s.attributes.update_percentage : typeof s.attributes.in_progress === "number" ? s.attributes.in_progress : null, canInstall: (s.attributes.supported_features & 1) === 1, summary: s.attributes.release_summary }))
    .sort((a, b) => a.title.localeCompare(b.title, "nl"));
}
/** the row on the System and Sensors pages: while an update installs it says so and a tap opens its details instead of offering it again */
export const updateRow = (p, u) => ({ icon: u.kind === t("Firmware") ? "mdi:chip" : "mdi:update", svg: "update", name: u.title,
  sub: u.busy ? `${t("Bezig…")} ${u.from || "?"} → ${u.to || "?"}` : `${u.from || "?"} → ${u.to || "?"}${u.canInstall ? " · " + t("tik = installeren") : ""}`,
  tr: u.busy ? html`<div class=${u.pct == null ? "prog run" : "prog"}><i style="--v:${Math.max(0, Math.min(100, u.pct ?? 0))}%"></i></div>` : nothing,   // without a percentage the bar just runs
  pill: u.busy ? (u.pct != null ? `${Math.round(u.pct)}%` : t("Bezig")) : t("Update"), on: !u.busy, dim: u.busy, tap: () => installUpdate(p, u) });
export function installUpdate(p, u) {
  if (!u.canInstall || u.busy) return p.moreInfo(u.id);
  p.openPopup({ type: "confirm", title: t("Update installeren"), big: u.title, sub: `${u.from || "?"} → ${u.to || "?"}${u.summary ? " · " + u.summary.replace(/\s+/g, " ").slice(0, 160) : ""}`, okLabel: t("Installeren"), ok: () => p.call("update", "install", { entity_id: u.id }) });
}

/* ---------- light presets per room (saved light states, stored with the user settings) ---------- */
export const roomPresets = (p, r) => (p.config.presets || {})[r.id] || [];
export function snapshot(p, r) {
  const st = {};
  for (const e of r.ents.lights) {
    const s = p.hass.states[e.id]; if (!s || unavailable(s)) continue;
    const a = s.attributes;
    st[e.id] = !isOn(s) ? { on: false } : { on: true,
      ...(a.brightness != null && { brightness: a.brightness }),
      ...(a.color_mode === "color_temp" && a.color_temp_kelvin && { color_temp_kelvin: a.color_temp_kelvin }),
      ...(["hs", "rgb", "xy", "rgbw", "rgbww"].includes(a.color_mode) && a.hs_color && { hs_color: a.hs_color }) };
  }
  return st;
}
export function applyPreset(p, pr) {
  const off = Object.entries(pr.states).filter(([, v]) => !v.on).map(([id]) => id);
  if (off.length) p.call("light", "turn_off", { entity_id: off });
  for (const [id, v] of Object.entries(pr.states)) if (v.on) { const { on, ...data } = v; p.call("light", "turn_on", { entity_id: id, ...data }); }
}
/** true when every light in the preset is currently on/off as the preset says (brightness/colour not compared) */
export const presetMatches = (p, pr) => { const ids = Object.keys(pr.states); return ids.length > 0 && ids.every(id => { const s = p.hass.states[id]; return s && isOn(s) === !!pr.states[id].on; }); };
export function presetCard(p, r) {
  const list = roomPresets(p, r);
  return html`<div class="card scenes presets" ${pressDir(p, { tap: () => p.openPopup({ type: "presets", roomId: r.id }) })}>
    <div class="n">${t("Lichtscènes")}</div>
    <div class="s">${list.map(pr => html`<button class=${presetMatches(p, pr) ? "on" : ""} title=${pr.name} @click=${ev => { ev.stopPropagation(); applyPreset(p, pr); }}><ha-icon icon=${pr.icon || "mdi:lightbulb-group-outline"}></ha-icon></button>`)}
      <button class="add" title=${t("Huidige stand opslaan")} @click=${ev => { ev.stopPropagation(); p.openPopup({ type: "presets", roomId: r.id, form: true }); }}><ha-icon icon="mdi:plus"></ha-icon></button></div>
  </div>`;
}

export const featureStyles = `
  .offline{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:80;display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;background:rgba(242,122,92,.95);color:#fff;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;box-shadow:0 10px 30px rgba(0,0,0,.35);animation:fadeIn .3s ease-out both}
  .offline ha-icon{--mdc-icon-size:18px}
  /* desktop: the title sits at a fixed height and moves up to make room for the quick actions; on a phone it is in the flow (transform:none) and must not move */
  @media (min-width:901px){ .title:has(.quick:not(.row)){transform:translateY(-56%)} }
  @media (min-width:901px) and (max-height:620px){ .title:has(.quick:not(.row)){transform:translateY(-64%)} }
  @media (max-height:620px){ .quick:not(.row){margin-top:10px} }
  .quick:not(.row){display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 0 5px;max-width:640px}
  .quick:not(.row) button{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 16px 0 12px;border:0;border-radius:999px;background:rgba(255,255,255,.14);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);color:#fff;font:inherit;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .quick:not(.row) button:active{background:rgba(255,255,255,.3)}
  .quick:not(.row) button.on{background:rgba(255,255,255,.4)}
  .quick:not(.row) button ha-icon{--mdc-icon-size:18px}
  .card.presets .s button.add{background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1px rgba(255,255,255,.3)}
  .popup .fc.hours{display:flex;overflow-x:auto;scrollbar-width:none}
  .popup .fc.hours>div{flex:1 0 60px}
  .popup .fc div img.ico{width:24px;height:24px;margin:6px auto;display:block}
  .popup .fc div.today{background:rgba(255,255,255,.22)}
  .popup .confirm-text{white-space:pre-line}
  .srow .prog{position:relative;height:6px;border-radius:3px;background:rgba(255,255,255,.15);overflow:hidden}
  .srow .prog i{position:absolute;inset:0 auto 0 0;width:var(--v);border-radius:3px;background:#fff;transition:width .6s ease}
  .srow .prog.run i{width:35%;animation:progRun 1.4s ease-in-out infinite}
  @keyframes progRun{from{left:-35%}to{left:100%}}
  .popup.wiz .wfoot{margin-top:22px}
  .popup.wiz .dots{display:flex;gap:6px;justify-content:center;margin-bottom:14px}
  .popup.wiz .dots i{width:8px;height:8px;border-radius:50%;background:#fff;opacity:.3}
  .popup.wiz .dots i.on{opacity:1}
  .popup.wiz .modes.n3{grid-template-columns:1fr 1fr 1fr}
  .popup.wiz .chips{margin-top:14px}
  .popup li img.avatar{width:34px;height:34px;border-radius:50%;object-fit:cover;margin-left:-2px}
  .popup .form.lines .lrow{display:grid;grid-template-columns:150px 1fr max-content;gap:6px;margin-top:4px}
  .popup .form.lines .lrow button,.popup .form.lines .addline{border:0;border-radius:var(--r-sm);background:rgba(255,255,255,.14);color:#fff;font:inherit;font-size:12px;font-weight:700;padding:9px 12px;cursor:pointer}
  .popup .form.lines .addline{margin-top:6px}
  .popup .plist li{grid-template-columns:30px 1fr max-content;padding:10px 12px 10px 16px;font-size:14px}
  .popup .plist li.off{opacity:.45}
  .popup .plist li .btns{display:flex;gap:4px}
  .popup .plist li .btns button{width:32px;height:32px;border:0;border-radius:50%;background:rgba(255,255,255,.14);color:#fff;font:inherit;font-weight:700;cursor:pointer;display:grid;place-items:center}
  .popup .plist li .btns button:disabled{opacity:.3;cursor:default}
  .popup .plist li .btns button ha-icon{--mdc-icon-size:18px}
  .popup .form .f small{display:block;font-size:11px;font-weight:500;opacity:.65}
  .popup .form .f button{border:0;border-radius:var(--r-sm);background:rgba(255,255,255,.14);color:#fff;font:inherit;font-size:12px;font-weight:700;padding:9px 12px;cursor:pointer;justify-self:start}
  .popup .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
  .popup .chips button{border:0;border-radius:999px;background:rgba(255,255,255,.1);color:#fff;font:inherit;font-size:12px;font-weight:600;padding:8px 12px;cursor:pointer;opacity:.6}
  .popup .chips button.on{background:rgba(255,255,255,.35);opacity:1}
  .settings input[type=file]{padding:7px 10px;font-size:12px}
  .settings input[type=checkbox]{width:auto;justify-self:start;accent-color:#fff;transform:scale(1.2)}
  /* .quick is the home page row; the settings rows are .row.quick and must not pick up its pill buttons and margins (:not(.row) above) */
  .settings .row.quick{grid-template-columns:1.2fr 1fr 1fr 1.4fr max-content max-content;align-items:center}
  .settings .row.quick label{display:flex;align-items:center;gap:4px;font-size:11px;opacity:.8;white-space:nowrap}
  .settings .qa{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px 10px;margin:2px 0 12px;padding:12px;border:1px solid var(--line);border-radius:12px;align-items:start}
  .settings .qa .f{margin:0;min-width:0;grid-template-columns:1fr;gap:6px;align-items:start;align-content:start}   /* label above the control: the usual 190px label column leaves a three-column cell no room for the control */
  .settings .qa .vol{display:grid;grid-template-columns:28px 1fr 28px;gap:6px;align-items:center;height:38px;padding:0 5px;box-sizing:border-box;background:rgba(0,0,0,.35);border-radius:var(--r-sm)}
  .settings .qa .vol button{height:28px;width:28px;padding:0;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;border-radius:8px}
  .settings .qa .vol b{text-align:center;font-size:13px;font-weight:600}
  .settings .qa select,.settings .qa input[type=text]{height:38px;box-sizing:border-box}
  .settings .qa .wide{grid-column:1 / -1}
  .settings .qa .spk{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:4px 12px;margin-top:6px}
  .settings .qa .spk label{display:flex;align-items:center;gap:8px;font-size:13px;min-width:0}
  .settings .qa .spk label span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .settings .qa .spk small{opacity:.6;margin-left:4px}
  @media (max-width:900px){
    .settings .qa{grid-template-columns:1fr}
    .quick:not(.row){margin:12px 0 0 2px}
    .quick:not(.row) button{height:34px;font-size:11px;padding:0 12px 0 10px}
    .settings .row.quick{grid-template-columns:1fr 1fr}
  }
`;

/* ---------- a newer Tomte ---------- */
const REPO = "emile-bodin/TomTe";
const parts = v => String(v || "").replace(/^v/, "").split(/[.-]/).slice(0, 3).map(n => parseInt(n, 10) || 0);
/** true when version a is newer than b ("v3.0.5" > "3.0.4") */
export const newer = (a, b) => { const x = parts(a), y = parts(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
/** the update to offer an administrator, or null: GitHub's latest release of this project (checked at most twice a day,
 *  cached per browser); tapping it opens the release page. Dev builds stay quiet. */
export function selfUpdate(p) {
  const hass = p.hass;
  if (!hass?.user?.is_admin || p.config.noUpdateCheck || SUFFIX) return null;
  checkGithub(p);
  const g = p.ghLatest;
  return g?.tag && newer(g.tag, VERSION) ? { to: g.tag, from: VERSION, open: () => window.open(g.url, "_blank", "noopener") } : null;
}
let ghBusy = false;
function checkGithub(p) {
  if (p.ghLatest !== undefined || ghBusy) return;
  ghBusy = true;
  const KEY = "tomte:latest-release";
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(KEY) || "null"); } catch {}
  if (cached && Date.now() - cached.at < 12 * 3600e3) { queueMicrotask(() => { p.ghLatest = cached; ghBusy = false; }); return; }
  fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
    .then(r => (r.ok ? r.json() : null))
    .then(j => { const v = { tag: j?.tag_name || null, url: j?.html_url || `https://github.com/${REPO}/releases`, at: Date.now() }; try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} p.ghLatest = v; })
    .catch(() => { p.ghLatest = null; })
    .finally(() => { ghBusy = false; });
}
