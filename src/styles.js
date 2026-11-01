import { css, unsafeCSS } from "lit";
import { settingsStyles } from "./settings.js";
import { pageStyles } from "./pages.js";
import { extraStyles } from "./extras.js";
import { extra2Styles } from "./extras2.js";
import { featureStyles } from "./features.js";
import { searchStyles } from "./search.js";
import { extra3Styles } from "./extras3.js";
import { graphStyles } from "./graph.js";
import { usageStyles } from "./usage.js";
import { costsStyles } from "./costs.js";
import { musicStyles } from "./music.js";

// Started from our own Homio-style mockup; scoped to the panel host.

/** The compact card rules, written once. Phones and tablets get them under (max-width:900px); two rows on wide screens get the same rules
    under .strip.rows2 (every card) and .strip.rows2.compact (cards under 160px high). :where() keeps the specificity of the desktop
    rules, so the later position of these rules is what makes them win. What only changes a size is a token on .card (--cp --lh --bh …);
    the rules here are the ones that hide, move or reorder something. */
const cardCompact = (all, compact) => `
  ${compact} .card{--cp:14px;--lh:24px;--bh:30px;--bh-sock:44px;--bh-media:34px;--bh-tile:40px;--bg:6px;--gut:10px;--ib:26px;--ctl-w:34px;--vs-w:8px;height:var(--card-h)}
  ${compact} .card.litter{--bh-sock:var(--bh);--lh:var(--bh);--reserve:0px}
  ${compact} .card.usage{--um:22px;--lh:calc(var(--um) * 2 + var(--bg))}
  ${compact} .card.usage .s{display:none}
  ${compact} .card.usage .ml{font-size:9px;letter-spacing:1.2px}
  ${compact} .card.usage .m b{font-size:12px}
  ${all} .card.costs{--lh:42px}
  ${all} .card.costs .s{display:block}
  ${all} .card.costs .cd,${all} .card.costs .cl,${all} .card.costs .cr em{display:none}
  ${all} .card.costs .cc{padding:0 9px}
  ${all} .card.costs .ch{font-size:9px;letter-spacing:1.2px;margin-bottom:2px}
  ${all} .card.costs .cr b{font-size:14px}
  ${compact} .card.appl2 .ctl.row button{padding:0 8px;gap:5px;font-size:10px;letter-spacing:.6px}
  ${compact} .card .i{margin-left:-2px}
  ${compact} .card .c{font-size:9px;letter-spacing:1.2px}
  ${compact} .card .n{font-size:14px}
  ${compact} .card .s{font-size:11px;margin-top:2px}
  ${compact} .card .s.big{font-size:22px;letter-spacing:-1px}
  ${compact} .card .lbl{font-size:9px;letter-spacing:1.4px}
  ${compact} .card .lbl.steps button{padding:0 8px;font-size:9px}
  ${compact} .card .lbl.bars{padding-top:6px}
  ${compact} .card .seg{padding:2px}
  ${compact} .card .seg button{height:var(--lh);padding:0 9px;font-size:9px}
  ${compact} .card .ctl{gap:3px}
  ${compact} .card .ctl button img{width:14px}
  ${compact} .card .ctl button ha-icon{--mdc-icon-size:18px}
  ${compact} .card .ctl.modes{display:none}
  ${compact} .card .slider{height:6px}
  ${compact} .card .slider b{width:14px;height:14px;margin:-7px 0 0 -7px}
  ${compact} .card .ua{top:8px;right:8px;width:18px;height:18px}
  ${compact} .card .ua ha-icon{--mdc-icon-size:13px}
  ${compact} .card.wide{--rr:calc(52px - var(--cp))}
  /* sub-cards (agenda, weather, waste) do not fit: the second line moves to the bottom line */
  ${compact} .card.hassub{--rr:0px}
  ${compact} .card .subc{display:none}
  ${compact} .card .lbl.mob{display:flex}
  /* plug with a power meter */
  ${compact} .card.plug .spk,${compact} .card.plug .meta{display:none}
  ${compact} .card.plug.appl .lbl{right:calc(var(--cp) + 70px);height:30px}
  ${compact} .card.plug.hasspk{--rr:0px}
  /* climate: the control row goes, the rail slims down, the bottom line shrinks to the caps style of the other cards */
  ${all} .card.climate{--bt:26px;--rw:34px;--reserve:0px;--areas:var(--a-hero);--rows:var(--r-base)}
  ${all} .card.climate .ctl.row{display:none}
  ${all} .card.climate .rail em{display:none}
  ${all} .card.climate .rail b{font-size:9px}
  ${all} .card.climate .lbl{height:var(--lh);font-size:9px;letter-spacing:1.4px;text-transform:uppercase;font-weight:600;margin-top:0}
  ${all} .card.climate .lbl .tg,${all} .card.climate .lbl .tg+.dt,${all} .card.climate .lbl .lng{display:none}
  ${all} .card.climate .lbl ha-icon{--mdc-icon-size:12px;margin-right:3px}
  /* media: artwork under the whole card, the progress line along the bottom edge (mini player), a scrim that darkens toward the controls */
  ${all} .card.media.art,${all} .card.media.appart{--rl:0px}
  ${all} .card.media .n{-webkit-line-clamp:1}
  ${all} .card.media .ctl{gap:4px}
  ${all} .card.media.unavailable .ctl{display:none}
  ${all} .card.media .prog{position:absolute !important;grid-area:auto;left:0;right:0;bottom:0;height:3px;border-radius:0;margin:0;z-index:1}   /* !important: .card.art>*:not(...) sets position:relative with far more weight */
  ${all} .card.appart .appi{display:none !important}
  ${all} .card.appart::before{left:0;box-shadow:none;background:rgba(20,20,24,.35)}
  ${all} .card.art::before{left:0;box-shadow:none;background:linear-gradient(180deg,rgba(20,20,24,.38) 0%,rgba(20,20,24,.72) 100%)}
  /* appliance and action rows */
  ${compact} .card.acts .ctl.row button,${compact} .card.appl .ctl.row button{padding:0 10px;font-size:10px}
  ${compact} .card.appl:not(.plug) .lbl{display:none}   /* the stop / power row takes the bottom line */
  /* lists, sockets, tiles */
  ${compact} .card.list .s{gap:3px;margin-top:4px}
  ${compact} .card.list .s span{font-size:11px;gap:6px}
  ${compact} .card.list .s span em{display:none}
  ${compact} .card .socks{gap:4px}
  ${compact} .card .socks button ha-icon{--mdc-icon-size:16px}
  ${compact} .card .socks button small{display:none}
  ${compact} .card.scenes .s{gap:4px;margin-top:4px}
  ${compact} .card.scenes .s button small{display:none}
  ${compact} .card.group .gtiles button small{display:none}
  ${compact} .card.group .glist{gap:3px;margin-top:4px}
  ${compact} .card.group .glist div{font-size:11px}
  ${compact} .card.people .s span{width:36px;height:36px}
  ${compact} .card.cam{--reserve:-2px}
  ${compact} .card.graph{--gl-h:22px;--gl-gap:4px;--gl-nmt:32px;--gl-dot:6px}
  ${compact} .card.graph .s{display:none}   /* no room for the average line under the chart */
`;

