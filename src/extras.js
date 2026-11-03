// Notifications, energy statistics, alarm keypad and the idle screen.
import { t, locale } from "./i18n.js";
import { html, nothing } from "lit";
import { num, clock, isOn, unavailable } from "./util.js";
import { condText, condIcon, cardCfg, isHidden, applianceIcon, mediaView, carIds, carTitle } from "./cards.js";
import { applianceState, applianceEnd } from "./extras2.js";
import { deviceName, name as entName } from "./model.js";

/* ---------- persistent notifications (live subscription) ---------- */
export function subscribeNotifications(hass, cb) {
  if (!hass?.connection?.subscribeMessage) return () => {};
  return hass.connection.subscribeMessage(msg => cb(Object.values(msg?.notifications || msg || {})), { type: "persistent_notification/subscribe" });
}

/* ---------- hourly energy for today from the recorder ---------- */
export async function hourlyToday(hass, statisticId) {
  if (!statisticId) return null;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  try {
    const r = await hass.callWS({ type: "recorder/statistics_during_period", start_time: start.toISOString(), statistic_ids: [statisticId], period: "hour", types: ["change", "sum"] });
    const rows = r?.[statisticId] || [];
    return rows.map(x => ({ t: new Date(x.start), v: x.change ?? 0 }));
  } catch (e) { console.warn("[tomte] statistics unavailable", e); return null; }
}
export const bars = (rows, unit = "kWh") => {
  if (!rows) return html`<div class="sub">${t("Geen geschiedenis beschikbaar")}</div>`;
  if (!rows.length) return html`<div class="sub">${t("Nog geen gegevens voor vandaag")}</div>`;
  const max = Math.max(...rows.map(r => r.v), 0.001), now = new Date().getHours();
  return html`<div class="bars">${rows.map(r => html`<i class=${r.t.getHours() === now ? "now" : ""} style="height:${Math.max(3, r.v / max * 100)}%" title="${r.t.getHours()}:00 · ${r.v.toFixed(2)} ${unit}"></i>`)}</div>
    <div class="bars-x"><span>0</span><span>6</span><span>12</span><span>18</span><span>24</span></div>`;
};

/* ---------- alarm keypad ---------- */
export function keypad(p, pop) {
  const code = pop.code || "";
  const press = k => p.openPopup({ ...pop, code: k === "⌫" ? code.slice(0, -1) : code + k });
  const ok = async () => { try { await p.call("alarm_control_panel", pop.pending, { entity_id: p.home.alarm.entity_id, code }); p.openPopup({ ...pop, pending: null, code: "" }); } catch { p.openPopup({ ...pop, code: "" }); } };
  const lbl = { alarm_disarm: t("Code om uit te schakelen"), alarm_arm_home: t("Code om thuis in te schakelen"), alarm_arm_away: t("Code om weg in te schakelen"), alarm_arm_night: t("Code om nacht in te schakelen") }[pop.pending];
  return html`<div class="keypad">
    <div class="kcode">${code ? "•".repeat(code.length) : html`<span>${lbl}</span>`}</div>
    <div class="kgrid">${["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"].map(k => html`<button class=${k === "OK" ? "on" : ""} @click=${() => k === "OK" ? ok() : press(k)}>${k}</button>`)}</div>
    <button class="klink" @click=${() => p.openPopup({ ...pop, pending: null, code: "" })}>${t("Annuleren")}</button>
  </div>`;
}

