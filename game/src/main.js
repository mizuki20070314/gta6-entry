// main.js — bootstrap and global state
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

// surface runtime errors to the DOM for headless verification
window.onerror = function (msg, src, line, col, err) {
    const full = String(msg) + " @ " + (src || "?") + ":" + (line || "?") + ":" + (col || "?");
    try { document.body.dataset.error = full; } catch (e) {}
    try { document.title = "ERROR: " + msg; } catch (e) {}
    return false;
};
window.addEventListener("unhandledrejection", function (e) {
    const msg = (e.reason && e.reason.message) ? e.reason.message : String(e.reason);
    try { document.body.dataset.error = msg; } catch (er) {}
});

const CITY = generateCity(SEED);
window.CITY = CITY;
initMissions();

CAMERA.x = CITY.worldW / 2 - CONFIG.CANVAS_W / 2;
CAMERA.y = CITY.worldH / 2 - CONFIG.CANVAS_H / 2;

window.addEventListener("keydown", (e) => {
    if (!INPUT.keys[e.code]) INPUT.justPressed[e.code] = true;
    INPUT.keys[e.code] = true;
    if (e.code === "Space") e.preventDefault();
    if (e.code === "Escape") {
        if (STATE === "PLAYING") STATE = "PAUSED";
        else if (STATE === "PAUSED") STATE = "PLAYING";
    }
    if (e.code === "F5") { e.preventDefault(); saveGame(); }
    if (STATE === "MISSION_DIALOG" && (e.code === "Space" || e.code === "Enter")) {
        advanceDialogue();
    }
});
window.addEventListener("keyup", (e) => { INPUT.keys[e.code] = false; });
canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    MOUSE.x = e.clientX - rect.left;
    MOUSE.y = e.clientY - rect.top;
    MOUSE.worldX = MOUSE.x + CAMERA.x;
    MOUSE.worldY = MOUSE.y + CAMERA.y;
});
canvas.addEventListener("mousedown", (e) => {
    INPUT.mouseDown = true; INPUT.justPressed["MouseDown"] = true;
    MOUSE.down = true;
    if (STATE === "TITLE") {
        const rect = canvas.getBoundingClientRect();
        handleTitleClick(e.clientX - rect.left, e.clientY - rect.top);
    }
    if (STATE === "PLAYING" && PLAYER.onFoot) {
        playerFire();
    }
});
window.addEventListener("mouseup", () => { INPUT.mouseDown = false; MOUSE.down = false; });

function startNewGame() {
    CASH = 500; WANTED = 0; BULLETS.length = 0; PARTICLES.length = 0; SKIDMARKS.length = 0; PEDS.length = 0; VEHICLES.length = 0; POLICE_OFFICERS.length = 0; ROADBLOCKS.length = 0; HELI = null;
    MISSION_INDEX = 0;
    const spawn = findPlayerSpawn();
    initPlayer(spawn.x, spawn.y);
    initMissions();
    startMission(0);
    STATE = "MISSION_DIALOG";
    DAY_TIME = 0.35;
}

function continueGame() {
    const ok = loadGame();
    if (!ok) { startNewGame(); return; }
    VEHICLES.length = 0; PEDS.length = 0; BULLETS.length = 0; POLICE_OFFICERS.length = 0; ROADBLOCKS.length = 0; HELI = null;
    initMissions();
    startMission(MISSION_INDEX);
    STATE = "MISSION_DIALOG";
    DAY_TIME = 0.35;
}

function findPlayerSpawn() {
    let best = CITY.roadSpawns[0];
    const cx = CITY.worldW / 2, cy = CITY.worldH / 2;
    let bestD = 1e9;
    for (const sp of CITY.roadSpawns) {
        const d = Math.hypot(sp.x - cx, sp.y - cy);
        if (d < bestD) { bestD = d; best = sp; }
    }
    return best;
}

window.GAME = { startNewGame, continueGame, state: () => STATE, onRespawn: null };

Object.defineProperty(window, "SHOT_RECENT", { get: () => SHOT_RECENT, set: (v) => { SHOT_RECENT = v; } });
Object.defineProperty(window, "STATE", { get: () => STATE, set: (v) => { STATE = v; } });
Object.defineProperty(window, "CASH", { get: () => CASH, set: (v) => { CASH = v; } });
Object.defineProperty(window, "WANTED", { get: () => WANTED, set: (v) => { WANTED = v; } });
Object.defineProperty(window, "DAY_TIME", { get: () => DAY_TIME, set: (v) => { DAY_TIME = v; } });
Object.defineProperty(window, "FROZEN", { get: () => FROZEN, set: (v) => { FROZEN = v; } });
Object.defineProperty(window, "SHOT_MODE", { get: () => SHOT_MODE, set: (v) => { SHOT_MODE = v; } });
Object.defineProperty(window, "SHOT_TIMER", { get: () => SHOT_TIMER, set: (v) => { SHOT_TIMER = v; } });
Object.defineProperty(window, "SHOT_READY_FIRED", { get: () => SHOT_READY_FIRED, set: (v) => { SHOT_READY_FIRED = v; } });
Object.defineProperty(window, "MISSION_INDEX", { get: () => MISSION_INDEX, set: (v) => { MISSION_INDEX = v; } });

if (SHOT_NAME) {
    setTimeout(() => { setupShot(SHOT_NAME); }, 50);
}

setTimeout(() => { if (window.startLoop) window.startLoop(); }, 100);
