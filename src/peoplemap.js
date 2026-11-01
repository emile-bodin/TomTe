// <hcn-people-map>: Home Assistant's own map card with the people and their routes of today.
// HA loads the map code when the card is created. The card stays the same element while the popup is open and only
// receives new `hass`, so it keeps its position and zoom while people move. `ids` is read once, when the map opens.
import { LitElement, html, css, nothing } from "lit";
import { t } from "./i18n.js";

/** whole hours since midnight: the map card counts in hours, so this can reach up to an hour into yesterday */
const hoursToday = () => { const d = new Date(), m = new Date(d); m.setHours(0, 0, 0, 0); return Math.max(1, Math.ceil((d - m) / 3600000)); };

export class PeopleMap extends LitElement {
  static properties = { hass: { attribute: false }, ids: { attribute: false }, _failed: { state: true } };
  static styles = css`
    :host{display:block;position:relative;min-height:0;overflow:hidden;border-radius:var(--r-sm);background:rgba(0,0,0,.25)}
    #m{position:absolute;inset:0}
    #m > *{display:block;width:100%;height:100%}
    .no{position:absolute;inset:0;display:grid;place-items:center;font-size:14px;opacity:.75}
  `;
  constructor() { super(); this.ids = []; this._failed = false; this._gen = 0; this._card = null; }
  connectedCallback() { super.connectedCallback(); if (this.hasUpdated) this._mount(); }
  disconnectedCallback() { super.disconnectedCallback(); this._gen++; this._card?.remove(); this._card = null; }
  firstUpdated() { this._mount(); }
  updated(ch) { if (ch.has("hass") && this._card) this._card.hass = this.hass; }

  async _mount() {
    const gen = ++this._gen;
    try {
      const helpers = await window.loadCardHelpers();
      const zones = Object.keys(this.hass.states).filter(id => id.startsWith("zone."));
      const card = await helpers.createCardElement({ type: "map", entities: [...this.ids, ...zones], hours_to_show: hoursToday(), theme_mode: "dark" });
      if (gen !== this._gen || !this.isConnected) return;
      card.isPanel = true;   // fill the box instead of keeping the card's own aspect ratio
      card.hass = this.hass;
      this._card = card;
      this.renderRoot.getElementById("m").append(card);
    } catch (e) { console.warn("[tomte] map failed", e); if (gen === this._gen) this._failed = true; }
  }

  render() { return html`<div id="m"></div>${this._failed ? html`<div class="no">${t("Kaart niet beschikbaar")}</div>` : nothing}`; }
}
if (!customElements.get("hcn-people-map")) customElements.define("hcn-people-map", PeopleMap);
