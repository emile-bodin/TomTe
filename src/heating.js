// Heating page: shows and tunes the household's heating rules (Home Assistant package verwarming.yaml), which drive climate.nest.
// The page only appears when sensor.verwarming_doel exists; everything else here is read from those rules' helpers and sensors.
// Laid out like the Sensors page: filter pills on top, then blocks of rows in columns.
import { html, nothing, svg } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { t, locale } from "./i18n.js";
import { num, relTime, unavailable } from "./util.js";
import { ico } from "./cards.js";
import { fetchNumeric } from "./extras3.js";
import { srow, sblock, fmt } from "./pages.js";

const IN = "input_number.verwarming_", DT = "input_datetime.verwarming_", NEST = "climate.nest";
const MAIN = "input_boolean.verwarming_brain_regelt", HAND = "timer.verwarming_hand", HOLIDAY = "input_boolean.vakantie_modus";
const ROOM = "sensor.nest_temperature", GOAL = "sensor.verwarming_doel", SET = "sensor.nest_setpoint", BOILER = "sensor.nest_hvac_action";
const OUT = "sensor.weer_home_temperature", SUN = "sensor.weer_home_solar_radiation", GAS = "sensor.gas_meter_gas";
// the period on the old Nest schedule, the first day that can count as the new rules, the days needed before comparing, and hot water per day (an estimate from September)
const BASE_FROM = "2026-10-19", BASE_TO = "2026-11-01", NEW_FROM = "2026-11-03", NEW_DAYS = 14, HOT_WATER = 0.4;

