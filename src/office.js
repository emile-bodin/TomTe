// Office overview reads the installed rules; starting uses the same action as the tag.
import { html } from "lit";
import { t } from "./i18n.js";
import { srow, sblock, kpi, fmt } from "./pages.js";
import { num, unavailable } from "./util.js";

const SESSION = "input_boolean.kantoor_werksessie_actief";
const TAG = "automation.tag_tag_kantoor_is_gescand";
const STOP = "script.kantoor_werk_klaar";

export function office(p) {
  const states = p.hass.states, on = id => states[id]?.state === "on";
  const ready = id => !!states[id] && !unavailable(states[id]);
  const active = on(SESSION), pause = on("input_boolean.kantoor_licht_pauze");
  const presence = "binary_sensor.kantoor_aanwezigheid_presence", lux = "sensor.kantoor_aanwezigheid_illuminance";
  const timer = states["timer.kantoor_afwezigheid"];
  const end = timer?.state === "active" && timer.attributes.finishes_at;
  const clock = end ? new Date(end).toLocaleTimeString(p.hass.locale?.language || "nl", { hour: "2-digit", minute: "2-digit" }) : "";
  const status = !ready(SESSION) ? t("Onbereikbaar") : !active ? t("Geen werksessie") : !ready(presence) ? t("Aanwezigheid onbekend") : clock ? t("Uitschakelen om {t}", { t: clock }) : on(presence) ? t("Aan het werk") : t("Wachten op aanwezigheid");
  const row = (id, title, icon, sub = "") => srow({ icon, name: title, sub,
    pill: !ready(id) ? t("Onbereikbaar") : on(id) ? t("Aan") : t("Uit"),
    on: ready(id) && on(id), dim: !ready(id), tap: () => p.moreInfo(id) });
  const value = (id, title, unit, icon) => srow({ icon, name: title,
    val: ready(id) ? fmt(num(states[id].state)) : "–", unit, dim: !ready(id), tap: () => p.moreInfo(id) });
  const action = (title, id, domain, service) => html`<button class="pill" ?disabled=${!ready(id)} @click=${() => p.call(domain, service, { entity_id: id })}>${title}</button>`;
  const start = () => p.call("automation", "trigger", { entity_id: TAG, skip_condition: false });
  return {
    sub: status,
    tools: html`<div class="ppills">${active ? action(t("Werk klaar"), STOP, "script", "turn_on") : html`<button class="pill" ?disabled=${!ready(SESSION) || !ready(TAG) || !on(TAG)} @click=${start}>${t("Werksessie starten")}</button>`}</div>`,
    body: html`
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
        ])}
        ${sblock(t("Schermen en verlichting"), [
          row("switch.kantoor_schermen", t("Schermen"), "mdi:monitor"),
          row("light.plafond_kantoor_light", t("Plafond kantoor"), "mdi:ceiling-light"),
          row("light.led_bureau", t("Led bureau"), "mdi:led-strip-variant"),
        ])}
        ${sblock(t("Licht afstellen"), [
          value("input_number.kantoor_lux_donker", t("Donker: maximaal 70% licht"), "lx", "mdi:brightness-4"),
          value("input_number.kantoor_lux_licht", t("Voldoende daglicht: lampen uit"), "lx", "mdi:brightness-7"),
        ])}
        ${sblock(t("Zo werkt kantoor"), [
          srow({ icon: "mdi:tag-outline", name: t("Tag of knop start en stopt"), sub: t("Geen vaste start- of stoptijd; vroeg beginnen en overwerken blijven mogelijk."), pill: "" }),
          srow({ icon: "mdi:timer-outline", name: t("Vijf minuten gemeld afwezig"), sub: t("Schermen en lampen gaan uit; terugkomen hervat de actieve werksessie."), pill: "" }),
          srow({ icon: "mdi:cat", name: t("De sensor herkent geen personen"), sub: t("Tijdens een actieve werksessie kan ook een kat of huisgenoot hervatten veroorzaken."), pill: "" }),
        ])}
      </div>`,
  };
}
