// missions.js - story chain and mission runner (Marisol / Rex Costa)
// Ten story missions chain from Marisol's cafe to Rex Costa's race.
// Each mission is a list of typed steps with markers and rewards.
// Progress persists through localStorage mission index.
let MISSIONS = [];
let MISSION_INDEX = 0;
let CURRENT_MISSION = null;
let STEP_INDEX = 0;
let MISSION_TIMER = 0;
let MISSION_COMPLETE_TIMER = 0;
let MISSION_MARKER = null;
let STEAL_TARGET_ID = null;
let DIALOGUE_LINE = 0;
let DROPOFF_COUNT = 0;
let RACE_CP = 0;
let RACE_CHECKPOINTS = [];
let SIDE_JOB = null;
let CITY_HERO = false;
let AMBUSH_LEFT = 0;

function buildMissions() {
    const W = CITY.worldW, H = CITY.worldH;
    const cafe = { x: W * 0.40, y: H * 0.32 };
    const docks = { x: W * 0.78, y: H * 0.82 };
    const pickup = { x: W * 0.22, y: H * 0.62 };
    const delivery = { x: W * 0.55, y: H * 0.48 };
    const villa = { x: W * 0.16, y: H * 0.20 };
    const impound = { x: W * 0.72, y: H * 0.55 };
    const rivalVilla = { x: W * 0.82, y: H * 0.22 };
    const waterfront = { x: W * 0.5, y: H * 0.88 };
    const docks2 = { x: W * 0.7, y: H * 0.75 };
    const safehouse = { x: W * 0.25, y: H * 0.35 };
    const cp1 = { x: W * 0.3, y: H * 0.7 };
    const cp2 = { x: W * 0.6, y: H * 0.4 };
    const cp3 = { x: W * 0.85, y: H * 0.6 };
    const finish = { x: W * 0.5, y: H * 0.5 };

    MISSIONS = [
        { id: "m1", title: "Welcome to Pacificora", speaker: "Marisol",
            briefingLines: ['Marisol: "You made it to the coast, kid."', 'Marisol: "Walk to my cafe in Costa Vista. I\'ll be waiting."'],
            reward: 100, steps: [{ type: "goto", x: cafe.x, y: cafe.y, radius: 50, label: "Go to Marisol's cafe" }] },
        { id: "m2", title: "Borrowed Rides", speaker: "Marisol",
            briefingLines: ['Marisol: "I need a sedan. Borrow one from the street."', 'Marisol: "Deliver it to the docks garage. Don\'t scratch it."'],
            reward: 500, steps: [
                { type: "stealCar", targetType: "sedan", spawnX: W * 0.5, spawnY: H * 0.4, label: "Steal the marked sedan" },
                { type: "deliver", x: docks.x, y: docks.y, radius: 60, requireVehicle: true, label: "Deliver to docks garage" },
            ] },
        { id: "m3", title: "Cash Run", speaker: "Marisol",
            briefingLines: ['Marisol: "Pick up a package, deliver it fast."', 'Marisol: "Timer starts on pickup. Don\'t be late."'],
            reward: 750, steps: [
                { type: "goto", x: pickup.x, y: pickup.y, radius: 45, label: "Pick up the package" },
                { type: "deliver", x: delivery.x, y: delivery.y, radius: 50, timer: 90, label: "Deliver under 90s" },
            ] },
        { id: "m4", title: "Heat", speaker: "Marisol",
            briefingLines: ['Marisol: "This delivery is hot. Police will come."', 'Marisol: "Deliver, then lose the heat."'],
            reward: 1200, steps: [
                { type: "goto", x: pickup.x + 60, y: pickup.y - 40, radius: 45, label: "Pick up the hot package" },
                { type: "deliver", x: delivery.x + 80, y: delivery.y + 40, radius: 50, timer: 120, heat: true, label: "Deliver the hot package" },
                { type: "evade", label: "Evade police until heat clears" },
            ] },
        { id: "m5", title: "Promotion", speaker: "Marisol",
            briefingLines: ['Marisol: "You\'ve earned a visit to the villa."', 'Marisol: "Drive up the hill. Stage two awaits."'],
            reward: 2000, steps: [{ type: "goto", x: villa.x, y: villa.y, radius: 60, requireVehicle: false, label: "Drive to the villa" }] },

        { id: "m6", title: "Tow Trouble", speaker: "Marisol",
            briefingLines: ['Marisol: "We need cars cleared off the street."', 'Marisol: "Steal the tow truck, drop 3 cars at the impound."'],
            reward: 2500, steps: [
                { type: "stealCar", targetType: "tow", spawnX: W * 0.45, spawnY: H * 0.5, label: "Steal the marked tow truck" },
                { type: "deliverMany", x: impound.x, y: impound.y, radius: 60, count: 3, label: "Deliver cars to impound (0/3)" },
            ] },
        { id: "m7", title: "Villa Invitation", speaker: "Rex Costa",
            briefingLines: ['Rex Costa: "Welcome to my villa, friend."', 'Rex Costa: "I hope you brought your gun."'],
            reward: 3000, steps: [
                { type: "goto", x: rivalVilla.x, y: rivalVilla.y, radius: 60, label: "Meet Rex Costa at the villa" },
                { type: "survive", timer: 30, label: "Survive the ambush (30s)" },
            ] },
        { id: "m8", title: "Coastal Courier", speaker: "Marisol",
            briefingLines: ['Marisol: "Run the waterfront fast."', 'Marisol: "Police are already hot. Keep moving."'],
            reward: 3500, steps: [
                { type: "courier", x: waterfront.x, y: waterfront.y, radius: 50, timer: 75, heat: 2, label: "Reach the waterfront" },
            ] },
        { id: "m9", title: "The Big Swap", speaker: "Marisol",
            briefingLines: ['Marisol: "Docks. Pick up the case on foot."', 'Marisol: "4-star response. Use the staged getaway car."'],
            reward: 4500, steps: [
                { type: "goto", x: docks2.x, y: docks2.y, radius: 45, requireVehicle: false, label: "Go to the docks on foot" },
                { type: "pickup", x: docks2.x, y: docks2.y, radius: 40, label: "Pick up the case" },
                { type: "escape", x: safehouse.x, y: safehouse.y, radius: 50, heat: 4, label: "Escape to the safehouse" },
            ] },
        { id: "m10", title: "Sunset Kingdom", speaker: "Rex Costa",
            briefingLines: ['Rex Costa: "Race me across three districts."', 'Rex Costa: "Winner takes the coast."'],
            reward: 6000, steps: [
                { type: "race", checkpoints: [cp1, cp2, cp3, finish], timer: 180, label: "Win the checkpoint race" },
            ] },
    ];
}

