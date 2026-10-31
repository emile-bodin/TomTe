// Music Assistant through Home Assistant's own music_assistant services: favourites, search, the queue and moving music to
// another speaker. Used by the speaker popup (popups.js) and the Muziek page (pages.js); nothing talks to the MA server directly.
import { html, nothing } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { t } from "./i18n.js";
import { domain, unavailable } from "./util.js";
import { ico } from "./cards.js";

/** a media player that Music Assistant runs (MA sets mass_player_type on its own players) */
export const isMA = (hass, id) => hass.states[id]?.attributes?.mass_player_type != null || hass.entities?.[id]?.platform === "music_assistant";
export const maPlayers = hass => Object.values(hass.states).filter(s => domain(s.entity_id) === "media_player" && isMA(hass, s.entity_id));
/** a speaker by the name of its device ("Sonos", "Hub"), else its own name: the room is no good, several speakers can share one */
export const playerName = (hass, s) => { const d = hass.devices?.[hass.entities?.[s.entity_id]?.device_id], n = d?.name_by_user || d?.name || s.attributes.friendly_name || s.entity_id; return n.charAt(0).toUpperCase() + n.slice(1); };

/** the MA config entry, needed by search and get_library. Listing config entries can need an admin, so an admin's panel stores the id
    in the household settings (music.entry) and everyone else reads it from there. */
function entryId(p) {
  if (p._maEntry) return p._maEntry;
  return p._maEntry = (async () => {
    let id = p.config.music?.entry || null;
    try { const r = await p.hass.callWS({ type: "config_entries/get", domain: "music_assistant" }); const e = r?.find(x => x.state === "loaded") || r?.[0]; if (e) id = e.entry_id; } catch { /* not an admin: keep the stored one */ }
    if (id && p.canShare && p.globalConfig && p.globalConfig.music?.entry !== id) p.saveGlobal({ music: { ...(p.globalConfig.music || {}), entry: id } }).catch(() => {});
    return id;
  })();
}
const ask = async (p, service, data, target) => (await p.hass.callWS({ type: "call_service", domain: "music_assistant", service, service_data: data, ...(target ? { target: { entity_id: target } } : {}), return_response: true }))?.response;

const FAV_TYPES = ["playlist", "album", "radio", "artist", "track"];
const TYPE = { playlist: ["Afspeellijst", "mdi:playlist-music"], album: ["Album", "mdi:album"], radio: ["Radio", "mdi:radio"], artist: ["Artiest", "mdi:account-music"], track: ["Nummer", "mdi:music-note"] };
async function loadFavourites(p) {
  p.musicLib = { ...(p.musicLib || {}), at: Date.now(), loading: true };
  const entry = await entryId(p);
  if (!entry) { p.musicLib = { at: Date.now(), items: [], none: true }; return; }
  const lists = await Promise.all(FAV_TYPES.map(mt => ask(p, "get_library", { config_entry_id: entry, media_type: mt, favorite: true, limit: 24 }).then(r => r?.items || [], () => [])));
  p.musicLib = { at: Date.now(), items: lists.flat() };
}
/** favourites, loaded on first use and refreshed after 10 minutes */
const favourites = p => { const l = p.musicLib; if (!l || (!l.loading && Date.now() - l.at > 10 * 60000)) loadFavourites(p); return p.musicLib; };

/** search as you type, 400 ms after the last key; an answer for an older query is dropped */
function searchMusic(p, q) {
  p.musicQuery = q; clearTimeout(p._maSearchT);
  if (q.trim().length < 2) { p.musicHits = null; return; }
  p._maSearchT = setTimeout(async () => {
    const entry = await entryId(p);
    if (!entry) { p.musicHits = { none: true }; return; }
    let r; try { r = await ask(p, "search", { config_entry_id: entry, name: q, limit: 5 }) || {}; } catch { r = { error: true }; }
    if (p.musicQuery === q) p.musicHits = r;
  }, 400);
}

/** the queue of one player (what plays now and what comes next); asked again when the title changes. No active queue is an error in MA. */
function queue(p, id) {
  const key = p.hass.states[id]?.attributes.media_title || "", cur = p.musicQueue?.[id];
  if (!cur || cur.key !== key) {
    p.musicQueue = { ...(p.musicQueue || {}), [id]: { ...(cur || {}), key, loading: true } };
    ask(p, "get_queue", {}, id).then(r => r?.[id] || null, () => null).then(q => { p.musicQueue = { ...p.musicQueue, [id]: { key, q } }; });
  }
  return p.musicQueue[id];
}

export function playOn(p, id, it) {
  p.call("music_assistant", "play_media", { entity_id: id, media_id: it.uri, media_type: it.media_type, enqueue: "play" })
    .then(() => p.showToast(t("{x} speelt op {n}", { x: it.name, n: playerName(p.hass, p.hass.states[id]) })), () => {});
}
export function moveTo(p, from, to) {
  p.call("music_assistant", "transfer_queue", { entity_id: to, source_player: from, auto_play: true })
    .then(() => p.showToast(t("Muziek naar {n}", { n: playerName(p.hass, p.hass.states[to]) })), () => {});
}

const artOf = it => it?.image || it?.album?.image || null;
const subOf = it => it.artists?.length ? it.artists.map(a => a.name).join(", ") : t(TYPE[it.media_type]?.[0] || "");
const art = (it, cls = "ma") => html`<span class=${cls}>${ico(TYPE[it.media_type]?.[1] || "mdi:music")}${artOf(it) ? html`<img src=${artOf(it)} alt="" loading="lazy" @error=${e => e.target.remove()}>` : nothing}</span>`;
const row = (it, tap, extra = "") => html`<div class="mrow" @click=${tap}>${art(it, "ma sm")}<div class="nm">${it.name}<small>${subOf(it)}</small></div>${extra ? html`<span class="st">${extra}</span>` : nothing}</div>`;
const note = text => html`<div class="mnote">${text}</div>`;

