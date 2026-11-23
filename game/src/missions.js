// The campaign is a list of ten jobs that carries the player from
// Marisol's early errands toward the rivalry and finale with Rex.
// Each job pairs a speaker and briefing with a payout and ordered tasks.
//
// A task's type tells the update loop what counts as success.
// Reaching a place, taking a marked ride, dropping off several cars,
// staying alive, escaping pursuit, collecting an item, or clearing
// race checkpoints each use their own completion rule. Optional fields
// add details such as a timer, arrival radius, heat, or vehicle condition.
//
// Only one task is active at a time. When it finishes, setup prepares
// the next task and resets the counters or countdowns that belong to it.
// That keeps the story moving in a defined order while allowing each
// job to combine different kinds of play in a single short sequence.
//
// A map marker follows the active destination; marked cars can move,
// and a race points toward its next checkpoint as the route advances.
// Some tasks create extra world objects, such as a getaway car or ambush,
// so their marker and encounter begin with the task itself.
//
// The payout is granted after the final task, then a short completion
// beat separates that job from the next briefing. The mission position
// is stored in browser storage when the chain advances, allowing later
// play to resume from the saved chapter rather than the opening job.
// Timers and counters serve the current run and are prepared anew on task setup.
// Marisol's jobs and Rex Costa's challenge form a ten chapter coastal story.
// Every objective is a typed step, which keeps markers, timers, and rewards in sync.
// Progress lives in local storage; the active briefing can still be replayed.
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
  const width = CITY.worldW;
  const height = CITY.worldH;
  const place = (x, y) => ({ x: width * x, y: height * y });
  const cafe = place(0.40, 0.32);
  const docks = place(0.78, 0.82);
  const pickup = place(0.22, 0.62);
  const delivery = place(0.55, 0.48);
  const villa = place(0.16, 0.20);
  const impound = place(0.72, 0.55);
  const rivalVilla = place(0.82, 0.22);
  const waterfront = place(0.50, 0.88);
  const docksTwo = place(0.70, 0.75);
  const safehouse = place(0.25, 0.35);
  const checkpoints = [place(0.30, 0.70), place(0.60, 0.40), place(0.85, 0.60), place(0.50, 0.50)];

  MISSIONS = [
    {
      id: "m1", title: "Welcome to Pacificora", speaker: "Marisol",
      briefingLines: ['Marisol: "You made it to the coast, kid."', 'Marisol: "Walk to my cafe in Costa Vista. I\'ll be waiting."'],
      reward: 100,
      steps: [{ type: "goto", x: cafe.x, y: cafe.y, radius: 50, label: "Go to Marisol's cafe" }],
    },
    {
      id: "m2", title: "Borrowed Rides", speaker: "Marisol",
      briefingLines: ['Marisol: "I need a sedan. Borrow one from the street."', 'Marisol: "Deliver it to the docks garage. Don\'t scratch it."'],
      reward: 500,
      steps: [
        { type: "stealCar", targetType: "sedan", spawnX: width * 0.5, spawnY: height * 0.4, label: "Steal the marked sedan" },
        { type: "deliver", x: docks.x, y: docks.y, radius: 60, requireVehicle: true, label: "Deliver to docks garage" },
      ],
    },
    {
      id: "m3", title: "Cash Run", speaker: "Marisol",
      briefingLines: ['Marisol: "Pick up a package, deliver it fast."', 'Marisol: "Timer starts on pickup. Don\'t be late."'],
      reward: 750,
      steps: [
        { type: "goto", x: pickup.x, y: pickup.y, radius: 45, label: "Pick up the package" },
        { type: "deliver", x: delivery.x, y: delivery.y, radius: 50, timer: 90, label: "Deliver under 90s" },
      ],
    },
    {
      id: "m4", title: "Heat", speaker: "Marisol",
      briefingLines: ['Marisol: "This delivery is hot. Police will come."', 'Marisol: "Deliver, then lose the heat."'],
      reward: 1200,
      steps: [
        { type: "goto", x: pickup.x + 60, y: pickup.y - 40, radius: 45, label: "Pick up the hot package" },
        { type: "deliver", x: delivery.x + 80, y: delivery.y + 40, radius: 50, timer: 120, heat: true, label: "Deliver the hot package" },
        { type: "evade", label: "Evade police until heat clears" },
      ],
    },
    {
      id: "m5", title: "Promotion", speaker: "Marisol",
      briefingLines: ['Marisol: "You\'ve earned a visit to the villa."', 'Marisol: "Drive up the hill. Stage two awaits."'],
      reward: 2000,
      steps: [{ type: "goto", x: villa.x, y: villa.y, radius: 60, requireVehicle: false, label: "Drive to the villa" }],
    },
    {
      id: "m6", title: "Tow Trouble", speaker: "Marisol",
      briefingLines: ['Marisol: "We need cars cleared off the street."', 'Marisol: "Steal the tow truck, drop 3 cars at the impound."'],
      reward: 2500,
      steps: [
        { type: "stealCar", targetType: "tow", spawnX: width * 0.45, spawnY: height * 0.5, label: "Steal the marked tow truck" },
        { type: "deliverMany", x: impound.x, y: impound.y, radius: 60, count: 3, label: "Deliver cars to impound (0/3)" },
      ],
    },
    {
      id: "m7", title: "Villa Invitation", speaker: "Rex Costa",
      briefingLines: ['Rex Costa: "Welcome to my villa, friend."', 'Rex Costa: "I hope you brought your gun."'],
      reward: 3000,
      steps: [
        { type: "goto", x: rivalVilla.x, y: rivalVilla.y, radius: 60, label: "Meet Rex Costa at the villa" },
        { type: "survive", timer: 30, label: "Survive the ambush (30s)" },
      ],
    },
    {
      id: "m8", title: "Coastal Courier", speaker: "Marisol",
      briefingLines: ['Marisol: "Run the waterfront fast."', 'Marisol: "Police are already hot. Keep moving."'],
      reward: 3500,
      steps: [{ type: "courier", x: waterfront.x, y: waterfront.y, radius: 50, timer: 75, heat: 2, label: "Reach the waterfront" }],
    },
    {
      id: "m9", title: "The Big Swap", speaker: "Marisol",
      briefingLines: ['Marisol: "Docks. Pick up the case on foot."', 'Marisol: "4-star response. Use the staged getaway car."'],
      reward: 4500,
      steps: [
        { type: "goto", x: docksTwo.x, y: docksTwo.y, radius: 45, requireVehicle: false, label: "Go to the docks on foot" },
        { type: "pickup", x: docksTwo.x, y: docksTwo.y, radius: 40, label: "Pick up the case" },
        { type: "escape", x: safehouse.x, y: safehouse.y, radius: 50, heat: 4, label: "Escape to the safehouse" },
      ],
    },
    {
      id: "m10", title: "Sunset Kingdom", speaker: "Rex Costa",
      briefingLines: ['Rex Costa: "Race me across three districts."', 'Rex Costa: "Winner takes the coast."'],
      reward: 6000,
      steps: [{ type: "race", checkpoints, timer: 180, label: "Win the checkpoint race" }],
    },
  ];
  window.MISSIONS = MISSIONS;
}

