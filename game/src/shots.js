// shots.js - deterministic screenshot scenes
// Four fixed scenes provide reproducible marketing screenshots.
// Each scene sets up vehicles, police and lighting then freezes.
// SHOT_READY is signaled on document.body for headless capture.
let SHOT_BANNER = null;
window.SHOT_BANNER = SHOT_BANNER;

function setupShot(name) {
    SHOT_MODE = name;
    SHOT_TIMER = 0;
    SHOT_READY_FIRED = false;
    FROZEN = false;
    SHOT_BANNER = null;
    window.SHOT_BANNER = SHOT_BANNER;
    CASH = 500; WANTED = 0; BULLETS.length = 0; PARTICLES.length = 0; SKIDMARKS.length = 0; PEDS.length = 0; VEHICLES.length = 0;
    POLICE_OFFICERS.length = 0; ROADBLOCKS.length = 0; HELI = null;
    DAY_TIME = 0.35;
    if (name === "city") DAY_TIME = 0.5;
    if (name === "night") DAY_TIME = 0.82;
    if (name === "chase") DAY_TIME = 0.72;

    let spawn = null;
    for (const sp of CITY.roadSpawns) {
        if (sp.x > CITY.worldW * 0.45 && sp.x < CITY.worldW * 0.55) { spawn = sp; break; }
    }
    if (!spawn) spawn = CITY.roadSpawns[0];

    const dur = (name === "chase") ? 8 : (name === "mission" ? 2 : 10);
    setTimeout(() => { if (!SHOT_READY_FIRED) fireShotReady(); }, dur * 1000);

    if (name === "mission") {
        initPlayer(spawn.x + 40, spawn.y);
        initMissions();
        startMission(0);
        STATE = "MISSION_DIALOG";
        DIALOGUE_LINE = 0;
        window.setDialogueLine(0);
        MISSION_MARKER = { x: spawn.x + 80, y: spawn.y - 60 };
        if (MISSIONS && MISSIONS[0]) { MISSIONS[0].steps[0].x = spawn.x + 80; MISSIONS[0].steps[0].y = spawn.y - 60; }
        spawnVehicle("sports", spawn.x + 120, spawn.y + 60, 0.3, { ai: false, driver: null });
        CAMERA.x = PLAYER.x - CONFIG.CANVAS_W / 2;
        CAMERA.y = PLAYER.y - CONFIG.CANVAS_H / 2;
        return;
    }

    initPlayer(spawn.x, spawn.y);
    const car = spawnVehicle("sedan", spawn.x, spawn.y, Math.PI / 2, { driver: "player" });
    PLAYER.onFoot = false;
    PLAYER.vehicleId = car.id;
    PLAYER.x = car.x; PLAYER.y = car.y;

    for (let i = 0; i < 14; i++) {
        const s = CITY.roadSpawns[Math.floor(Math.random() * CITY.roadSpawns.length)];
        if (s) {
            const dir = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
            spawnVehicle(["compact", "sedan", "taxi"][Math.floor(Math.random() * 3)], s.x + (Math.random() - 0.5) * 20, s.y + (Math.random() - 0.5) * 20, dir, { ai: true, aiDir: dir });
        }
    }
    for (let i = 0; i < 20; i++) {
        const s = CITY.roadSpawns[Math.floor(Math.random() * CITY.roadSpawns.length)];
        if (s) spawnPed(s.x + (Math.random() - 0.5) * 80, s.y + (Math.random() - 0.5) * 80);
    }

    if (name === "chase") {
        WANTED = 4;
        SHOT_BANNER = "Escape the heat";
        window.SHOT_BANNER = SHOT_BANNER;
        for (let i = 0; i < 3; i++) {
            const s = CITY.roadSpawns[Math.floor(Math.random() * CITY.roadSpawns.length)];
            if (s) { const v = spawnVehicle("police", s.x, s.y, Math.PI / 2, { ai: true }); v.isPolice = true; }
        }
        const s = CITY.roadSpawns[Math.floor(Math.random() * CITY.roadSpawns.length)];
        if (s) { const v = spawnVehicle("swat", s.x, s.y, Math.PI / 2, { ai: true }); v.isPolice = true; }
        ROADBLOCKS.push({ x: spawn.x, y: spawn.y - 300, angle: Math.PI / 2, life: 60 });
        const h = spawnVehicle("helicopter", spawn.x + 200, spawn.y - 200, 0, { ai: true });
        h.isPolice = true; HELI = h;
        STATE = "PLAYING";
    } else {
        STATE = "PLAYING";
    }
    CAMERA.x = car.x - CONFIG.CANVAS_W / 2;
    CAMERA.y = car.y - CONFIG.CANVAS_H / 2;
}

function updateShot(dt) {
    SHOT_TIMER += dt;
    if (SHOT_MODE === "city" || SHOT_MODE === "night" || SHOT_MODE === "chase") {
        INPUT.keys["KeyW"] = true;
        INPUT.keys["KeyA"] = false;
        INPUT.keys["KeyD"] = false;
    }
    const dur = (SHOT_MODE === "chase") ? 8 : (SHOT_MODE === "mission" ? 2 : 10);
    if (SHOT_MODE === "mission") {
        if (SHOT_TIMER >= 2 && !SHOT_READY_FIRED) fireShotReady();
    } else {
        if (SHOT_TIMER >= dur && !SHOT_READY_FIRED) fireShotReady();
    }
}

function fireShotReady() {
    SHOT_READY_FIRED = true;
    FROZEN = true;
    window.__SHOT_READY__ = true;
    try { document.body.dataset.shotReady = "1"; } catch (e) {}
    console.log("SHOT_READY_FIRED", SHOT_MODE);
}

window.setupShot = setupShot;
window.updateShot = updateShot;
window.SHOT_MODE = () => SHOT_MODE;
window.SHOT_BANNER = () => SHOT_BANNER;
window.fireShotReady = fireShotReady;
window.SHOT_BANNER_VAR = () => SHOT_BANNER;