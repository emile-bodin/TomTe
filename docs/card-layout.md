# Card layout contract

Every card is a member of one system: the same slots in the same order, the same spacing and control sizes, and the same compact variant on phones, tablets and in the two-row layout. The rules live in `src/styles.js` (the card section, `cardCompact()` and the tokens on `.card`); `src/graph.js` brings its own tokens for its line band, and `src/usage.js` its meter row (`--um`).

## The slots

A card is a grid with one column for content and one for the corner:

```
 i         c        icon, and the corner state (absolute, top right)
 .         .        flexible gap
 n         n        title        (.n)
 s         s        status       (.s)
 .         .        flexible gap
 l         l        bottom line  (.lbl, one row of --lh)
```

Controls are not grid items. They are anchored to the bottom or the right edge, and the card reserves room for them through four tokens, so text can never run under them:

| token | what it reserves | set by |
|---|---|---|
| `--reserve` | space under the content for a bottom control row | `.pstrip` (sockets), `.appl` / `.acts` (button rows), `.media` (transport), `.climate` (control row) |
| `--rr` | space on the right for a control column | `.actions` (up / down), `.vs` (vertical slider), `.climate` (rail), `.hasspk` (sparkline), `.hassub` (sub-content) |
| `--rc` | how far the corner text moves left of the right edge | `.vs`, `.climate`, and `.actions` in a compact card on a wide screen |
| `--rl` | space on the left | `.media` with artwork (the artwork panel) |

Padding is always `--cp` plus those four.

## Order

- **Base:** title above status. Lights, switches, covers, fans, locks, vacuums, humidifiers, sensors (binary), cameras, groups, lists.
- **Hero** (`.card.hero`): the big value above its name. Climate (setpoint), plug (watts) and a value card that has a number. The hero rule sets the slot order once; the card only adds the class. A value card puts the number in `.s.big` (unit in a smaller `small`) and the name under it in `.nm`; `.noname` hides the name.
- **Caption variants** put the bottom line right under the status instead of at the bottom edge: media, climate and plug with a control row. The area and row templates are tokens (`--a-base`, `--a-capt`, `--a-hero`, `--a-hero-capt`, `--a-hero-foot`, `--a-cam` with their `--r-*` rows), and a card picks one with `--areas` / `--rows`.

## Geometry tokens

Defined once on `.card`, changed once for the compact variant:

| token | desktop | compact | what |
|---|---|---|---|
| `--cp` | 22px | 14px | padding |
| `--lh` | 28px | 24px | bottom line row |
| `--ib` | 36px | 26px | icon box and corner height |
| `--bh` | 34px | 30px | button rows (appliance, actions) |
| `--bh-sock` | 56px | 44px | socket buttons |
| `--bh-media` | 42px | 34px (26px on a wide screen under 160px) | media transport buttons |
| `--bh-tile` | 52px | 40px | scene and group tiles |
| `--ctl-w` | 46px | 34px | the side control column |
| `--vs-w` | 12px | 8px | vertical slider |
| `--bg` | 10px | 6px | gap between content and the controls under it |
| `--gut` | 14px | 10px | gap between content and the furniture at its side |

The graph card adds `--gl-h`, `--gl-gap`, `--gl-nmt` and `--gl-dot` for its line band.

## Every card type

Each card in [Cards](cards.md) and the modifier classes that give it its layout. Anything not listed in a row uses the base slots.

| card | classes | layout |
|---|---|---|
| Light | `light`, `vs` (dimmable), `tinted`, `acts` | base; vertical slider on the right (`--rr`, `--vs-w`); bottom line is steps, colour dots, today bars or nothing |
| Switch | base | base; toggles on tap |
| Plug | `hero`, `plug`, `appl`, `hasspk` | hero; sparkline on the right (hidden in compact); footer row for timer, cost or bars |
| Power strip | `pstrip` | socket row at the bottom (`--reserve`, `--bh-sock`) |
| Litter box | `pstrip`, `litter` | icon, weight / state in the corner, name, active modes; all switches as icon buttons in the bottom-line row (`--lh` = `--bh`, `--reserve` 0) |
| Appliance | `appl`, `running`, `on`, `dirty` | button row at the bottom (`--bh`); the bottom line is hidden when the row takes its place |
| Media | `media`, `actions`, `art`, `appart` | caption variant; artwork behind a translucent panel (`--rl`); transport row (`--bh-media`) |
| Climate | `hero`, `climate` | hero caption; rail on the right (`--rr`, `--rc`); mode row at the bottom (desktop only) |
| Cover | `actions`, or `vs` with a position | up / down column (`--ctl-w`) or vertical slider |
| Fan | `vs` | vertical slider for speed |
| Lock | base | base; tap to lock or unlock |
| Vacuum | `actions`, `verr` | control column on the right |
| Humidifier | `actions` | target up / down in the control column |
| Door, motion, other binary sensors | base, `graph` | base; bottom line is "since", today bars or the on/off line (graph band) |
| Value | `value`, `hero` | number as hero, name under it; no number means base |
| Camera | `cam` | `--a-cam`; name and state at the bottom over a gradient |
| Attention | `list` | list layout in `.s` |
| Weather, waste, agenda | `hassub` | glass column on the right (`--rr`); in compact the second item moves to `.lbl.mob` |
| Scenes | `scenes` | tile row in `.s` (`--bh-tile`) |
| Light scenes | `scenes`, `presets` | same as scenes; the presets popup saves and recalls the room's lights |
| Energy | base | base |
| Group | `group`, `tiles` or `list` | chip tiles or member rows in `.s` |
| Lights | `group`, `lamps` | no icon, title or corner: `.s` covers the whole card edge to edge, one section per light in quarters (three lights: the first takes the top row) |
| Graph | `graph` | line band between icon and name (`--gl-*`) |
| Electric car | `car`, `hero` | big value above the name; `--rr` holds the battery bar on the right, `--reserve` the update line under the bottom line |
| Verbruik | `costs` | power in the corner, a column each for electricity and gas in the bottom-line row (`--lh` = the height of the columns), the name directly above them; on low cards and in compact only this month's use, with `.s` saying so |
| Claude Code, ChatGPT | `usage` | session time left in the corner, notice in the status line (amber), two meters in the bottom-line row (`--lh` = two meter rows `--um`, `--reserve` 0); amber from 70 %, red from 90 %; in compact the status line goes |
| Template | the base card of the entity it is placed on | text, label and visibility come from Jinja; the layout is the base's |
| Network | `net` | its own inner layout |