function initMissions() {
  buildMissions();
  MISSION_INDEX = loadMissionIndex();
  if (MISSION_INDEX >= MISSIONS.length) {
    MISSION_INDEX = MISSIONS.length - 1;
    CITY_HERO = true;
  }
  MISSION_COMPLETE_TIMER = 0;
  DROPOFF_COUNT = 0;
  RACE_CP = 0;
  SIDE_JOB = null;
  AMBUSH_LEFT = 0;
}

function loadMissionIndex() {
  try {
    const value = localStorage.getItem("sc_mission");
    return value ? parseInt(value, 10) : 0;
  } catch (error) { return 0; }
}

function saveMissionIndex() {
  try { localStorage.setItem("sc_mission", String(MISSION_INDEX)); } catch (error) {}
}

function startMission(index) {
  if (index >= MISSIONS.length) {
    index = MISSIONS.length - 1;
    CITY_HERO = true;
  }
  MISSION_INDEX = index;
  CURRENT_MISSION = MISSIONS[index];
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
    const markedCar = spawnVehicle(step.targetType || "sedan", step.spawnX, step.spawnY, 0, { ai: false });
    markedCar.color = step.targetType === "tow" ? "#f39c12" : "#ff4444";
    STEAL_TARGET_ID = markedCar.id;
    MISSION_MARKER = { x: markedCar.x, y: markedCar.y };
  }
  if (step.type === "deliverMany") {
    DROPOFF_COUNT = 0;
    step.label = "Deliver cars to impound (0/" + step.count + ")";
  }
  if (step.type === "race") {
    RACE_CHECKPOINTS = step.checkpoints.map((checkpoint) => ({ x: checkpoint.x, y: checkpoint.y }));
    RACE_CP = 0;
    MISSION_MARKER = { x: RACE_CHECKPOINTS[0].x, y: RACE_CHECKPOINTS[0].y };
  }
  if ((step.type === "escape" || step.type === "courier") && step.heat) WANTED = step.heat;
  if (step.type === "survive") {
    AMBUSH_LEFT = step.timer || 30;
    spawnAmbush();
  }
  if (step.timer) MISSION_TIMER = step.timer;
  if (step.type === "pickup") {
    const getaway = spawnVehicle("sports", step.x + 120, step.y + 60, 0, { ai: false });
    getaway.color = "#7fd67f";
  }
}