function initMissions() {
    buildMissions();
    MISSION_INDEX = loadMissionIndex();
    if (MISSION_INDEX >= MISSIONS.length) { MISSION_INDEX = MISSIONS.length - 1; CITY_HERO = true; }
    MISSION_COMPLETE_TIMER = 0;
    DROPOFF_COUNT = 0; RACE_CP = 0; SIDE_JOB = null; AMBUSH_LEFT = 0;
}

function loadMissionIndex() { try { const s = localStorage.getItem("sc_mission"); return s ? parseInt(s, 10) : 0; } catch (e) { return 0; } }
function saveMissionIndex() { try { localStorage.setItem("sc_mission", String(MISSION_INDEX)); } catch (e) {} }

function startMission(i) {
    if (i >= MISSIONS.length) { i = MISSIONS.length - 1; CITY_HERO = true; }
    MISSION_INDEX = i;
    CURRENT_MISSION = MISSIONS[i];
    STEP_INDEX = 0;
    MISSION_TIMER = 0;
    STEAL_TARGET_ID = null;
    DROPOFF_COUNT = 0;
    RACE_CP = 0;
    RACE_CHECKPOINTS = [];
    AMBUSH_LEFT = 0;
    setupStep(CURRENT_MISSION.steps[0]);
    STATE = "MISSION_DIALOG";
    DIALOGUE_LINE = 0;
    if (window.setDialogueLine) window.setDialogueLine(0);
}

function setupStep(step) {
    if (!step) return;
    MISSION_MARKER = step.x != null ? { x: step.x, y: step.y } : null;
    if (step.type === "stealCar") {
        const v = spawnVehicle(step.targetType || "sedan", step.spawnX, step.spawnY, 0, { ai: false, driver: null });
        if (step.targetType === "tow") v.color = "#f39c12";
        else v.color = "#ff4444";
        STEAL_TARGET_ID = v.id;
        MISSION_MARKER = { x: v.x, y: v.y };
    }
    if (step.type === "deliverMany") {
        DROPOFF_COUNT = 0;
        step.label = "Deliver cars to impound (0/" + step.count + ")";
    }
    if (step.type === "race") {
        RACE_CHECKPOINTS = step.checkpoints.map(c => ({ x: c.x, y: c.y }));
        RACE_CP = 0;
        MISSION_MARKER = { x: RACE_CHECKPOINTS[0].x, y: RACE_CHECKPOINTS[0].y };
    }
    if (step.type === "escape" && step.heat) { WANTED = step.heat; }
    if (step.type === "courier" && step.heat) { WANTED = step.heat; }
    if (step.type === "survive") { AMBUSH_LEFT = step.timer || 30; spawnAmbush(); }
    if (step.timer) MISSION_TIMER = step.timer;
    if (step.type === "pickup") {
        const v = spawnVehicle("sports", step.x + 120, step.y + 60, 0, { ai: false, driver: null });
        v.color = "#7fd67f";
    }
}

