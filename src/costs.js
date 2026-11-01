// Verbruik card: use and cost of electricity and gas. The meters and prices come from the settings of Home Assistant's Energy dashboard,
// the use from the recorder's statistics of those meters, so the numbers follow the dashboard. The current power comes from the panel's own
// Vermogen sensor (home.energy.power): the dashboard's power sensor can be anything, and here it is two plugs.
import { html, nothing } from "lit";
import { t, locale } from "./i18n.js";
import { num } from "./util.js";
import { pressDir, cardCfg, icoFor } from "./cards.js";

const TTL = 10 * 60000;

/** one entry per metered source: grid sources come flat or with flow_from, depending on the Home Assistant version */
const sourcesOf = prefs => (prefs?.energy_sources || []).flatMap(s => {
  if (s.type === "gas") return [{ ...s, kind: "gas" }];
  return s.type === "grid" ? (s.flow_from || [s]).filter(f => f.stat_energy_from).map(f => ({ ...f, kind: "grid" })) : [];
});

/** "Stroom dal" and "Stroom normaal" from "P1 Meter Energy import Dal" and "… Normaal": what the names do not share is the tariff */
function labels(p, lines) {
  const words = lines.map(l => (p.hass.states[l.id]?.attributes.friendly_name || "").split(" "));
  let same = 0; while (words[0][same] && words.every(w => w[same] === words[0][same])) same++;
  return lines.map((l, i) => lines.length === 1 ? null : words[i].slice(same).join(" ").toLowerCase() || String(i + 1));
}

/** the contract year around a date: from the last anniversary of the contract date (home.energy.start) to the next. Without a date, the calendar year */
function contractYear(p, now) {
  const [, m = 1, d = 1] = (p.config.home?.energy?.start || "").split("-").map(Number);
  const y = new Date(now.getFullYear(), m - 1, d) > now ? now.getFullYear() - 1 : now.getFullYear();
  return [new Date(y, m - 1, d), new Date(y + 1, m - 1, d)];
}
const yearAgo = d => new Date(d.getFullYear() - 1, d.getMonth(), d.getDate());
const dayCount = (a, b) => Math.round((b - a) / 864e5);
const total = rows => rows.reduce((n, x) => n + (x.change || 0), 0);
/** a sum over have days scaled up to want days; a missing day is allowed, today's statistics may not be there yet */
const fill = (sum, have, want) => have >= want - 1 ? sum : sum * want / have;

/** today, this month and last month per source, as use and as use times today's price. For the contract year: done is the use so far,
    rest the same days a year ago, so the season counts; without those days it goes on at this year's average and says so (guessed) */
async function loadCosts(p) {
  if (p._costsBusy) return; p._costsBusy = true;
  const now = new Date(), Y = now.getFullYear(), M = now.getMonth(), start = p.config.home?.energy?.start;
  const today = +new Date(Y, M, now.getDate()), tomorrow = new Date(Y, M, now.getDate() + 1), month = +new Date(Y, M, 1), last = +new Date(Y, M - 1, 1), [from, to] = contractYear(p, now);
  const elapsed = dayCount(from, tomorrow), remain = dayCount(tomorrow, to);
  try {
    const src = sourcesOf(await p.hass.callWS({ type: "energy/get_prefs" }));
    const stats = (begin, end) => p.hass.callWS({ type: "recorder/statistics_during_period", start_time: new Date(begin).toISOString(), ...(end ? { end_time: new Date(end).toISOString() } : {}), statistic_ids: src.map(s => s.stat_energy_from), period: "day", types: ["change"] });
    const [rows, years, ago] = src.length ? await Promise.all([stats(last), stats(from), remain > 0 ? stats(yearAgo(tomorrow), yearAgo(to)) : {}]) : [{}, {}, {}];
    const lines = [...src.filter(s => s.kind === "grid"), ...src.filter(s => s.kind === "gas")].map(s => {
      const r = rows?.[s.stat_energy_from] || [], y = years?.[s.stat_energy_from] || [], a = ago?.[s.stat_energy_from] || [], price = s.number_energy_price ?? num(p.hass.states[s.entity_energy_price]?.state) ?? null;
      const sum = (from, to) => r.filter(x => { const d = +new Date(x.start); return d >= from && d < to; }).reduce((n, x) => n + (x.change || 0), 0);
      const done = y.length ? fill(total(y), y.length, elapsed) : 0, rest = a.length ? fill(total(a), a.length, remain) : y.length ? total(y) / y.length * remain : 0;
      return { id: s.stat_energy_from, kind: s.kind, price, unit: p.hass.states[s.stat_energy_from]?.attributes.unit_of_measurement || (s.kind === "gas" ? "m³" : "kWh"), today: sum(today, Infinity), month: sum(month, Infinity), last: sum(last, month), done, rest, guessed: y.length < elapsed - 1 || a.length < remain - 1 };
    });
    for (const k of ["grid", "gas"]) { const part = lines.filter(l => l.kind === k), names = part.length ? labels(p, part) : []; part.forEach((l, i) => { l.tariff = names[i]; }); }
    p.costsData = { at: Date.now(), start, from, to, lines };
  } catch (e) { console.warn("[tomte] energy dashboard unavailable", e); p.costsData = { at: Date.now(), start, lines: [] }; }
  p._costsBusy = false; p.requestUpdate();
}
const costsOf = p => { const d = p.costsData; if (!d || Date.now() - d.at > TTL || d.start !== p.config.home?.energy?.start) loadCosts(p); return d?.lines || []; };