const val = (p, id) => num(p.hass.states[id]?.state);
const deg = v => v == null ? "–" : `${fmt(v, 1)}°`;
const clock = (p, id, dflt) => { const s = p.hass.states[id]?.state; return /^\d\d:\d\d/.test(s || "") ? s.slice(0, 5) : dflt; };
const mins = hm => +hm.slice(0, 2) * 60 + +hm.slice(3, 5);
const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m) % 60).padStart(2, "0")}`;
const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const weekday = () => (new Date().getDay() + 6) % 7;   // 0 = Monday
const on = (p, id) => p.hass.states[id]?.state === "on";
const blockName = k => ({ hand: t("Met de hand"), vakantie: t("Vakantie"), deur: t("Deur open"), weg: t("Niemand thuis"), opwarmen: t("Opwarmen"), nacht: t("Nacht"), thuisdag: t("Thuisdag"), avond: t("Avond"), avond_desiree: t("Avond, Desiree thuis"), dag: t("Dag") }[k] || k);

/** when the boiler has to start for the coming warm time: the same sum as the automation Verwarming - opwarmen */
function preheat(p) {
  const warm = clock(p, DT + (weekday() < 5 ? "warm_werkdag" : "warm_weekend"), "06:30");
  const goal = (val(p, IN + "dag") ?? 18.5) + (p.hass.states["sensor.verwarming_weer"]?.state === "koud" ? 0.5 : 0);
  const room = val(p, ROOM) ?? goal, out = val(p, "sensor.verwarming_buiten_gemiddeld") ?? 8;
  const rate = Math.max((val(p, IN + "opwarmsnelheid") ?? 0.6) - (val(p, IN + "warmteverlies") ?? 0.021) * (10 - out), 0.3);
  const need = Math.min(Math.round((goal - room) / rate * 60), 180);
  return { warm, goal, room, out, rate, need, start: need > 0 ? hhmm(Math.max(mins(warm) - need, 0)) : null };
}

/** the blocks of today, as [kind, from, to] in minutes */
function dayBlocks(p) {
  const wd = weekday(), pre = preheat(p), nowM = new Date().getHours() * 60 + new Date().getMinutes();
  const warm = mins(pre.warm), evening = mins(clock(p, DT + "avondstart", "16:00")), stopS = p.hass.states["sensor.verwarming_avondstop"]?.state;
  const stop = mins(/^\d\d:\d\d$/.test(stopS || "") ? stopS : "21:30"), home = mins(clock(p, DT + "start_thuisdag", "08:00"));
  const heatUp = pre.need > 0 && nowM < warm ? Math.max(warm - pre.need, 0) : warm;
  const list = [["nacht", 0, heatUp], ["opwarmen", heatUp, warm]];
  if ([1, 2].includes(wd) && home > warm && home < evening) list.push(["dag", warm, home], ["thuisdag", home, evening]); else list.push(["dag", warm, evening]);
  list.push(["avond", evening, stop], ["nacht", stop, 1440]);
  return list.filter(b => b[2] > b[1]);
}

/* ---------- history: every 5 minutes while the page is open ---------- */
async function rawStates(p, ids, hours) {
  try {
    const r = await p.hass.callWS({ type: "history/history_during_period", start_time: new Date(Date.now() - hours * 3600000).toISOString(), entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false });
    return Object.fromEntries(ids.map(id => [id, (r?.[id] || []).map(x => ({ t: (x.lu || x.lc) * 1000, s: x.s }))]));
  } catch (e) { console.warn("[tomte] heating history failed", e); return {}; }
}
async function loadHeat(p) {
  const hours = p.heatHours || 24, cur = p.heatHist;
  if (p._heatBusy || (cur && cur.hours === hours && Date.now() - cur.at < 5 * 60000)) return;
  p._heatBusy = true;
  try {
    const [nums, week] = await Promise.all([fetchNumeric(p.hass, [ROOM, GOAL, SET, OUT, SUN], hours), rawStates(p, [BOILER, HAND], 168)]);
    p.heatHist = { at: Date.now(), hours, nums, boiler: week[BOILER] || [], hand: (week[HAND] || []).filter(r => r.s === "active") };
  } finally { p._heatBusy = false; }
  p.requestUpdate();
}
async function loadDays(p) {
  if (p._heatDaysBusy || (p.heatDays && Date.now() - p.heatDays.at < 30 * 60000)) return;
  p._heatDaysBusy = true;
  const from = new Date(Math.min(new Date(`${BASE_FROM}T00:00:00`).getTime(), Date.now() - 14 * 86400000));
  const days = {};
  try {
    const r = await p.hass.callWS({ type: "recorder/statistics_during_period", start_time: from.toISOString(), statistic_ids: [GAS, OUT], period: "day", types: ["change", "mean"] });
    for (const x of r?.[GAS] || []) (days[dayKey(new Date(x.start))] ||= {}).gas = x.change;
    for (const x of r?.[OUT] || []) (days[dayKey(new Date(x.start))] ||= {}).out = x.mean;
  } catch (e) { console.warn("[tomte] heating statistics failed", e); }
  p.heatDays = { at: Date.now(), days };
  p._heatDaysBusy = false;
  p.requestUpdate();
}
const degreeDays = out => out == null ? null : Math.max(0, 18 - out);
/** heating gas per degree day over a period of whole days */
function perDegreeDay(days, from, to) {
  let gas = 0, dd = 0, n = 0;
  for (const [k, d] of Object.entries(days)) if (k >= from && k <= to && d.gas != null && d.out != null) { gas += Math.max(0, d.gas - HOT_WATER); dd += degreeDays(d.out); n++; }
  return { n, v: dd > 0 ? gas / dd : null };
}

/* ---------- the question mark on every block's header: opens a popup explaining the block ---------- */
const helpTexts = () => ({
  now: { title: t("Nu"), what: t("De actuele cijfers: kamertemperatuur, het doel van de regeling, buiten, stookuren en gas van vandaag."), does: t("Laat in één oogopslag zien of de kamer op het doel zit en of de ketel brandt. Tik op een rij voor de geschiedenis van die sensor.") },
  rules: { title: t("Regeling"), what: t("De hoofdschakelaar, de stand van de Nest en hoe vaak iemand de stand met de hand heeft gewijzigd."), does: t("Met de hoofdschakelaar bepaal je of brAIn de Nest stuurt. Uit is meekijken: het doel wordt berekend, maar er gaat niets naar de Nest. Aanzetten vraagt een tweede tik. Staat hij aan, dan telt een andere stand als met de hand en blijft die staan tot het volgende blok, maximaal 3 uur.") },
  today: { title: t("Vandaag"), what: t("De blokken van vandaag op een balk van 00:00 tot 24:00, met een streepje op het huidige moment."), does: t("Laat zien wanneer welke stand geldt volgens het schema. Uitzonderingen zoals niemand thuis of een open deur staan hier niet op; die zie je bij Nu.") },
  autos: { title: t("Automations"), what: t("De vier automations die de regeling uitvoeren, met wanneer ze voor het laatst liepen."), does: t("De regelaar stuurt de Nest, handbediening herkent een handmatige wijziging, opwarmen start de ketel op tijd en storing waarschuwt als de Nest niet volgt. Zet je er een uit, dan werkt dat deel van de regeling niet meer.") },
  temp: { title: t("Temperatuur"), what: t("De kamertemperatuur (wit), het doel van de regeling (geel gestippeld) en de stand van de Nest (blauw). De rode strook eronder is wanneer de ketel brandde."), does: t("Hiermee zie je of de kamer het doel haalt en of de ketel op een goed moment stookt. Tijdens het meekijken verschillen doel en stand: de Nest volgt dan nog zijn eigen schema.") },
  out: { title: t("Buiten"), what: t("De buitentemperatuur en de zon, gemeten door het weerstation."), does: t("Het weer stuurt de regeling mee: bij kou start de ketel eerder en gaat de stand 0,5° omhoog, bij zacht weer of zon gaat hij 0,5° omlaag. Hoe zachter het is, hoe vroeger de avondstop.") },
  gas: { title: t("Gas per dag"), what: t("Het gasverbruik per dag over 14 dagen (grijs), met daaronder de graaddagen: hoe koud die dag was (geel)."), does: t("Zo zie je of een hoog verbruik door de kou komt. Is een dag hoog in gas maar laag in graaddagen, dan is er meer gestookt dan nodig. Warm water zit in het gasverbruik.") },
  effect: { title: t("Effect"), what: t("Het gasverbruik per graaddag van het oude Nest-schema tegenover de nieuwe regeling."), does: t("Dit is de eerlijke vergelijking, want een koudere week telt niet tegen de regeling. Er komt pas een conclusie na 14 dagen met de regeling aan. Per dag is 0,4 m³ afgetrokken voor warm water; dat is een schatting.") },
  temps: { title: t("Temperaturen"), what: t("De temperatuur per blok: dag, thuisdag, avond, avond met Desiree thuis, en nacht en weg."), does: t("Met − en + wijzig je de stand direct in Home Assistant; dat werkt binnen een minuut. Lager is zuiniger: elke graad scheelt ongeveer 6 tot 7% stookgas. De regeling blijft altijd tussen 16° en 21°.") },
  times: { title: t("Tijden"), what: t("Wanneer het warm moet zijn, wanneer de thuisdag en de avond beginnen, en tussen welke tijden de avondstop valt."), does: t("De warm-tijd is het moment waarop de kamer warm moet zijn; de ketel start zelf eerder als dat nodig is. De avondstop kiest de regeling elke avond om 20:00 tussen de vroegste en laatste tijd, afhankelijk van het weer.") },
  weather: { title: t("Weer"), what: t("De grenzen waarbij het weer de stand verandert, en de vakantieschakelaar."), does: t("Onder de koud-grens gaat de stand 0,5° omhoog, boven de zacht-grens of de zon-grens 0,5° omlaag. Daarvoor telt het gemiddelde van het afgelopen uur. De vakantieschakelaar houdt de nachtstand vast tot je hem uitzet.") },
  measured: { title: t("Gemeten waarden van het huis"), what: t("Hoe snel het huis opwarmt met de ketel aan, en hoeveel warmte het verliest per graad verschil met buiten."), does: t("De regeling rekent hiermee uit wanneer de ketel moet starten en wanneer de avondstop valt. Dit zijn metingen, geen voorkeuren. Pas ze alleen aan als de ketel steeds te vroeg of te laat start.") },
  explain: { title: t("Uitleg"), what: t("Hoe de hele regeling werkt, met de actuele waarden erin."), does: t("Tik op een onderwerp om het te openen. Waarom nu deze stand staat standaard open en verandert mee met wat de regeling doet.") },
  attention: { title: t("Aandacht"), what: t("Een probleem dat nu speelt: de Nest is onbereikbaar, staat op uit, of volgt het doel al 30 minuten niet."), does: t("Dit blok verschijnt alleen als er iets mis is. Tik op de rij voor de details van de Nest. Een aanhoudende afwijking stuurt ook één melding per dag naar je telefoon.") },
});
const hq = (p, key, title) => html`<span class="hth">${title}<button class="hq" aria-label=${t("Uitleg bij deze kaart")} @click=${ev => { ev.preventDefault(); ev.stopPropagation(); p.openPopup({ type: "heatinfo", key }); }}>?</button></span>`;
export const heatInfoTitle = key => helpTexts()[key]?.title || "";
export const heatInfo = key => { const c = helpTexts()[key]; return c ? html`<div class="hinfo"><h4>${t("Wat je ziet")}</h4><p>${c.what}</p><h4>${t("Wat het doet")}</h4><p>${c.does}</p></div>` : nothing; };

/* ---------- charts ---------- */
const W = 600;
function lines(series, hours, h = 96, unit = "°") {
  const now = Date.now(), start = now - hours * 3600000, rows = series.flatMap(s => s.rows);
  if (!rows.length) return html`<div class="hempty">${t("Nog geen gegevens voor deze periode")}</div>`;
  const vals = rows.map(r => r.v), lo = Math.floor(Math.min(...vals)), hi = Math.ceil(Math.max(...vals)), span = hi - lo || 1;
  const x = at => ((Math.max(at, start) - start) / (now - start) * W).toFixed(1), y = v => (h - 4 - (v - lo) / span * (h - 8)).toFixed(1);
  const path = s => { if (!s.rows.length) return ""; let d = `M${x(s.rows[0].t)},${y(s.rows[0].v)}`, prev = s.rows[0].v; for (const r of s.rows.slice(1)) { d += s.step ? ` L${x(r.t)},${y(prev)} L${x(r.t)},${y(r.v)}` : ` L${x(r.t)},${y(r.v)}`; prev = r.v; } return `${d} L${W},${y(prev)}`; };
  return html`<div class="hplot" style="height:${h}px"><em class="hi">${hi}${unit}</em><em class="lo">${lo}${unit}</em>
    ${svg`<svg viewBox="0 0 ${W} ${h}" preserveAspectRatio="none">${series.map(s => svg`<path d=${path(s)} fill="none" stroke=${s.color} stroke-width=${s.width || 2} stroke-dasharray=${s.dash || "none"} stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`)}</svg>`}</div>`;
}
const boilerSpans = (rows, hours) => {
  const now = Date.now(), start = now - hours * 3600000, out = [];
  rows.forEach((r, i) => { if (r.s !== "on") return; const end = rows[i + 1]?.t ?? now; if (end > start) out.push([Math.max(r.t, start), end]); });
  return out.map(([a, b]) => ({ l: (a - start) / (now - start) * 100, w: (b - a) / (now - start) * 100 }));
};
const timeAxis = hours => { const now = Date.now(), f = hours > 48 ? { weekday: "short" } : { hour: "2-digit", minute: "2-digit" }; return html`<div class="bx">${[4, 3, 2, 1, 0].map(i => html`<span>${new Date(now - hours * 3600000 * i / 4).toLocaleString(locale(), f)}</span>`)}</div>`; };
const legend = list => html`<div class="hleg">${list.map(([c, l]) => html`<span><i style="background:${c}"></i>${l}</span>`)}</div>`;
const chartBlock = (title, meta, body) => html`<div class="sblk hcb"><h3>${title}${meta ? html`<b>${meta}</b>` : nothing}</h3><div class="hcbody">${body}</div></div>`;

function charts(p) {
  const h = p.heatHist, hours = p.heatHours || 24, n = h?.nums || {};
  const c = { room: "#fff", goal: "rgba(255,220,130,.95)", set: "rgba(140,200,255,.95)", boiler: "rgba(242,122,92,.9)" };
  const spans = boilerSpans(h?.boiler || [], hours);
  const days = p.heatDays?.days || {}, last = Array.from({ length: 14 }, (_, i) => { const d = new Date(Date.now() - (13 - i) * 86400000), x = days[dayKey(d)] || {}; return { d, gas: x.gas ?? 0, dd: degreeDays(x.out) ?? 0 }; });
  const maxG = Math.max(...last.map(r => r.gas), 0.1), maxD = Math.max(...last.map(r => r.dd), 0.1), dayLabel = d => d.toLocaleDateString(locale(), { day: "numeric", month: "short" });
  const yest = dayKey(new Date(Date.now() - 86400000)), base = perDegreeDay(days, BASE_FROM, BASE_TO), after = perDegreeDay(days, NEW_FROM, yest);
  const running = on(p, MAIN);
  const verdict = !running ? t("De regeling stuurt nog niet, dus er valt nog niets te vergelijken.")
    : after.n < NEW_DAYS || after.v == null || base.v == null ? t("Nog te vroeg: {n} van de {m} dagen.", { n: after.n, m: NEW_DAYS })
    : t("{p}% ten opzichte van het oude schema, op {n} dagen.", { p: `${after.v <= base.v ? "−" : "+"}${fmt(Math.abs(after.v / base.v - 1) * 100, 0)}`, n: after.n });
  const m3 = v => v == null ? "–" : v.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return [
    chartBlock(hq(p, "temp", t("Temperatuur")), h?.hours === hours ? "" : t("laden…"), html`
      ${lines([{ rows: n[SET] || [], color: c.set, step: true, width: 1.5 }, { rows: n[GOAL] || [], color: c.goal, step: true, dash: "5 4" }, { rows: n[ROOM] || [], color: c.room }], hours)}
      <div class="hband">${spans.map(s => html`<i style="left:${s.l.toFixed(2)}%;width:${Math.max(s.w, 0.3).toFixed(2)}%"></i>`)}</div>
      ${timeAxis(hours)}${legend([[c.room, t("kamer")], [c.goal, t("doel")], [c.set, t("stand Nest")], [c.boiler, t("ketel aan")]])}`),
    chartBlock(hq(p, "out", t("Buiten")), t("temperatuur en zon"), html`
      ${lines([{ rows: n[OUT] || [], color: c.set }], hours, 56)}
      ${lines([{ rows: n[SUN] || [], color: c.goal }], hours, 32, "")}
      ${timeAxis(hours)}${legend([[c.set, t("buiten (°C)")], [c.goal, t("zon (W/m²)")]])}`),
    chartBlock(hq(p, "gas", t("Gas per dag")), t("14 dagen"), html`
      <div class="hbwrap hgas"><div class="hbars">${last.map(r => html`<i class=${classMap({ now: dayKey(r.d) === dayKey(new Date()) })} style="height:${Math.max(3, r.gas / maxG * 100)}%" title="${dayLabel(r.d)} · ${fmt(r.gas, 2)} m³"></i>`)}</div></div>
      <div class="hbwrap hdd"><div class="hbars">${last.map(r => html`<i class="sun" style="height:${Math.max(3, r.dd / maxD * 100)}%" title="${dayLabel(r.d)} · ${fmt(r.dd, 1)}"></i>`)}</div></div>
      <div class="bx"><span>${dayLabel(last[0].d)}</span><span>${t("vandaag")}</span></div>
      ${legend([["rgba(255,255,255,.3)", t("gas (m³)")], ["rgba(255,220,130,.75)", t("graaddagen: hoe koud het was")]])}`),
    sblock(hq(p, "effect", t("Effect")), [
      srow({ icon: "mdi:history", name: t("Oude schema"), sub: t("19 okt t/m 1 nov"), val: m3(base.v), unit: "m³" }),
      srow({ icon: "mdi:leaf", name: t("Nieuwe regeling"), sub: verdict, val: running ? m3(after.v) : "–", unit: "m³", dim: !running }),
      html`<p class="hnote">${t("Een graaddag is 18° min de gemiddelde buitentemperatuur. Per dag is {w} m³ afgetrokken voor warm water; dat is een schatting.", { w: fmt(HOT_WATER, 1) })}</p>`,
    ], t("m³ per graaddag")),
  ];
}

/* ---------- options: rows with a stepper or a time field ---------- */
const stepRow = ({ icon, label, sub = "", v, unit = "", dec = 1, canDown = true, canUp = true, down, up, tap = null }) => html`<div class=${classMap({ srow: true, hopt: true })} @click=${tap}>
  ${ico(icon)}<div class="nm">${label}${sub ? html`<small>${sub}</small>` : nothing}</div>
  <div class="hstep" @click=${ev => ev.stopPropagation()}><button aria-label=${t("Lager")} ?disabled=${!canDown} @click=${down}>−</button><b>${v == null ? "–" : v.toLocaleString(locale(), { minimumFractionDigits: dec, maximumFractionDigits: dec })}<small>${unit}</small></b><button aria-label=${t("Hoger")} ?disabled=${!canUp} @click=${up}>+</button></div></div>`;
function numberRow(p, id, icon, label, sub = "") {
  const s = p.hass.states[id]; if (!s) return nothing;
  const v = num(s.state), step = s.attributes.step || 0.5, lo = s.attributes.min, hi = s.attributes.max, dec = step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 1 : 0;
  const set = d => () => p.call("input_number", "set_value", { entity_id: id, value: +Math.min(hi, Math.max(lo, v + d)).toFixed(3) });
  return stepRow({ icon, label, sub, v, unit: s.attributes.unit_of_measurement === "°C" ? "°" : s.attributes.unit_of_measurement || "", dec, canDown: v != null && v > lo, canUp: v != null && v < hi, down: set(-step), up: set(step) });
}
/** what was typed as HH:MM on a 24-hour clock, or null: "6:30", "630" and "0630" are all 06:30. A plain text field, because type="time" follows the browser's clock and shows AM/PM on some desktops. */
const parseTime = v => {
  const d = String(v).replace(/\D/g, ""), h = +(d.length > 2 ? d.slice(0, -2) : d), m = +(d.length > 2 ? d.slice(-2) : 0);
  return d && d.length <= 4 && h < 24 && m < 60 ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` : null;
};
function timeRow(p, id, icon, label, sub = "") {
  const s = p.hass.states[id]; if (!s) return nothing;
  return html`<div class="srow hopt">${ico(icon)}<div class="nm">${label}${sub ? html`<small>${sub}</small>` : nothing}</div>
    <input class="htime" type="text" inputmode="numeric" maxlength="5" placeholder="00:00" aria-label=${label} .value=${(s.state || "").slice(0, 5)} @focus=${e => e.target.select()} @change=${e => {
      const hm = parseTime(e.target.value);
      e.target.value = hm || (s.state || "").slice(0, 5);
      if (hm) p.call("input_datetime", "set_datetime", { entity_id: id, time: `${hm}:00` }); else p.showToast(t("Vul een tijd in, zoals 06:30"));
    }}></div>`;
}
const options = p => [
  sblock(hq(p, "temps", t("Temperaturen")), [
    numberRow(p, IN + "dag", "mdi:weather-sunny", t("Dag")),
    numberRow(p, IN + "thuisdag", "mdi:home-account", t("Thuisdag"), t("di en wo, als Desiree thuis is")),
    numberRow(p, IN + "avond", "mdi:weather-night", t("Avond")),
    numberRow(p, IN + "avond_desiree", "mdi:home-account", t("Avond, Desiree thuis")),
    numberRow(p, IN + "nacht", "mdi:power-sleep", t("Nacht en weg"), t("ook bij deur open en vakantie")),
  ], t("wijzigingen werken binnen een minuut")),
  sblock(hq(p, "times", t("Tijden")), [
    timeRow(p, DT + "warm_werkdag", "mdi:calendar-week", t("Warm op ma t/m vr")),
    timeRow(p, DT + "warm_weekend", "mdi:calendar-weekend", t("Warm op za en zo")),
    timeRow(p, DT + "start_thuisdag", "mdi:home-clock-outline", t("Start thuisdag")),
    timeRow(p, DT + "avondstart", "mdi:weather-sunset", t("Start avond")),
    timeRow(p, DT + "avondstop_vroegst", "mdi:clock-start", t("Avondstop op z'n vroegst"), t("wordt om 20:00 vastgezet")),
    timeRow(p, DT + "avondstop_laatst", "mdi:clock-end", t("Avondstop op z'n laatst"), t("wordt om 20:00 vastgezet")),
  ]),
  sblock(hq(p, "weather", t("Weer")), [
    numberRow(p, IN + "koud_grens", "mdi:snowflake", t("Koud onder"), t("dan 0,5° warmer")),
    numberRow(p, IN + "zacht_grens", "mdi:sun-thermometer", t("Zacht boven"), t("dan 0,5° lager")),
    numberRow(p, IN + "zon_grens", "mdi:white-balance-sunny", t("Zon boven"), t("dan 0,5° lager")),
    srow({ icon: "mdi:bag-suitcase-outline", name: t("Vakantie"), sub: t("nachtstand tot je hem uitzet"), toggle: () => p.call("input_boolean", "toggle", { entity_id: HOLIDAY }), on: on(p, HOLIDAY), tap: () => p.moreInfo(HOLIDAY) }),
  ]),
  html`<details class="sblk hmore"><summary>${hq(p, "measured", t("Gemeten waarden van het huis"))}</summary>
    <p class="hnote">${t("Dit zijn metingen van brAIn, geen voorkeuren. Pas ze alleen aan als de ketel steeds te vroeg of te laat start.")}</p>
    ${numberRow(p, IN + "opwarmsnelheid", "mdi:speedometer", t("Opwarmsnelheid"), t("zoveel graden per uur met de ketel aan"))}
    ${numberRow(p, IN + "warmteverlies", "mdi:home-thermometer-outline", t("Warmteverlies"), t("per uur, per graad verschil met buiten"))}
  </details>`,
];

