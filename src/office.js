// Office overview reads the installed rules; starting uses the same action as the tag.
import { html, nothing } from "lit";
import { t } from "./i18n.js";
import { srow, sblock, kpi, fmt } from "./pages.js";
import { num, unavailable, relTime } from "./util.js";

const SESSION = "input_boolean.kantoor_werksessie_actief";
const TAG = "automation.tag_tag_kantoor_is_gescand";
const STOP = "script.kantoor_werk_klaar";

export function office(p) {
  const states = p.hass.states, on = id => states[id]?.state === "on";
  const ready = id => !!states[id] && !unavailable(states[id]);
  const active = on(SESSION), pause = on("input_boolean.kantoor_licht_pauze");
  const presence = "binary_sensor.kantoor_aanwezigheid_presence", lux = "sensor.kantoor_aanwezigheid_illuminance";
  const timer = states["timer.kantoor_afwezigheid"];
  const end = active && ready(presence) && !on(presence) && timer?.state === "active" && timer.attributes.finishes_at;
  const clock = end ? new Date(end).toLocaleTimeString(p.hass.locale?.language || "nl", { hour: "2-digit", minute: "2-digit" }) : "";
  const remaining = end ? Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / 60000)) : null;
  const status = !ready(SESSION) ? t("Onbereikbaar") : !active ? t("Geen werksessie") : !ready(presence) ? t("Aanwezigheid onbekend") : clock ? t("Uitschakelen om {t}", { t: clock }) : on(presence) ? t("Aan het werk") : t("Wachten op aanwezigheid");
  const row = (id, title, icon, sub = "") => srow({ icon, name: title, sub,
    pill: !ready(id) ? t("Onbereikbaar") : on(id) ? t("Aan") : t("Uit"),
    on: ready(id) && on(id), dim: !ready(id), tap: () => p.moreInfo(id) });
  const action = (title, id, domain, service) => html`<button class="pill" ?disabled=${!ready(id)} @click=${() => p.call(domain, service, { entity_id: id })}>${title}</button>`;
  const start = () => p.call("automation", "trigger", { entity_id: TAG, skip_condition: false });
  const reading = (id, title, unit, icon) => html`<button class="office-reading" ?disabled=${!ready(id)} @click=${() => p.moreInfo(id)}>
    <ha-icon icon=${icon}></ha-icon><strong>${ready(id) ? fmt(num(states[id].state), unit === "%" || unit === "lx" ? 0 : 1) : "–"}<small>${unit}</small></strong>
    <span>${title}</span><small>${ready(id) ? t("Tik voor verloop") : t("Onbereikbaar")}</small></button>`;
  const light = (id, title) => {
    const brightness = on(id) ? Math.round((num(states[id]?.attributes.brightness) ?? 0) / 255 * 100) : 0;
    return html`<div class="office-device"><div><button class="office-name" @click=${() => p.moreInfo(id)}>${title}</button>
      <button class="pill" ?disabled=${!ready(id)} aria-label=${title} aria-pressed=${String(on(id))} @click=${() => p.call("light", "toggle", { entity_id: id })}>${!ready(id) ? t("Onbereikbaar") : on(id) ? t("Aan") : t("Uit")}</button></div>
      <label><span>${t("Helderheid")}</span><input type="range" min="0" max="100" step="1" aria-label=${t("Helderheid") + ": " + title} .value=${String(brightness)} ?disabled=${!ready(id)}
        @input=${ev => { ev.target.nextElementSibling.textContent = ev.target.value + "%"; }}
        @change=${ev => p.call("light", +ev.target.value === 0 ? "turn_off" : "turn_on", { entity_id: id, ...(+ev.target.value ? { brightness_pct: +ev.target.value } : {}) })}><output>${brightness}%</output></label></div>`;
  };
  const threshold = (id, title) => {
    const state = states[id], attrs = state?.attributes || {};
    return html`<label class="office-threshold"><span>${title}</span><input type="number" aria-label=${title} min=${attrs.min ?? 0} max=${attrs.max ?? 1000} step=${attrs.step ?? 5}
      .value=${ready(id) ? state.state : ""} ?disabled=${!ready(id)} @change=${ev => {
        if (ev.target.value.trim() && ev.target.reportValidity()) p.call("input_number", "set_value", { entity_id: id, value: +ev.target.value });
      }}><small>lx</small></label>`;
  };
  return {
    sub: status,
    tools: html`<div class="ppills">${active ? action(t("Werk klaar"), STOP, "script", "turn_on") : html`<button class="pill" ?disabled=${!ready(SESSION) || !ready(TAG) || !on(TAG)} @click=${start}>${t("Werksessie starten")}</button>`}</div>`,
    body: html`
      <div class="office-summary"><div><strong>${status}</strong><p>${!active ? t("Start met de tag of de knop. Alleen aanwezigheid start geen werkdag.") : !ready(presence) ? t("Sensor niet beschikbaar. De regeling mag dit niet als afwezigheid gebruiken.") : pause ? t("Je eigen lichtstand blijft behouden. Je kunt automatisch licht hieronder hervatten.") : t("De sensor regelt je schermen; het gemeten licht bepaalt de helderheid.")}</p></div>
        ${remaining !== null ? html`<div class="office-countdown"><strong>${t("Nog {n} min", { n: remaining })}</strong><progress max="5" value=${Math.min(5, remaining)} aria-label=${t("Tijd tot uitschakelen")}></progress><small>${t("Terugkomen annuleert uitschakelen.")}</small></div>` : nothing}
      </div>
      <div class="kpis">
        ${kpi({ icon: "mdi:briefcase-outline", v: ready(SESSION) ? active ? t("Actief") : t("Uit") : "–", n: t("Werksessie"), on: active })}
        ${kpi({ icon: "mdi:motion-sensor", v: ready(presence) ? on(presence) ? t("Bezet") : t("Leeg") : "–", n: t("Aanwezigheid"), on: on(presence) })}
        ${kpi({ icon: "mdi:brightness-6", v: ready(lux) ? fmt(num(states[lux].state), 0) : "–", unit: "lx", n: t("Licht in kantoor") })}
      </div>
      <div class="sblks">
        ${sblock(t("Bediening"), [
          row(SESSION, t("Werksessie"), "mdi:briefcase-outline", status),
          srow({ icon: "mdi:home-account", name: t("Thuiswerken"), sub: t("Gaat uit bij aankomst bij NetApp; thuiskomen zet dit niet aan."),
            pill: "", tr: html`<button class="tog" role="switch" aria-label=${t("Thuiswerken")} aria-checked=${String(on("input_boolean.emile_work_from_home"))} ?disabled=${!ready("input_boolean.emile_work_from_home")} @click=${() => p.call("input_boolean", "toggle", { entity_id: "input_boolean.emile_work_from_home" })}></button>`,
            on: on("input_boolean.emile_work_from_home") }),
          row("input_boolean.kantoor_licht_pauze", t("Handmatige lichtpauze"), "mdi:hand-back-right-outline", pause ? t("Eigen lichtstand blijft tot vijf minuten afwezigheid of een nieuwe werksessie.") : t("Automatisch licht tot maximaal 70%.")),
          ...(pause ? [html`<div class="ppills office-inset"><button ?disabled=${!ready("input_boolean.kantoor_licht_pauze")} @click=${() => p.call("input_boolean", "turn_off", { entity_id: "input_boolean.kantoor_licht_pauze" })}>${t("Automatisch licht hervatten")}</button></div>`] : []),
        ])}
        ${sblock(t("Schermen en verlichting"), [
          row("switch.kantoor_schermen", t("Schermen"), "mdi:monitor"),
          html`<div class="ppills office-inset">${action(on("switch.kantoor_schermen") ? t("Schermen uit") : t("Schermen aan"), "switch.kantoor_schermen", "switch", on("switch.kantoor_schermen") ? "turn_off" : "turn_on")}</div>`,
          light("light.plafond_kantoor_light", t("Plafond kantoor")),
          light("light.led_bureau", t("Led bureau")),
          html`<p class="office-note">${t("Zelf dimmen pauzeert automatisch licht. Maximaal 70% geldt alleen voor de automatische regeling.")}</p>`,
        ])}
        ${sblock(t("FP300 sensordata"), [
          html`<div class="office-readings">
            ${reading(lux, t("Licht in kantoor"), "lx", "mdi:brightness-6")}
            ${reading("sensor.kantoor_aanwezigheid_temperature", t("Temperatuur"), "°C", "mdi:thermometer")}
            ${reading("sensor.kantoor_aanwezigheid_humidity", t("Luchtvochtigheid"), "%", "mdi:water-percent")}
            ${reading("sensor.kantoor_aanwezigheid_battery", t("Batterij"), "%", "mdi:battery")}
          </div>`,
          srow({ icon: "mdi:motion-sensor", name: t("Aanwezigheid"), sub: !ready(presence) ? t("Onbereikbaar") : states[presence].last_changed ? t("Sinds {t}", { t: relTime(states[presence].last_changed) }) : "", pill: ready(presence) ? on(presence) ? t("Bezet") : t("Leeg") : t("Onbereikbaar"), tap: () => p.moreInfo(presence) }),
          srow({ icon: "mdi:clock-check-outline", name: t("Laatste sensormelding"), pill: ready("sensor.kantoor_aanwezigheid_last_seen") ? relTime(states["sensor.kantoor_aanwezigheid_last_seen"].state) : t("Onbereikbaar"), tap: () => p.moreInfo("sensor.kantoor_aanwezigheid_last_seen") }),
        ])}
        ${sblock(t("Licht afstellen"), [
          threshold("input_number.kantoor_lux_donker", t("Donker: maximaal 70% licht")),
          threshold("input_number.kantoor_lux_licht", t("Voldoende daglicht: lampen uit")),
        ])}
        ${sblock(t("Zo werkt kantoor"), [
          srow({ icon: "mdi:tag-outline", name: t("Tag of knop start en stopt"), sub: t("Geen vaste start- of stoptijd; vroeg beginnen en overwerken blijven mogelijk."), pill: "" }),
          srow({ icon: "mdi:timer-outline", name: t("Vijf minuten gemeld afwezig"), sub: t("Schermen en lampen gaan uit; terugkomen hervat de actieve werksessie."), pill: "" }),
          srow({ icon: "mdi:cat", name: t("De sensor herkent geen personen"), sub: t("Tijdens een actieve werksessie kan ook een kat of huisgenoot hervatten veroorzaken."), pill: "" }),
        ])}
      </div>`,
  };
}