/** favourites as artwork tiles; a tap plays the item on speaker `id` */
export function favTiles(p, id) {
  const l = favourites(p);
  if (l?.none) return note(t("Music Assistant is niet gevonden."));
  if (!l?.items?.length) return note(l?.loading ? t("Laden…") : t("Nog geen favorieten. Markeer muziek met een hartje in Music Assistant."));
  return html`<div class="mtiles">${l.items.map(it => html`<button class="mtile" title=${it.name} @click=${() => playOn(p, id, it)}>${art(it)}<b>${it.name}</b><small>${subOf(it)}</small></button>`)}</div>`;
}

/** a search field with the hits per kind below it; a tap plays the hit on speaker `id` */
export function searchBox(p, id) {
  const h = p.musicHits, groups = h && !h.error && !h.none ? [["tracks", t("Nummers")], ["artists", t("Artiesten")], ["albums", t("Albums")], ["playlists", t("Afspeellijsten")], ["radio", t("Radio")]].filter(([k]) => h[k]?.length) : [];
  return html`<div class="msearch"><input type="search" .value=${p.musicQuery || ""} placeholder=${t("Zoek een nummer, artiest of zender")} @input=${e => searchMusic(p, e.target.value)}></div>
    ${h?.none ? note(t("Music Assistant is niet gevonden.")) : h?.error ? note(t("Zoeken lukte niet.")) : h && !groups.length ? note(t("Niets gevonden.")) : nothing}
    ${groups.map(([k, label]) => html`<div class="mgrp">${label}</div>${h[k].map(it => row(it, () => playOn(p, id, it)))}`)}`;
}

/** what plays now on speaker `id` and what comes after it */
export function queueList(p, id) {
  const q = queue(p, id)?.q;
  if (!q) return note(p.musicQueue?.[id]?.loading ? t("Laden…") : t("Er staat niets in de wachtrij."));
  const it = x => x?.media_item || (x ? { name: x.name, media_type: "track" } : null), now = it(q.current_item), next = it(q.next_item);
  return html`${now ? row(now, null, t("Nu")) : nothing}${next ? row(next, null, t("Hierna")) : nothing}
    ${q.items ? note(t("{n} nummers in de wachtrij", { n: q.items })) : nothing}`;
}

/** the other speakers as pills; a tap moves what plays on `id` there */
export function movePills(p, id) {
  const s = p.hass.states[id], others = maPlayers(p.hass).filter(x => x.entity_id !== id && !unavailable(x) && x.attributes.mass_player_type === "player");
  if (!s || !s.attributes.active_queue || s.attributes.source !== "Music Assistant Queue") return note(t("Op deze speaker speelt nu geen muziek van Music Assistant."));
  if (!others.length) return note(t("Er zijn geen andere speakers."));
  return html`<div class="mpills">${others.map(o => html`<button class=${classMap({ on: o.state === "playing" })} @click=${() => moveTo(p, id, o.entity_id)}>${ico("mdi:speaker")}${playerName(p.hass, o)}</button>`)}</div>`;
}

export const musicStyles = `
  /* ===== Music Assistant: artwork tiles, search and queue rows, speaker pills (popup and Muziek page) ===== */
  .ma{position:relative;display:flex;align-items:center;justify-content:center;aspect-ratio:1;border-radius:12px;overflow:hidden;background:rgba(255,255,255,.10)}
  .ma img:not(.ico){position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .ma img.ico,.ma ha-icon{width:26px;height:26px;--mdc-icon-size:26px;opacity:.7}
  .ma.sm{width:40px;border-radius:8px;flex:none} .ma.sm img.ico,.ma.sm ha-icon{width:20px;height:20px;--mdc-icon-size:20px}
  .mtiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:12px;margin-top:12px}
  .mtile{display:flex;flex-direction:column;gap:2px;min-width:0;padding:0;border:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}
  .mtile b{margin-top:6px;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .mtile small{font-size:11px;color:var(--fg-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .mtile:hover .ma{outline:2px solid rgba(255,255,255,.5)}
  .msearch input{width:100%;box-sizing:border-box;height:42px;margin-top:12px;padding:0 16px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.08);color:inherit;font:inherit;font-size:14px}
  .mgrp{margin:14px 0 4px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--fg-3)}
  .mrow{display:flex;align-items:center;gap:12px;padding:6px 0;cursor:pointer;font-size:14px;font-weight:600}
  .mrow .nm{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .mrow .nm small{display:block;font-size:11px;font-weight:500;color:var(--fg-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .mrow .st{flex:none;height:22px;padding:0 10px;display:inline-flex;align-items:center;border-radius:999px;background:rgba(255,255,255,.12);font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase}
  .mpills{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
  .mpills button{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.08);color:inherit;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
  .mpills button.on{background:rgba(255,255,255,.18)}
  .mpills img.ico,.mpills ha-icon{width:17px;height:17px;--mdc-icon-size:17px}
  .mnote{margin-top:12px;font-size:13px;color:var(--fg-3)}
  .popup .mpop .modes.mtabs{margin-top:18px}
  .popup .mpop .modes.mtabs button{padding-left:2px;padding-right:2px;font-size:10px;letter-spacing:.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .popup .mpop .mtiles{grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:10px}
`;