/* ---------- explanation: one fold per subject, the first one open ---------- */
function reason(p, block, weer, goal) {
  const text = { hand: t("Iemand heeft de stand met de hand gewijzigd. Dat blijft staan tot het volgende blok, en maximaal 3 uur."),
    vakantie: t("De vakantieschakelaar staat aan, dus de nachtstand geldt."), deur: t("Een buitendeur staat al minstens 5 minuten open, dus de ketel stookt niet tot de deur dicht is."),
    weg: t("Er is al minstens 30 minuten niemand thuis. Zodra iemand thuiskomt, gaat de stand terug."), opwarmen: t("De ketel warmt de kamer alvast op voor de warm-tijd."),
    nacht: t("Buiten de dag- en avonduren staat de verwarming laag. Het huis koelt traag af, dus de ketel hoeft dan meestal niet aan."),
    thuisdag: t("Op dinsdag en woensdag is Desiree thuis, dus overdag is het warmer."), avond: t("De avondstand geldt."), avond_desiree: t("De avondstand geldt, en iets warmer omdat Desiree thuis is."),
    dag: t("De dagstand geldt.") }[block] || "";
  const extra = weer === "koud" ? t("Het is koud buiten, dus er staat 0,5° bij.") : weer === "zacht" ? t("Het is zacht buiten, dus er gaat 0,5° af.") : weer === "zon" ? t("De zon schijnt, dus er gaat 0,5° af.") : "";
  return `${t("Doel {v}.", { v: deg(goal) })} ${text}${extra && ["dag", "opwarmen", "thuisdag", "avond", "avond_desiree"].includes(block) ? ` ${extra}` : ""}`;
}
function explain(p, block, weer, goal) {
  const pre = preheat(p), stop = p.hass.states["sensor.verwarming_avondstop"]?.state || "–";
  const part = (icon, title, body, open = false) => html`<details class="hlp" ?open=${open}><summary>${ico(icon)}<span>${title}</span></summary><p>${body}</p></details>`;
  return html`<div class="sblk hexpl"><h3>${hq(p, "explain", t("Uitleg"))}</h3>
    ${part("mdi:help-circle-outline", t("Waarom nu deze stand"), reason(p, block, weer, goal), true)}
    ${part("mdi:calendar-clock", t("Hoe de dag loopt"), t("Op werkdagen is het om {w} warm, in het weekend om {e}. Overdag geldt {d}, vanaf {a} de avondstand van {v} (of {vd} als Desiree thuis is). Na de avondstop geldt {n}. Op dinsdag en woensdag is het overdag {h} als Desiree thuis is.", { w: clock(p, DT + "warm_werkdag", "–"), e: clock(p, DT + "warm_weekend", "–"), d: deg(val(p, IN + "dag")), a: clock(p, DT + "avondstart", "–"), v: deg(val(p, IN + "avond")), vd: deg(val(p, IN + "avond_desiree")), n: deg(val(p, IN + "nacht")), h: deg(val(p, IN + "thuisdag")) }))}
    ${part("mdi:radiator", t("Slim opwarmen"), pre.start ? t("De ketel start zo laat mogelijk. Nu zou dat om {s} zijn: de kamer is {r}, moet {g} worden, en warmt bij {o} buiten ongeveer {v}° per uur op.", { s: pre.start, r: deg(pre.room), g: deg(pre.goal), o: deg(pre.out), v: fmt(pre.rate, 2) }) : t("De ketel start zo laat mogelijk, maximaal 3 uur vooraf. De kamer is nu {r} en moet {g} zijn, dus opwarmen is nu niet nodig.", { r: deg(pre.room), g: deg(pre.goal) }))}
    ${part("mdi:clock-end", t("Avondstop"), t("De ketel stopt zo vroeg dat de kamer tot 23:00 maximaal 0,5° zakt. Hoe zachter het buiten is, hoe vroeger dat kan. De tijd wordt elke avond om 20:00 vastgezet. Vanavond: {s}.", { s: stop }))}
    ${part("mdi:format-list-numbered", t("Wat voorgaat"), t("Met de hand wint altijd. Daarna vakantie, een open deur, niemand thuis, en dan pas het dagschema. Staat de Nest zelf op uit, dan blijft de regeling eraf."))}
    ${part("mdi:alert-outline", t("Bij een storing"), t("Valt Home Assistant uit, dan blijft de laatste stand op de Nest staan tot Home Assistant terug is of iemand aan de Nest draait. Terugdraaien: zet de hoofdschakelaar uit en zet het schema terug in de Google Home-app."))}
  </div>`;
}