function spawnAmbush() {
    const pp = getPlayerPos();
    for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const x = pp.x + Math.cos(ang) * 180;
        const y = pp.y + Math.sin(ang) * 180;
        POLICE_OFFICERS.push({ x, y, angle: ang + Math.PI, health: 80, shootCd: 0.5, speed: 90 });
    }
    for (let i = 0; i < 2; i++) {
        const sp = pickRoadSpawnNear(pp.x, pp.y, 200, 400);
        if (sp) {
            const v = spawnVehicle("police", sp.x, sp.y, 0, { ai: true });
            v.isPolice = true;
        }
    }
}

function currentStep() { if (!CURRENT_MISSION) return null; return CURRENT_MISSION.steps[STEP_INDEX]; }

function updateMissions(dt) {
    if (STATE !== "PLAYING") return;
    if (!CURRENT_MISSION) { startMission(MISSION_INDEX); STATE = "PLAYING"; return; }
    if (MISSION_COMPLETE_TIMER > 0) {
        MISSION_COMPLETE_TIMER -= dt;
        if (MISSION_COMPLETE_TIMER <= 0) {
            MISSION_INDEX++;
            saveMissionIndex();
            if (MISSION_INDEX < MISSIONS.length) startMission(MISSION_INDEX);
            else {
                CITY_HERO = true;
                SIDE_JOB = { type: "taxi", active: false };
            }
        }
        return;
    }
    const step = currentStep();
    if (!step) return;

    if (step.type === "stealCar" && STEAL_TARGET_ID != null) {
        const v = VEHICLES.find(x => x.id === STEAL_TARGET_ID);
        if (v) MISSION_MARKER = { x: v.x, y: v.y };
    }
    if (step.type === "deliverMany") {
        step.label = "Deliver cars to impound (" + DROPOFF_COUNT + "/" + step.count + ")";
        MISSION_MARKER = { x: step.x, y: step.y };
    }
    if (step.type === "race") {
        if (RACE_CP < RACE_CHECKPOINTS.length) MISSION_MARKER = { x: RACE_CHECKPOINTS[RACE_CP].x, y: RACE_CHECKPOINTS[RACE_CP].y };
    }

    if (step.timer && MISSION_TIMER > 0) {
        if (step.type === "survive") {
            AMBUSH_LEFT -= dt;
            MISSION_TIMER = AMBUSH_LEFT;
            if (AMBUSH_LEFT <= 0) {
                AMBUSH_LEFT = 0;
                STEP_INDEX++;
                if (STEP_INDEX >= CURRENT_MISSION.steps.length) {
                    CASH += CURRENT_MISSION.reward;
                    MISSION_COMPLETE_TIMER = 3;
                    saveGame();
                    if (window.playMissionComplete) playMissionComplete();
                } else setupStep(CURRENT_MISSION.steps[STEP_INDEX]);
                return;
            }
        } else {
            MISSION_TIMER -= dt;
            if (MISSION_TIMER <= 0) {
                MISSION_TIMER = step.timer;
            }
        }
    }

    let done = false;
    if (step.type === "goto") {
        const d = PLAYER.onFoot ? Math.hypot(PLAYER.x - step.x, PLAYER.y - step.y) : (function(){ const v = VEHICLES.find(x => x.id === PLAYER.vehicleId); return v ? Math.hypot(v.x - step.x, v.y - step.y) : 9999; })();
        if (d < (step.radius || 50)) done = true;
    } else if (step.type === "stealCar") {
        if (!PLAYER.onFoot && PLAYER.vehicleId === STEAL_TARGET_ID) done = true;
    } else if (step.type === "deliver") {
        if (!PLAYER.onFoot && PLAYER.vehicleId != null) {
            const v = VEHICLES.find(x => x.id === PLAYER.vehicleId);
            if (v && Math.hypot(v.x - step.x, v.y - step.y) < (step.radius || 50)) done = true;
        }
        if (step.heat && done) { WANTED = step.heat === true ? 2 : step.heat; }
    } else if (step.type === "evade") {
        if (WANTED <= 0) done = true;
    } else if (step.type === "deliverMany") {
        if (!PLAYER.onFoot && PLAYER.vehicleId != null) {
            const v = VEHICLES.find(x => x.id === PLAYER.vehicleId);
            if (v && Math.hypot(v.x - step.x, v.y - step.y) < (step.radius || 50)) {
                if (!step._justCounted) {
                    DROPOFF_COUNT++;
                    step._justCounted = true;
                }
            } else {
                step._justCounted = false;
            }
            if (DROPOFF_COUNT >= step.count) done = true;
        }
    } else if (step.type === "survive") {
    } else if (step.type === "courier") {
        const d = PLAYER.onFoot ? Math.hypot(PLAYER.x - step.x, PLAYER.y - step.y) : (function(){ const v = VEHICLES.find(x => x.id === PLAYER.vehicleId); return v ? Math.hypot(v.x - step.x, v.y - step.y) : 9999; })();
        if (d < (step.radius || 50)) done = true;
    } else if (step.type === "pickup") {
        const d = PLAYER.onFoot ? Math.hypot(PLAYER.x - step.x, PLAYER.y - step.y) : 9999;
        if (d < (step.radius || 50)) done = true;
    } else if (step.type === "escape") {
        const d = PLAYER.onFoot ? Math.hypot(PLAYER.x - step.x, PLAYER.y - step.y) : (function(){ const v = VEHICLES.find(x => x.id === PLAYER.vehicleId); return v ? Math.hypot(v.x - step.x, v.y - step.y) : 9999; })();
        if (d < (step.radius || 50)) done = true;
    } else if (step.type === "race") {
        const pp = PLAYER.onFoot ? { x: PLAYER.x, y: PLAYER.y } : (VEHICLES.find(x => x.id === PLAYER.vehicleId) || { x: PLAYER.x, y: PLAYER.y });
        if (RACE_CP < RACE_CHECKPOINTS.length) {
            const cp = RACE_CHECKPOINTS[RACE_CP];
            if (Math.hypot(pp.x - cp.x, pp.y - cp.y) < 40) {
                RACE_CP++;
                if (RACE_CP >= RACE_CHECKPOINTS.length) done = true;
            }
        }
    }

    if (done) {
        if (step.heat && (step.type === "courier")) { WANTED = (step.heat === true ? 2 : step.heat); }
        if (step.type === "deliver" && step.heat) { WANTED = (step.heat === true ? 2 : step.heat); }
        STEP_INDEX++;
        if (STEP_INDEX >= CURRENT_MISSION.steps.length) {
            CASH += CURRENT_MISSION.reward;
            MISSION_COMPLETE_TIMER = 3;
            saveGame();
            if (window.playMissionComplete) playMissionComplete();
        } else {
            setupStep(CURRENT_MISSION.steps[STEP_INDEX]);
        }
    }
}