/** the picker offers the card unless the Energy dashboard turns out to have no meters */
export const costsAvailable = p => costsOf(p).length > 0 || !p.costsData;

const nr = (v, dec) => v.toLocaleString(locale(), { minimumFractionDigits: dec, maximumFractionDigits: dec });
const eur = (v, dec = 2) => v == null ? "–" : "€ " + nr(v, dec);
/** what these lines cost over a period; unknown as soon as one of them has no price */
const cost = (lines, per) => lines.some(l => l.price == null) ? null : lines.reduce((n, l) => n + l[per] * l.price, 0);
const use = (lines, per) => lines.reduce((n, l) => n + l[per], 0);
const name = l => l.kind === "gas" ? t("Gas") : l.tariff ? `${t("Stroom")} ${l.tariff}` : t("Stroom");
const power = p => { const v = num(p.home?.energy?.power?.state); return v == null ? null : `${Math.round(v)} W`; };

/** the phone and low cards keep this month's use (.s says so); larger cards also show today and the cost */
export function costsCard(p) {
  const lines = costsOf(p); if (!lines.length) return null;
  const col = (title, part) => { if (!part.length) return nothing; const u = part[0].unit, row = (cls, label, per, dec, cdec) => html`<div class=${"cr " + cls}><span class="cl">${label}</span><b>${nr(use(part, per), dec)} ${u}</b><em>${eur(cost(part, per), cdec)}</em></div>`;
    return html`<div class="cc"><span class="ch">${title}</span>${row("cd", t("Vandaag"), "today", 1, 2)}${row("cm", t("Deze maand"), "month", 0, 0)}</div>`; };
  return html`<div class="card costs" ${pressDir(p, { tap: () => p.openPopup({ type: "costs" }) })}>
    <div class="i">${icoFor(p, "costs", "mdi:receipt-text-outline", null)}</div>
    <div class="c">${power(p) || ""}</div>
    <div class="n">${cardCfg(p, "costs").name || t("Verbruik")}</div>
    <div class="s">${t("Deze maand")}</div>
    <div class="ccols">${col(t("Stroom"), lines.filter(l => l.kind === "grid"))}${col(t("Gas"), lines.filter(l => l.kind === "gas"))}</div>
  </div>`;
}

/** big and sub of the popup: this month's cost next to the power now */
export const costsBig = p => { const w = power(p), c = cost(costsOf(p), "month"); return html`<span class="cbig"><span>${eur(c)}</span>${w ? html`<span class="cnow"><b>${w}</b><small>${t("Nu")}</small></span>` : nothing}</span>`; };

/** the contract year at today's prices plus the fixed costs against twelve instalments.
    The verdict waits for all three settings: without the fixed costs it would look better than it is, without the date it is the wrong year. */
function yearBlock(p, lines) {
  const done = cost(lines, "done"), rest = cost(lines, "rest"), { from, to } = p.costsData || {};
  if (!lines.length || done == null || !from) return nothing;
  const cfg = p.config.home?.energy, term = num(cfg?.term), fixed = num(cfg?.fixed), known = term != null && fixed != null && !!cfg?.start;
  const expected = done + rest + (fixed ?? 0) * 12, left = known ? term * 12 - expected : null;
  const date = d => d.toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" }), row = (label, v) => html`<div class="cyr"><span>${label}</span><b>${v}</b></div>`;
  return html`<div class="cyear">
    <div class="cyh">${t("Contractjaar")} ${date(from)} – ${date(new Date(to.getFullYear(), to.getMonth(), to.getDate() - 1))}</div>
    ${row(t("Verbruik tot nu"), eur(done, 0))}
    ${row(t("Verwacht voor de rest van het jaar"), eur(rest, 0))}
    ${row(t("Vaste kosten"), fixed == null ? "–" : eur(fixed * 12, 0))}
    ${row(t("Verwachte kosten"), eur(expected, 0))}
    ${row(term == null ? t("Termijnen") : `${t("Termijnen")} (12 × ${eur(term)})`, term == null ? "–" : eur(term * 12, 0))}
    ${known ? html`<div class=${"cyr cyv" + (left < 0 ? " over" : "")}><span>${left < 0 ? t("Boven je termijnen") : t("Binnen je termijnen")}</span><b>${left < 0 ? t("{a} tekort", { a: eur(-left, 0) }) : t("{a} over", { a: eur(left, 0) })}</b></div>` : nothing}
  </div>
  <div class="cnote">${lines.some(l => l.guessed) ? t("Er ontbreken metingen, dus dit is deels geschat met het gemiddelde van dit jaar.") : t("De rest van het jaar is geschat met dezelfde dagen van vorig jaar, tegen de huidige prijzen.")}${known ? nothing : html` ${t("Vul je contractdatum, termijnbedrag en vaste kosten in bij Instellingen → Energie.")}`}</div>`;
}