/* ---------- the page ---------- */
export function heating(p) {
  const st = p.hass.states, nest = st[NEST], block = st["sensor.verwarming_blok"]?.state, weer = st["sensor.verwarming_weer"]?.state, goal = val(p, GOAL), set = num(nest?.attributes.temperature);
  if (!st[GOAL]) return { sub: t("Niet gevonden"), body: html`<div class="hempty">${t("De verwarmingsregeling is niet gevonden in Home Assistant.")}</div>` };
  loadHeat(p); loadDays(p);
  const tab = p.heatTab || "all", hours = p.heatHours || 24, show = k => tab === "all" || tab === k;
  const running = on(p, MAIN), room = val(p, ROOM), boiler = st[BOILER]?.state === "on", hist = p.heatHist;
  const armed = p._heatArm && Date.now() - p._heatArm < 6000;
  const toggleMain = () => {
    if (running) { p.call("input_boolean", "turn_off", { entity_id: MAIN }); return; }
    if (armed) { p._heatArm = 0; p.call("input_boolean", "turn_on", { entity_id: MAIN }); p.requestUpdate(); return; }
    p._heatArm = Date.now(); p.requestUpdate(); setTimeout(() => p.requestUpdate(), 6100);
  };
  const handLeft = st[HAND]?.state === "active" && st[HAND].attributes.finishes_at ? Math.max(1, Math.ceil((Date.parse(st[HAND].attributes.finishes_at) - Date.now()) / 60000)) : null;
  const stale = Date.now() - Math.max(Date.parse(st[GOAL].last_changed), Date.parse(st[SET]?.last_changed || 0));
  const warn = unavailable(nest) ? t("De Nest is onbereikbaar. De laatste stand blijft staan.")
    : nest.state === "off" ? t("De Nest staat op uit. De regeling blijft eraf tot je hem weer op verwarmen zet.")
    : running && block !== "hand" && goal != null && set != null && Math.abs(goal - set) >= 0.5 && stale > 30 * 60000 ? t("De Nest staat al 30 minuten op {s} in plaats van {g}.", { s: deg(set), g: deg(goal) }) : "";
  const onH = (hist?.boiler || []).reduce((a, r, i, l) => r.s === "on" ? a + ((l[i + 1]?.t ?? Date.now()) - r.t) : a, 0) / 3600000;
  const handWeek = hist?.hand.length ?? null, nowM = new Date().getHours() * 60 + new Date().getMinutes(), blocks = dayBlocks(p);
  const nestStep = nest?.attributes.target_temp_step || 0.5, nestLo = num(nest?.attributes.min_temp) ?? 7, nestHi = num(nest?.attributes.max_temp) ?? 35, nestOk = !unavailable(nest) && nest?.state !== "off" && set != null;
  const setNest = d => () => p.call("climate", "set_temperature", { entity_id: NEST, temperature: +(set + d).toFixed(1) });
  const autos = ["regelaar", "handbediening", "opwarmen", "storing"].map(k => st[`automation.verwarming_${k}`]).filter(Boolean);
  const autoName = { regelaar: t("Regelaar"), handbediening: t("Handbediening"), opwarmen: t("Opwarmen"), storing: t("Storing") };
  const autoSub = { regelaar: t("stuurt de Nest naar het doel"), handbediening: t("ziet wanneer iemand de stand wijzigt"), opwarmen: t("start de ketel op tijd voor de warm-tijd"), storing: t("meldt het als de Nest niet volgt") };
  const pills = [["all", t("Alles"), "mdi:radiator"], ["regeling", t("Regeling"), "mdi:thermostat-auto"], ["grafieken", t("Grafieken"), "mdi:chart-line"], ["opties", t("Opties"), "mdi:tune-variant"], ["uitleg", t("Uitleg"), "mdi:help-circle-outline"]];
  return { sub: `${blockName(block)} · ${t("doel")} ${deg(goal)} · ${t("kamer")} ${deg(room)} · ${boiler ? t("ketel aan") : t("ketel uit")} · ${running ? t("brAIn regelt") : t("meekijken")}`,
    head: html`<div class="ppills">${pills.map(([k, l, icon]) => html`<button class=${classMap({ on: tab === k })} @click=${() => { p.heatTab = k; p.requestUpdate(); }}>${ico(icon)}${l}</button>`)}</div>`,
    tools: show("grafieken") ? html`<div class="seg pseg">${[[24, t("24 uur")], [48, t("48 uur")], [168, t("7 dagen")]].map(([k, l]) => html`<button class=${hours === k ? "on" : ""} @click=${() => { p.heatHours = k; p.requestUpdate(); }}>${l}</button>`)}</div>` : nothing,
    body: html`<div class="sblks hblks">
      ${warn ? sblock(hq(p, "attention", t("Aandacht")), [srow({ icon: "mdi:alert-outline", name: warn, pill: t("Let op"), err: true, tap: () => p.moreInfo(NEST) })]) : nothing}
      ${show("regeling") ? html`
        ${sblock(hq(p, "now", t("Nu")), [
          srow({ icon: "mdi:home-thermometer-outline", svg: "thermometer", name: t("Kamer"), sub: boiler ? t("ketel aan") : t("ketel uit"), val: fmt(room, 1), unit: "°", tap: () => p.moreInfo(ROOM) }),
          srow({ icon: "mdi:thermometer-auto", svg: "thermometer", name: t("Doel"), sub: blockName(block), val: fmt(goal, 1), unit: "°", tap: () => p.moreInfo(GOAL) }),
          srow({ icon: "mdi:weather-partly-cloudy", name: t("Buiten"), sub: t("zon {v} W/m²", { v: fmt(val(p, "sensor.verwarming_zon_gemiddeld"), 0) }), val: fmt(val(p, OUT), 1), unit: "°", tap: () => p.moreInfo(OUT) }),
          srow({ icon: "mdi:timer-outline", svg: "timer", name: t("Stookuren"), sub: hist ? t("{v} uur in 7 dagen", { v: fmt(onH, 0) }) : t("vandaag"), val: fmt(val(p, "sensor.heat_active_today"), 1), unit: t("uur"), tap: () => p.moreInfo(BOILER) }),
          srow({ icon: "mdi:fire", svg: "gas", name: t("Gas"), sub: t("vandaag"), val: fmt(val(p, "sensor.gas_usuage_daiily"), 1), unit: "m³", tap: () => p.moreInfo(GAS) }),
        ])}
        ${sblock(hq(p, "rules", t("Regeling")), [
          srow({ icon: "mdi:thermostat-auto", name: t("brAIn regelt de Nest"), sub: running ? t("Aan: de Nest volgt het doel") : armed ? t("Tik nog een keer: de Nest wordt vanaf nu gestuurd") : t("Meekijken: er gaat niets naar de Nest"), toggle: toggleMain, on: running, err: armed }),
          nest ? stepRow({ icon: "mdi:thermostat", label: t("Stand Nest"), sub: running ? t("wijzigen telt als met de hand") : t("eigen schema van de Nest"), v: set, unit: "°", canDown: nestOk && set > nestLo, canUp: nestOk && set < nestHi, down: setNest(-nestStep), up: setNest(nestStep), tap: () => p.openPopup({ type: "climate", s: nest }) }) : nothing,
          handLeft != null ? srow({ icon: "mdi:hand-back-right-outline", name: t("Met de hand"), sub: t("nog {n} min", { n: handLeft }), pill: t("Terug naar de regeling"), on: true, tap: () => p.call("timer", "cancel", { entity_id: HAND }) }) : nothing,
          srow({ icon: "mdi:hand-back-right-outline", name: t("Met de hand gewijzigd"), sub: t("afgelopen 7 dagen"), val: handWeek ?? "–", unit: "×", dim: true }),
        ])}
        <div class="sblk hday"><h3>${hq(p, "today", t("Vandaag"))}<b>${t("schema")}</b></h3>
          <div class="htl">${blocks.map(([k, a, b]) => html`<i class=${k} style="flex-grow:${b - a}" title="${blockName(k)} · ${hhmm(a)}–${hhmm(b)}"></i>`)}<u style="left:${(nowM / 14.4).toFixed(2)}%"></u></div>
          <ul class="hsch">${blocks.map(([k, a, b]) => html`<li class=${classMap({ cur: nowM >= a && nowM < b })}><i class=${k}></i><b>${hhmm(a)}</b> ${blockName(k)}</li>`)}</ul>
        </div>
        ${sblock(hq(p, "autos", t("Automations")), autos.map(s => { const k = s.entity_id.split("_").pop(); return srow({ icon: "mdi:robot-outline", svg: "robot", name: autoName[k], sub: `${autoSub[k]} · ${s.attributes.last_triggered ? t("laatst {t}", { t: relTime(s.attributes.last_triggered) }) : t("nog nooit gestart")}`, toggle: unavailable(s) ? null : () => p.call("automation", "toggle", { entity_id: s.entity_id }), pill: unavailable(s) ? t("Fout") : null, on: s.state === "on", err: unavailable(s), tap: () => p.moreInfo(s.entity_id) }); }), `${autos.length}`)}` : nothing}
      ${show("grafieken") ? charts(p) : nothing}
      ${show("opties") ? options(p) : nothing}
      ${show("uitleg") ? explain(p, block, weer, goal) : nothing}
    </div>` };
}