export const styles = css`
  :host{
    --fg:#fff; --fg-2:rgba(255,255,255,.78); --fg-3:rgba(255,255,255,.55);
    --card:rgba(255,255,255,.10); --card-on:rgba(255,255,255,.34);
    --line:rgba(255,255,255,.14); --line-on:rgba(255,255,255,.38); --accent:#f2b63a;
    --pad:8vw; --u:clamp(1px, min(.07vw, .12vh), 1.25px); --card-h:calc(200 * var(--u)); --card-w:calc(var(--card-h) * 1.6); --card-gap:6px;
    --tile-h:calc(180 * var(--u)); --tile-w:calc(var(--tile-h) * 1.6);   /* the strip's cards on wide screens; _fitCards() sets both per screen */
    --r:8px; --r-sm:6px; --ease:cubic-bezier(.2,.7,.2,1);
    --font:"Hanken Grotesk",Roboto,system-ui,sans-serif;
    display:block;height:100vh;overflow:hidden;position:relative;
    font-family:var(--font);color:var(--fg);-webkit-font-smoothing:antialiased;font-feature-settings:"tnum" 1;
    background:#222;
  }
  /* photo with a slow drift; the dark wash sits only where the text is (radial, bottom-left) plus a light top/bottom gradient */
  .bg{position:absolute;inset:0;z-index:0;background:var(--bg) center center / cover no-repeat;animation:fadeIn .4s ease-out both,kb 40s ease-in-out infinite alternate;transform-origin:60% 40%;pointer-events:none}
  .bg::after{content:"";position:absolute;inset:0;background:radial-gradient(90% 70% at 18% 62%, rgba(20,20,22,.55) 0%, rgba(20,20,22,0) 100%),linear-gradient(to bottom, rgba(51,51,51,.62) 0%, rgba(51,51,51,.55) 50%, rgba(51,51,51,.45) 100%)}
  .bg.out{animation:none;z-index:0}
  .bg.plain{background:radial-gradient(120% 90% at 15% 0%,#3d454d 0%,#2a2f35 55%,#1d2125 100%);animation:none}
  .bg.grad{background:linear-gradient(160deg,hsl(var(--hue,210) 26% 36%),hsl(calc(var(--hue,210) + 40) 22% 13%));animation:none}
  .bg.plain::after,.bg.grad::after{display:none}
  @keyframes kb{from{transform:scale(1)}to{transform:scale(1.045)}}
  :host(.in-card){height:100%}
  .nav,.title,.strip,.page,.settings,.banner,.empty{z-index:1}
  *{box-sizing:border-box;margin:0;padding:0}
  a{color:inherit;text-decoration:none}
  button{font:inherit;color:inherit}
  ha-icon{--mdc-icon-size:30px;display:inline-flex}
  img.ico{width:30px;height:30px;display:block}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  @keyframes rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  /* transform-only entrances for wrappers whose children blur the page (an opacity animation on an ancestor stops backdrop-filter) */
  @keyframes downT{from{transform:translateY(-10px)}to{transform:none}}
  @keyframes upT{from{transform:translateY(10px)}to{transform:none}}

  /* ===== navigation ===== */
  .nav{position:absolute;top:calc(40px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)));left:var(--pad);right:var(--pad);height:46px;z-index:5;display:flex;--navgap:clamp(10px,1.4vw,18px);gap:var(--navgap);align-items:center;animation:downT .5s var(--ease) both}
  .nav .links + *{margin-left:auto}
  .nav>*{height:46px;display:flex;align-items:center}
  .brand{gap:10px}
  .logo{display:flex;align-items:center;gap:10px;font-size:19px;font-weight:800;letter-spacing:-.4px;cursor:pointer;white-space:nowrap;min-width:0}
  .logo .bt{overflow:hidden;text-overflow:ellipsis;min-width:0}
  .logo .mark{width:46px;height:46px;border-radius:14px;background:rgba(255,255,255,.14);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);display:grid;place-items:center;border:1px solid var(--line);flex:none}
  .logo .mark img.ico{width:22px;height:22px}
  .ham{width:44px;height:44px;border:0;border-radius:50%;background:rgba(255,255,255,.12);backdrop-filter:blur(16px);color:#fff;cursor:pointer;display:grid;place-items:center;flex:none}
  .ham ha-icon{--mdc-icon-size:20px}
  .pill{border-radius:999px;background:rgba(255,255,255,.10);backdrop-filter:blur(20px) saturate(1.3);-webkit-backdrop-filter:blur(20px) saturate(1.3);border:1px solid var(--line);box-shadow:0 1px 0 rgba(255,255,255,.08) inset,0 10px 30px rgba(0,0,0,.18)}
  .links{position:absolute;left:50%;top:0;transform:translateX(-50%);display:flex;gap:2px;padding:4px;max-width:calc(100% - 560px);overflow:auto;scrollbar-width:none}
  .links a{font-size:clamp(12px,1vw,14px);white-space:nowrap;font-weight:600;padding:0 clamp(8px,.85vw,14px);height:36px;display:flex;align-items:center;border-radius:999px;color:var(--fg-2);cursor:pointer;transition:background .2s,color .2s}
  .links a:hover{background:rgba(255,255,255,.08);color:#fff}
  .links a.active{background:rgba(255,255,255,.26);color:#fff;font-weight:700}
  .links .sep{width:1px;height:20px;background:var(--line);align-self:center;margin:0 4px 0 8px;flex:none}
  .links a.search{width:38px;padding:0;justify-content:center;flex:none}
  .links a.search img.ico{width:16px;height:16px}
  .links.srch{padding:0;overflow:visible;width:min(560px,calc(100% - 560px));display:block}
  .links.srch .searchbar{position:static;transform:none;width:100%;animation:none}
  /* floor navigation: one pill per floor, rooms in a dropdown (hover on desktop, tap on touch) */
  /* the pill glass sits on ::before so the dropdown (a child) is not inside a backdrop-filter and can blur on its own; z-index lifts it over the search bar */
  .links.floors{overflow:visible;position:absolute;z-index:7;background:none;backdrop-filter:none;-webkit-backdrop-filter:none;border:0;box-shadow:none}
  .links.floors::before{content:"";position:absolute;inset:0;border-radius:inherit;background:rgba(255,255,255,.10);backdrop-filter:blur(20px) saturate(1.3);-webkit-backdrop-filter:blur(20px) saturate(1.3);border:1px solid var(--line);box-shadow:0 1px 0 rgba(255,255,255,.08) inset,0 10px 30px rgba(0,0,0,.18);z-index:-1}
  .links .fl{position:relative;display:flex;align-items:center}
  .links .fl>a{gap:6px}
  .links .fl>a small{font-weight:600;opacity:.6;font-size:.92em}
  .links .fl>a ha-icon{--mdc-icon-size:16px;width:16px;height:16px;opacity:.7;transition:transform .2s;margin-right:-4px}
  .links .fl.open>a ha-icon{transform:rotate(180deg)}
  .links .dd{display:none;position:absolute;top:calc(100% + 8px);left:50%;transform:translateX(-50%);min-width:190px;flex-direction:column;gap:2px;padding:6px;border-radius:var(--r);background:rgba(255,255,255,.14);backdrop-filter:blur(24px) saturate(1.2);-webkit-backdrop-filter:blur(24px) saturate(1.2);border:1px solid var(--line);box-shadow:0 14px 34px rgba(0,0,0,.25);z-index:20;animation:fadeIn .15s ease-out both}
  .links .dd::before{content:"";position:absolute;left:0;right:0;top:-10px;height:10px}
  .links .dd a{height:40px;border-radius:var(--r-sm);padding:0 14px;font-size:14px}
  .links .dd a:hover{background:rgba(255,255,255,.1)}
  .links .dd a.active{background:rgba(255,255,255,.22)}
  .links .fl.open .dd{display:flex}
  @media (hover:hover) and (min-width:901px){ .links .fl:hover .dd{display:flex} .links .fl:hover>a ha-icon{transform:rotate(180deg)} }
  @media (max-width:1700px){ .links a{padding:0 clamp(6px,.75vw,12px)} .nav{--navgap:clamp(8px,1.1vw,14px)} }
  @media (max-width:1200px){ .links a{padding:0 clamp(6px,.8vw,12px);font-size:clamp(11px,1vw,13px)} .nav{--navgap:clamp(8px,1.2vw,14px)} }
  .people{display:inline-flex;align-items:center;gap:7px;padding:0 14px 0 12px;cursor:pointer;font-size:14px;font-weight:700}
  .people ha-icon{--mdc-icon-size:18px}
  .people .pc small{font-weight:700;color:var(--fg-3);font-size:inherit}
  .people + .alarm{margin-left:calc(8px - var(--navgap))}
  .alarm{display:inline-flex;align-items:center;gap:9px;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;padding:0 16px;cursor:pointer;white-space:nowrap}
  .alarm ha-icon{--mdc-icon-size:17px}
  .alarm i{width:8px;height:8px;border-radius:50%;background:#fff;opacity:.4;flex:none}
  .alarm.off i{background:#fff;opacity:.4;box-shadow:none}
  .alarm.armed{background:rgba(255,255,255,.4)}
  .alarm.armed i{background:#f2b63a;opacity:1;box-shadow:0 0 8px rgba(242,182,58,.7)}
  .alarm.home i{background:#8fd16a;opacity:1;box-shadow:0 0 8px rgba(143,209,106,.7)}
  .alarm.arming i{background:#f2b63a;opacity:1;animation:blink 1s ease-in-out infinite}
  .alarm.triggered{background:rgba(242,122,92,.6)}
  .alarm.triggered i{background:#f27a5c;opacity:1;animation:blink .5s ease-in-out infinite}
  .alarm.unavailable i{opacity:.3}
  @keyframes blink{0%,100%{opacity:1;box-shadow:0 0 8px rgba(242,182,58,.8)}50%{opacity:.25;box-shadow:none}}
  .time{align-items:center;justify-content:center;white-space:nowrap}
  .time b{font-size:19px;font-weight:800;letter-spacing:-.4px}
  .time small{font-size:11px;font-weight:600;letter-spacing:1.4px;text-transform:uppercase;color:var(--fg-3);margin-top:3px}
  .menu,.sbtn{display:none;width:46px;height:46px;border-radius:999px;background:rgba(255,255,255,.10);backdrop-filter:blur(20px) saturate(1.3);-webkit-backdrop-filter:blur(20px) saturate(1.3);border:1px solid var(--line);box-shadow:0 1px 0 rgba(255,255,255,.08) inset,0 10px 30px rgba(0,0,0,.18);place-items:center;cursor:pointer;flex:none;color:#fff}
  .menu img,.sbtn img{width:18px;height:18px}
  .sbtn.on{background:rgba(255,255,255,.3)}

  /* ===== title block: eyebrow, greeting, one line, rotating notice; weather block on the right ===== */
  .title{position:absolute;left:var(--pad);right:var(--pad);top:44%;transform:translateY(-50%);display:grid;grid-template-columns:minmax(0,1fr) max-content;align-items:end;gap:40px}
  .title>*{animation:upT .6s var(--ease) both;animation-delay:.1s}
  .title .tl{min-width:0}
  .title .temp{display:flex;align-items:center;flex-wrap:wrap;gap:10px;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--fg-2);min-height:18px}
  .title .temp .dt{margin:0 -3px}
  .title h1{font-size:clamp(48px,6.6vw,92px);font-weight:600;letter-spacing:-3.2px;line-height:1;margin:12px 0 6px;text-shadow:0 2px 24px rgba(0,0,0,.25)}
  .title .sub{font-size:19px;font-weight:400;color:var(--fg-2);max-width:48ch;line-height:1.35;min-height:22px}
  .title .sub b{font-weight:600;color:#fff}
  .ticker{margin:8px 0 0 2px;height:24px;position:relative;overflow:hidden;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--fg-2);max-width:640px}
  .pills{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0 2px}
  .pills button{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px 0 10px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.08);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);color:var(--fg-2);font:inherit;font-size:13px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background .2s}
  .pills button.on{background:rgba(255,255,255,.18);color:#fff}
  .pills button:active{background:rgba(255,255,255,.3)}
  .pills button img.ico,.pills button ha-icon{width:17px;height:17px;--mdc-icon-size:17px}
  .title .pills + .quick{margin-top:10px}
  .ticker div{position:absolute;left:0;top:0;height:24px;display:flex;align-items:center;gap:10px;opacity:0;transform:translateY(100%);transition:opacity .45s var(--ease),transform .45s var(--ease);white-space:nowrap}
  .ticker div.show{opacity:1;transform:none}
  .ticker div.out{opacity:0;transform:translateY(-100%)}
  .ticker div:not(.show){pointer-events:none}
  .ticker .tk{all:unset;display:flex;align-items:center;gap:10px;cursor:pointer;height:24px}
  .ticker .tk:hover span,.ticker .tk:focus-visible span{color:#fff;text-decoration:underline;text-underline-offset:3px}
  .ticker .tt{color:#fff;font-weight:700}
  .ticker b{color:#fff;font-weight:700}
  .ticker span{color:var(--fg-2)}
  .dt,.ticker .dt,.card .s .dt,.card .lbl .dt,.wx .cnd .dt,.title .temp .dt{display:inline-block;width:4px;height:4px;border-radius:50%;background:#fff;opacity:.5;margin:0 7px;vertical-align:2px;flex:none}
  .ticker .dt{margin:0 -3px}
  .card .lbl .dt{align-self:center}
  .ticker ha-icon{--mdc-icon-size:18px}
  .ticker img.ico{width:18px;height:18px}
  .wx{text-align:right;padding-bottom:6px;cursor:pointer;animation-name:upT;animation-delay:.25s}
  .wx .big{display:flex;align-items:flex-start;justify-content:flex-end;gap:6px}
  .wx .big img.ico,.wx .big ha-icon{width:52px;height:52px;--mdc-icon-size:52px;margin-top:6px;opacity:.95}
  .wx .t{font-size:72px;font-weight:500;letter-spacing:-3px;line-height:1}
  .wx .t sup{font-size:28px;font-weight:600;vertical-align:top;margin-left:2px;line-height:1.6}
  .wx .cnd{font-size:15px;font-weight:600;color:var(--fg-2);margin-top:2px}
  .wx .hl{font-size:13px;font-weight:600;letter-spacing:1.4px;text-transform:uppercase;color:var(--fg-3);margin-top:4px}
  .wx .hours{display:flex;gap:4px;justify-content:flex-end;margin-top:14px}
  .wx .hours div{width:64px;padding:10px 0;border-radius:var(--r);background:rgba(255,255,255,.10);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid var(--line);text-align:center;font-size:12px;font-weight:600;color:var(--fg-2)}
  .wx .hours div{font-size:13px}
  .wx .hours div img.ico,.wx .hours div ha-icon{width:24px;height:24px;--mdc-icon-size:24px;margin:6px auto;display:block}
  .wx .hours div b{display:block;color:#fff;font-weight:700;font-size:14px}
  @media (max-width:1100px){ .wx .hours{display:none} }

  /* ===== card strip ===== */
  .strip{position:absolute;left:var(--pad);right:0;bottom:85px;display:flex;gap:var(--card-gap);overflow-x:auto;scroll-snap-type:none;scrollbar-width:none;padding:6px 0}
  @media (pointer:coarse){ .strip{scroll-snap-type:x proximity} }
  .strip::-webkit-scrollbar{display:none}
  /* soft shadows on the row's edges: right always, left once scrolled */
  .sfade{position:absolute;bottom:85px;height:calc(var(--card-h) + 12px);width:64px;pointer-events:none;z-index:2;opacity:0;transition:opacity .25s}
  .sfade.r{right:0;background:linear-gradient(to left,rgba(0,0,0,.38),transparent);opacity:1}
  .sfade.l{left:var(--pad);background:linear-gradient(to right,rgba(0,0,0,.38),transparent)}
  .sfade.l.on{opacity:1}
  .strip::after{content:"";flex:none;width:var(--pad)}
  .strip.drag{cursor:grabbing;scroll-snap-type:none}
  .strip.rows2{--rows2-scale:1;--rows2-card-h:var(--card-h);--rows2-card-w:var(--card-w);display:block;height:calc(var(--rows2-card-h) * 2 + var(--card-gap) + 12px);overflow-x:auto;overflow-y:hidden}
  .room-rows{display:flex;flex-direction:column;gap:var(--card-gap);width:max-content;min-width:100%}
  .room-row{display:flex;gap:var(--card-gap);width:max-content;min-height:var(--rows2-card-h, var(--card-h))}
  .room-cell{position:relative;flex:none;width:var(--rows2-card-w);height:var(--rows2-card-h)}
  .room-scale{position:absolute;left:0;top:0;width:var(--card-w);height:var(--card-h);transform:scale(var(--rows2-scale));transform-origin:top left}
  .sfade.rows2{height:calc(var(--card-h) * 2 + var(--card-gap) + 12px)}
  /* wide screens: every page's cards share one size (--tile-h). A room keeps a zone of two rows above the bottom line with its title
     above that zone, so the title never moves between rooms; one row sits on the top line of the zone, right under the title. */
  @media (min-width:901px){
    .strip,.sfade{--card-h:var(--tile-h);--card-w:var(--tile-w)}
    .title.rt{top:auto;bottom:calc(85px + var(--tile-h) * 2 + var(--card-gap) + 12px + 24px);transform:none}
    .strip.room:not(.rows2),.sfade.room:not(.rows2){bottom:calc(85px + var(--tile-h) + var(--card-gap))}
    .strip.room ~ .empty{bottom:calc(85px + var(--tile-h) * 2 + var(--card-gap) - 24px)}   /* an empty room says so where its first row would start */
  }
  /* layout: icon + corner text on top, name/state centred in what is left, caps line at the bottom */
  .card{flex:none;width:var(--card-w);height:var(--card-h);background:var(--card);backdrop-filter:blur(16px) saturate(1.2);-webkit-backdrop-filter:blur(16px) saturate(1.2);border:1px solid var(--line);box-shadow:0 1px 0 rgba(255,255,255,.08) inset,0 12px 32px rgba(0,0,0,.18);--cp:22px;--lh:28px;--bh:34px;--bh-sock:56px;--bh-media:42px;--bh-tile:52px;--bg:10px;--gut:14px;--ib:36px;--ctl-w:46px;--vs-w:12px;--rr:0px;--rc:0px;--rl:0px;--reserve:0px;padding:var(--cp) calc(var(--cp) + var(--rr)) calc(var(--cp) + var(--reserve)) calc(var(--cp) + var(--rl));display:grid;grid-template-columns:minmax(0,1fr) max-content;--a-base:"i c" ". ." "n n" "s s" ". ." "l l";--r-base:max-content 1fr max-content max-content 1fr var(--lh);--a-capt:"i c" ". ." "n n" "s s" "l l" ". .";--r-capt:max-content 1fr max-content max-content max-content 1fr;--a-hero:"i c" ". ." "s s" "n n" ". ." "l l";--a-hero-capt:"i c" ". ." "s s" "n n" "l l" ". .";--a-hero-foot:"i c" ". ." "s s" "n n" "l l" ". ." "f f";--r-foot:max-content 1fr max-content max-content max-content 1fr max-content;--a-cam:"i c" ". ." "n n" "s s";--r-cam:max-content 1fr max-content max-content;grid-template-areas:var(--areas,var(--a-base));grid-template-rows:var(--rows,var(--r-base));scroll-snap-align:start;position:relative;border-radius:var(--r);overflow:hidden;cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;animation:rise .55s var(--ease) both;transition:transform .25s var(--ease),background .25s,border-color .25s,padding .3s}
  /* hero order: the big value above its name (climate, plug, value cards); every other card is name above status */
  .card.hero{--areas:var(--a-hero);--rows:var(--r-base)}
  .card:nth-child(2){animation-delay:60ms}.card:nth-child(3){animation-delay:120ms}.card:nth-child(4){animation-delay:180ms}.card:nth-child(5){animation-delay:240ms}.card:nth-child(n+6){animation-delay:300ms}
  @media (hover:hover){ .card:hover{transform:translateY(-3px);background-color:rgba(255,255,255,.14)} .card.on:hover{background-color:rgba(255,255,255,.4)} .card.art:hover,.card.appart:hover{background-color:transparent} }
  .card.on{background:var(--card-on);border-color:var(--line-on)}
  /* no opacity/filter here: both would turn the card into a backdrop root and kill the blur behind it */
  .card.unavailable{background:rgba(255,255,255,.04);border-style:dashed;color:var(--fg-3)}
  .card.unavailable .i,.card.unavailable .ua{opacity:.5}
  .card.unavailable .i{filter:grayscale(1)}
  .card.unavailable .ctl,.card.unavailable .seg,.card.unavailable .socks,.card.unavailable .slider{display:none}
  .card.unavailable .s{font-style:italic}
  .card .i{grid-area:i;width:var(--ib);height:var(--ib);margin-left:-3px;align-self:center}
  .card .i img.ico{width:100%;height:100%;display:block}
  .card .i ha-icon{--mdc-icon-size:calc(var(--ib) + 4px);margin:-2px}
  .card .c{position:absolute;top:var(--cp);right:calc(var(--cp) + var(--rc));height:var(--ib);display:flex;align-items:center;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:var(--fg-2);white-space:nowrap;max-width:min(calc(var(--card-w) * .55),calc(100% - 2 * var(--cp) - var(--rl) - var(--rc) - var(--ib) - 8px));overflow:hidden;text-overflow:ellipsis}
  .card .n{grid-area:n;font-size:17px;font-weight:600;line-height:1.2;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  .card .s{grid-area:s;font-size:13px;font-weight:500;color:var(--fg-3);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .card .s b{color:var(--fg-2);font-weight:600}
  .card .s.big{font-size:36px;font-weight:600;letter-spacing:-1.8px;line-height:1;color:#fff;margin:0}
  .card .lbl{grid-area:l;height:var(--lh);display:flex;align-items:flex-end;font-size:11px;text-transform:uppercase;letter-spacing:1.8px;font-weight:600;color:var(--fg-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .card .lbl>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .card .lbl.steps{display:flex;gap:4px;overflow:visible;align-items:center}
  .card .lbl.steps button{height:var(--lh);padding:0 10px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid var(--line);font:inherit;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--fg-2);cursor:pointer}
  .card .lbl.steps button.on{background:rgba(255,255,255,.9);color:#1d1d1f}
  .card .lbl.cols{display:flex;gap:6px;align-items:center;overflow:visible}
  .card .lbl.cols button{width:calc(var(--lh) - 4px);height:calc(var(--lh) - 4px);border-radius:50%;border:2px solid rgba(255,255,255,.35);padding:0;cursor:pointer;flex:none}
  .card .lbl.cols button.on{border-color:#fff;box-shadow:0 0 0 2px rgba(0,0,0,.25)}
  .card .lbl.cols span{margin-left:4px;overflow:hidden;text-overflow:ellipsis}
  .card .lbl.bars{display:flex;align-items:flex-end;gap:2px;padding:6px 0 0;margin:0;height:var(--lh)}
  .card .lbl.bars i{flex:1;background:rgba(255,255,255,.25);border-radius:2px 2px 0 0;min-height:2px}
  .card .lbl.bars i.on{background:#fff}
  .card .lbl.today b{color:#fff;font-weight:700}
  .card .bat{position:absolute;right:var(--cp);bottom:var(--cp);display:flex;align-items:center;gap:5px;height:14px;font-size:10px;font-weight:700;letter-spacing:1.2px;color:var(--fg-3)}
  .card .bat img.ico,.card .bat ha-icon{width:14px;height:14px;--mdc-icon-size:14px;opacity:.8}
  .card .bat.low{color:#fff}
  .card.vs .bat{right:calc(var(--cp) + 26px)}
  .card:has(.bat) .lbl{padding-right:66px}
  .card:has(.bat) .lbl.bars{margin-right:66px;padding-right:0}
  .card .ua{position:absolute;top:12px;right:12px;width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.25);display:grid;place-items:center}
  .card .ua ha-icon{--mdc-icon-size:16px}
  /* cards with action buttons keep the text clear of the button column */
  .card.actions{--rr:calc(var(--ctl-w) + var(--bg))}
  .card .ctl{position:absolute;right:var(--cp);bottom:var(--cp);width:var(--ctl-w);display:grid;grid-auto-rows:var(--ctl-w);gap:4px}
  .card .ctl button{border:1px solid rgba(255,255,255,.08);border-radius:var(--r-sm);background:rgba(0,0,0,.22);color:#fff;cursor:pointer;display:grid;place-items:center;-webkit-tap-highlight-color:transparent;transition:background .15s}
  .card .ctl button:active{background:rgba(0,0,0,.35)}
  .card .ctl button img{display:block;width:18px;transform:rotate(-90deg)}
  .card .ctl button.down img{transform:rotate(90deg)}
  .card .ctl button ha-icon{--mdc-icon-size:22px}
  /* climate: setpoint big above the name, current temperature under it, presets bottom-left, hvac modes in a column left of up/down */
  .card.climate{--areas:var(--a-hero-capt);--rows:var(--r-capt);--bt:calc(30 * var(--u));--rw:calc(44 * var(--u));--bh:var(--bt);--rr:calc(var(--rw) + var(--gut));--rc:var(--rr);--reserve:calc(var(--bt) + var(--bg))}
  .card.climate .ctl.row{position:absolute;left:var(--cp);right:auto;bottom:var(--cp);width:auto;display:flex;align-items:center;gap:4px;grid-auto-rows:auto}
  .card.climate .ctl.row .seg{height:var(--bt);padding:3px;align-items:center;margin-right:4px}
  .card.climate .ctl.row .seg button{height:100%;white-space:nowrap;padding:0 10px;font-size:calc(10 * var(--u))}
  .card.climate .ctl.row>button{width:var(--bt);height:var(--bt);flex:none;background:rgba(255,255,255,.12);border:1px solid var(--line);border-radius:999px}
  .card.climate .ctl.row>button.on{background:rgba(255,255,255,.9);color:#1d1d1f}
  .card.climate .ctl.row>button ha-icon{--mdc-icon-size:calc(16 * var(--u))}
  /* the rail: + at the top, − at the bottom, drag the filled part to set the temperature */
  .card.climate .rail{position:absolute;top:var(--cp);bottom:var(--cp);right:var(--cp);width:var(--rw);border-radius:999px;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.08);touch-action:none;user-select:none;overflow:hidden}
  .card.climate .rail i{position:absolute;left:3px;right:3px;bottom:3px;height:calc(var(--v) * 1%);border-radius:999px;background:rgba(255,255,255,.22);pointer-events:none;transition:height .15s}
  .card.climate .rail b::after{content:attr(data-v)}
  .card.climate .rail b{position:absolute;left:3px;right:3px;height:calc(var(--rw) - 6px);bottom:calc(var(--v) * 1% - (var(--rw) - 6px) / 2);border-radius:50%;background:#fff;color:#1d1d1f;display:grid;place-items:center;font-size:calc(11 * var(--u));font-weight:800;letter-spacing:-.3px;pointer-events:none;transition:bottom .15s}
  .card.climate .rail em{position:absolute;left:0;right:0;height:26px;display:grid;place-items:center;font-style:normal;font-size:15px;font-weight:700;color:var(--fg-2);cursor:pointer}
  .card.climate .rail em.up{top:2px} .card.climate .rail em.dn{bottom:2px}
  .card.climate:not(.on) .rail i{background:rgba(255,255,255,.12)}
  .card.climate:not(.on) .rail b{background:rgba(255,255,255,.6)}
  .card.climate .seg button{height:30px;padding:0 10px;font-size:10px}
  .card.climate .n{margin-top:4px;-webkit-line-clamp:1}   /* one line: the setpoint above and the control row below leave no room for two */
  .card.climate .lbl ha-icon{--mdc-icon-size:14px;margin-right:4px;vertical-align:-2px;opacity:.8}
  .card.climate .lbl{height:calc(var(--lh) - 8px);font-size:13px;font-weight:500;letter-spacing:0;text-transform:none;color:var(--fg-3);margin-top:3px}
  .card .seg{display:inline-flex;border-radius:999px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.08);padding:3px;width:max-content}
  .card .seg button{border:0;border-radius:999px;background:transparent;color:var(--fg-3);font:inherit;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;height:32px;padding:0 14px;cursor:pointer}
  .card .seg button.on{background:rgba(255,255,255,.9);color:#1d1d1f}
  /* media: artwork fills the card, the text sits on a translucent panel on the right, transport row at the bottom */
  .card.media{--areas:var(--a-capt);--rows:var(--r-capt);--reserve:calc(var(--bh-media) + var(--bg));--rr:0px}
  .card.media.art,.card.media.appart{--rl:calc(var(--card-w) * .34)}
  .card.art,.card.appart{border-width:0;padding:calc(var(--cp) + 1px) calc(var(--cp) + var(--rr) + 1px) calc(var(--cp) + var(--reserve) + 1px) calc(var(--cp) + var(--rl) + 1px)}   /* no border: overflow:hidden clips the scrim to the padding box, so a border left a strip of bare art around it; the extra 1px keeps the content where it was */
  .card.art{background-size:cover;background-position:center}
  .card.art::before,.card.appart::before{content:"";position:absolute;top:0;bottom:0;right:0;left:34%;background:rgba(20,20,24,.45);backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2);box-shadow:-6px 0 14px -2px rgba(0,0,0,.4);pointer-events:none}
  .card.art>*:not(.ctl):not(.ua):not(.appi):not(.c),.card.appart>*:not(.ctl):not(.ua):not(.appi):not(.c){position:relative}
  .card.art .c,.card.appart .c{z-index:1}
  .card.art .ctl{z-index:1}
  .card.media .prog{grid-area:l;height:3px;border-radius:2px;background:rgba(255,255,255,.18);margin-top:10px;overflow:hidden;align-self:start}
  .card.media .prog i{display:block;height:100%;background:#fff;border-radius:2px}
  .card.media .ctl{left:calc(var(--cp) + var(--rl));right:var(--cp);bottom:var(--cp);width:auto;display:flex;gap:6px;grid-auto-rows:auto}
  .card.media .ctl button{flex:1;height:var(--bh-media);background:rgba(255,255,255,.12);border:1px solid var(--line)}
  .card.media .ctl button.main{flex:1.6;background:rgba(255,255,255,.9);color:#1d1d1f;border-color:transparent}
  /* media card without artwork: the running app in its brand colour */
  .card.art .n,.card.art .s,.card.art .c{text-shadow:0 1px 8px rgba(0,0,0,.35)}
  .card.media.unavailable .ctl{opacity:.35;pointer-events:none}   /* an unreachable player cannot be steered: do not offer it */
  .card.media.unavailable .ctl button.main{background:rgba(255,255,255,.12);color:#fff;border-color:var(--line)}
  .card.appart{background:linear-gradient(135deg,color-mix(in srgb,var(--app,#8a8f96) 70%,#1c1c1c) 0%,color-mix(in srgb,var(--app,#8a8f96) 30%,#1c1c1c) 100%)}
  .card.appart .appi{position:absolute;left:calc(var(--card-w) * .17);top:50%;transform:translate(-50%,-50%);--mdc-icon-size:44px;opacity:.95}
  /* light colour tint */
  .card.tinted .slider{background:rgba(255,255,255,.9)}
  /* vertical brightness / speed / position bar: full card height, fills from the bottom, value in the corner */
  .card.vs{--rr:calc(var(--vs-w) + var(--gut));--rc:var(--rr)}
  .vslider{position:absolute;top:var(--cp);bottom:var(--cp);right:var(--cp);width:var(--vs-w);border-radius:999px;background:rgba(255,255,255,.14);cursor:ns-resize;touch-action:none;overflow:hidden}
  .vslider::before{content:"";position:absolute;inset:0 -14px}
  .vslider i{position:absolute;left:0;right:0;bottom:0;height:var(--v,0%);background:#fff;border-radius:999px;transition:height .15s;pointer-events:none}
  .card.vs:not(.on) .vslider{background:rgba(255,255,255,.08)}
  .card.vs:not(.on) .vslider i{height:0}
  .card .slider{position:absolute;left:var(--cp);right:var(--cp);bottom:var(--cp);height:8px;border-radius:20px;background:hsl(0 0% 98%);transition:transform .6s,opacity .3s;cursor:pointer}
  .card .slider i{position:absolute;left:0;top:0;bottom:0;border-radius:20px;background:hsl(0 0% 75%);width:var(--v);pointer-events:none}
  .card .slider b{position:absolute;top:50%;left:var(--v);width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:#fff;box-shadow:2px 0 8px 2px rgba(0,0,0,.15);pointer-events:none}
  .card:not(.on) .slider{transform:translateY(45px);opacity:0;pointer-events:none}
  /* camera: snapshot behind, name and state in the bottom-left over a gradient */
  .card.cam{--areas:var(--a-cam);--rows:var(--r-cam);isolation:isolate}
  .card.cam hcn-cam-snap{z-index:-1}
  .card.cam::before{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(20,20,20,.75),rgba(20,20,20,0) 60%);pointer-events:none}
  .card.cam .n,.card.cam .s,.card.cam .i{position:relative}
  /* power strip sockets */
  .card.pstrip{--reserve:calc(var(--bh-sock) + var(--bg))}
  .card .socks{position:absolute;left:var(--cp);right:var(--cp);bottom:var(--cp);display:flex;gap:6px}
  .card .socks button{flex:1;height:var(--bh-sock);border:1px solid var(--line);border-radius:var(--r-sm);background:rgba(255,255,255,.1);color:#fff;cursor:pointer;display:grid;place-items:center;gap:2px;font:inherit;-webkit-tap-highlight-color:transparent;user-select:none}
  .card .socks button.on{background:rgba(255,255,255,.45)}
  .card .socks button.unavailable{opacity:.35}
  .card .socks button ha-icon{--mdc-icon-size:20px}
  .card .socks button small{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;opacity:.8;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  /* litter box: the button row sits in the bottom-line row (as the light's steps do), so name and status keep the height of the other cards; icon buttons only, the state (weight, cleaning, bin full) is the corner text */
  .card.litter{--bh-sock:var(--bh);--lh:var(--bh);--reserve:0px}
  .card.litter .n{-webkit-line-clamp:1}
  /* appliance test card: progress as a line along the bottom edge (as on the media card); the separator dot sits on the text line */
  .card.appl2.dirty .c{color:#ffb46e}   /* dishwasher: closed and not started */
  .card.appl2 .prog{position:absolute;left:0;right:0;bottom:0;height:3px;background:rgba(255,255,255,.14)}
  .card.appl2 .prog u{display:block;height:100%;background:#fff;transition:width .6s ease}
  .card.appl2 .lbl .dt{align-self:flex-end;margin-bottom:5px}
  .card.appl2 .ctl.row button{flex:0 1 auto;min-width:0}   /* two buttons (Stop, Pause) shrink to the card instead of running out of it */
  .card.appl2 .ctl.row button .bl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  /* appliance: stop / power row at the bottom */
  .card.appl,.card.acts{--reserve:calc(var(--bh) + var(--bg))}
  /* the name keeps the height every other card gives it: the button row is absolute at the bottom and takes no room from the grid, and it takes the place of the bottom line (as on the phone) */
  .card.appl:not(.plug){--reserve:0px}
  .card.appl:not(.plug) .lbl{display:none}
  .card.appl .ctl.row{position:absolute;left:var(--cp);right:var(--cp);bottom:var(--cp);width:auto;display:flex;gap:6px;grid-auto-rows:auto}
  .card.appl .ctl.row button{height:var(--bh);padding:0 14px;flex:none;display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:rgba(255,255,255,.12);border:1px solid var(--line);border-radius:var(--r-sm)}
  .card.appl .ctl.row button ha-icon{--mdc-icon-size:16px}
  .card.appl .ctl.row button.on{background:rgba(255,255,255,.9);color:#1d1d1f}
  .card.noname .n,.card.nosub .s,.card.nostate .c{display:none}
    .card.acts .ctl.row{position:absolute;left:var(--cp);right:var(--cp);bottom:var(--cp);width:auto;display:flex;gap:6px;grid-auto-rows:auto}
  .card.acts .ctl.row button{height:var(--bh);padding:0 14px;flex:none;display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:rgba(255,255,255,.12);border:1px solid var(--line);border-radius:var(--r-sm)}
  .card.acts .ctl.row button ha-icon{--mdc-icon-size:16px}
  .card.acts.vs .ctl.row{right:calc(var(--cp) + var(--rr))}
  .card.acts .lbl{display:none}
  /* plug with a power meter: watts as the hero, sparkline right, options at the bottom */
  .card.plug{--areas:var(--a-hero-foot);--rows:var(--r-foot)}
  .card.plug .s.big small{font-size:16px;font-weight:600;letter-spacing:0;color:var(--fg-3);margin-left:4px}
  .card.plug .meta{grid-area:l;font-size:13px;font-weight:500;color:var(--fg-3);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .card.plug .meta b{color:var(--fg-2);font-weight:600}
  .card.plug .lbl{grid-area:f}
  .card.plug .spk{position:absolute;right:var(--cp);top:calc(var(--cp) + 50px);width:110px;height:34px;pointer-events:none}
  .card.plug .spk svg{width:100%;height:100%}
  .card.plug.appl .spk{top:auto;bottom:calc(var(--cp) + 46px)}
  .card.plug.hasspk{--rr:120px}
  .card .lbl.chips{display:flex;gap:4px;align-items:center;overflow:visible}
  .card .lbl.chips button{height:var(--lh);padding:0 10px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid var(--line);font:inherit;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--fg-2);cursor:pointer}
  .card .lbl.chips button.on{background:rgba(255,255,255,.9);color:#1d1d1f}
  /* with an action row, the bottom option shares the line with the buttons */
  .card.plug.appl{--areas:var(--a-hero-capt);--rows:var(--r-capt)}
  .card.plug.appl .lbl{position:absolute;left:var(--cp);right:calc(var(--cp) + 96px);bottom:var(--cp);height:34px;align-items:center}
  .card.plug.appl .ctl.row{left:auto}
  .card.plug .c i{width:6px;height:6px;border-radius:50%;background:#fff;margin-right:7px;animation:blink 1.4s ease-in-out infinite}
  .card .lbl.cost b{color:#fff;font-weight:700}
  /* attention list */
  .card.list .s{white-space:normal;display:flex;flex-direction:column;gap:6px;margin-top:10px;overflow:hidden}
  .card.list .s span{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--fg-2);white-space:nowrap;min-width:0}
  .card.list .s span img.ico,.card.list .s span ha-icon{width:16px;height:16px;--mdc-icon-size:16px;opacity:.8;flex:none}
  .card.list .s span b{font-weight:600;color:#fff;overflow:hidden;text-overflow:ellipsis}
  .card.list .s span em{margin-left:auto;font-style:normal;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:3px 7px;border-radius:999px;background:rgba(255,255,255,.14);flex:none;max-width:45%;overflow:hidden;text-overflow:ellipsis}
  .card.people .s{display:flex;gap:6px;margin-top:4px}
  .card.people .s span{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.3);display:grid;place-items:center;font-size:12px;font-weight:700;overflow:hidden}
  .card.people .s span img{width:100%;height:100%;object-fit:cover}
  .card.people .s span.away{opacity:.3}
  /* scenes: one button per scene with its name */
  .card.scenes .s{display:flex;gap:6px;margin-top:10px;white-space:normal;overflow:visible}
  .card.scenes .s button{flex:1;min-width:0;height:var(--bh-tile);border:1px solid var(--line);border-radius:var(--r-sm);background:rgba(255,255,255,.12);color:#fff;cursor:pointer;display:grid;place-items:center;gap:3px;padding:0 4px;align-content:center}
  .card.scenes .s button ha-icon{--mdc-icon-size:20px}
  .card.scenes .s button small{font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.2}
  .card.scenes .s button.on{background:rgba(255,255,255,.9);color:#1d1d1f}
  /* sub-card: a glass tile inside a card listing what comes next (agenda, weather, waste) */
  .card.hassub{--rr:calc(var(--card-w) * .42 + 16px - var(--cp))}
  .card .subc{position:absolute;right:var(--cp);top:var(--cp);bottom:var(--cp);width:calc(var(--card-w) * .40);border-left:1px solid var(--line);padding-left:16px;display:flex;flex-direction:column;justify-content:center;gap:12px;overflow:hidden}
  .card .lbl.mob{display:none}   /* phones only: stands in for the hidden sub-card */
  .card .subc div{min-width:0}
  .card .subc div b{display:block;font-size:9px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--fg-3);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .card .subc div span{display:block;font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.25}
  .card.group .gtiles{display:flex;gap:6px;margin-top:10px;white-space:normal;overflow:visible}
  .card.group .gtiles button{flex:1;min-width:0;height:var(--bh-tile);border:1px solid var(--line);border-radius:var(--r-sm);background:rgba(255,255,255,.12);color:#fff;cursor:pointer;display:grid;place-items:center;gap:3px;padding:0 4px;align-content:center}
  .card.group .gtiles button img.ico{width:20px;height:20px}
  .card.group .gtiles button.on{background:rgba(255,255,255,.9);color:#1d1d1f}
  .card.group .gtiles button.on img.ico{filter:invert(1)}
  .card.group .gtiles button small{font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.2}
  .card.group .glist{white-space:normal;display:flex;flex-direction:column;gap:6px;margin-top:8px;overflow:hidden}
  .card.group .glist div{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;color:var(--fg-2);white-space:nowrap;min-width:0}
  .card.group .glist div i{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.3);flex:none}
  .card.group .glist div.on{color:#fff}
  .card.group .glist div.on i{background:#fff;box-shadow:0 0 8px rgba(255,255,255,.7)}
  .card.group .glist div img.ico{width:16px;height:16px;opacity:.9;flex:none}
  .card.group .glist div span{overflow:hidden;text-overflow:ellipsis}
  .card.group .glist div b{margin-left:auto;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--fg-3);flex:none}
  .card.group .glist div.on b{color:#fff}
  .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:1px}
  .empty{position:absolute;left:var(--pad);bottom:120px;font-size:14px;opacity:.6}

  /* ===== motion banner ===== */
  .banner{position:absolute;left:0;right:0;bottom:0;padding:17px 20px;text-align:center;font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:700;background:rgba(255,255,255,.1);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-top:1px solid var(--line);display:flex;justify-content:center;align-items:center;gap:10px;transform:translateY(100%);transition:transform .5s var(--ease);z-index:4}
  .banner.show{transform:translateY(0)}
  .banner img.ico{width:16px;height:16px}

  /* ===== popups ===== */
  .overlay{position:fixed;inset:0;z-index:50;background:rgba(20,20,20,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center}
  .toast.info{background:rgba(255,255,255,.14);backdrop-filter:blur(20px) saturate(1.3);-webkit-backdrop-filter:blur(20px) saturate(1.3);border:1px solid var(--line);color:#fff;font-weight:600;letter-spacing:0}
  .popup{width:max-content;min-width:400px;max-width:min(620px,calc(100vw - 32px));max-height:80vh;overflow:auto;border-radius:10px;background:rgba(255,255,255,.10);backdrop-filter:blur(24px) saturate(1.3);-webkit-backdrop-filter:blur(24px) saturate(1.3);border:1px solid var(--line);box-shadow:0 1px 0 rgba(255,255,255,.08) inset,0 24px 60px rgba(0,0,0,.35);padding:28px 30px 26px;animation:upT .25s var(--ease);scrollbar-width:none}
  .overlay{animation:fadeIn .2s ease-out}
  .popup h2{font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:.8;display:flex;justify-content:space-between;align-items:center;gap:16px}
  .popup h2 .hb{display:flex;gap:6px;flex:none}
  .popup h2 .hb button{width:32px;height:32px;border:1px solid var(--line);border-radius:50%;background:rgba(255,255,255,.1);color:#fff;cursor:pointer;display:grid;place-items:center}
  .popup h2 .hb button img{width:14px;height:14px}
  .popup h2 .hb button ha-icon{--mdc-icon-size:18px}
  .popup .big{font-size:clamp(26px,4vw,40px);font-weight:600;letter-spacing:-1.5px;margin:14px 0 2px;overflow-wrap:anywhere}
  .popup.wide{max-width:min(960px,calc(100vw - 32px));width:min(960px,calc(100vw - 32px))}
  .popup h2 .hb button.on{background:rgba(255,255,255,.3)}
  /* ••• menu: the floor-nav dropdown glass, hung under the button; lives next to .popup (not inside: overflow:auto would clip it) */
  .pw{position:relative;display:flex;justify-content:center;max-width:100%}
  .pmenu{position:absolute;top:70px;right:68px;z-index:3;min-width:250px;display:flex;flex-direction:column;gap:2px;padding:6px;border-radius:var(--r);background:rgba(44,46,50,.8);backdrop-filter:blur(24px) saturate(1.2);-webkit-backdrop-filter:blur(24px) saturate(1.2);border:1px solid var(--line);box-shadow:0 14px 34px rgba(0,0,0,.25);animation:downT .18s var(--ease) both}
  .pmenu a{display:flex;align-items:center;gap:12px;min-height:40px;padding:6px 14px 6px 12px;border-radius:var(--r-sm);font-size:14px;font-weight:600;cursor:pointer;line-height:1.25}
  .pmenu a:hover{background:rgba(255,255,255,.1)}
  .pmenu a ha-icon{--mdc-icon-size:18px;flex:none}
  .pmenu a small{display:block;font-size:11px;font-weight:500;opacity:.6;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:260px}
  .pmenu .sep{height:1px;background:var(--line);margin:4px 8px}
  .pmenu .who,.pmenu .cancel{display:none}
  @media (max-width:900px){
    .pw{position:static;width:100%}
    .pmenu{position:fixed;top:auto;left:16px;right:16px;bottom:calc(16px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)));min-width:0;animation:upT .22s var(--ease) both}
    .pmenu::before{content:"";position:fixed;inset:-100vh 0 -100vh;background:rgba(20,20,20,.5);z-index:-1}   /* scrim over the popup; a tap on it closes the sheet */
    .pmenu .who{display:flex;gap:12px;align-items:center;padding:10px 12px 12px;border-bottom:1px solid var(--line);margin-bottom:4px}
    .pmenu .who ha-icon{--mdc-icon-size:24px;flex:none}
    .pmenu .who b{font-size:15px}
    .pmenu .who small{display:block;font-size:11px;opacity:.6;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .pmenu a{min-height:46px;font-size:15px}
    .pmenu a small{display:none}
    .pmenu .cancel{display:block;margin-top:4px;height:46px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.08);color:#fff;font:inherit;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer}
  }
  .popup.wide .form .f{grid-template-columns:160px 1fr}
  .popup .form .f{display:grid;grid-template-columns:140px 1fr;gap:10px;align-items:center;padding:10px 12px;margin-top:4px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:var(--r-sm);font-size:13px;font-weight:600}
  /* card form: live preview on the left, sections on the right, the Opslaan row stays in view */
  .popup.cardf{padding-bottom:0;width:min(calc(var(--card-w) + 720px),calc(100vw - 32px));max-width:none}
  .popup .fwrap{display:grid;grid-template-columns:var(--card-w) 1fr;gap:28px;margin-top:8px}
  .popup .pv{position:sticky;top:0;align-self:start}
  .popup .pv .ey{font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--fg-2);margin:0 0 8px 2px;display:flex;justify-content:space-between}
  .popup .pv .ey span{color:var(--fg-3)}
  .popup .pvc{pointer-events:none}
  .popup .pvc .card{animation:none;width:var(--card-w);height:var(--card-h)}
  .popup .pv .tip{margin-top:12px;font-size:12px;line-height:1.5;color:var(--fg-3)}
  .popup .pv .tip b{color:var(--fg-2);font-weight:600}
  .popup .sh{display:flex;align-items:center;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--fg-2);margin:0 0 8px 2px}
  .popup .sh .cnt{margin-left:auto;color:var(--fg-3);font-size:11px;letter-spacing:1px}
  .popup .grp{margin-bottom:18px}
  .popup .form .two{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  .seg{display:flex;flex-wrap:wrap;gap:4px}
  .seg.two{display:grid;grid-template-columns:1fr 1fr}
  .seg.two button{justify-content:center}
  .seg button,.popup .form .f .seg button{height:34px;padding:0 13px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.08);color:#fff;font:inherit;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;display:inline-flex;align-items:center;gap:7px;cursor:pointer;white-space:nowrap}
  .seg button ha-icon{--mdc-icon-size:15px}
  .seg button.on,.popup .form .f .seg button.on{background:rgba(255,255,255,.9);color:#1d1d1f;border-color:transparent}
  .seg button sup{font-size:8.5px;letter-spacing:.5px;opacity:.55;margin-left:-3px}
  .popup .form .f .chips{margin:0}
  .popup .act{display:grid;grid-template-columns:34px 1fr max-content;gap:12px;align-items:center;padding:8px 12px;margin-top:4px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:var(--r-sm);font-size:13px;font-weight:600}
  .popup .act .bx{height:34px;width:34px;border-radius:var(--r-sm);background:rgba(255,255,255,.12);border:1px solid var(--line);display:grid;place-items:center}
  .popup .act .bx ha-icon{--mdc-icon-size:16px}
  .popup .act>div small{display:block;font-size:11px;color:var(--fg-3);font-weight:500;font-family:ui-monospace,Consolas,monospace;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .popup .act .ab{display:flex;gap:4px}
  .popup .act .ab button{width:32px;height:32px;border:0;border-radius:50%;background:rgba(255,255,255,.14);color:#fff;display:grid;place-items:center;cursor:pointer}
  .popup .act .ab button ha-icon{--mdc-icon-size:16px}
  .popup .act.open{grid-template-columns:1fr;border-color:var(--line-on);background:rgba(255,255,255,.09);padding:12px}
  .popup .act .ed{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  .popup .act .ed .full{grid-column:1/-1}
  .popup .act .ed label{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--fg-3);font-weight:700;display:flex;flex-direction:column;gap:4px}
  .popup .act .ed label i{font-style:normal;float:right;text-transform:none;letter-spacing:0;color:#8fd16a;font-weight:600}
  .popup .act .ed label i.bad{color:#f27a5c}
  .popup .act .ed .modes{margin-top:4px}
  .popup .act .ed .modes button{padding:10px 0}
  .popup .addbtn{margin-top:6px;width:100%;height:40px;border:1px dashed var(--line-on);border-radius:var(--r-sm);background:none;color:var(--fg-2);font:inherit;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer}
  .popup .coll{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:var(--r-sm);background:rgba(255,255,255,.08);border:1px solid var(--line);font-size:15px;font-weight:600;cursor:pointer;user-select:none}
  .popup .coll>ha-icon{--mdc-icon-size:24px;flex:none}
  .popup .coll small{display:block;font-size:12px;font-weight:500;opacity:.7}
  .popup .coll ha-icon.chev{margin-left:auto;--mdc-icon-size:18px;opacity:.6;transition:transform .2s}
  .popup .coll.open ha-icon.chev{transform:rotate(180deg)}
  .popup .foot{position:sticky;bottom:0;margin:4px -30px 0;padding:14px 30px 20px;border-top:1px solid var(--line);background:rgba(44,46,50,.6);backdrop-filter:blur(24px) saturate(1.3);-webkit-backdrop-filter:blur(24px) saturate(1.3);border-radius:0 0 10px 10px}
  .popup .foot .modes{margin:0}
  @media (max-width:900px){ .popup h2 .rm{display:none} .popup .fwrap{grid-template-columns:1fr;gap:18px} .popup .pv{position:static} .popup .pvc .card{width:100%} .popup .foot{margin:4px -24px 0;padding:12px 24px 18px} .popup .act .ed{grid-template-columns:1fr} }
  .popup .form .chk3{display:flex;gap:14px;font-weight:600}
  .popup .form .chk3 label{display:inline-flex;align-items:center;gap:6px}
  .popup .form .f.acts{grid-template-columns:140px 1fr}
  .popup .form .f.acts .arow{display:grid;grid-template-columns:1fr 1fr 1.2fr 1.4fr;gap:4px;margin-bottom:4px}
  .popup .form .f.acts .arow input{font-size:12px;padding:7px 8px}
  .popup .form input,.popup .form select{width:100%;border:0;border-radius:var(--r-sm);padding:9px 11px;background:rgba(0,0,0,.3);color:#fff;font:inherit;font-size:13px;outline:none}
  .popup .form select{color-scheme:dark}
  .popup .form select option{color:#fff;background:#2b2b2b}
  .popup .form input[type=checkbox]{width:auto;justify-self:start;accent-color:#fff}
  .popup .sub{font-size:14px;opacity:.75;margin-bottom:18px}
  .popup ul{list-style:none;display:flex;flex-direction:column;gap:4px;margin-top:18px}
  .popup li{border-radius:var(--r-sm);display:grid;grid-template-columns:30px 1fr max-content;gap:16px;align-items:center;padding:14px 16px;background:rgba(255,255,255,.08);border:1px solid var(--line);font-size:15px;font-weight:600}
  .popup li.on{background:rgba(255,255,255,.3);border-color:var(--line-on)}
  .popup li.tap{cursor:pointer}
  .popup li small{display:block;font-size:12px;font-weight:500;opacity:.7;margin-top:2px}
  .popup li .st{font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;opacity:.8;white-space:nowrap}
  .popup li ha-icon{--mdc-icon-size:26px}
  .popup li img.ico{width:26px;height:26px}
  .popup .prow{display:grid;grid-template-columns:1fr max-content;gap:6px 12px;align-items:center;margin-top:16px;font-size:13px;font-weight:600}
  .popup .modes{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:18px}
  .popup .modes.n2{grid-template-columns:1fr 1fr}
  .popup .modes.n3{grid-template-columns:repeat(3,1fr)}
  .popup .vh{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;opacity:.6;margin-top:22px}
  .popup .vh+.modes,.popup .vh+ul{margin-top:8px}
  .popup .vs{font-size:12px;opacity:.6;margin-top:12px}
  .popup .vs+.modes{margin-top:6px}
  .popup .vh+.vs{margin-top:4px}
  .popup .mart.vmap{background-size:contain;background-repeat:no-repeat;background-color:rgba(255,255,255,.04);height:220px;cursor:pointer}
  .card .vdot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#f27a5c;margin-left:6px;vertical-align:middle}
  .card.verr .s{color:#f27a5c}
  .card .vbat{display:inline-flex;align-items:center;gap:3px;margin-right:10px}
  .card .vbat ha-icon{--mdc-icon-size:14px}
  .popup .mart{height:170px;margin-top:16px;border-radius:var(--r-sm);background-size:cover;background-position:center}
  .popup .modes.att{display:flex;flex-wrap:wrap;gap:6px;margin-top:20px}
  .popup .modes.att button{flex:1 0 auto;display:flex;align-items:center;justify-content:center;gap:6px;padding:13px 11px;font-size:11px;letter-spacing:.6px;white-space:nowrap}
  .popup .modes.att .cnt{min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:rgba(255,255,255,.2);font-size:10px;letter-spacing:0;line-height:18px;text-align:center}
  .popup .modes.att button.on .cnt{background:rgba(0,0,0,.25)}
  .popup .modes button{border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.08);color:#fff;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:14px 0;cursor:pointer}
  .popup .modes button.on{background:rgba(255,255,255,.9);color:#1d1d1f;border-color:transparent}
  .popup .therm{display:grid;grid-template-columns:1fr 80px 80px;gap:4px;align-items:center;margin-top:14px}
  .popup .therm button{border:1px solid var(--line);border-radius:var(--r-sm);background:rgba(255,255,255,.1);color:#fff;height:64px;cursor:pointer;display:grid;place-items:center}
  .popup .therm button img{width:18px;transform:rotate(-90deg)}
  .popup .therm button.down img{transform:rotate(90deg)}
  .popup .fc{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:18px}
  .popup .fc div{border-radius:var(--r-sm);background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.08);padding:14px 0;text-align:center;font-size:12px;font-weight:600}
  .popup .fc div ha-icon{--mdc-icon-size:24px;display:block;margin:6px auto}
  .popup .fc div b{display:block;font-size:15px}
  .popup .fc.week{grid-template-columns:repeat(7,1fr)}
  .popup .fc.week div{padding:10px 0}
  .popup .fc div small{display:block;font-size:11px;opacity:.6}
  .popup .fc div em{display:block;font-style:normal;font-size:10px;opacity:.6;margin-top:2px}
  .popup .pages{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:18px}
  .popup .pages a{display:flex;align-items:center;gap:14px;padding:18px 16px;background:rgba(255,255,255,.08);border:1px solid var(--line);border-radius:var(--r-sm);font-size:15px;font-weight:600;cursor:pointer;transition:background .15s}
  .popup .pages a:hover{background:rgba(255,255,255,.14)}
  .popup .pages a ha-icon{--mdc-icon-size:24px}
  .popup .pages a small{display:block;font-size:12px;font-weight:500;opacity:.7}
  .popup .avs{display:flex;gap:6px;margin-top:14px}
  /* real range inputs, styled like Homio's slider */
  input[type=range]{-webkit-appearance:none;appearance:none;grid-column:1/3;width:100%;height:8px;border-radius:20px;background:rgba(255,255,255,.35);margin:6px 0 0;outline:none}
  input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:2px 0 8px 2px rgba(0,0,0,.15);cursor:pointer}
  input[type=range]::-moz-range-thumb{width:20px;height:20px;border:0;border-radius:50%;background:#fff;cursor:pointer}
  input[type=range].hue{background:linear-gradient(to right,#f00 0%,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,#f00 100%)}
  input[type=range].ct{background:linear-gradient(to right,#ffb46e,#fff2e0,#cfe3ff)}
  .popup .swatches{display:flex;gap:8px;margin-top:14px}
  .popup .swatches button{flex:1;height:34px;border:0;border-radius:999px;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
  .popup .swatches button.on{box-shadow:inset 0 0 0 3px #fff}

  /* ===== edit mode: card wrappers with hide/restore, grip and drag state; the bar at the bottom; the add tile ===== */
  .ecard{position:relative;flex:none;scroll-snap-align:start;--cp:22px}
  .ecard>.card{pointer-events:none;animation:none;transition:transform .2s var(--ease),box-shadow .2s,background .2s}
  .ecard .shield{position:absolute;inset:0;z-index:2;cursor:grab;touch-action:pan-x;border-radius:var(--r)}
  .ecard>.card .ctl,.ecard>.card .vslider,.ecard>.card .socks,.ecard>.card .rail,.ecard>.card .lbl.steps,.ecard>.card .lbl.cols,.ecard>.card .lbl.chips,.ecard>.card .seg{visibility:hidden}   /* controls rest while editing */
  .ecard>.card .c,.ecard>.card .ua{visibility:hidden}                 /* the × takes the corner */
  .ecard.hid>.card{background:rgba(255,255,255,.04);border-style:dashed}
  .ecard.hid>.card>*{opacity:.45}
  .ecard.lift>.card{background:rgba(255,255,255,.03);border:1px dashed var(--line-on);box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none}   /* the slot the dragged card will land in */
  .ecard.lift>.card>*{visibility:hidden}
  .ecard.lift .grip,.ecard.lift .x{visibility:hidden}
  .card.dragghost{position:fixed;left:0;top:0;z-index:60;pointer-events:none;margin:0;animation:none;transition:box-shadow .2s,scale .2s,rotate .2s;scale:1;rotate:0deg;background:rgba(255,255,255,.22);border-color:var(--line-on)}
  .card.dragghost.up{box-shadow:0 1px 0 rgba(255,255,255,.08) inset,0 34px 70px rgba(0,0,0,.55);scale:1.04;rotate:-2deg}
  .ecard .x{position:absolute;top:14px;right:14px;z-index:3;width:30px;height:30px;border:1px solid var(--line);border-radius:50%;background:rgba(255,255,255,.14);color:#fff;display:grid;place-items:center;cursor:pointer}
  .ecard .x ha-icon{--mdc-icon-size:16px}
  .ecard .x.eye{background:rgba(255,255,255,.9);color:#1d1d1f;border-color:transparent}
  .ecard .grip{position:absolute;right:var(--cp);bottom:var(--cp);height:28px;display:flex;align-items:center;color:var(--fg-3);pointer-events:none}
  .ecard .grip ha-icon{--mdc-icon-size:20px}
  .ecard .hban{position:absolute;left:0;right:0;bottom:0;z-index:3;height:36px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:10px;letter-spacing:1.8px;text-transform:uppercase;font-weight:700;color:var(--fg-2);background:rgba(255,255,255,.1);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-top:1px solid var(--line);border-radius:0 0 var(--r) var(--r);pointer-events:none;white-space:nowrap;overflow:hidden}
  .ecard .hban ha-icon{--mdc-icon-size:14px;flex:none}
  .card.add{background:rgba(255,255,255,.04);border-style:dashed;box-shadow:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--fg-3);animation:none}
  .card.add .plus{width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:rgba(255,255,255,.1);display:grid;place-items:center;color:#fff}
  .card.add .plus ha-icon{--mdc-icon-size:20px}
  .card.add b{font-size:11px;font-weight:600;letter-spacing:1.8px;text-transform:uppercase;color:var(--fg-2)}
  .banner.ebar{justify-content:flex-start;gap:12px;padding:0 var(--pad);height:58px;text-align:left}
  .banner.ebar ha-icon{--mdc-icon-size:18px;flex:none}
  .banner.ebar .scopesel{margin-left:auto}
  .banner.ebar small{font-weight:600;color:var(--fg-3);letter-spacing:1.6px;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
  .banner.ebar button{height:36px;padding:0 18px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.08);color:#fff;font:inherit;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;flex:none}
  .banner.ebar .ghost{margin-left:auto}
  .banner.ebar .done{background:rgba(255,255,255,.9);color:#1d1d1f;border-color:transparent}
  /* value card: the number where the name sits, the name under it (as on the thermostat card) */
  .card.value .s.big small{font-size:16px;letter-spacing:0;font-weight:600;color:var(--fg-2);margin-left:3px}
  .card.value .nm{grid-area:n;font-size:13px;font-weight:500;color:var(--fg-3);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .card.value.noname .nm{display:none}
  /* "Kaart toevoegen" popup */
  .popup.addp{width:min(680px,calc(100vw - 32px));max-width:none;padding-bottom:0}
  .popup.addp .foot{margin-top:22px}
  .popup.addp.nofoot{padding-bottom:30px}
  .popup .pages.types{grid-template-columns:repeat(3,1fr);margin-top:0;margin-bottom:6px}
  .popup .pages.types a{padding:12px 12px;gap:10px;font-size:13px;align-items:flex-start}
  .popup .pages.types a ha-icon{--mdc-icon-size:22px;margin-top:1px}
  .popup .pages.types a small{font-size:11px;line-height:1.3}
  .popup .glbl+.pages.types{margin-top:0}
  @media (max-width:900px){ .popup .pages.types{grid-template-columns:1fr 1fr} }
  .popup .foot .modes button:disabled{opacity:.4;cursor:default}
  .popup .steps{display:flex;gap:6px;align-items:center;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--fg-3);margin:-6px 0 14px}
  .popup .steps span{display:flex;gap:6px;align-items:center}
  .popup .steps span i{width:18px;height:18px;border-radius:50%;border:1px solid var(--line);display:grid;place-items:center;font-style:normal;font-size:10px;letter-spacing:0}
  .popup .steps span.on{color:#fff}.popup .steps span.on i{background:rgba(255,255,255,.9);color:#1d1d1f;border-color:transparent}
  .popup .steps span.done i{background:rgba(255,255,255,.25);border-color:transparent}
  .popup .steps i.ln{width:18px;height:1px;background:var(--line)}
  .popup .sinput{display:flex;align-items:center;gap:10px;height:46px;padding:0 18px;border-radius:999px;background:rgba(255,255,255,.10);border:1px solid var(--line)}
  .popup .sinput ha-icon{--mdc-icon-size:18px;opacity:.8}
  .popup .sinput input{flex:1;min-width:0;background:none;border:0;outline:0;font:inherit;font-size:16px;color:#fff}
  .popup .glbl{display:flex;justify-content:space-between;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:var(--fg-3);margin:16px 2px 6px}
  .popup ul.ents{margin-top:0}
  .popup ul.ents li{padding:10px 12px 10px 16px;font-size:14px}
  .popup ul.ents li.dim{opacity:.45}
  .popup ul.ents li small{font-family:ui-monospace,Consolas,monospace;font-size:11px}
  .popup ul.ents li .val{font-size:13px;font-weight:700;color:var(--fg-2);white-space:nowrap}
  .popup ul.ents li .tag{display:inline-flex;align-items:center;height:20px;padding:1px 8px 0;line-height:1;border-radius:999px;background:rgba(255,255,255,.12);font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--fg-2);margin-left:8px;vertical-align:2px}
  .popup ul.place li{align-items:start}
  .popup ul.place li ha-icon,.popup li.chk ha-icon{margin-top:1px}
  .popup ul.place li small{font-size:12px;line-height:1.4;margin-top:3px;opacity:.75}
  .popup ul.place li .st{align-self:start;margin-top:4px}
  .popup ul.place li .st.adm{opacity:.5}
  .popup .pvrow{display:flex;flex-direction:column;gap:12px;align-items:stretch;margin-top:18px}
  .popup .pvrow .cap{font-size:12px;line-height:1.45;color:var(--fg-3)}
  .popup .pvrow .pvc .card{width:var(--card-w);height:var(--card-h)}
  .popup .form .three{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:6px}
  .popup .form .irow{display:grid;grid-template-columns:1fr 1fr .9fr 1fr 34px;gap:4px;margin-top:4px}
  .popup .form .irow button{border:0;border-radius:var(--r-sm);background:rgba(255,255,255,.14);color:#fff;cursor:pointer}
  .popup .form .note{font-size:13px;font-weight:500;color:var(--fg-2);line-height:1.4}
  .popup .sub code{font-family:ui-monospace,Consolas,monospace;font-size:12px;color:#fff}
  @media (max-width:900px){
    .banner.ebar{display:none}
    .ecard{--cp:14px}
    .ecard .x{top:10px;right:10px;width:28px;height:28px}
    .btabs.edit{padding:4px 4px 4px 18px;gap:10px}
    .btabs.edit .lbl{flex:1;min-width:0;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--fg-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .btabs.edit .lbl ha-icon{--mdc-icon-size:16px;flex:none}
    .btabs.edit a.done{background:rgba(255,255,255,.9);color:#1d1d1f;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:0 18px}
    .popup .pvrow{flex-direction:column;align-items:stretch}
    .popup .pvrow .pvc .card{width:100%}
  }

  /* ===== tablet portrait & phone ===== */
  @media (max-width:900px){
    :host(.in-card){position:relative;height:100%}
    :host{--pad:20px;--u:1px;--card-h:132px;position:fixed;inset:0;height:auto;max-height:none;overflow:hidden;overscroll-behavior:none;touch-action:none;display:flex;flex-direction:column}
    .strip,.page,.settings,.popup,.nav.open .links{touch-action:pan-y}
    .nav{top:calc(20px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)));display:grid;grid-template-columns:minmax(0,1fr) 0 max-content max-content;height:46px;grid-column-gap:10px;animation:none}
    .nav .links + *{margin-left:0}
    .nav.open .links .sep,.nav.open .links a.search{display:none}
    .logo{font-size:17px;flex:1;min-width:0}
    @media (max-width:400px){.logo .bt{display:none}}   /* small phones: the pills need the room, the home mark stays */
    /* compact glass pills: count and status dot sit inside the pill, like on desktop (no badges on top) */
    .people{justify-self:end;min-width:44px;padding:0 13px 0 12px;justify-content:center;gap:6px}
    .people .pc{font-size:13px}
    .people .pc small{display:none}
    .people + .alarm{margin-left:0}
    .time{display:none}
    .alarm{min-width:44px;padding:0 13px 0 12px;justify-content:center;gap:7px}
    .alarm .al{display:none}
    .alarm i{width:7px;height:7px}
    .links{display:none}
    /* ===== bottom bar: glass pill (home · rooms · more) + detached search; the room sheet opens above it ===== */
    .bnav{position:fixed;left:var(--pad);right:var(--pad);bottom:calc(16px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)));z-index:41;display:flex;gap:8px;align-items:flex-end;animation:upT .5s var(--ease) both}
    :host(.in-card) .bnav{position:absolute}
    .btabs{flex:1;min-width:0;display:flex;align-items:center;gap:2px;height:54px;padding:4px}
    .btabs a{flex:none;display:flex;align-items:center;justify-content:center;gap:6px;height:46px;padding:0 14px;border-radius:999px;color:var(--fg-2);font-size:14px;font-weight:600;white-space:nowrap;cursor:pointer;transition:background .2s,color .2s}
    .btabs a.active{background:rgba(255,255,255,.26);color:#fff;font-weight:700}
    .btabs a.ic{width:46px;padding:0}
    .btabs a img.ico{width:20px;height:20px}
    .btabs a ha-icon{--mdc-icon-size:18px;width:18px;height:18px;opacity:.7;flex:none}
    .btabs a.rtab{flex:1;min-width:0;padding:0 10px 0 16px}
    .btabs a.rtab span{overflow:hidden;text-overflow:ellipsis}
    .btabs .sep{width:1px;height:20px;background:var(--line);margin:0 4px;flex:none}
    .bnav .sbtn{display:grid;width:54px;height:54px}
    .bnav .sbtn img{width:20px;height:20px}
    .bnav .sbtn.on img{width:16px;height:16px}
    /* search: the pill becomes the field, results stack above it (close = the detached button) */
    .bnav .searchbar{flex:1;min-width:0;display:flex;flex-direction:column-reverse}
    .bnav .sinput{height:54px;padding-left:18px}
    .bnav .sinput input{font-size:16px}
    .bnav .sinput button{display:none}
    .bnav .sres{margin:0 0 8px;max-height:min(50vh,420px)}
    /* room sheet (the desktop room pill, restyled) sits above the bar */
    .nav.open .links{display:flex;flex-direction:column;align-items:stretch;gap:2px;position:fixed;top:auto;left:var(--pad);right:var(--pad);bottom:calc(78px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)));transform:none;max-width:none;width:auto;height:auto;max-height:55vh;padding:6px;border-radius:var(--r);background:rgba(255,255,255,.14);backdrop-filter:blur(24px) saturate(1.2);-webkit-backdrop-filter:blur(24px) saturate(1.2);border:1px solid var(--line);box-shadow:0 14px 34px rgba(0,0,0,.25);z-index:40;overflow:auto;animation:upT .2s var(--ease) both}
    .nav.open .links a{height:44px;font-size:16px;padding:0 12px;border-radius:var(--r-sm);justify-content:flex-start}
    .nav.open .links a.active{background:rgba(255,255,255,.14)}
    .nav.open .links a.more{display:none}
    .nav.open .links.floors{position:fixed;overflow:auto;background:rgba(255,255,255,.14);backdrop-filter:blur(24px) saturate(1.2);-webkit-backdrop-filter:blur(24px) saturate(1.2);border:1px solid var(--line);box-shadow:0 14px 34px rgba(0,0,0,.25)}
    .nav.open .links.floors::before{display:none}
    .nav.open .links .fl{flex-direction:column;align-items:stretch}
    .nav.open .links .fl>a{justify-content:space-between;gap:10px}
    .nav.open .links .fl>a small{margin-left:auto;opacity:.5}
    .nav.open .links .fl>a ha-icon{margin:0;opacity:.6;flex:none}
    .nav.open .links .dd{position:static;transform:none;min-width:0;margin:0 0 6px 14px;padding:0 0 0 10px;border:0;border-left:1px solid var(--line);border-radius:0;background:none;box-shadow:none;animation:none;backdrop-filter:none;-webkit-backdrop-filter:none}
    .nav.open .links .dd a{height:40px;font-size:15px;font-weight:600;padding:0 10px;color:var(--fg-2)}
    .nav.open .links .dd a.active{color:#fff;background:rgba(255,255,255,.14)}
    .nav.open .links.expanded .fl>a{cursor:default;font-size:13px;letter-spacing:1px;text-transform:uppercase;opacity:.6;height:34px;background:none}
    .nav.open .links.expanded .fl>a small{display:none}
    .nav.open .links.expanded .dd{padding-left:0}
    .title{position:static;transform:none;flex:none;padding:calc(88px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px))) var(--pad) 18px;display:block}
    .title .temp{font-size:11px;letter-spacing:1.4px;gap:6px}
    .title h1{font-size:clamp(40px,11vw,64px);letter-spacing:-2px}
    .title .sub{font-size:15px}
    .ticker{height:40px;font-size:11px;letter-spacing:1.3px;max-width:none;margin-top:14px}
    .ticker div{align-items:center;line-height:1.4;white-space:normal}
    .ticker div span{min-width:0}
    .wx{display:none;text-align:left;align-items:center;gap:14px;padding:0;margin-top:16px}
    .wx.wxm{display:flex}
    .pills{gap:6px;margin-top:10px}
    .pills button{height:32px;font-size:12px;padding:0 12px 0 9px}
    .wx .big{justify-content:flex-start;gap:4px}
    .wx .big img.ico,.wx .big ha-icon{width:36px;height:36px;--mdc-icon-size:36px;margin-top:0}
    .wx .t{font-size:40px;letter-spacing:-2px}
    .wx .t sup{font-size:16px;line-height:1.4}
    .wx .cnd{margin:0}
    .wx .hl{margin-top:2px}
    .wx .hours{display:none}
    .strip{position:static;flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;display:grid;grid-template-columns:1fr 1fr;align-content:start;gap:6px;padding:4px var(--pad) calc(90px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)));scroll-snap-type:none;scrollbar-width:none}
    .strip.rows2{height:auto;display:grid;overflow-y:auto;overflow-x:hidden}
    .strip.rows2 .room-rows,.strip.rows2 .room-row,.strip.rows2 .room-cell,.strip.rows2 .room-scale{display:contents}
    .strip::after{display:none}
    .sfade{display:none}
    .popup{width:calc(100% - 32px);min-width:0;max-height:85vh;padding:26px 24px 22px}
    .popup .pages{grid-template-columns:1fr}
    .popup .form .f,.popup.wide .form .f{grid-template-columns:1fr;gap:6px}
    .popup.wide{width:calc(100% - 32px);max-width:none}
    .banner{position:absolute;padding:14px}
    .empty{position:static;padding:0 var(--pad) 40px}
    .page,.settings{position:static;flex:1;min-height:0;overflow:auto;padding-top:calc(88px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)));padding-bottom:calc(90px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))}
  }

  @media (min-width:600px) and (max-width:900px){
    .strip{grid-template-columns:1fr 1fr 1fr}   /* two rows falls back to this grid too: it already shows every card */
  }
  ${unsafeCSS(pageStyles)}
  ${unsafeCSS(extraStyles)}
  ${unsafeCSS(extra2Styles)}
  ${unsafeCSS(settingsStyles)}
  ${unsafeCSS(featureStyles)}
  ${unsafeCSS(searchStyles)}
  ${unsafeCSS(extra3Styles)}
  ${unsafeCSS(graphStyles)}
  ${unsafeCSS(usageStyles)}
  ${unsafeCSS(costsStyles)}
  ${unsafeCSS(musicStyles)}
  @media (max-width:900px){
    .card{width:auto}
    ${unsafeCSS(cardCompact("", ""))}
  }
  @media (min-width:901px){
    ${unsafeCSS(cardCompact(":where(.strip.tile-s)", ":where(.strip.compact)"))}
    :where(.strip.tile-s) .card.graph .s{display:none}   /* under 200px the average line pushes the period text off the card */
    :where(.strip.tile-s) .card.plug.hasspk .n{-webkit-line-clamp:1}   /* next to the sparkline a long name takes two lines and the peak line falls off */
    :where(.strip.compact) .card.appl:not(.plug){--reserve:calc(var(--bh) + var(--bg))}   /* under 160px there is no room for the name at its usual height above the row */
    :where(.strip.compact) .card.graph .lbl{display:none}   /* under 160px the period text would run into the name */
    :where(.strip.compact) .card.actions{--rc:var(--rr)}   /* the control column is as tall as the card: the corner text moves left of it */
    /* under 160px: the media buttons are as low as the other cards' buttons, so the card keeps its icon and status row like every other card */
    :where(.strip.compact) .card.media{--bh-media:26px}
  }
  /* unavailable: controls are hidden, so center what is left */
  .card.unavailable{grid-template-columns:1fr;grid-template-rows:1fr max-content max-content 1fr;grid-template-areas:"." "n" "s" ".";justify-items:center;text-align:center;padding:0 40px}
  .card.unavailable .i,.card.unavailable .c,.card.unavailable .lbl,.card.unavailable .prog,.card.unavailable hcn-cam-snap{display:none}
  .card.unavailable .n{margin-bottom:6px}
  @media (max-width:900px){ .card.unavailable{padding:0 16px} }
`;