/* ---------- idle screen ---------- */
const IDLE_TILES = 6;
/** what is active right now, most time-bound first: { icon, name, sub, room }; a tap goes to the room (a car has none: home) */
function idleTiles(p, show) {
  const appliances = p.rooms.flatMap(r => r.ents.appliances.filter(a => !a.plain && !isHidden(p, a.id) && /^mdi:(washing-machine|tumble-dryer|dishwasher)$/.test(applianceIcon(cardCfg(p, a.id).name || deviceName(p.hass, a.device)))).map(a => {
    const c = cardCfg(p, a.id), st = applianceState(p.hass, a, c.threshold ?? 5), name = c.name || deviceName(p.hass, a.device);
    return ["running", "waiting", "done"].includes(st.st) ? { icon: c.icon || applianceIcon(name), name, sub: [st.label, applianceEnd(st)].filter(Boolean).join(" · "), room: r } : null;
  })).filter(Boolean);
  const cars = carIds(p.hass).filter(k => !isHidden(p, "car:" + k) && p.hass.states[`binary_sensor.${k}_battery_charging`]?.state === "on").map(k => {
    const batt = p.hass.states[`sensor.${k}_battery`], end = new Date(p.hass.states[`sensor.${k}_battery_charging_end`]?.state);
    return { icon: cardCfg(p, "car:" + k).icon || "mdi:car-electric-outline", name: carTitle(p, k), sub: [unavailable(batt) ? t("Laden") : `${num(batt.state)}%`, end > Date.now() ? t("Klaar om {t}", { t: end.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }) }) : ""].filter(Boolean).join(" · "), room: null };
  });
  const media = p.rooms.flatMap(r => r.ents.media.filter(e => !isHidden(p, e.id)).map(e => {
    const v = mediaView(p, e), a = v.info?.attributes || {};
    return v.playing || v.paused ? { icon: cardCfg(p, e.id).icon || (a.media_content_type === "music" || a.media_artist ? "mdi:music" : "mdi:television"), name: v.title || v.app?.name || cardCfg(p, e.id).name || entName(p.hass, e), sub: [r.name, v.playing ? "" : t("Gepauzeerd")].filter(Boolean).join(" · "), room: r } : null;
  })).filter(Boolean);
  const lights = p.rooms.map(r => {
    const on = r.ents.lights.filter(e => isOn(e.state) && !e.reg.entity_category && !isHidden(p, e.id));
    return on.length ? { icon: "mdi:lightbulb-on-outline", name: r.name, sub: on.length > 1 ? t("{n} lampen", { n: on.length }) : cardCfg(p, on[0].id).name || entName(p.hass, on[0]), room: r } : null;
  }).filter(Boolean);
  const all = [...(show("appliances") ? appliances : []), ...(show("cars") ? cars : []), ...(show("media") ? media : []), ...(show("lights") ? lights : [])];
  return all.length > IDLE_TILES ? [...all.slice(0, IDLE_TILES - 1), { icon: "mdi:dots-horizontal", name: t("+{n} meer", { n: all.length - IDLE_TILES + 1 }), sub: "", room: null }] : all;
}

export function idleScreen(p) {
  const w = p.home?.weather, h = p.home;
  const date = new Date().toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" });
  // the content drifts a little each minute (screen burn-in) and is dimmer between 23:00 and 06:00
  const min = Math.floor(Date.now() / 60000), rnd = k => { const v = Math.sin(min * 12.9898 + k * 78.233) * 43758.5453; return (v - Math.floor(v)) * 2 - 1; }, hr = new Date().getHours(), night = hr >= 23 || hr < 6;
  // what the settings hide; the unsaved choices count while the settings are open, so "Nu tonen" previews them
  const hide = (p.draft || p.config).idleHide || [], show = k => !hide.includes(k), tiles = idleTiles(p, show);
  const line = [show("temp") && h?.temp != null ? t("{t}° binnen", { t: h.temp.toFixed(1) }) : "", show("doors") && h?.doorsOpen?.length ? t("{n} deur open", { n: h.doorsOpen.length }) : "", show("notices") && h?.attention?.length ? t("{n} meldingen", { n: h.attention.length }) : ""].filter(Boolean).join(" · ");
  return html`<div class="idle" style=${`--ix:${(rnd(1) * 8).toFixed(2)}vw;--iy:${(rnd(2) * 10).toFixed(2)}vh;--io:${night ? 0.35 : 1}`} @pointerdown=${() => p.wake(true)}>
    <div class="iclock">${clock()}</div>
    ${show("date") ? html`<div class="idate">${date}</div>` : nothing}
    ${w && show("weather") ? html`<div class="iwx"><ha-icon icon=${condIcon(w.state)}></ha-icon>${Math.round(num(w.attributes.temperature) ?? 0)}° · ${condText(w.state)}</div>` : nothing}
    ${line ? html`<div class="iline">${line}</div>` : nothing}
    ${tiles.length ? html`<div class="itiles">${tiles.map(x => html`<div class="itile" @pointerdown=${() => p.go(x.room)}><ha-icon icon=${x.icon}></ha-icon><div><b>${x.name}</b>${x.sub ? html`<small>${x.sub}</small>` : nothing}</div></div>`)}</div>` : nothing}
  </div>`;
}