export const heatingStyles = `
  .hblks .srow .nm,.hblks .srow .nm small{white-space:normal}
  .hth{display:inline-flex;align-items:center;gap:7px}
  .hq{position:relative;display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;padding:0;border:1px solid var(--line);border-radius:50%;background:rgba(255,255,255,.1);color:var(--fg-2);font:inherit;font-size:10px;font-weight:700;letter-spacing:0;line-height:1;cursor:pointer}
  .hq::after{content:"";position:absolute;inset:-12px}
  .hq:hover{background:rgba(255,255,255,.22);color:#fff}
  .hinfo h4{margin:14px 0 4px;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--fg-2)}
  .hinfo h4:first-child{margin-top:4px}
  .hinfo p{margin:0;font-size:14px;line-height:1.55}
  .hopt{grid-template-columns:26px 1fr max-content;cursor:default}
  .hopt:hover{background:none}
  .hstep{display:flex;align-items:center;gap:4px;flex:none}
  .hstep b{min-width:58px;text-align:center;font-size:15px;font-weight:700;letter-spacing:-.3px;white-space:nowrap}
  .hstep b small{font-size:11px;font-weight:600;letter-spacing:0;color:var(--fg-3);margin-left:2px}
  .hstep button{width:26px;height:26px;padding:0;border-radius:50%;border:1px solid var(--line);background:rgba(255,255,255,.1);color:#fff;font:inherit;font-size:15px;line-height:1;cursor:pointer}
  .hstep button:disabled{opacity:.35;cursor:default}
  .htime{width:62px;height:28px;padding:0;text-align:center;border-radius:8px;border:1px solid var(--line);background:rgba(255,255,255,.1);color:#fff;font:inherit;font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}
  .htime:focus{outline:none;border-color:var(--line-on);background:rgba(255,255,255,.18)}
  .hcbody{padding:4px 20px 12px}
  .hplot{position:relative}
  .hplot + .hplot{margin-top:10px}
  .hplot svg{display:block;width:100%;height:100%;overflow:visible}
  .hplot em{position:absolute;right:0;font-style:normal;font-size:10px;font-weight:600;color:var(--fg-3);pointer-events:none}
  .hplot em.hi{top:-11px} .hplot em.lo{bottom:-2px}
  .hband{position:relative;height:6px;margin-top:6px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden}
  .hband i{position:absolute;top:0;bottom:0;background:rgba(242,122,92,.9)}
  .hleg{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;font-size:11px;font-weight:600;color:var(--fg-3)}
  .hleg i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px}
  .hgas{height:56px;margin-top:4px}
  .hdd{height:22px;margin-top:4px}
  .hempty{padding:14px 0;font-size:13px;color:var(--fg-3)}
  .hnote{font-size:12px;line-height:1.45;color:var(--fg-3);margin:0;padding:8px 20px 6px;border-top:1px solid rgba(255,255,255,.08)}
  .hmore summary{padding:12px 20px 8px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--fg-2);cursor:pointer}
  .hmore .hnote{border-top:0;padding:0 20px 10px}
  .hday .htl{position:relative;display:flex;height:14px;margin:2px 20px 0;border-radius:4px;overflow:hidden}
  .htl i{display:block;flex-basis:0;min-width:1px}
  .htl u{position:absolute;top:0;bottom:0;width:2px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.35)}
  .htl .nacht,.hsch .nacht{background:rgba(255,255,255,.14)}
  .htl .opwarmen,.hsch .opwarmen{background:rgba(242,122,92,.85)}
  .htl .dag,.hsch .dag{background:rgba(255,220,130,.5)}
  .htl .thuisdag,.hsch .thuisdag{background:rgba(255,220,130,.95)}
  .htl .avond,.hsch .avond{background:rgba(255,170,110,.8)}
  .hsch{list-style:none;display:flex;flex-wrap:wrap;gap:4px 14px;margin:8px 0 8px;padding:0 20px;font-size:12px;font-weight:500;color:var(--fg-3)}
  .hsch li{display:flex;align-items:center;gap:5px}
  .hsch li.cur{color:#fff;font-weight:600}
  .hsch li i{width:8px;height:8px;border-radius:2px;flex:none}
  .hsch li b{font-weight:600;font-variant-numeric:tabular-nums}
  .hlp{border-top:1px solid rgba(255,255,255,.08)}
  .hlp summary{display:grid;grid-template-columns:26px 1fr;gap:14px;align-items:center;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;list-style:none}
  .hlp summary::-webkit-details-marker{display:none}
  .hlp summary:hover{background:rgba(255,255,255,.05)}
  .hlp summary img.ico,.hlp summary ha-icon{width:22px;height:22px;--mdc-icon-size:22px}
  .hlp p{margin:0;padding:0 20px 12px 60px;font-size:13px;line-height:1.5;color:var(--fg-2)}
  @media (max-width:900px){
    .hcbody{padding:4px 14px 10px} .hnote{padding:8px 14px 6px} .hmore summary{padding:10px 14px 6px} .hmore .hnote{padding:0 14px 10px}
    .hday .htl{margin:2px 14px 0} .hsch{padding:0 14px} .hlp summary{padding:10px 14px} .hlp p{padding:0 14px 12px 54px}
  }
`;
