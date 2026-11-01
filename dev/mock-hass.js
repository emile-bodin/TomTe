// A fake `hass` object for developing the panel outside Home Assistant.
// A generic demo home: nine areas on three floors, five persons and a plausible set of devices per room.
// Add ?lang=nl to the page URL to see the Dutch UI.
const now = () => new Date().toISOString();
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();

// floors as in the real setup (floor registry; level 0 = ground floor)
const floors = { ground_floor: { floor_id: "ground_floor", name: "Ground floor", level: 0 }, first_floor: { floor_id: "first_floor", name: "First floor", level: 1 }, attic: { floor_id: "attic", name: "Attic", level: 2 } };
const FLOOR_OF = { living_room: "ground_floor", kitchen: "ground_floor", backyard: "ground_floor", hallway: "ground_floor", bedroom: "first_floor", dressing_room: "first_floor", landing: "first_floor", bathroom: "first_floor", attic: "attic" };

export function makeHass(onChange) {
  const areas = {};
  const LAB = new URLSearchParams(location.search).has("lab");   // ?lab: a room of awkward cards for the layout audit (dev/layout-audit.mjs)
  for (const n of ["Living room", "Kitchen", "Bedroom", "Dressing room", "Landing", "Attic", "Backyard", "Bathroom", "Hallway", ...(LAB ? ["Test lab"] : [])]) {
    const id = n.toLowerCase().replace(/ /g, "_"); areas[id] = { area_id: id, name: n, picture: null, floor_id: FLOOR_OF[id] || null };
  }
  const devices = {}, entities = {}, states = {};
  const add = (id, area, state, attributes = {}, { reg = {}, changed = ago(60), device = null } = {}) => {
    entities[id] = { entity_id: id, area_id: device ? null : area, device_id: device, ...reg };
    states[id] = { entity_id: id, state, attributes: { friendly_name: id.split(".")[1].replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()), ...attributes }, last_changed: changed, last_updated: changed };
    return id;
  };
  const dev = (id, area) => { devices[id] = { id, area_id: area, name: id }; return id; };

  // living_room
  add("light.floor_lamp", "living_room", "on", { friendly_name: "Floor lamp", brightness: 77, supported_color_modes: ["color_temp", "hs"], color_mode: "hs", hs_color: [225, 90], rgb_color: [25, 95, 255], color_temp_kelvin: 2700, min_color_temp_kelvin: 2000, max_color_temp_kelvin: 6500 }, { changed: ago(90) });
  add("light.ceiling_light_living_room", "living_room", "on", { friendly_name: "Ceiling light", brightness: 102, supported_color_modes: ["brightness"] }, { changed: ago(90) });
  add("light.spots_tv_meubel", "living_room", "off", { friendly_name: "TV cabinet spots", supported_color_modes: ["onoff"] }, { changed: ago(600) });
  add("climate.living_room_living_room", "living_room", "heat", { friendly_name: "Living room", temperature: 21.5, current_temperature: 20.8, hvac_action: "heating", hvac_modes: ["off", "heat", "auto"], preset_modes: ["home", "away", "sleep"], preset_mode: "home", target_temp_step: 0.5 });
  // living_room TV via Android TV Remote: only a package id, no title or artwork -> app fallback (Netflix colours)
  add("media_player.tv", "living_room", "on", { friendly_name: "TV", app_name: "com.netflix.ninja", volume_level: .3 });
  // bedroom TV seen through three integrations, like the real Lounge Sony: Android TV Remote + Bravia in the room,
  // Cast without an area but with title + artwork -> one card that shows The Boys
  const dS1 = dev("dev_sony_atv", "bedroom"); devices[dS1].name = "SONY KD-55X85L";
  const dS2 = dev("dev_sony_bravia", "bedroom"); devices[dS2].name = "Sony KD-55X85L";
  const dS3 = dev("dev_sony_cast", null); devices[dS3].name = "SONY KD-55X85L";
  add("media_player.sony_kd_55x85l_2", null, "on", { friendly_name: "Bedroom TV", app_name: "com.amazon.amazonvideo.livingroom", volume_level: .2 }, { device: dS1 });
  add("media_player.sony_kd_55x85l_4", null, "on", { friendly_name: "Sony KD-55X85L", source: "HDMI 1" }, { device: dS2 });
  add("media_player.sony_kd_55x85l", null, "playing", { friendly_name: "SONY KD-55X85L", app_name: "Prime Video", media_series_title: "The Boys", media_title: "S4 E3 · We'll Keep the Red Flag Flying Here", entity_picture: "/images/rooms/livingroom.png" }, { device: dS3 });
  add("media_player.speaker", "living_room", "playing", { friendly_name: "Speaker", media_title: "B2b", media_artist: "Charli xcx", volume_level: .35, entity_picture: "/images/rooms/lounge.png", mass_player_type: "player", source: "Music Assistant Queue", active_queue: "q-speaker" });
  add("media_player.kitchen_speaker", "kitchen", "idle", { friendly_name: "Kitchen speaker", volume_level: .2, mass_player_type: "player", source: "Music Assistant Queue", active_queue: null });
  add("cover.blind_living_room", "living_room", "open", { friendly_name: "Blind", current_position: 100 });
  const dWin = dev("dev_window", "living_room");
  add("binary_sensor.living_room_living_room_window", "living_room", "off", { friendly_name: "Living room window", device_class: "window" }, { changed: ago(720), device: dWin });
  add("sensor.window_living_room_battery", null, "92", { friendly_name: "Living room window battery", device_class: "battery", unit_of_measurement: "%" }, { reg: { entity_category: "diagnostic" }, device: dWin });
  add("sensor.living_room_temperature", "living_room", "20.8", { friendly_name: "Living room temperature", device_class: "temperature", unit_of_measurement: "°C" });
  add("sensor.living_room_humidity", "living_room", "48", { friendly_name: "Living room humidity", device_class: "humidity", unit_of_measurement: "%" });
  add("binary_sensor.living_room_motion", "living_room", "off", { friendly_name: "Living room motion", device_class: "motion" }, { changed: ago(3) });

  // kitchen
  add("light.ceiling_light_kitchen", "kitchen", "on", { friendly_name: "Ceiling light", brightness: 255, supported_color_modes: ["brightness"] }, { changed: ago(160) });
  add("light.counter", "kitchen", "off", { friendly_name: "Counter lights", supported_color_modes: ["brightness"] });
  const dBack = dev("dev_back_door", "kitchen");
  add("binary_sensor.back_door_open", "kitchen", "on", { friendly_name: "Back door", device_class: "door" }, { changed: ago(24), device: dBack });
  add("sensor.back_door_battery", null, "70", { friendly_name: "Back door battery", device_class: "battery" }, { reg: { entity_category: "diagnostic" }, device: dBack });
  add("binary_sensor.kitchen_motion", "kitchen", "on", { friendly_name: "Kitchen motion", device_class: "motion" }, { changed: ago(0.2) });
  add("switch.coffee_maker", "kitchen", "off", { friendly_name: "Coffee maker" });
  const dStrip = dev("dev_strip", "kitchen"); devices[dStrip].name = "LSC Power Strip EU excl. Power Meter 2"; devices[dStrip].name_by_user = "Kitchen power strip";
  add("switch.power_strip_1", null, "on", { friendly_name: "Power strip 1" }, { device: dStrip });
  add("switch.power_strip_2", null, "off", { friendly_name: "Power strip 2" }, { device: dStrip });
  add("switch.power_strip_3", null, "on", { friendly_name: "Power strip 3", current_power_w: 12 }, { device: dStrip });
  add("switch.power_strip_4", null, "unavailable", { friendly_name: "Power strip 4" }, { device: dStrip });
  add("sensor.kitchen_temperature", "kitchen", "20.1", { device_class: "temperature" });
  add("sensor.kitchen_humidity", "kitchen", "52", { device_class: "humidity" });

  // bedroom
  add("light.bedside_lamp_links", "bedroom", "off", { friendly_name: "Bedside lamp left", supported_color_modes: ["brightness"] });
  add("light.bedside_lamp_rechts", "bedroom", "off", { friendly_name: "Bedside lamp right", supported_color_modes: ["brightness"] });
  add("cover.blind_bedroom", "bedroom", "open", { friendly_name: "Blind", current_position: 100 });
  add("sensor.bedroom_temperature", "bedroom", "18.4", { device_class: "temperature" });

  // dressing_room
  add("light.dressing_room", "dressing_room", "off", { friendly_name: "Ceiling light", supported_color_modes: ["onoff"] });
  const dKast = dev("dev_dressing", "dressing_room");
  add("binary_sensor.dressing_room_door_sensor_opening", "dressing_room", "off", { friendly_name: "Dressing room door", device_class: "opening" }, { device: dKast, changed: ago(300) });
  add("sensor.dressing_room_door_sensor_battery", null, "18", { friendly_name: "Dressing room door battery", device_class: "battery" }, { reg: { entity_category: "diagnostic" }, device: dKast });

  // landing
  add("light.landing", "landing", "on", { friendly_name: "Landing light", brightness: 153, supported_color_modes: ["brightness"] });
  add("binary_sensor.landing_motion", "landing", "off", { friendly_name: "Landing motion", device_class: "motion" }, { changed: ago(61) });
  add("binary_sensor.smoke_alarm_landing", "landing", "off", { friendly_name: "Smoke alarm", device_class: "smoke" });

  // kitchen: Home Connect dishwasher (no power sensor; status comes from the appliance)
  const dVw = dev("dev_dishwasher", "kitchen"); devices[dVw].name = "Dishwasher";
  const hc = (id, state, attr, tk, cat) => add(id, null, state, attr, { device: dVw, reg: { translation_key: tk, platform: "home_connect", ...(cat ? { entity_category: cat } : {}) } });
  const DW = new URLSearchParams(location.search).get("dw");   // ?dw=schoon|vuil|leeg shows the dishwasher flow (test card), without it the dishwasher is running
  hc("sensor.dishwasher_operation_state", DW ? "ready" : "run", { friendly_name: "Dishwasher Operation state", device_class: "enum" }, "operation_state");
  hc("sensor.dishwasher_programme_progress", "11", { friendly_name: "Dishwasher Programme progress", unit_of_measurement: "%" }, "program_progress");
  hc("sensor.dishwasher_remaining_program_time", "1.88", { friendly_name: "Dishwasher Remaining program time", device_class: "duration", unit_of_measurement: "h" }, "remaining_program_time");   // Home Connect Local: the time left as a duration
  hc("binary_sensor.dishwasher_door", DW === "schoon" ? "on" : "off", { friendly_name: "Dishwasher Door", device_class: "door" }, "door");
  hc("button.dishwasher_abort", "unknown", { friendly_name: "Dishwasher Abort" }, "abort");
  add("input_select.dishwasher_status", "kitchen", DW || "vuil", { friendly_name: "Dishwasher status", options: ["schoon", "vuil", "leeg"] });
  hc("select.dishwasher_selected_program", "dishcare_dishwasher_program_eco50", { friendly_name: "Dishwasher Selected program", options: ["favorite_001", "dishcare_dishwasher_program_auto2", "dishcare_dishwasher_program_eco50", "dishcare_dishwasher_program_intensiv70", "dishcare_dishwasher_program_machinecare", "dishcare_dishwasher_program_prerinse", "dishcare_dishwasher_program_quick45", "dishcare_dishwasher_program_quick65", "dishcare_dishwasher_program_quickd"] }, "selected_program");
  for (const [k, st] of [["half_load", "off"], ["hygiene_plus", "off"], ["intensiv_zone", "on"], ["variospeedplus", "off"], ["silence_on_demand", "unavailable"], ["child_lock", "off"]]) hc(`switch.dishwasher_${k}`, st, { friendly_name: `Dishwasher ${k}` }, k);
  hc("number.dishwasher_start_in", "7200", { friendly_name: "Dishwasher Start in", min: 0, max: 86400, step: 1, unit_of_measurement: "s", device_class: "duration" }, "start_in");
  hc("select.dishwasher_water_hardness", "h04", { friendly_name: "Dishwasher Water hardness", options: ["h00", "h01", "h02", "h03", "h04", "h05", "h06", "h07"] }, "water_hardness");
  hc("select.dishwasher_rinse_aid", "r05", { friendly_name: "Dishwasher Rinse aid", options: ["off", "r01", "r02", "r03", "r04", "r05", "r06"] }, "rinse_aid");
  hc("select.dishwasher_water_connection", "coldwater", { friendly_name: "Dishwasher Water connection", options: ["coldwater", "hotwater"] }, "water_connection");
  hc("sensor.dishwasher_rinse_aid", "full", { friendly_name: "Dishwasher Rinse aid level", device_class: "enum" }, "rinse_aid_level");
  hc("sensor.dishwasher_salt", "low", { friendly_name: "Dishwasher Salt", device_class: "enum" }, "salt");
  hc("sensor.dishwasher_machinecare_remaining_runs", "19", { friendly_name: "Dishwasher MachineCare remaining runs" }, "machinecare_remaining_runs");
  hc("sensor.dishwasher_start_count", "736", { friendly_name: "Dishwasher Start count" }, "start_count");
  hc("sensor.dishwasher_wifi_signal_strength", "-68", { friendly_name: "Dishwasher WiFi Signal strength", unit_of_measurement: "dBm" }, "wifi");
  hc("binary_sensor.dishwasher_check_filter_system", "on", { friendly_name: "Dishwasher Check Filter System", device_class: "problem" }, "check_filter");
  hc("button.dishwasher_start", "unknown", { friendly_name: "Dishwasher Start" }, "start");
  hc("switch.dishwasher_power", "on", { friendly_name: "Dishwasher Power" }, "power");
  hc("switch.dishwasher_silence_on_demand", "off", { friendly_name: "Dishwasher Silence on demand" }, "silence_on_demand");
  hc("binary_sensor.dishwasher_remote_start", "on", { friendly_name: "Dishwasher Remote start" }, "remote_start");
  hc("binary_sensor.dishwasher_connectivity", "on", { friendly_name: "Dishwasher Connectivity", device_class: "connectivity" }, "connectivity", "diagnostic");

  // attic
  add("light.attic", "attic", "unavailable", { friendly_name: "Attic light" }, { changed: ago(630) });
  const dWas = dev("dev_washer", "attic"); devices[dWas].name = "Washing machine";
  add("switch.washing_machine", null, "on", { friendly_name: "Washing machine plug", current_power_w: 3 }, { device: dWas });
  // attic: LG ThinQ washer (running) and dryer (stopped), named like the household's own devices
  for (const [k, nm, run] of [["wasmachine", "Wasmachine", true], ["droger", "Droger", false]]) {
    const d = dev("dev_" + k, "attic"); devices[d].name = nm; const w = (id, st, at) => add(id, null, st, { friendly_name: `${nm} ${at.n}`, ...at.a }, { device: d });
    const ms = k === "wasmachine" ? "sensor.wasmachine_washer_machine_state" : "sensor.droger_1_machine_state", js = k === "wasmachine" ? "sensor.wasmachine_washer_job_state" : "sensor.droger_1_job_state", ct = k === "wasmachine" ? "sensor.wasmachine_washer_completion_time" : "sensor.droger_1_completion_time";
    w(ms, run ? "run" : "stop", { n: "Machine state", a: { device_class: "enum" } });
    w(js, run ? "rinse" : "none", { n: "Job state", a: { device_class: "enum" } });
    w(ct, new Date(Date.now() + (run ? 52 : -180) * 60000).toISOString(), { n: "Completion time", a: { device_class: "timestamp" } });
    w(`binary_sensor.${k === "wasmachine" ? "wasmachine" : "droger_1"}_power`, run ? "on" : "off", { n: "Power", a: { device_class: "power" } });
    w(`switch.${k}`, run ? "on" : "off", { n: "", a: {} });
    w(`select.${k === "wasmachine" ? "wasmachine" : "droger_1"}`, run ? "run" : "stop", { n: "", a: { options: ["stop", "run", "pause"] } });
    w(`sensor.${k === "wasmachine" ? "wasmachine" : "droger_1"}_power`, run ? "410" : "0", { n: "Power", a: { unit_of_measurement: "W", device_class: "power" } });
    w(`binary_sensor.${k === "wasmachine" ? "wasmachine" : "droger_1"}_remote_control`, "on", { n: "Remote control", a: {} });
    w(`sensor.${k}_progress`, "-", { n: "progress", a: {} });
    w(`sensor.${k}_energie_maand`, k === "wasmachine" ? "19.0" : "12.9", { n: "energie maand", a: { unit_of_measurement: "kWh", device_class: "energy" } });
    w(`sensor.${k}_kosten_maand`, k === "wasmachine" ? "4.92" : "3.39", { n: "kosten maand", a: { unit_of_measurement: "EUR", device_class: "monetary" } });
    w(`sensor.${k}_cycli_maand`, k === "wasmachine" ? "30" : "28", { n: "cycli maand", a: { unit_of_measurement: "beurten" } });
  }
  add("sensor.attic_temperature", "attic", "17.2", { device_class: "temperature" });

  add("camera.front_door", "hallway", "idle", { friendly_name: "Front door", entity_picture: "/images/rooms/hallway.png?x=1", access_token: "abc" });
  add("camera.living_room", "living_room", "idle", { friendly_name: "Living room cam", entity_picture: "/images/rooms/livingroom.png?x=1", access_token: "ghi" });
  add("camera.backyard", "backyard", "streaming", { friendly_name: "Backyard", entity_picture: "/images/rooms/backyard.png?x=1", access_token: "def" });

  // whole-home
  for (const [p, st] of [["alex", "home"], ["sam", "home"], ["robin", "home"], ["jamie", "not_home"], ["charlie", "not_home"]])
    add(`person.${p}`, null, st, { friendly_name: p.split("_")[0].replace(/^\w/, c => c.toUpperCase()) }, { changed: ago(st === "home" ? 900 : 130) });
  add("alarm_control_panel.alarmo", null, "disarmed", { friendly_name: "Alarmo", changed_by: "Alex", code_format: "number", code_arm_required: false }, { changed: ago(640) });
  add("fan.ceiling_fan", "bedroom", "on", { friendly_name: "Ceiling fan", percentage: 40, preset_modes: ["low", "high", "auto"], oscillating: false });
  add("lock.front_door", "hallway", "locked", { friendly_name: "Front door lock", changed_by: "Sam" }, { changed: ago(130) });
  add("vacuum.robbie", "living_room", "docked", { friendly_name: "Robbie", battery_level: 86, fan_speed: "standard" });
  add("humidifier.humidifier", "bedroom", "on", { friendly_name: "Humidifier", humidity: 50, current_humidity: 44, action: "humidifying", available_modes: ["auto", "sleep"] });
  // Claude Code usage (a Claude usage integration: percentages, with the moment each window resets)
  add("sensor.claude_5_h_session", null, "84.0", { friendly_name: "Claude · 5 h session", unit_of_measurement: "%", state_class: "measurement", session_resets_at: new Date(Date.now() + 175 * 60000).toISOString(), last_success_at: new Date().toISOString(), state: "ok" });
  add("sensor.claude_week", null, "54.0", { friendly_name: "Claude · week", unit_of_measurement: "%", state_class: "measurement", weekly_resets_at: new Date(Date.now() + 4.5 * 86400000).toISOString(), last_success_at: new Date().toISOString(), state: "ok" });
  add("sensor.chatgpt_5_h_session", null, "12.0", { friendly_name: "ChatGPT · 5 h session", unit_of_measurement: "%", state_class: "measurement", session_resets_at: new Date(Date.now() + 250 * 60000).toISOString(), last_success_at: new Date().toISOString(), state: "ok" });
  add("sensor.chatgpt_week", null, "31.0", { friendly_name: "ChatGPT · week", unit_of_measurement: "%", state_class: "measurement", weekly_resets_at: new Date(Date.now() + 6 * 86400000).toISOString(), last_success_at: new Date().toISOString(), state: "ok" });
  add("update.home_assistant_core_update", null, "on", { friendly_name: "Home Assistant Core Update", title: "Home Assistant Core", installed_version: "2026.9.3", latest_version: "2026.10.1", release_summary: "New features and improvements.", supported_features: 1 + 16 });
  add("update.shelly_plug_firmware", "kitchen", "on", { friendly_name: "Shelly Plug Firmware", title: "Shelly Plug", installed_version: "1.4.2", latest_version: "1.5.0", device_class: "firmware", supported_features: 1 });
  add("script.good_night", null, "off", { friendly_name: "Good night", icon: "mdi:weather-night" });
  add("binary_sensor.doorbell", "hallway", "off", { friendly_name: "Doorbell", device_class: "occupancy" });
  add("sensor.processor_use", null, "23", { friendly_name: "Processor use", unit_of_measurement: "%", icon: "mdi:cpu-64-bit" });
  add("sensor.processor_temperature", null, "48.2", { friendly_name: "Processor temperature", unit_of_measurement: "°C", device_class: "temperature" });
  add("sensor.memory_use_percent", null, "61", { friendly_name: "Memory use (percent)", unit_of_measurement: "%" });
  add("sensor.disk_use_percent", null, "88", { friendly_name: "Disk use (percent) /", unit_of_measurement: "%" });
  add("sensor.network_throughput_in_eth0", null, "1.8", { friendly_name: "Network throughput in eth0", unit_of_measurement: "MB/s", device_class: "data_rate" });
  add("sensor.network_throughput_out_eth0", null, "0.3", { friendly_name: "Network throughput out eth0", unit_of_measurement: "MB/s", device_class: "data_rate" });
  add("sensor.last_boot", null, new Date(Date.now() - 36 * 3600000).toISOString(), { friendly_name: "Last boot", device_class: "timestamp" });
  add("weather.home", null, "partlycloudy", { friendly_name: "Home", temperature: 14, humidity: 71, wind_speed: 17, wind_speed_unit: "km/h", attribution: "Home" });
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  // Afvalwijzer format: state "Tomorrow, 08-10-2026", Sort_date 20261008, Days_until 1
  const waste = (n, pre = "") => { const [y, m, dd] = d(n).split("-"); return [`${pre}${dd}-${m}-${y}`, { Wastecollector: "example", Sort_date: +`${y}${m}${dd}`, Days_until: n }]; };
  for (const [id, n, pre] of [["bio", 1, "Tomorrow, "], ["plastic", 5, ""], ["paper", 15, ""]]) { const [st, at] = waste(n, pre); add(`sensor.waste_${id}`, null, st, { friendly_name: `Waste ${id}`, ...at }); }
  add("calendar.family", null, "on", { friendly_name: "Family" });
  add("sun.sun", null, "above_horizon", { next_rising: new Date(Date.now() + 10 * 3600000).toISOString(), next_setting: new Date(Date.now() + 2 * 3600000).toISOString() });
  add("sensor.washing_machine_power", null, "0", { friendly_name: "Washing machine power", unit_of_measurement: "W", device_class: "power" }, { device: dWas });
  add("scene.living_room_movie", "living_room", "unknown", { friendly_name: "Movie", icon: "mdi:movie-open-outline" });
  add("scene.morning", null, "unknown", { friendly_name: "Morning", icon: "mdi:weather-sunset-up" });
  add("scene.film", null, "unknown", { friendly_name: "Movie", icon: "mdi:movie-open-outline" });
  add("scene.evening", null, "unknown", { friendly_name: "Evening", icon: "mdi:candle" });
  add("scene.night", null, "unknown", { friendly_name: "Night", icon: "mdi:power-sleep" });
  add("sensor.p1_power", null, "412", { friendly_name: "Power", unit_of_measurement: "W" });
  add("sensor.p1_energy_today", null, "6.8", { unit_of_measurement: "kWh" });
  add("sensor.p1_import_dal", null, "19327.9", { friendly_name: "P1 Meter Energy import Dal", unit_of_measurement: "kWh" });
  add("sensor.p1_import_normaal", null, "24269.5", { friendly_name: "P1 Meter Energy import Normaal", unit_of_measurement: "kWh" });
  add("sensor.gas_meter", null, "8836.7", { friendly_name: "Gas meter", unit_of_measurement: "m³" });
  add("automation.night_mode", null, "unavailable", { friendly_name: "Night mode" });

  if (LAB) {   // long names, unavailable devices, every kind of card in its awkward states
    const L = "A very long name that has to be clamped to two lines without pushing anything over the controls";
    add("light.lab_long_on", "test_lab", "on", { friendly_name: L, brightness: 140, supported_color_modes: ["brightness"] });
    add("light.lab_long_off", "test_lab", "off", { friendly_name: L, supported_color_modes: ["onoff"] });
    add("light.lab_unavailable", "test_lab", "unavailable", { friendly_name: "Unavailable light" });
    add("switch.lab_switch_long", "test_lab", "on", { friendly_name: L });
    const dLabPlug = dev("dev_lab_plug", "test_lab"); devices[dLabPlug].name = "Coffee machine with a long name";
    add("switch.lab_plug", null, "on", { friendly_name: "Coffee machine plug", current_power_w: 120 }, { device: dLabPlug });
    add("sensor.lab_plug_power", null, "120", { unit_of_measurement: "W", device_class: "power", friendly_name: "Coffee machine power" }, { device: dLabPlug });
    // litter boxes: the device is named like one, its switches are Clean / Empty / Smart / Deodorize; one idle, one cleaning, one with a long name, one unreachable
    for (const [k, nm, st] of [["a", "Kattenbak", "off"], ["b", "Kattenbak boven", "off"], ["c", "Kattenbak van de logeerkamer met een heel lange naam", "off"], ["d", "Kattenbak onbereikbaar", "unavailable"]]) {
      const d = dev("dev_litter_" + k, "test_lab"); devices[d].name = nm;
      for (const [r, label] of [["clean", "Clean"], ["empty", "Empty"], ["smart", "Smart clean"], ["deodorize", "Deodorize"], ["auto", "Auto deodorize"], ["odourless", "Odourless"]])
        add(`switch.litter_${k}_${r}`, null, k === "b" && r === "clean" ? "on" : st, { friendly_name: `${nm} ${label}` }, { device: d });
      add(`sensor.litter_${k}_weight`, null, st === "unavailable" ? "unavailable" : "4.2", { friendly_name: `${nm} weight`, device_class: "weight", unit_of_measurement: "kg" }, { device: d });
    }
    add("climate.lab_long", "test_lab", "heat", { friendly_name: L, temperature: 21, current_temperature: 19.5, hvac_action: "heating", hvac_modes: ["off", "heat", "auto"], preset_modes: ["home", "away"], preset_mode: "home" });
    add("climate.lab_unavailable", "test_lab", "unavailable", { friendly_name: "Unavailable thermostat" });
    add("media_player.lab_art", "test_lab", "playing", { friendly_name: L, media_title: "A track title that is far too long to fit on one line of the card", media_artist: "An artist with a long name", volume_level: .4, entity_picture: "/images/rooms/lounge.png" });
    add("media_player.lab_idle", "test_lab", "idle", { friendly_name: "Idle speaker with a long name", volume_level: .2 });
    add("media_player.lab_unavailable", "test_lab", "unavailable", { friendly_name: "Unavailable speaker" });
    add("cover.lab_long", "test_lab", "open", { friendly_name: L, current_position: 60 });
    add("cover.lab_unavailable", "test_lab", "unavailable", { friendly_name: "Unavailable blind" });
    add("fan.lab_long", "test_lab", "on", { friendly_name: L, percentage: 60, preset_modes: ["low", "high"] });
    add("lock.lab_long", "test_lab", "locked", { friendly_name: L });
    add("vacuum.lab_unavailable", "test_lab", "unavailable", { friendly_name: "Unavailable vacuum" });
    add("humidifier.lab_long", "test_lab", "on", { friendly_name: L, humidity: 50, current_humidity: 44, available_modes: ["auto", "sleep"] });
    add("sensor.lab_temp", null, "21.3", { friendly_name: "Temperature", device_class: "temperature", unit_of_measurement: "°C" });
    add("sensor.lab_long_value", null, "1234.5", { friendly_name: L, device_class: "power", unit_of_measurement: "W" });
    add("sensor.lab_text_value", null, "A text state that is quite long", { friendly_name: "Text sensor" });
    add("sensor.lab_unavailable_value", null, "unavailable", { friendly_name: "Unavailable sensor", device_class: "temperature", unit_of_measurement: "°C" });
  }
  const notifications = [{ notification_id: "update_available", title: "Update available", message: "Home Assistant 2026.10.1 is available.", created_at: ago(40) }];
  const hass = {
    user: { id: "u1", name: "Alex", is_admin: true },
    areas, devices, entities, states, floors, language: new URLSearchParams(location.search).get("lang") || "en",
    connection: { subscribeMessage(cb, msg) { console.log("[mock] subscribe", msg.type); if (msg.type === "render_template") { setTimeout(() => cb({ result: msg.template.includes("weather") ? "Partly cloudy" : "example" }), 30); return Promise.resolve(() => {}); } setTimeout(() => cb({ notifications: Object.fromEntries(notifications.map(n => [n.notification_id, n])) }), 50); return () => {}; } },
    callService(domain, service, data) {
      console.log("[mock] callService", domain, service, data);
      const ids = [].concat(data.entity_id || []);
      for (const id of ids) {
        const s = states[id]; if (!s) continue;
        const set = (st, attrs = {}) => { states[id] = { ...s, state: st, attributes: { ...s.attributes, ...attrs }, last_changed: now() }; };
        if (service === "select_option") set(data.option);
        if (service === "toggle") set(s.state === "on" ? "off" : "on");
        if (domain === "persistent_notification" && service === "dismiss") { const i = notifications.findIndex(n => n.notification_id === data.notification_id); if (i >= 0) notifications.splice(i, 1); }
        if (service === "turn_on") set("on", data.brightness_pct ? { brightness: Math.round(data.brightness_pct * 2.55) } : data.color_temp_kelvin ? { color_temp_kelvin: data.color_temp_kelvin, color_mode: "color_temp" } : data.hs_color ? { hs_color: data.hs_color, color_mode: "hs", rgb_color: (h => { const [hh, ss] = h, c = ss / 100, x = c * (1 - Math.abs((hh / 60) % 2 - 1)), m = 1 - c; const [r, g, b] = hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x] : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x]; return [r, g, b].map(v => Math.round((v + m) * 255)); })(data.hs_color) } : {});
        if (service === "turn_off") set("off");
        if (service === "media_play_pause") set(s.state === "playing" ? "paused" : "playing");
        if (service === "volume_set") set(s.state, { volume_level: data.volume_level });
        if (service === "open_cover") set("open", { current_position: 100 });
        if (service === "close_cover") set("closed", { current_position: 0 });
        if (service === "set_cover_position") set(data.position > 0 ? "open" : "closed", { current_position: data.position });
        if (service === "set_temperature") set(s.state, { temperature: data.temperature });
        if (service === "set_hvac_mode") set(data.hvac_mode);
        if (service === "set_preset_mode") set(s.state, { preset_mode: data.preset_mode });
        if (service === "set_percentage") set("on", { percentage: data.percentage });
        if (service === "lock") set("locked"); if (service === "unlock") set("unlocked");
        if (service === "start") set("cleaning"); if (service === "pause") set("paused"); if (service === "return_to_base") set("returning");
        if (service === "set_humidity") set(s.state, { humidity: data.humidity });
        if (service.startsWith("alarm_")) console.log("[mock] alarm code", data.code), set({ alarm_disarm: "disarmed", alarm_arm_home: "armed_home", alarm_arm_away: "armed_away", alarm_arm_night: "armed_night" }[service]);
      }
      hass.states = { ...states };
      onChange(hass);
      return Promise.resolve();
    },
    callWS(msg) {
      console.log("[mock] callWS", msg);
      if (msg.type === "config_entries/get" && msg.domain === "music_assistant") return Promise.resolve([{ entry_id: "mock_ma", domain: "music_assistant", state: "loaded" }]);
      if (msg.type === "call_service" && msg.domain === "music_assistant") {
        const it = (media_type, n, name, extra = {}) => ({ media_type, uri: `library://${media_type}/${n}`, name, version: "", image: null, favorite: true, ...extra });
        const by = a => ({ artists: [{ media_type: "artist", uri: "library://artist/1", name: a, image: null }] });
        const lib = { playlist: [it("playlist", 1, "Friday dinner"), it("playlist", 2, "Focus")], album: [it("album", 3, "Brat", by("Charli xcx"))], radio: [it("radio", 4, "Qmusic"), it("radio", 5, "Radio 538")], artist: [it("artist", 6, "Fleetwood Mac")], track: [it("track", 7, "Dreams", by("Fleetwood Mac")), it("track", 8, "A track with a very long name that does not fit", by("Someone"))] };
        if (msg.service === "get_library") return Promise.resolve({ response: { items: lib[msg.service_data.media_type] || [], limit: 24, offset: 0, media_type: msg.service_data.media_type } });
        if (msg.service === "search") { const q = msg.service_data.name.toLowerCase(), f = l => l.filter(x => (x.name + " " + (x.artists || []).map(a => a.name).join(" ")).toLowerCase().includes(q)); return Promise.resolve({ response: { artists: f(lib.artist), albums: f(lib.album), tracks: f(lib.track), playlists: f(lib.playlist), radio: f(lib.radio), audiobooks: [], podcasts: [] } }); }
        if (msg.service === "get_queue") { const id = msg.target.entity_id; if (id !== "media_player.speaker") return Promise.reject({ message: "No active queue found" });
          return Promise.resolve({ response: { [id]: { queue_id: "q-speaker", active: true, name: "Speaker", items: 12, current_index: 3, current_item: { name: "Charli xcx - B2b", media_item: it("track", 9, "B2b", by("Charli xcx")) }, next_item: { name: "Charli xcx - 360", media_item: it("track", 10, "360", by("Charli xcx")) } } } }); }
      }
      if (msg.type === "call_service" && msg.domain === "calendar") { const t = new Date(); return Promise.resolve({ response: { "calendar.family": { events: [{ summary: "Swimming lesson", start: new Date(t.getTime() + 2 * 3600000).toISOString(), end: new Date(t.getTime() + 3 * 3600000).toISOString() }, { summary: "Grandma's birthday", start: new Date(t.getTime() + 86400000).toISOString().slice(0, 10), end: new Date(t.getTime() + 2 * 86400000).toISOString().slice(0, 10) }] } } }); }
      if (msg.type === "history/history_during_period" && msg.entity_ids[0].startsWith("sensor.")) { const now = Date.now(), hrs = (now - Date.parse(msg.start_time)) / 3600000, id = msg.entity_ids[0], base = parseFloat(hass.states[id]?.state) || 20;
        return Promise.resolve({ [id]: Array.from({ length: Math.round(hrs * 4) + 1 }, (_, i) => { const h = i / 4 - hrs; return { s: String(base + Math.sin((h + 9) / 3.8) * 1.3 + Math.sin(h * 1.7) * .25 - .4), lu: (now + h * 3600000) / 1000 }; }) }); }
      if (msg.type === "history/history_during_period" && msg.entity_ids[0].startsWith("climate.")) { const id = msg.entity_ids[0], st = Date.parse(msg.start_time), now = Date.now();
        return Promise.resolve({ [id]: [0, 1.5, 3, 4.2, 6, 7.1, 9, 9.8].map((h, i) => ({ s: "heat", a: { hvac_action: i % 2 ? "idle" : "heating" }, lu: (st + h * 3600000) / 1000 })).filter(x => x.lu * 1000 < now) }); }
      if (msg.type === "history/history_during_period") { const now = Date.now(); return Promise.resolve({ [msg.entity_ids[0]]: [3, 5, 8, 13].flatMap(h => [{ s: "on", lu: (now - h * 3600000) / 1000 }, { s: "off", lu: (now - h * 3600000 + (h === 8 ? 150 : 35) * 60000) / 1000 }]) }); }
      if (msg.type === "energy/get_prefs") return Promise.resolve({ energy_sources: [{ type: "gas", stat_energy_from: "sensor.gas_meter", number_energy_price: 1.359931 }, { type: "grid", stat_energy_from: "sensor.p1_import_dal", number_energy_price: 0.248897 }, { type: "grid", stat_energy_from: "sensor.p1_import_normaal", number_energy_price: 0.260997 }] });
      if (msg.type === "recorder/statistics_during_period" && msg.period === "day" && msg.statistic_ids.includes("sensor.gas_meter")) { const days = Math.round(((msg.end_time ? Date.parse(msg.end_time) : Date.now()) - Date.parse(msg.start_time)) / 864e5), day = Date.parse(msg.start_time); return Promise.resolve(Object.fromEntries(msg.statistic_ids.map((id, n) => [id, Array.from({ length: days + 1 }, (_, i) => ({ start: new Date(day + i * 864e5).toISOString(), change: [1.7, 5.2, 6.0][n] }))]))); }
      if (msg.type === "recorder/statistics_during_period") { const h = new Date().getHours(); const start = new Date(); start.setHours(0, 0, 0, 0); return Promise.resolve({ [msg.statistic_ids[0]]: Array.from({ length: h + 1 }, (_, i) => ({ start: new Date(start.getTime() + i * 36e5).toISOString(), change: +(0.1 + Math.abs(Math.sin(i / 3)) * 0.9).toFixed(2) })) }); }
      if (msg.type === "frontend/get_user_data") return Promise.resolve({ value: JSON.parse(localStorage.getItem("mock:" + msg.key) || "null") });
      if (msg.type === "frontend/set_user_data") { localStorage.setItem("mock:" + msg.key, JSON.stringify(msg.value)); if (msg.key === "core") hass.userData = msg.value; return Promise.resolve({}); }
      return Promise.resolve({ response: {} });
    },
  };
  return hass;
}