/** body of the popup: every source with its price, for today, this month and last month, then the year against the instalments */
export function costsPopup(p) {
  const lines = costsOf(p), pers = ["today", "month", "last"];
  return html`<table class="ctab">
    <tr><th></th><th>${t("Vandaag")}</th><th>${t("Deze maand")}</th><th>${t("Vorige maand")}</th></tr>
    ${lines.map(l => html`<tr><td>${name(l)}<small>${l.price == null ? "–" : `€ ${nr(l.price, 4)} / ${l.unit}`}</small></td>${pers.map(k => html`<td>${eur(cost([l], k))}<small>${nr(l[k], 1)} ${l.unit}</small></td>`)}</tr>`)}
    <tr class="tot"><td>${t("Totaal")}</td>${pers.map(k => html`<td>${eur(cost(lines, k))}</td>`)}</tr>
  </table>
  <div class="cnote">${t("Zonder vastrecht en netbeheer. Berekend met de prijzen uit het Energy-dashboard.")}</div>
  ${yearBlock(p, lines)}`;
}

export const costsStyles = `
  /* ===== Verbruik card: power in the corner, a column each for electricity and gas in the bottom-line row (--lh is its height) ===== */
  .card.costs{--lh:96px;--rows:max-content 1fr max-content max-content 0 var(--lh)}
  .card.costs .s{display:none}
  .card.costs .ccols{position:absolute;left:var(--cp);right:var(--cp);bottom:var(--cp);display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr)}
  .card.costs .cc{min-width:0;padding:0 12px}
  .card.costs .cc:first-child{padding-left:0}
  .card.costs .cc:last-child{padding-right:0}
  .card.costs .cc+.cc{border-left:1px solid var(--line)}
  .card.costs .ch{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.4px;color:var(--fg-3);line-height:1.3;margin-bottom:4px}
  .card.costs .cr{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:6px;white-space:nowrap}
  .card.costs .cr+.cr{margin-top:6px}
  .card.costs .cl{grid-column:1/-1;font-size:11px;font-weight:500;color:var(--fg-3);line-height:1.25}
  .card.costs .cr b{font-size:13px;font-weight:600;line-height:1.35;overflow:hidden;text-overflow:ellipsis}
  .card.costs .cr em{font-size:13px;font-style:normal;font-weight:500;line-height:1.35;color:var(--fg-2)}
  .popup .cbig{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}
  .popup .cnow{display:flex;flex-direction:column;align-items:flex-end;font-size:22px;line-height:1.1;letter-spacing:0}
  .popup .cnow b{font-weight:600}
  .popup .cnow small{font-size:13px;font-weight:500;color:var(--fg-3);margin-top:3px}
  .popup .ctab{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:16px;font-size:13px}
  .popup .ctab th{font-size:11px;font-weight:600;color:var(--fg-3);text-align:right;padding:0 0 8px 6px;vertical-align:bottom}
  .popup .ctab th:first-child{width:33%}
  .popup .ctab td{border-top:1px solid var(--line);padding:9px 0 9px 6px;text-align:right;vertical-align:top;font-weight:600;white-space:nowrap}
  .popup .ctab td:first-child{text-align:left;padding-left:0;white-space:normal}
  .popup .ctab small{display:block;font-size:11px;font-weight:400;color:var(--fg-3);line-height:1.4;white-space:nowrap}
  .popup .ctab .tot td{font-size:14px;font-weight:700}
  .popup .cnote{font-size:11px;color:var(--fg-3);margin-top:10px}
  .popup .cyear{margin-top:20px;font-size:13px}
  .popup .cyh{font-size:11px;font-weight:600;color:var(--fg-3);padding-bottom:8px}
  .popup .cyr{display:flex;justify-content:space-between;gap:12px;border-top:1px solid var(--line);padding:9px 0}
  .popup .cyr b{font-weight:600;white-space:nowrap}
  .popup .cyv{font-size:14px;font-weight:700}
  .popup .cyv b{font-weight:700}
  .popup .cyv.over{color:#f2b63a}
`;