function spawnAmbush() {
  const player = getPlayerPos();
  for (let officer = 0; officer < 6; officer++) {
    const angle = officer / 6 * Math.PI * 2;
    POLICE_OFFICERS.push({
      x: player.x + Math.cos(angle) * 180,
      y: player.y + Math.sin(angle) * 180,
      angle: angle + Math.PI, health: 80, shootCd: 0.5, speed: 90,
    });
  }
  for (let car = 0; car < 2; car++) {
    const road = pickRoadSpawnNear(player.x, player.y, 200, 400);
    if (road) {
      const patrol = spawnVehicle("police", road.x, road.y, 0, { ai: true });
      patrol.isPolice = true;
    }
  }
}

function currentStep() {
  return CURRENT_MISSION ? CURRENT_MISSION.steps[STEP_INDEX] : null;
}

function stepDistance(step) {
  if (PLAYER.onFoot) return Math.hypot(PLAYER.x - step.x, PLAYER.y - step.y);
  const ride = VEHICLES.find((vehicle) => vehicle.id === PLAYER.vehicleId);
  return ride ? Math.hypot(ride.x - step.x, ride.y - step.y) : 9999;
}

function finishMissionStep() {
  STEP_INDEX++;
  if (STEP_INDEX < CURRENT_MISSION.steps.length) {
    setupStep(CURRENT_MISSION.steps[STEP_INDEX]);
    return;
  }
  CASH += CURRENT_MISSION.reward;
  MISSION_COMPLETE_TIMER = 3;
  saveGame();
  if (window.playMissionComplete) playMissionComplete();
}

