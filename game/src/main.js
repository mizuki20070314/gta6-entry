// This last classic script binds browser input and publishes the shared runtime.
// Query parameters choose a world seed or one of the staged capture scenes.
// Runtime errors are copied onto the page so a headless browser can report them.
const params = new URLSearchParams(location.search);
const SEED = parseInt(params.get("seed") || "1", 10) || 1;
const SHOT_NAME = params.get("shot");
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = CONFIG.CANVAS_W;
canvas.height = CONFIG.CANVAS_H;

let STATE = "TITLE";
let CASH = 500;
let WANTED = 0;
let CAMERA = { x: 0, y: 0 };
let MOUSE = { x: 0, y: 0, worldX: 0, worldY: 0, down: false };
let INPUT = { keys: {}, justPressed: {}, mouseDown: false };
let BULLETS = [];
let DAY_TIME = 0.35;
let FROZEN = false;
let SHOT_MODE = null;
let SHOT_TIMER = 0;
let SHOT_READY_FIRED = false;
let SHOT_RECENT = 0;

window.INPUT = INPUT;
window.MOUSE = MOUSE;
window.CAMERA = CAMERA;
window.BULLETS = BULLETS;

window.onerror = function (msg, src, line, col, err) {
  const summary = String(msg) + " @ " + (src || "?") + ":" + (line || "?") + ":" + (col || "?");
  try { document.body.dataset.error = summary; } catch (error) {}
  try { document.title = "ERROR: " + msg; } catch (error) {}
  return false;
};
window.addEventListener("unhandledrejection", function (event) {
  const reason = event.reason;
  const summary = reason && reason.message ? reason.message : String(reason);
  try { document.body.dataset.error = summary; } catch (error) {}
});

const CITY = generateCity(SEED);
window.CITY = CITY;
initMissions();
CAMERA.x = CITY.worldW / 2 - CONFIG.CANVAS_W / 2;
CAMERA.y = CITY.worldH / 2 - CONFIG.CANVAS_H / 2;

window.addEventListener("keydown", (event) => {
  if (!INPUT.keys[event.code]) INPUT.justPressed[event.code] = true;
  INPUT.keys[event.code] = true;
  if (event.code === "Space") event.preventDefault();

  if (event.code === "Escape") {
    if (STATE === "PLAYING") STATE = "PAUSED";
    else if (STATE === "PAUSED") STATE = "PLAYING";
  }
  if (event.code === "F5") {
    event.preventDefault();
    saveGame();
  }
  if (STATE === "MISSION_DIALOG" && (event.code === "Space" || event.code === "Enter")) {
    advanceDialogue();
    INPUT.justPressed[event.code] = false;
  }
});

window.addEventListener("keyup", (event) => { INPUT.keys[event.code] = false; });
canvas.addEventListener("mousemove", (event) => {
  const bounds = canvas.getBoundingClientRect();
  MOUSE.x = event.clientX - bounds.left;
  MOUSE.y = event.clientY - bounds.top;
  MOUSE.worldX = MOUSE.x + CAMERA.x;
  MOUSE.worldY = MOUSE.y + CAMERA.y;
});
canvas.addEventListener("mousedown", (event) => {
  INPUT.mouseDown = true;
  INPUT.justPressed.MouseDown = true;
  MOUSE.down = true;
  if (STATE === "TITLE") {
    const bounds = canvas.getBoundingClientRect();
    handleTitleClick(event.clientX - bounds.left, event.clientY - bounds.top);
  }
  if (STATE === "PLAYING" && PLAYER.onFoot) playerFire();
});
window.addEventListener("mouseup", () => {
  INPUT.mouseDown = false;
  MOUSE.down = false;
});

function clearWorldActors() {
  BULLETS.length = 0;
  PARTICLES.length = 0;
  SKIDMARKS.length = 0;
  PEDS.length = 0;
  VEHICLES.length = 0;
  POLICE_OFFICERS.length = 0;
  ROADBLOCKS.length = 0;
  HELI = null;
}

function startNewGame() {
  clearWorldActors();
  CASH = 500;
  WANTED = 0;
  MISSION_INDEX = 0;
  initMissions();
  window.setMissionIndex(0);
  try { localStorage.setItem("sc_mission", "0"); } catch (error) {}
  const spawn = findPlayerSpawn();
  initPlayer(spawn.x, spawn.y);
  startMission(0);
  STATE = "MISSION_DIALOG";
  DAY_TIME = 0.35;
}

function continueGame() {
  clearWorldActors();
  if (!loadGame()) {
    startNewGame();
    return;
  }
  initMissions();
  startMission(MISSION_INDEX);
  STATE = "MISSION_DIALOG";
  DAY_TIME = 0.35;
}

function findPlayerSpawn() {
  const centerX = CITY.worldW / 2;
  const centerY = CITY.worldH / 2;
  let chosen = CITY.roadSpawns[0];
  let chosenDistance = Infinity;
  for (const road of CITY.roadSpawns) {
    const distance = Math.hypot(road.x - centerX, road.y - centerY);
    if (distance < chosenDistance) { chosen = road; chosenDistance = distance; }
  }
  return chosen;
}

window.GAME = { startNewGame, continueGame, state: () => STATE, onRespawn: null };

Object.defineProperty(window, "SHOT_RECENT", { get: () => SHOT_RECENT, set: (value) => { SHOT_RECENT = value; } });
Object.defineProperty(window, "STATE", { get: () => STATE, set: (value) => { STATE = value; } });
Object.defineProperty(window, "CASH", { get: () => CASH, set: (value) => { CASH = value; } });
Object.defineProperty(window, "WANTED", { get: () => WANTED, set: (value) => { WANTED = value; } });
Object.defineProperty(window, "DAY_TIME", { get: () => DAY_TIME, set: (value) => { DAY_TIME = value; } });
Object.defineProperty(window, "FROZEN", { get: () => FROZEN, set: (value) => { FROZEN = value; } });
Object.defineProperty(window, "SHOT_MODE", { get: () => SHOT_MODE, set: (value) => { SHOT_MODE = value; } });
Object.defineProperty(window, "SHOT_TIMER", { get: () => SHOT_TIMER, set: (value) => { SHOT_TIMER = value; } });
Object.defineProperty(window, "SHOT_READY_FIRED", { get: () => SHOT_READY_FIRED, set: (value) => { SHOT_READY_FIRED = value; } });
Object.defineProperty(window, "MISSION_INDEX", { get: () => MISSION_INDEX, set: (value) => { MISSION_INDEX = value; } });

if (SHOT_NAME) window.setTimeout(() => setupShot(SHOT_NAME), 50);
window.setTimeout(() => { if (window.startLoop) window.startLoop(); }, 100);