## Compact

On a wide screen the card size comes from the screen, never from the page: `_fitCards()` in `src/panel.js` sets `--tile-h` and `--tile-w` on the panel (180px times `--u`, less when two rows plus the room title don't fit, never under 120px) and the strip's `--card-h`/`--card-w` follow them, for one row, two rows and the home page. A room always keeps a zone of two rows above the bottom line with its title (`.title.rt`) above that zone, so the title is in the same place on every room; a room with one row sits on the top line of the zone. On a portrait tablet (600–900px) two rows falls back to the three-column grid.

"Compact" is one thing with two triggers: a phone or tablet (`max-width: 900px`), and cards under 160px high on a wide screen (`.strip.compact`). Between 160 and 200px (`.strip.tile-s`) only the climate and media variants apply, plus two fixes outside the function: the graph's average line goes, and a plug with a sparkline keeps its name on one line. The rules are written once in `cardCompact(all, compact)` and used for both. What only changes a size is a token; the rules in the function are the ones that hide, move or reorder something. They are placed after every module's own card rules, so they win by position.

## Preserved exceptions

These differ on purpose; each is a modifier class with its own rules:

- **Climate:** the setpoint rail on the right and the control row at the bottom (desktop); the rail only, with the bottom line at the edge (compact). Its name is one line.
- **Media:** artwork under the card with the text on a translucent panel (`.art`, `.appart`), the transport row at the bottom, the progress line (a bar along the bottom edge in compact). On a wide screen under 160px the transport buttons shrink to 26px so the icon and the corner state stay, as on every other card.
- **Plug with a power meter:** the sparkline on the right (hidden in compact, so phones show watts and kWh only), a footer row for the options (timer, cost, bars).
- **Sub-content** (weather, waste, agenda): a glass column on the right; in compact the second item moves into the bottom line (`.lbl.mob`).
- **Appliance and action rows:** buttons in a row at the bottom; the bottom line is hidden when the row takes its place.
- **Door, window and motion cards with the graph bottom:** the same line band as the graph card, stepping between off and on over 24 hours; today's total sits on the bottom line.
- **Graph:** a line band between the icon and the name; in compact the band shrinks and the average line goes; on a wide screen the average line goes under 200px and the period text under 160px.
- **Lists, scenes, groups, people:** their inner layout (`.s` as a list, tiles) stays; only tile height and gaps follow the tokens.
- **Lights card:** the title sits in the icon's row because every section has its own icon. A section drops its icon, then its state, when its height can't hold them; the brightness bar stays.
- **Electric car:** the battery bar starts under the corner state, so `--rc` stays 0 and the corner keeps its place. The time left is smaller than the hero value of other cards, and the name is one line, because the update line takes the room.
- **Unavailable:** a centred three-row card without controls.
- **Camera:** name and state anchored at the bottom over a gradient.
- **Litter box:** its own card (`litterCard`), not a strip with a modifier: the same slots, a cat icon, the state (weight, cleaning, bin full) as corner text, the active modes in the status line, and every switch as an icon button in the bottom-line row (`--lh` and `--bh-sock` are `--bh`, `--reserve` is 0), so name and status keep the height of the other cards. Icon-only at every width; a one-line title.

## Checking it

`dev/layout-audit.mjs` renders the mock home in a real browser at seven sizes (desktop, small desktop, tablet and phone, each single row and two rows), measures the box of every region of every card and reports overlaps and anything sticking out of its card; it also compares two runs, and can lay out a contact sheet of a page. The mock home has a room of awkward cards for it (`?lab`: long names, unavailable devices, every kind of card). `npm run build && npm run layout` runs it (536 cards, 0 defects; the same run found 9 in the layout before this contract); the exit code is 1 when a card has a defect. See `card-layout-visual.html` in the repository root for the picture of the contract.