function updateMissions(dt) {
  if (STATE !== "PLAYING") return;
  if (!CURRENT_MISSION) {
    startMission(MISSION_INDEX);
    STATE = "PLAYING";
    return;
  }
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
    const target = VEHICLES.find((vehicle) => vehicle.id === STEAL_TARGET_ID);
    if (target) MISSION_MARKER = { x: target.x, y: target.y };
  }
  if (step.type === "deliverMany") {
    step.label = "Deliver cars to impound (" + DROPOFF_COUNT + "/" + step.count + ")";
    MISSION_MARKER = { x: step.x, y: step.y };
  }
  if (step.type === "race" && RACE_CP < RACE_CHECKPOINTS.length) {
    MISSION_MARKER = { x: RACE_CHECKPOINTS[RACE_CP].x, y: RACE_CHECKPOINTS[RACE_CP].y };
  }

  if (step.timer && MISSION_TIMER > 0) {
    if (step.type === "survive") {
      AMBUSH_LEFT -= dt;
      MISSION_TIMER = AMBUSH_LEFT;
      if (AMBUSH_LEFT <= 0) {
        AMBUSH_LEFT = 0;
        finishMissionStep();
        return;
      }
    } else {
      MISSION_TIMER -= dt;
      if (MISSION_TIMER <= 0) MISSION_TIMER = step.timer;
    }
  }

  let complete = false;
  if (step.type === "goto") complete = stepDistance(step) < (step.radius || 50);
  else if (step.type === "stealCar") complete = !PLAYER.onFoot && PLAYER.vehicleId === STEAL_TARGET_ID;
  else if (step.type === "deliver") {
    const ride = !PLAYER.onFoot ? VEHICLES.find((vehicle) => vehicle.id === PLAYER.vehicleId) : null;
    complete = !!ride && Math.hypot(ride.x - step.x, ride.y - step.y) < (step.radius || 50);
    if (step.heat && complete) WANTED = step.heat === true ? 2 : step.heat;
  } else if (step.type === "evade") complete = WANTED <= 0;
  else if (step.type === "deliverMany") {
    const ride = !PLAYER.onFoot ? VEHICLES.find((vehicle) => vehicle.id === PLAYER.vehicleId) : null;
    if (ride && Math.hypot(ride.x - step.x, ride.y - step.y) < (step.radius || 50)) {
      if (!step._justCounted) { DROPOFF_COUNT++; step._justCounted = true; }
    } else step._justCounted = false;
    complete = DROPOFF_COUNT >= step.count;
  } else if (step.type === "courier" || step.type === "escape") {
    complete = stepDistance(step) < (step.radius || 50);
  } else if (step.type === "pickup") {
    complete = PLAYER.onFoot && Math.hypot(PLAYER.x - step.x, PLAYER.y - step.y) < (step.radius || 50);
  } else if (step.type === "race") {
    const ride = VEHICLES.find((vehicle) => vehicle.id === PLAYER.vehicleId);
    const position = PLAYER.onFoot ? PLAYER : (ride || PLAYER);
    if (RACE_CP < RACE_CHECKPOINTS.length) {
      const checkpoint = RACE_CHECKPOINTS[RACE_CP];
      if (Math.hypot(position.x - checkpoint.x, position.y - checkpoint.y) < 40) {
        RACE_CP++;
        complete = RACE_CP >= RACE_CHECKPOINTS.length;
      }
    }
  }

  if (complete) {
    if ((step.type === "courier" || step.type === "deliver") && step.heat) {
      WANTED = step.heat === true ? 2 : step.heat;
    }
    finishMissionStep();
  }
}

function getMissionMarker() {
  return MISSION_COMPLETE_TIMER > 0 ? null : MISSION_MARKER;
}

function advanceDialogue() {
  if (!CURRENT_MISSION) return;
  DIALOGUE_LINE++;
  if (DIALOGUE_LINE >= CURRENT_MISSION.briefingLines.length) STATE = "PLAYING";
}

window.MISSIONS = MISSIONS;
window.initMissions = initMissions;
window.startMission = startMission;
window.updateMissions = updateMissions;
window.getMissionMarker = getMissionMarker;
window.advanceDialogue = advanceDialogue;
window.MISSION_COMPLETE_TIMER = MISSION_COMPLETE_TIMER;
window.getMissionCompleteTimer = () => MISSION_COMPLETE_TIMER;
window.setMissionCompleteTimer = (time) => { MISSION_COMPLETE_TIMER = time; };
window.CURRENT_MISSION = () => CURRENT_MISSION;
window.STEP_INDEX = () => STEP_INDEX;
window.DIALOGUE_LINE = () => DIALOGUE_LINE;
window.setDialogueLine = (line) => { DIALOGUE_LINE = line; };
window.MISSION_TIMER = () => MISSION_TIMER;
window.setMissionTimer = (time) => { MISSION_TIMER = time; };
window.CITY_HERO = () => CITY_HERO;
window.SIDE_JOB = () => SIDE_JOB;
window.DROPOFF_COUNT = () => DROPOFF_COUNT;
window.RACE_CP = () => RACE_CP;
window.AMBUSH_LEFT = () => AMBUSH_LEFT;
window.MISSION_INDEX = () => MISSION_INDEX;
window.setMissionIndex = (index) => { MISSION_INDEX = index; };