export const extraStyles = `
  .toast{position:fixed;left:50%;bottom:110px;transform:translateX(-50%);z-index:70;max-width:min(560px,calc(100vw - 32px));padding:14px 20px;border-radius:999px;background:rgba(242,122,92,.92);color:#fff;font-size:13px;font-weight:600;letter-spacing:.5px;box-shadow:0 10px 30px rgba(0,0,0,.35);animation:fadeIn .25s ease-out both}
  .bars{display:flex;align-items:flex-end;gap:3px;height:70px;margin-top:16px;padding:0 2px}
  .bars i{flex:1;border-radius:3px 3px 0 0;background:rgba(255,255,255,.35);min-height:3px}
  .bars i.now{background:#fff}
  .bars-x{display:flex;justify-content:space-between;font-size:10px;opacity:.6;margin-top:4px;letter-spacing:1px}
  .keypad{margin-top:18px}
  .kcode{height:44px;display:flex;align-items:center;justify-content:center;font-size:26px;letter-spacing:8px;border-radius:var(--r-sm);background:rgba(0,0,0,.25)}
  .kcode span{font-size:13px;letter-spacing:0;opacity:.7}
  .kgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px}
  .kgrid button{height:56px;border:1px solid var(--line);border-radius:var(--r-sm);background:rgba(255,255,255,.1);color:#fff;font:inherit;font-size:20px;font-weight:600;cursor:pointer}
  .kgrid button.on{background:rgba(255,255,255,.4)}
  .klink{display:block;margin:12px auto 0;border:0;background:transparent;color:#fff;opacity:.7;font:inherit;font-size:12px;letter-spacing:1px;text-transform:uppercase;cursor:pointer}
  .idle{position:absolute;inset:0;z-index:60;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;animation:fadeIn 1.2s ease-out both;user-select:none}
  .idle>*{transform:translate(var(--ix,0),var(--iy,0));filter:brightness(var(--io,1));transition:transform 2s ease-in-out,filter 2s ease-in-out}
  .iclock{font-size:clamp(72px,16vw,160px);font-weight:700;letter-spacing:-4px;line-height:1;opacity:.9}
  .idate{font-size:18px;font-weight:500;opacity:.7;text-transform:capitalize}
  .iwx{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:.8;margin-top:14px}
  .iwx ha-icon{--mdc-icon-size:24px}
  .iline{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;opacity:.5;margin-top:4px}
  .itiles{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;width:min(860px,82vw);margin-top:14px}
  .itile{flex:0 1 270px;min-width:0;min-height:56px;box-sizing:border-box;display:flex;align-items:center;gap:12px;padding:8px 14px;border:1px solid rgba(255,255,255,.16);border-radius:var(--r-sm);background:rgba(255,255,255,.06)}
  .itile ha-icon{--mdc-icon-size:24px;flex:none;opacity:.8}
  .itile>div{min-width:0}
  .itile b,.itile small{display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
  .itile b{font-size:14px;font-weight:600}
  .itile small{font-size:11px;font-weight:500;opacity:.65;margin-top:2px}
  @media (max-height:520px){.iclock{font-size:64px;letter-spacing:-2px}.idate,.iline{display:none}.iwx{margin-top:0}.itiles{margin-top:2px}.itile{flex-basis:200px;min-height:48px;padding:4px 12px}}
`;
