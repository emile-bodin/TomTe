# Pages

Besides the rooms, **More** in the navigation opens a set of built-in pages. Pages that have a Home Assistant counterpart have an **Open in Home Assistant** button top right.

## Sensors

![Sensors](assets/screenshots/sensors.png)

**Attention** comes first: updates (tap to install), low batteries, unreachable devices. Two or more unreachable devices fold into one row under *All*; tap it to show or hide them. Then a block per room, or per kind (doors, windows, motion, climate …) with the toggle top right. Filter pills narrow it down to batteries, unavailable or updates. Binary sensors show a small trend of today.

The Sensors page also estimates how many days a battery has left, from 30 days of statistics.

## Energy

![Energy](assets/screenshots/energy.png)

Power now, consumption and solar return today, gas, today per hour from the recorder, and the biggest consumers right now. Choose the sensors under **Settings → Energy**.

!!! tip
    The per-hour chart needs long-term statistics on the energy sensor (any sensor with a `state_class`).

## Automations

Every automation with a toggle, grouped by **with errors**, **on** and **off**, plus which one ran last and how many ran today. Tap toggles, hold opens Home Assistant's dialog.

## Cameras

All cameras with a live snapshot; tap for the stream.

## System

Home Assistant version and uptime, host info from the Supervisor (when available), entity counts, pending updates, and the **System Monitor** sensors for processor, memory, disk and network (download and upload as sparklines of the last hour).

!!! note
    Host info comes from the Supervisor and needs an administrator account on Home Assistant OS or Supervised.

## Music

Only there when Home Assistant has the **Music Assistant** integration. Pills at the top are the speakers: playing ones first with a pulsing dot, paused ones with a ring. The page steers the speaker that started playing last, or the one you tap (it stays picked). On the left a slim player bar shows what plays on it with previous / play-pause / next and the volume, and below it one search field over your favourites from Music Assistant (artwork tiles; while you search, the hits); a tap plays it on the chosen speaker. On the right the queue of that speaker and buttons to move its music to another one. Mark music as a favourite with the heart in Music Assistant.

!!! note
    Search and favourites need the id of the Music Assistant integration. An administrator's panel finds it and stores it in the household settings, so other users get it too: open the Music page once as an administrator.

## Heating

Only there when the Home Assistant rules behind `sensor.verwarming_doel` exist, a set of rules that steer a thermostat. Laid out like the Sensors page, with filter pills and blocks of rows:

- what the rules do now and why, today's schedule, the main switch and the automations;
- a log of every setpoint change with its reason, read back from Home Assistant's history (up to 7 days). A red row means the setpoint changed without the rules and without a manual change;
- graphs of the room, target, Nest setpoint and boiler, of the outside temperature and sun, of gas per day, and of gas per degree day against the old schedule;
- every temperature, time and weather limit, to change in place;
- a plain explanation with the current values. Every block also has a small question mark that opens a popup about what it shows and does.

Turning on the main switch takes a second tap, because the thermostat is steered from that moment.

## Automation

The status summary explains what happens now, with an approximate countdown when the absence timer is active. FP300 readings include temperature, humidity, battery, illuminance and the last report; tap a reading for Home Assistant's history dialog. Monitor buttons and light sliders act directly, while daylight thresholds can be edited in place. Manual light changes pause automatic dimming; **Resume automatic lighting** clears that pause for the next automatic update. The 70% ceiling only applies to automatic lighting, so manual sliders allow the full range.

Available under **More → Automation** when the office work-session helper exists. Start a session using the same action as the tag, or finish with **Finish work**. The page shows presence, measured light, the scheduled switch-off time, working from home, and the manual lighting pause. Tap a monitor or light row for its Home Assistant controls, or a daylight threshold to adjust it. Missing entities show as unavailable; the page does not create or change automation rules. Automatic lighting is limited to 70%; a session has no fixed start or finish time.
## Your own links

**Settings → More menu** adds your own entries (label, icon, path) next to the built-in pages, for example to another dashboard.
