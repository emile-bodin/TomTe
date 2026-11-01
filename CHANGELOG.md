# Changelog

Tomte started as a fork of [HaCasa Nova](https://github.com/damianeickhoff/HaCasa) by Damian Eickhoff (3.0.5 and the work after it). It is now a standalone project with its own name and version numbers, starting at 1.0.0. The history of HaCasa Nova before that is kept at the bottom.

## Unreleased

- **New: a player bar on the Muziek page, and a calmer layout.** The page could pick music for a speaker but not steer it, and its blocks had no order. A slim bar at the top of the left column now steers the chosen speaker (artwork, title, previous / play-pause / next, volume), with small round buttons in the style of the page's filter pills; on a phone it takes two rows. The pills show which speakers play (pulsing dot) or are paused (ring), playing ones first. The page picks the speaker that started playing last, and keeps the one you tap, so it does not jump while you choose music. Under the bar the library (one search field over the favourites, the hits while you search) fills the wide left column, the queue and moving the music sit in a narrow column on the right; the separate "Speelt nu" block is gone, the pills say it.

- **Fix: Music Assistant speakers are named after their device.** They took the name of their room, so four speakers in the living room all read "Huiskamer" on the Muziek page, in the speaker popup and in the announcement settings. They now show the device's name (the one you gave it in Home Assistant, else its own).

- **Fix: room pages jumped between one and two rows.** On a wide screen one row used large cards near the bottom and two rows used cards fitted to the space under the title (120–180px, compact under 160px), so going from room to room the cards changed size and the row moved. Every page now uses one card size per screen (at most 180px high, larger on big screens, compact only when the screen is too low for that), the home page included. A room always keeps room for two rows with its title above it, so the title stays in the same place; a room with one row puts it right under the title. On a portrait tablet two rows now falls back to the three-column grid, which already shows every card.

- **New: a Verbruik card.** The Energie card only knows the power and one day's kWh, so what the house uses and costs had no place on the panel. This card reads the meters and prices from Home Assistant's Energy dashboard: electricity and gas for today and this month with their cost, the power now in the corner. A phone shows this month's use only; the popup has every tariff and price for today, this month and last month, and a year of use against your instalments (two new fields under Settings → Energy). Add it through Bewerken → Kaart toevoegen.

## 1.4.0 · 2026-10-30

- **New: Music Assistant.** Speakers that Music Assistant runs were plain media players in Tomte (play, pause, volume). Their popup now has four tabs: favourites (tap to play), search, the queue (now and next) and moving the music to another speaker. A new **Muziek** page under Meer has the same for all speakers on one screen, plus what plays where; it only shows when Music Assistant is installed. Everything goes through Home Assistant's own `music_assistant` services. An administrator's panel stores the integration's id in the household settings, so search and favourites also work for other users.
- **Fix: thermostat card coloured while resting.** The card took its colour from the mode, so a thermostat in "heat" that had reached its target said "Rust" but still looked like it was heating. It is now coloured only while the thermostat actually heats or cools; thermostats that don't report what they are doing still colour by mode.

## 1.3.0 · 2026-10-30

- **New: offline devices fold into one row on the Sensors page.** With many unreachable devices the Attention block was mostly a long list of Offline rows, pushing low batteries and updates out of sight. Under "Alles" two or more of them now show as one row ("5 onbereikbaar" with the first few names); tap it to show them right below and tap again to hide them. The "onbereikbaar" filter still lists them all.

- **Cleanup: one copy of the short entity state text.** The editor's entity list and the search bar each had their own identical copy of the code that turns a state into "Aan", "Uit", "Onbereikbaar" or a value with its unit; it now lives once in `util.js`. The editor also had a list of domain icons that nothing used, which is gone. Nothing changes in the panel.
- **Cleanup: unused code removed.** Six pieces nothing called any more (an old slider drag handler, a plain page card, a close-button image, two domain lists and `getLang`) and 12 imports that were no longer used. Nothing changes in the panel.

## 1.2.6 · 2026-10-30

- **Fix: the media card in the two-row layout matches the other cards.** Its buttons were 34 px high next to the 24–26 px buttons of the other cards, so the icon and the status text had to be dropped. The buttons are now 26 px and the card keeps its icon and status (Playing, On) like every other card.

## 1.2.5 · 2026-10-30

- **Fix: with quick actions on, the home page was shifted up on a phone.** The rule that lifts the title to make room for the quick actions (`translateY(-56%)`) also beat the phone layout's `transform: none`, so the greeting and the date slid off the top of the screen. It now applies from 901 px up only.
- **Fix: the rows in Settings › Snelle acties looked like the home page buttons.** The home page row and the settings rows share the class `quick`, so the settings rows got the round 40 px pill buttons and the top margin; the delete button (×) was round and out of line with every other delete button. Those rules now apply to the home page row only.
- **Quick action type *Omroep* (announcement).** A button under the greeting with a message ("We gaan eten") and speakers. Tapping it opens the speakers; tapping one runs `script.omroep_afspelen` (chime-tts through Music Assistant, what is playing continues afterwards). Settings › Snelle acties: the message, the volume, the chime before and after (any chime-tts preset, or none) and a tick list of the Music Assistant speakers, named after their area.
- **brAIn's findings show up in Attention.** What brAIn has found and waits on the household for (the titles from `sensor.brain_findings_open_findings`) are rows in the Attention list, its pill and, as its own line, the ticker (tap = the *brAIn* filter), with their own *brAIn* filter in the list. There is no separate card; with nothing to report nothing shows. Read-only for now.
## 1.2.4 · 2026-10-30

- **Fix: the scrim over the album art on the media card reaches the card edge.** The card's 1 px border sat outside the scrim (`overflow: hidden` clips it to the padding box), leaving a strip of bare art at the top, bottom and right; cards with art or an app backdrop now have no border.
- **Fix: the media card and popup show album art for Music Assistant players.** Those players report `entity_picture` as an absolute `http://host:8097/...` address, which the browser blocks on https. Tomte now uses the `entity_picture_local` that Home Assistant proxies when the picture is an absolute URL.
- **Docs: the appliance card picture shows the dishwasher flow** (*Schoon, uitruimen* with the *Uitgeruimd* button) instead of the old running dishwasher.
## 1.2.3 · 2026-10-29

- **Dishwasher popup with every setting of the machine.** Besides the status, the popup now has: the clean / dirty / empty choice, the programme as buttons (read-only while it runs), the options of the cycle as toggles (half load, Hygiene Plus, intensive zone, VarioSpeed Plus, quiet …), delayed start in hours, the notices the machine reports, maintenance (salt, rinse aid, MachineCare, cycles, Wi-Fi) and the machine's own settings (child lock, water hardness, rinse-aid dosing, water connection), plus a Start button next to Stop. Each section appears only when the integration offers it. Programme names, levels and settings are shown in plain words (Eco 50°, Hardness 4, Cold) instead of the raw Home Connect codes. The mock home has a full Home Connect Local dishwasher.
- **Dishwasher cards read Home Connect Local.** The appliance model now recognises what that integration (`homeconnect_ws`) calls things: the time left as a *duration* sensor (`…_remaining_program_time`, counted from its last update), the programme phase (`…_program_phase`), the selected programme (`select.…_selected_program`) and the Abort button as Stop. The month totals of a dishwasher are found under its Dutch name (`sensor.vaatwasser_*_maand`) even when the device is called *SIEMENS Dishwasher*. The test card keeps showing clean / dirty / empty when the dishwasher drops its connection (it used to switch to *Offline* and hide everything, which happened every minute or two). The mock home now has a Home Connect Local dishwasher.
- **The dishwasher card shows whether the dishes are clean (replaces the old dishwasher card).** The household approved the test card. A cycle ends and the door opens to dry (*Schoon, uitruimen*, with an *Uitgeruimd* button), closing the door without a new cycle makes it *Vuil* (amber, with a *Start* button when the machine allows it), and *Uitgeruimd* makes it *Leeg* until the door opens again. The card reads a helper with the options `schoon`, `vuil` and `leeg` (found by its options, no setting), kept by an automation in Home Assistant. While a cycle runs it shows programme, progress, finish time and Stop. Washers and dryers keep the old card; their test card stays next to it on the dev build. The mock home shows the flow with `?dw=schoon`, `?dw=vuil` or `?dw=leeg`.
- **Fix: the dishwasher card (Home Connect Alt, Siemens) shows what the appliance reports.** The finish time (`…_remaining_programme_running_time`), the programme (`…_active_program` as a sensor, or the `…_programs` select), the Stop button (`button.…_stop`) and the door (a `binary_sensor`, *on* = open) were not recognised on these entity names, so the card had no finish time, programme or Stop and never said *Deur open*. The popup reads the door the same way.
- **Fix: the name on appliance cards (dishwasher, washer, dryer) sits at the same height as on every other card.** The button row (Stop, Power) reserved room at the bottom of the grid, which pushed the name up by about 22 px on a desktop card (10 px on a phone in two rows). The row is now placed at the bottom without taking room from the grid, and, as on the phone already, it takes the place of the bottom line (programme, power, month totals) on every size, as *Card layout* describes. Under 160 px (two rows on a small screen) there is no room for the name at its usual height above the row, so those cards keep the reserve. The layout audit finds no overlap in 592 cards at seven sizes.

## 1.2.2 · 2026-10-28

- **New Claude Code and ChatGPT cards:** the same slots as every other card. The time left of the 5-hour session is the corner text (like the weight on the litter box card), a notice (ahead of schedule, outdated, an error) sits under the name, and the two meters sit in the bottom-line row, so the name keeps the height of the other cards and nothing runs outside the card in two rows (the audit found two overflows on the old card at 192×120). The audit's test lab now places both cards.

- **Fix: saving page settings no longer removes the cards you added by hand.** *Pagina instellen → Opslaan* (for example after switching between one and two rows) rebuilt the page without its list of added cards, so Claude Code, ChatGPT, value cards and template cards disappeared. It now keeps everything it does not edit.

- **New litter box card:** the litter box has its own card again (`litterCard`) instead of a power strip with a modifier. All six switches (Clean, Empty, Smart clean, Deodorize, Auto-deodorize, Odourless) are shown, not four; the active modes are named in the status line; the button row sits in the bottom-line row (as a light's steps do), so the name keeps the height of the other cards. Icon-only at every width, the state (weight, cleaning, bin full) stays in the corner. Documented in *Cards* and *Card layout*. The audit's mock home had its litter boxes defined twice; now once, with all six switches.

## 1.2.1 · 2026-10-28

- **One card layout contract:** every card type now shares the same slots (icon and corner, title, status, bottom line), the same order rule (base: title above status; *hero*: the big value above its name, for climate, plug and number-value cards), and one set of geometry tokens on `.card` (`--cp --lh --ib --bh --bh-sock --bh-media --bh-tile --ctl-w --vs-w --bg --gut`, and `--reserve --rr --rc --rl` for the room a card keeps for its controls) instead of per-card padding formulas. The phone and the two-row rules were two copies of the same list; they are now one generated block (`cardCompact`) that wins by position and changes sizes through tokens. Differences are explicit modifier classes, listed in the new *Card layout* page. Results: no card overlaps its own controls or sticks out of its box at any of seven sizes (the audit found 9 defects before: the media corner running into the icon, the climate bottom line reaching into its control row and a long name in it, the cover's corner text under its buttons in two rows, the graph card overflowing in two rows); small intentional shifts of 2–6 px in bottom reserves and vertical sliders. Climate cards show their name on one line.
- **`dev/layout-audit.mjs` (`npm run layout`):** renders the mock home in Chromium at desktop, small desktop, tablet and phone sizes, single and two rows, measures every card region and reports overlaps and overflow, compares two runs and lays out contact sheets. The mock home gets a room of awkward cards (`?lab`: long names, unavailable devices, every card kind).
- **Litter box card is the power strip card, icon-only at every width:** its buttons showed a text label under each icon on tablets (single and double row), which did not fit and distorted the card. It is now the same card as every power strip (`stripCard`) with a `.litter` modifier: icon-only buttons everywhere (the name is the tooltip and the row in the popup), a fixed 44px button row, a one-line title, and the state (weight, cleaning, bin full) in the corner like a light's percentage, so the title stays visible in two rows too. The separate litter card and its CSS overrides are gone; the audit's mock home has four litter boxes (idle, cleaning, long name, unreachable).
## 1.2.0 · 2026-10-28

- **ChatGPT usage card:** the Claude Code usage card is now one *AI usage* card for two providers, and ChatGPT is the second one: the same two meters (5-hour session, weekly limit), colours, pace hint, popup and history, from `sensor.chatgpt_5_h_session`, `sensor.chatgpt_week` and the optional reset sensors, found by name. Add it with **Edit → Add card → Tomte cards → ChatGPT** (only listed when the sensors exist). **Settings → Claude Code** became **Settings → AI usage** with a section per provider; the stored settings (`home.claude`, `home.chatgpt`) and the existing `claude` card key stay as they were, so nothing has to be redone. The code moved from `src/claude.js` to `src/usage.js`; the smoke test and the mock home cover both providers.
- **The release workflow creates the tag itself:** pushing `main` is enough. When `package.json`'s version has no GitHub release yet, `.github/workflows/release.yml` creates the tag `v<version>` and the release (with `tomte.js`, `loader.js` and the changelog section) on GitHub; later pushes do nothing, and it still runs for a pushed `v*` tag or by hand. `npm run deploy:prod` no longer makes a local tag (a local tag that GitHub Desktop did not push left the release missing, and would clash with the tag the workflow creates).
## 1.1.0 · 2026-10-28

- **Claude Code usage card:** a card with the 5-hour session and the weekly limit of Claude Code as two meters (percentage used, time until the reset, a tick for how far the window has run; amber from 70 %, red from 90 %, *ahead of schedule* when you use more than the elapsed time allows, *outdated* after 30 minutes without an update). The popup adds the pace, the last update and the history of both windows. The data comes from sensors in Home Assistant (`sensor.claude_5_h_session`, `sensor.claude_week`, optionally the two reset sensors), found by name or chosen under the new **Settings → Claude Code** tab; the card is added with **Edit → Add card → Tomte cards → Claude Code**, which only lists it when the sensors exist. Covered by the smoke test (card, colours, popup, picker, settings tab); the mock home has the sensors.
- **No HACS:** Tomte is no longer set up for HACS. `hacs.json`, the HACS validation job in CI, the HACS badge and the HACS install steps are gone; installing is downloading `tomte.js` and `loader.js` from a GitHub release into `/config/www/tomte/` and pointing `module_url` and `extra_module_url` at `/local/tomte/loader.js` (README and installation guide). The update notice no longer reads a HACS update entity and no longer offers an Install button: it compares the version with the latest GitHub release (at most twice a day) and tapping it opens the release page. The mock home lost its HACS update entity.
## 1.0.2 · 2026-10-28

- **Release workflow:** pushing a version tag (`v*`) runs `.github/workflows/release.yml`: it checks that the tag matches `package.json`, the translations, that `dist/` is up to date and the render smoke test, then publishes a GitHub release with `dist/tomte.js` (for HACS) and `dist/loader.js` attached and the matching changelog section as the notes. It can be re-run for an existing tag from the Actions tab.
- **`loader.js` is part of the build:** `build.mjs` writes it next to the bundle (`dist/loader.js`, `dist-dev/loader.js`) and the deploy scripts install that file, instead of generating their own. Manual installs can use it too: the new release workflow attaches it to the GitHub release next to `tomte.js` and manual installs point `module_url` and `extra_module_url` at `/local/tomte/loader.js`, so an update shows after a normal browser reload and not after the 31-day cache (HACS installs have no loader). The installation guide, the README, the troubleshooting page (*An update does not show*), the contributing guide and the development guide describe it; CI now also checks that `dist/loader.js` is up to date.
## 1.0.1 · 2026-10-28

- **Repository name:** links, the HACS path (`/hacsfiles/TomTe/tomte.js`, which is case-sensitive) and the update check use the repository's real name, `emile-bodin/TomTe`; the update check no longer compares the release URL case-sensitively.

## 1.0.0 · 2026-10-28

The first release of Tomte. It contains everything from HaCasa Nova up to its unreleased work after 3.0.5 (listed under *Carried over*) plus the changes below.

### Settings

- **Two layers:** the *household* (shared by everyone, stored in Home Assistant's system data, edited by administrators) and *personal* (user data, only what differs from the household). An administrator edits the household by default and switches to *only me* with the picker in the edit bar and the settings header. A first-time administrator without household settings shares their own with one choice (the personal copy is backed up first).
- **Merge per field:** everything merges deeply, so one personal change no longer replaces a whole room or card. A personal save stores only the difference with the layers below it, a household save stores only what differs from the defaults, and saving to the household drops the personal difference for the same page, card or field (*Back to household* in the edit bar does it by hand).
- **Settings → General → Storage:** shows the household version (revision, time, who) and where the personal layer wins, with *Clear my differences*. Import and export work on the layer being edited; export gives the merged settings. Household settings are polled once a minute, so a change shows on other devices without a reload.
- **The "not saved" marker** compares the draft with the layer it started from (and ignores key order), so it no longer comes back after saving.
- **Edit mode:** non-administrators still cannot edit; for administrators the edit bar shows the scope picker.

### Cards and popups

- **Robot vacuum:** the card shows an icon per state (docked, cleaning, error), the battery (from the robot's battery sensor), the current room or task while cleaning, area and time, and a red dot when a wear part is at zero hours. The popup has Start, Pause, Stop, Dock and Locate; the current or last task (what, with which settings, started by dashboard, automation, app or schedule); *Clean* with mode, suction, water and intensity chosen locally and a button per room plus the whole house; the robot's own tasks; the map; dock actions (empty the dust bin, wash and dry the mop); maintenance with a reset button and confirmation; last clean and totals; the robot's defaults; and its switches. A robot that is loaded twice (a test copy of the integration) shows once.
- **Litter box:** a device with Clean, Empty, Deodorize and similar switches becomes one card with a button per action, the status (cleaning, emptying, waste bin full or the weight) and a popup with the same actions, weight, bin and lifetime. New icon.
- **Appliances:** SmartThings machines are recognised (machine state, job state, completion time); the cycle phase is shown (washing, rinsing, spinning, drying …) and as a row in the popup; the end time only counts while a program runs; the card shows the remaining time next to the finish time; machines whose remote control is switched off cannot be started from the panel; month totals (energy, cost, cycles) from `sensor.<name>_energie_maand`, `_kosten_maand` and `_cycli_maand` show on the card and in the popup (*This month*); a plug that is not named like an appliance is a plain plug unless you switch the appliance features on; the same machine from two integrations (for example Home Connect and SmartThings) shows once.
- **Thermostat:** a setpoint you set in the panel shows at once and for ten seconds, until the device reports it.
- **Two rows:** a room page can show its cards in two rows (*Pages → Card layout*), sized to the space under the title on wide screens, with a compact layout for small cards; the edit strip follows. Media cards get a compact layout too.
- **Idle screen:** the content drifts a little every minute (against burn-in), dims between 23:00 and 06:00, and shows washers and dryers that are running. The tap that wakes it no longer presses the card underneath.
- **Attention:** an unavailable device is reported once by its device name, and not at all while another entity of that device still reports.
- **Smaller fixes:** waste dates with a time are read as the local day; the agenda reloads when the calendar list changes; the notification subscription is cleaned up and restored after a reconnect; the title block keeps its height when the ticker is empty; the Apple TV streaming match no longer catches every `tv` source.

### Project

- **Standalone:** the README, links, documentation and the update check (it now reads this repository's releases) point here. The demo video, the community links to the original's Discord and Discussions, the funding link and the call for testers are gone; the README says what this version is and thanks the original author. The MIT license and the original copyright notice stay.
- **Versions:** this project starts at 1.0.0.
- **Renamed to Tomte** (the Scandinavian household spirit that watches over the house): the element is `<tomte-panel>`, the card `custom:tomte-card`, the bundle `tomte.js`, the panel `/tomte` (dev: `/tomte-dev`), the icon `tomte:logo` and the settings key `tomte` (dev: `tomte_dev`). Settings saved under the old `hacasa_nova` keys, personal and household, are read automatically while the new keys are empty; the old keys are never written or deleted. A new logo replaces the HaCasa one (`dev/make-logo.mjs`).
- **Workflow:** `npm run deploy:dev` and `npm run deploy:prod` check (translations, syntax, a jsdom render smoke test), build, back up the bundle they replace and install it with a cache-busting loader; `deploy:prod` only runs from a clean `main` and tags the version; `rollback:dev` and `rollback:prod` restore the previous bundle; `npm run release -- <version>` writes the version and the changelog heading. See *Workflow* in the development guide.
- **Loader:** `deploy:dev` and `deploy:prod` write a small `loader.js` next to the bundle (`/config/www/tomte/loader.js`, `/config/www/tomte-dev/loader.js`). Home Assistant serves `/local` with a 31-day browser cache, so a plain `module_url` to the bundle keeps showing an old build after a deploy. The loader asks the server for the bundle's ETag (`HEAD`, no cache) and imports the bundle with that as `?v=`, so a new build means a new URL and a browser reload is enough, with no Home Assistant restart. `configuration.yaml` now points `module_url` and `extra_module_url` at the loader. It replaces the original project's `dev/dev-loader.js` (which read `version.json`) and its `deploy-dev` script. HACS installs the bundle itself and has no loader; after an update, reload the browser.
- **Translations:** English and German for everything above (German falls back to English where it is missing).

### Carried over from HaCasa Nova (unreleased after 3.0.5)

- **Edit mode:** administrators pick **More → Edit room** (or *Edit home view*), or hold the page title. The strip then shows every card of the page: drag a card by its grip to reorder, × hides it, hidden cards stay in the row dimmed with an eye to bring them back, a tap opens the card settings, and an **Add card** tile sits at the end. *Done* in the bar at the bottom (the bottom nav on phones) leaves edit mode. This replaces the up/down list in Page settings for ordering.
- **Template cards as a library:** a template card now lives in **Settings → Template cards** as a reusable definition. The entity is chosen when you place it (`$entity` in the templates), and the template marks which fields (text, label, condition) are **filled in when placing**. Place the same template as often as you like through edit mode → Add card → Template; each copy keeps its own values, name and icon. A template can also be written right in the picker, once for that page or kept in the library. Template cards that were pinned to a page are moved to that page's cards automatically.
- **Card picker:** Add card opens a picker like Home Assistant's: *Devices* (light, switch or plug, door or window, motion, on/off sensor, value, media, thermostat, shutter, fan, lock, camera, other — then the matching entities), *Tomte cards* (weather, agenda, waste, energy, attention, home thermostat, scenes and light scenes of a room, a new group or graph configured right there) and *Your own cards* (a template from your library). A tap on a group or graph in edit mode edits it. Cards added by hand are removed with the bin in edit mode; the panel's automatic cards are hidden with × and come back dimmed with a banner.
- **Simple conditions:** the visibility condition can be a plain comparison (entity · is / is not / greater / less · value) next to the Jinja template; every card in edit mode, including the panel's own, gets this.
- **Add card:** from edit mode, add any light, switch, sensor, media player, cover, thermostat, lock, fan, camera… to the home view or a room. Entities without an area come first, entities from other rooms carry their room name. By default the card is added in Tomte only (`pages[room].add`); administrators can instead move the entity's area in Home Assistant. A plain sensor becomes a **value card**: the number large, the name under it, the last change at the bottom; a tap opens its details. Groups, graphs and template cards start from the same tile and land in their settings tab with the room filled in.
- **Card settings redone:** a live preview of the card next to the form, so every change shows before you save; settings grouped under Appearance, Behaviour, Action buttons and Advanced; choices as buttons with a *std* marker for what the Card defaults give you; action buttons as one row each with a service picker and a JSON check; templates folded away. Door, window and motion cards get a **Kind** choice for sensors with a missing or wrong device class.
- **Visible (condition):** every card, and every template card, can carry a Jinja condition. The card is hidden when it renders false, 0, no, off, none or nothing; *show when false* inverts it. For the home-maintenance use case from #167, and anything else that should only appear when it matters.
- **••• in popups:** the options button now opens a small menu over the popup instead of replacing its contents: Card settings, Open in Home Assistant, Open device (when the entity belongs to a device) and Hide on this page. On phones it is a sheet at the bottom. Esc or a tap outside closes just the menu.
- **Graph card:** Settings → Graphs adds a card with the line of one numeric sensor (temperature, humidity, power, …) over the last 3 hours to 7 days, on the home view or in a room. Current value in the corner, average and range under the name; tap opens the Home Assistant history dialog. Door, window and motion cards get the same layout with **Bottom → graph (on/off line)**.
- **Bottom bar on phones and tablets:** the menu button and the search button in the top bar are replaced by a bar at the bottom: Home, the current room (opens the room list, or the floors when navigation is set to floors), More and a search button. Search opens in the bar itself, with the results above it.
- **More on phone cards:** the waste card shows the pickup after the next one at the bottom, and the agenda card the appointment after the next one (on wider screens both were already in the side column).
- **Thermostat card:** the big number is now the current temperature; the setpoint stays on the slider and is listed under the name, next to one extra item you pick under Bottom line in the card settings (or for all thermostats under Card defaults): humidity or the active preset (automatic), heating time today, outside temperature, or nothing. Phones show that item at the bottom.

## HaCasa Nova history (before this project)

The versions below are the original project's.


## 3.0.5

- **Update notice:** when a new HaCasa Nova is out, administrators see it in the notification row on the home page. Tap it for the changelog and an Install button (Home Assistant's update dialog, from HACS). Installs without HACS check GitHub instead, at most twice a day. Can be turned off under Panel settings → General → Check for updates.
- Lines in the notification row can now be tapped when they lead somewhere.
- For developers: `npm run deploy:dev` builds a dev variant (`hacasa-nova-dev`) that runs next to the HACS install in your own Home Assistant. See the [development guide](https://damianeickhoff.github.io/HaCasa/development/).

## 3.0.4

Maintenance release; the panel works the same as 3.0.3.

- Build tool esbuild updated to 0.28.1 (security advisory GHSA-67mh-4wv8-2f99 affects only esbuild's development server, which HaCasa Nova does not use; the released file was never affected).
- README: a Community section and links to [GitHub Discussions](https://github.com/damianeickhoff/HaCasa/discussions) for questions, ideas and showing your setup.
- New CONTRIBUTING.md and SECURITY.md (report security problems privately via the Security tab).

## 3.0.3

README and docs only; the panel is unchanged since 3.0.2.

- A 40-second demo video, playing on the docs home page; the README header links to it.
- New docs page [Best experience](https://damianeickhoff.github.io/HaCasa/best-experience/): make HaCasa Nova your start page, hide the sidebar, wall tablet tips. Linked from the README.
- The Cards page in the docs shows a picture of every card.

## 3.0.2

- The README now displays properly inside HACS: one logo image that reads on light and dark backgrounds instead of a light/dark switch HACS cannot show, plain notes instead of GitHub-only alert boxes, and absolute links.

## 3.0.1

The HaCasa logo is back ([#159](https://github.com/damianeickhoff/HaCasa/issues/159)).

- The original HaCasa logo by Fredrik Persson is used again: in the panel (top left), the README and the docs site.
- New icon `hacasa:logo`, registered by the panel, for the sidebar (`sidebar_icon: hacasa:logo`) or anywhere else Home Assistant takes an icon. Load the file with `frontend: extra_module_url` so the icon is there at startup; see the [installation guide](https://damianeickhoff.github.io/HaCasa/installation/#2a-sidebar-panel).

## 3.0.0 · HaCasa Nova

The HaCasa reboot. A complete rewrite as a Home Assistant panel, built on the [Homio](https://github.com/iamtherufus/Homio) design by iamtherufus. Nothing from v2 carries over; v2 lives on the [`legacy`](https://github.com/damianeickhoff/HaCasa/tree/legacy) branch.

- One file, `hacasa-nova.js`, usable as a sidebar panel (`panel_custom`) or as a dashboard card (`custom:hacasa-nova-card`). No other frontend dependencies.
- Rooms built from Home Assistant areas, with photos, temperature and humidity.
- Home view with greeting, weather, notification line, status pills, quick actions and home cards.
- Cards for lights, switches, smart plugs, power strips, appliances, media, climate, covers, fans, locks, vacuums, humidifiers, sensors, cameras, groups, scenes, light scene presets and Jinja template cards.
- Built-in Sensors, Energy, Automations, Cameras and System pages.
- Setup wizard, settings page and per-card settings, stored per Home Assistant user.
- Search, presence, alarm keypad, doorbell camera popup, modes, idle screen.
- English and Dutch.

### Known issues

Tracked in [#158](https://github.com/damianeickhoff/HaCasa/issues/158). The main ones:

- Template cards, your own notification lines and the System page's host info need an administrator account; for other users they stay empty without a hint ([#144](https://github.com/damianeickhoff/HaCasa/issues/144)).
- The font is loaded from Google Fonts ([#145](https://github.com/damianeickhoff/HaCasa/issues/145)).
- Automatic room mode shows at most 9 rooms ([#146](https://github.com/damianeickhoff/HaCasa/issues/146)).
- Built-in page addresses are Dutch (`/instellingen`, `/sensoren` …) and an area with the same name can't be opened ([#147](https://github.com/damianeickhoff/HaCasa/issues/147)).
- The dashboard card only works in a Panel view ([#148](https://github.com/damianeickhoff/HaCasa/issues/148)).
- Rooms without a photo cause a burst of 404s in the browser console ([#149](https://github.com/damianeickhoff/HaCasa/issues/149)).
- The plug timer runs in the browser and stops when the panel closes ([#150](https://github.com/damianeickhoff/HaCasa/issues/150)).
