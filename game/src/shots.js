// Capture scenes start from fixed coordinates and a seed for repeatable frames.
// Their traffic, police response, time of day, and camera pose are staged here.
// The ready marker freezes simulation only after the requested tableau is formed.
let SHOT_BANNER = null;
let SHOT_RANDOM_ORIGINAL = null;
window.SHOT_BANNER = SHOT_BANNER;

function shotHash(value) {
  let code = 2166136261;
  for (let index = 0; index < value.length; index++) {
    code ^= value.charCodeAt(index);
    code = Math.imul(code, 16777619);
  }
  return code >>> 0;
}

function nearestRoadSpawn(x, y) {
  let closest = CITY.roadSpawns[0];
  let closestGap = Infinity;
  for (const road of CITY.roadSpawns) {
    const gap = Math.hypot(road.x - x, road.y - y);
    if (gap < closestGap) { closest = road; closestGap = gap; }
  }
  return closest;
}

function resetShotWorld() {
  CASH = 500;
  WANTED = 0;
  BULLETS.length = 0;
  PARTICLES.length = 0;
  SKIDMARKS.length = 0;
  PEDS.length = 0;
  VEHICLES.length = 0;
  POLICE_OFFICERS.length = 0;
  ROADBLOCKS.length = 0;
  HELI = null;
  MISSION_MARKER = null;
  SHOT_BANNER = null;
  window.SHOT_BANNER = SHOT_BANNER;
}

function setShotTraffic(center, includePedestrians) {
  const traffic = [
    [center.x - 410, center.y - 25, 0, "taxi"],
    [center.x - 250, center.y + 27, 0, "compact"],
    [center.x + 255, center.y - 24, Math.PI, "sedan"],
    [center.x + 445, center.y + 25, Math.PI, "taxi"],
    [center.x - 28, center.y - 355, Math.PI / 2, "compact"],
    [center.x + 28, center.y + 350, -Math.PI / 2, "sedan"],
  ];
  for (const [x, y, heading, model] of traffic) {
    const car = spawnVehicle(model, x, y, heading, { ai: true, aiDir: heading });
    car.vel = car.maxSpeed * 0.34;
  }
  if (!includePedestrians) return;
  for (let person = 0; person < 12; person++) {
    const side = person % 2 === 0 ? -1 : 1;
    const offset = 105 + Math.floor(person / 2) * 42;
    spawnPed(center.x + side * offset, center.y + (person % 3 - 1) * 64);
  }
}

function setupShot(name) {
  if (SHOT_RANDOM_ORIGINAL) Math.random = SHOT_RANDOM_ORIGINAL;
  SHOT_RANDOM_ORIGINAL = Math.random;
  const querySeed = parseInt(new URLSearchParams(location.search).get("seed") || "1", 10) || 1;
  Math.random = createRng(querySeed ^ shotHash(name));

  SHOT_MODE = name;
  SHOT_TIMER = 0;
  SHOT_READY_FIRED = false;
  FROZEN = false;
  resetShotWorld();
  DAY_TIME = name === "night" ? 0.82 : (name === "chase" ? 0.72 : (name === "city" ? 0.5 : 0.35));

  const coastal = name === "night";
  const anchor = nearestRoadSpawn(CITY.worldW * 0.5, coastal ? CITY.worldH * 0.92 : CITY.worldH * 0.48);
  if (name === "mission") {
    initPlayer(anchor.x - 50, anchor.y + 10);
    initMissions();
    startMission(0);
    STATE = "MISSION_DIALOG";
    DIALOGUE_LINE = 0;
    window.setDialogueLine(0);
    MISSION_MARKER = { x: PLAYER.x + 90, y: PLAYER.y - 48 };
    if (MISSIONS && MISSIONS[0]) {
      MISSIONS[0].steps[0].x = MISSION_MARKER.x;
      MISSIONS[0].steps[0].y = MISSION_MARKER.y;
    }
    spawnVehicle("sports", PLAYER.x + 170, PLAYER.y + 92, 0.3, { ai: false });
    CAMERA.x = Math.max(0, Math.min(CITY.worldW - CONFIG.CANVAS_W, PLAYER.x - CONFIG.CANVAS_W / 2));
    CAMERA.y = Math.max(0, Math.min(CITY.worldH - CONFIG.CANVAS_H, PLAYER.y - CONFIG.CANVAS_H / 2));
    window.setTimeout(() => { if (!SHOT_READY_FIRED) fireShotReady(); }, 1600);
    return;
  }

  initPlayer(anchor.x, anchor.y);
  const ride = spawnVehicle("sedan", anchor.x, anchor.y, 0, { driver: "player" });
  PLAYER.onFoot = false;
  PLAYER.vehicleId = ride.id;
  PLAYER.x = ride.x;
  PLAYER.y = ride.y;
  setShotTraffic(anchor, name !== "night");

  if (name === "chase") {
    DAY_TIME = 0.72;
    WANTED = 4;
    SHOT_BANNER = "Escape the heat";
    window.SHOT_BANNER = SHOT_BANNER;
    const cruiserOne = spawnVehicle("police", anchor.x - 320, anchor.y - 28, 0, { ai: true });
    const cruiserTwo = spawnVehicle("police", anchor.x - 390, anchor.y + 32, 0, { ai: true });
    const swatVan = spawnVehicle("swat", anchor.x - 500, anchor.y + 90, 0, { ai: true });
    cruiserOne.isPolice = true;
    cruiserTwo.isPolice = true;
    swatVan.isPolice = true;
    ROADBLOCKS.push({ x: anchor.x + 610, y: anchor.y, angle: Math.PI / 2, life: 60 });
    STATE = "PLAYING";
  } else {
    STATE = "PLAYING";
  }

  CAMERA.x = Math.max(0, Math.min(CITY.worldW - CONFIG.CANVAS_W, ride.x - CONFIG.CANVAS_W / 2));
  CAMERA.y = Math.max(0, Math.min(CITY.worldH - CONFIG.CANVAS_H, ride.y - CONFIG.CANVAS_H / 2));
  const readyAfter = name === "chase" ? 1900 : 2600;
  window.setTimeout(() => { if (!SHOT_READY_FIRED) fireShotReady(); }, readyAfter);
}

function updateShot(dt) {
  SHOT_TIMER += dt;
  if (SHOT_MODE === "city" || SHOT_MODE === "night" || SHOT_MODE === "chase") {
    INPUT.keys.KeyW = true;
    INPUT.keys.KeyA = false;
    INPUT.keys.KeyD = false;
  }
  if (SHOT_TIMER >= 12 && !SHOT_READY_FIRED) fireShotReady();
}

function fireShotReady() {
  if (SHOT_READY_FIRED) return;
  SHOT_READY_FIRED = true;
  FROZEN = true;
  window.__SHOT_READY__ = true;
  if (SHOT_RANDOM_ORIGINAL) {
    Math.random = SHOT_RANDOM_ORIGINAL;
    SHOT_RANDOM_ORIGINAL = null;
  }
  try { document.body.dataset.shotReady = "1"; } catch (error) {}
  console.log("SHOT_READY_FIRED", SHOT_MODE);
}

window.setupShot = setupShot;
window.updateShot = updateShot;
window.SHOT_MODE = () => SHOT_MODE;
window.SHOT_BANNER = () => SHOT_BANNER;
window.fireShotReady = fireShotReady;
window.SHOT_BANNER_VAR = () => SHOT_BANNER;