function getMissionMarker() {
    if (MISSION_COMPLETE_TIMER > 0) return null;
    return MISSION_MARKER;
}

function advanceDialogue() {
    if (!CURRENT_MISSION) return;
    DIALOGUE_LINE++;
    if (DIALOGUE_LINE >= CURRENT_MISSION.briefingLines.length) {
        STATE = "PLAYING";
    }
}

window.MISSIONS = MISSIONS;
window.initMissions = initMissions;
window.startMission = startMission;
window.updateMissions = updateMissions;
window.getMissionMarker = getMissionMarker;
window.advanceDialogue = advanceDialogue;
window.MISSION_COMPLETE_TIMER = MISSION_COMPLETE_TIMER;
window.getMissionCompleteTimer = () => MISSION_COMPLETE_TIMER;
window.setMissionCompleteTimer = (t) => { MISSION_COMPLETE_TIMER = t; };
window.CURRENT_MISSION = () => CURRENT_MISSION;
window.STEP_INDEX = () => STEP_INDEX;
window.DIALOGUE_LINE = () => DIALOGUE_LINE;
window.setDialogueLine = (n) => { DIALOGUE_LINE = n; };
window.MISSION_TIMER = () => MISSION_TIMER;
window.setMissionTimer = (t) => { MISSION_TIMER = t; };
window.CITY_HERO = () => CITY_HERO;
window.SIDE_JOB = () => SIDE_JOB;
window.DROPOFF_COUNT = () => DROPOFF_COUNT;
window.RACE_CP = () => RACE_CP;
window.AMBUSH_LEFT = () => AMBUSH_LEFT;
window.MISSION_INDEX = () => MISSION_INDEX;
window.setMissionIndex = (i) => { MISSION_INDEX = i; };