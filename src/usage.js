// AI usage cards (Claude Code, ChatGPT): the 5-hour session and the weekly limit, read from the sensors of a usage integration
// (percentages with the moment each window resets). Added to a page through Bewerken → Kaart toevoegen → Tomte cards.
import { html, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { t, locale } from "./i18n.js";
import { num, unavailable, relTime } from "./util.js";
import { pressDir, cardCfg, icoFor, ua } from "./cards.js";
import { loadGraph, line } from "./graph.js";

const WINDOWS = { session: { ms: 5 * 3600000, label: "Sessie (5 uur)", attr: "session_resets_at" }, week: { ms: 7 * 86400000, label: "Week", attr: "weekly_resets_at" } };
const WARN = 70, CRIT = 90, STALE_MS = 30 * 60000, PACE_SLACK = 10;

/** the providers: the card key (also the key of the settings under `home`), the name on the card and the word in the entity ids */
export const USAGE_PROVIDERS = {
  claude: { name: "Claude Code", icon: "mdi:creation", match: /claude/i },
  chatgpt: { name: "ChatGPT", icon: "mdi:chat-processing-outline", match: /chatgpt/i },
};

/** the four sensors of a provider: from Settings → AI usage, else found by name (sensor.claude_5_h_session, sensor.chatgpt_week, …) */
export function usageSensors(p, prov) {
  const set = p.config.home?.[prov] || {}, ids = Object.keys(p.hass?.states || {}).filter(id => id.startsWith("sensor.") && USAGE_PROVIDERS[prov].match.test(id));
  const find = (win, reset) => ids.find(id => (win === "session" ? /(session|5_?h)/ : /week/).test(id) && /reset/.test(id) === reset) || null;
  return { session: set.session || find("session", false), week: set.week || find("week", false), sessionReset: set.sessionReset || find("session", true), weekReset: set.weekReset || find("week", true) };
}
export const usageAvailable = (p, prov) => { const s = usageSensors(p, prov); return !!(s.session || s.week); };

/** the moment a window resets: the sensor's attribute (a timestamp), else the reset sensor's text ("17:50" or "29/10 00:00") */
function resetAt(p, state, resetId, attr) {
  const a = state?.attributes?.[attr], d = a ? new Date(a) : null;
  if (d && !isNaN(d)) return d;
  const txt = resetId ? p.hass.states[resetId]?.state : null, m = /^(?:(\d{1,2})\/(\d{1,2}) )?(\d{1,2}):(\d{2})$/.exec(String(txt || ""));
  if (!m) return null;
  const now = new Date(), at = new Date(now.getFullYear(), m[2] ? +m[2] - 1 : now.getMonth(), m[1] ? +m[1] : now.getDate(), +m[3], +m[4]);
  if (!m[1] && at < now) at.setDate(at.getDate() + 1);                     // a bare time is the next one
  if (m[1] && at < now - 86400000 * 30) at.setFullYear(at.getFullYear() + 1);
  return at;
}
/** "2 u 55 min", "55 min", "3 d 4 u" */
export function span(ms) {
  const m = Math.max(0, Math.round(ms / 60000)), h = Math.floor(m / 60);
  if (m < 60) return t("{m} min", { m });
  if (h < 48) return t("{h} u {m} min", { h, m: m % 60 });
  return t("{d} d {h} u", { d: Math.floor(h / 24), h: h % 24 });
}

/** everything the card and the popup show about one window */
export function usageWindow(p, prov, kind) {
  const sensors = usageSensors(p, prov), id = sensors[kind], w = WINDOWS[kind];
  if (!id) return null;
  const s = p.hass.states[id], down = !s || unavailable(s), pct = down ? null : num(s.state);
  const reset = down ? null : resetAt(p, s, sensors[kind + "Reset"], w.attr), left = reset ? reset - Date.now() : null;
  const elapsed = left != null ? Math.min(1, Math.max(0, 1 - left / w.ms)) : null;
  const last = s?.attributes?.last_success_at ? new Date(s.attributes.last_success_at) : null, stale = !!last && Date.now() - last > STALE_MS;
  const status = s?.attributes?.state && s.attributes.state !== "ok" ? String(s.attributes.state) : null;
  return { kind, id, state: s, down, pct, reset, left, elapsed, pace: pct != null && elapsed != null ? (pct > elapsed * 100 + PACE_SLACK ? "over" : "within") : null,
    level: pct == null ? "" : pct >= CRIT ? "crit" : pct >= WARN ? "warn" : "ok", last, stale, status, label: t(w.label) };
}
const pctText = v => v == null ? "–" : `${Math.round(v)} %`;

/** The usage card laid out like every other card (docs/cards.md, docs/card-layout.md): icon top left, the notice (ahead of schedule, outdated, an error) top right,
 *  name and the next reset in the middle, the two meters in the bottom-line row (`--lh` is their height, so the name keeps the height of the other cards) */
export function usageCard(p, prov) {
  const wins = ["session", "week"].map(k => usageWindow(p, prov, k)).filter(Boolean);
  if (!wins.length) return null;
  const P = USAGE_PROVIDERS[prov], cfg = cardCfg(p, prov), down = wins.every(w => w.down), stale = wins.some(w => w.stale), over = wins.some(w => w.pace === "over");
  const notice = wins.find(w => w.status)?.status || (stale ? t("verouderd") : over ? t("boven schema") : "");
  const worst = wins.reduce((a, w) => (w.pct ?? 0) > (a ?? 0) ? w.pct : a, null), ses = wins.find(w => w.kind === "session");
  return html`<div class=${classMap({ card: true, usage: true, unavailable: down, stale, over, on: worst >= CRIT })} ${pressDir(p, { tap: () => p.openPopup({ type: "usage", provider: prov }) })}>
    ${down ? ua() : nothing}
    <div class="i">${icoFor(p, prov, P.icon, null)}</div>
    <div class="c">${ses?.left != null ? span(ses.left) : ""}</div>
    <div class="n">${cfg.name || P.name}</div>
    <div class="s">${notice}</div>
    <div class="um">${wins.map(w => html`<div class=${"m " + w.level}>
      <span class="ml">${w.label}</span><b>${pctText(w.pct)}</b>
      <i class="bar"><u style=${`width:${Math.min(100, w.pct ?? 0)}%`}></u>${w.elapsed != null ? html`<s style=${`left:${(w.elapsed * 100).toFixed(1)}%`} title=${t("Verstreken deel van het venster")}></s>` : nothing}</i></div>`)}</div>
  </div>`;
}

/** body of the popup: the numbers, whether the pace is on schedule, and the history of both windows */
export function usagePopup(p, prov, li) {
  const wins = ["session", "week"].map(k => usageWindow(p, prov, k)).filter(Boolean);
  const hist = (w, hours) => {
    const key = `usage:${prov}:${w.kind}`, h = p.graphHist?.[key];
    if (w.id && (!h || Date.now() - h.at > 5 * 60000 || h.hours !== hours)) loadGraph(p, { id: key, entity: w.id, hours });
    return html`<div class="vs">${w.label} · ${hours === 24 ? t("Afgelopen 24 uur") : t("Afgelopen {n} dagen", { n: hours / 24 })}</div><div class="cgraph">${line(h?.pts || [])}</div>`;
  };
  return html`
    <ul>${wins.flatMap(w => [
      li("mdi:timer-sand", w.label, pctText(w.pct), { on: w.level === "crit", sub: w.left != null ? t("reset over {t}", { t: span(w.left) }) + " · " + w.reset.toLocaleString(locale(), { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "", onclick: () => p.moreInfo(w.id) }),
      w.pace ? li("mdi:speedometer", t("Tempo"), w.pace === "over" ? t("boven schema") : t("binnen schema"), { on: w.pace === "over", sub: t("{u} % gebruikt · {e} % van het venster verstreken", { u: Math.round(w.pct), e: Math.round(w.elapsed * 100) }) }) : null,
    ]).filter(Boolean)}
    ${wins.some(w => w.last) ? li("mdi:update", t("Laatst bijgewerkt"), relTime(wins.find(w => w.last).last.toISOString()), { on: wins.some(w => w.stale) }) : nothing}</ul>
    ${wins.map(w => hist(w, w.kind === "week" ? 168 : 24))}`;
}

export const usageStyles = `
  /* ===== AI usage cards (Claude Code, ChatGPT): the time left of the session in the corner, two meters (session, week) in the bottom-line row, with a tick for where the window's time stands ===== */
  .card.usage{--um:28px;--lh:calc(var(--um) * 2 + var(--bg));--reserve:0px}
  .card.usage .um{position:absolute;left:var(--cp);right:var(--cp);bottom:var(--cp);display:grid;gap:var(--bg)}
  .card.usage .m{height:var(--um);display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:1fr auto;gap:4px 8px;align-items:end}
  .card.usage .ml{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.4px;color:var(--fg-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .card.usage .m b{font-size:14px;font-weight:700;letter-spacing:-.2px;color:var(--fg)}
  .card.usage .bar{grid-column:1/-1;position:relative;display:block;height:5px;border-radius:3px;background:rgba(255,255,255,.14)}
  .card.usage .bar u{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:#fff;transition:width .6s ease}
  .card.usage .m.warn .bar u{background:#f2b63a}
  .card.usage .m.crit .bar u{background:#f27a5c}
  .card.usage .m.crit b{color:#f27a5c}
  .card.usage .bar s{position:absolute;top:-3px;bottom:-3px;width:2px;margin-left:-1px;border-radius:1px;background:rgba(255,255,255,.8)}
  .card.usage.over .s,.card.usage.stale .s{color:#f2b63a}
  .popup .cgraph{height:56px;margin:4px 0 14px}
  .popup .cgraph svg{display:block;width:100%;height:100%;overflow:visible}
`;
