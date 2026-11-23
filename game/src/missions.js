// missions.js — mission chain + runner
const MISSION_DEFS = [
  {
    id: 'm1', title: 'Welcome to Pacificora',
    briefingLines: [
      'Marisol: "You made it to the coast, kid."',
      'Marisol: "Walk to my cafe in Costa Vista. I\'ll be waiting."',
    ],
    reward: 100,
    steps: [
      { type: 'goto', x: 0, y: 0, radius: 40, label: 'Go to Marisol\'s cafe' }, // positions set in init
    ],
  },
];

// We'll build positions after CITY exists. Rebuild mission list in initMissions().
let MISSIONS = [];
let MISSION_INDEX = 0;
let CURRENT_MISSION = null;
let STEP_INDEX = 0;
let MISSION_TIMER = 0;
let MISSION_COMPLETE_TIMER = 0;
let MISSION_MARKER = null; // {x,y}
let STEAL_TARGET_ID = null;

function buildMissions() {
  const W = CITY.worldW, H = CITY.worldH;
  const cafe = { x: W * 0.40, y: H * 0.32 };
  const docks = { x: W * 0.78, y: H * 0.82 };
  const pickup = { x: W * 0.22, y: H * 0.62 };
  const delivery = { x: W * 0.55, y: H * 0.48 };
  const villa = { x: W * 0.16, y: H * 0.20 };
  MISSIONS = [
    {
      id: 'm1', title: 'Welcome to Pacificora',
      briefingLines: ['Marisol: "You made it to the coast, kid."', 'Marisol: "Walk to my cafe in Costa Vista. I\'ll be waiting."'],
      reward: 100,
      steps: [{ type: 'goto', x: cafe.x, y: cafe.y, radius: 50, label: 'Go to Marisol\'s cafe' }],
    },
    {
      id: 'm2', title: 'Borrowed Rides',
      briefingLines: ['Marisol: "I need a sedan. Borrow one from the street."', 'Marisol: "Deliver it to the docks garage. Don\'t scratch it."'],
      reward: 500,
      steps: [
        { type: 'stealCar', targetType: 'sedan', spawnX: W * 0.5, spawnY: H * 0.4, label: 'Steal the marked sedan' },
        { type: 'deliver', x: docks.x, y: docks.y, radius: 60, requireVehicle: true, label: 'Deliver to docks garage' },
      ],
    },
    {
      id: 'm3', title: 'Cash Run',
      briefingLines: ['Marisol: "Pick up a package, deliver it fast."', 'Marisol: "Timer starts on pickup. Don\'t be late."'],
      reward: 750,
      steps: [
        { type: 'goto', x: pickup.x, y: pickup.y, radius: 45, label: 'Pick up the package' },
        { type: 'deliver', x: delivery.x, y: delivery.y, radius: 50, timer: 90, label: 'Deliver under 90s' },
      ],
    },
    {
      id: 'm4', title: 'Heat',
      briefingLines: ['Marisol: "This delivery is hot. Police will come."', 'Marisol: "Deliver, then lose the heat."'],
      reward: 1200,
      steps: [
        { type: 'goto', x: pickup.x + 60, y: pickup.y - 40, radius: 45, label: 'Pick up the hot package' },
        { type: 'deliver', x: delivery.x + 80, y: delivery.y + 40, radius: 50, timer: 120, heat: true, label: 'Deliver the hot package' },
        { type: 'evade', label: 'Evade police until heat clears' },
      ],
    },
    {
      id: 'm5', title: 'Promotion',
      briefingLines: ['Marisol: "You\'ve earned a visit to the villa."', 'Marisol: "Drive up the hill. Stage two awaits."'],
      reward: 2000,
      steps: [
        { type: 'goto', x: villa.x, y: villa.y, radius: 60, requireVehicle: false, label: 'Drive to the villa' },
      ],
    },
  ];
}

function initMissions() {
  buildMissions();
  MISSION_INDEX = loadMissionIndex();
  MISSION_COMPLETE_TIMER = 0;
}

function loadMissionIndex() {
  try { const s = localStorage.getItem('sc_mission'); return s ? parseInt(s, 10) : 0; } catch (e) { return 0; }
}
function saveMissionIndex() { try { localStorage.setItem('sc_mission', String(MISSION_INDEX)); } catch (e) {} }

function startMission(i) {
  if (i >= MISSIONS.length) i = MISSIONS.length - 1;
  MISSION_INDEX = i;
  CURRENT_MISSION = MISSIONS[i];
  STEP_INDEX = 0;
  MISSION_TIMER = 0;
  STEAL_TARGET_ID = null;
  // setup first step
  setupStep(CURRENT_MISSION.steps[0]);
  STATE = 'MISSION_DIALOG';
  DIALOGUE_LINE = 0;
}

function setupStep(step) {
  if (!step) return;
  MISSION_MARKER = step.x != null ? { x: step.x, y: step.y } : null;
  if (step.type === 'stealCar') {
    // spawn marked car
    const v = spawnVehicle(step.targetType || 'sedan', step.spawnX, step.spawnY, 0, { ai: false, driver: null });
    v.color = '#ff4444'; // marked
    STEAL_TARGET_ID = v.id;
    MISSION_MARKER = { x: v.x, y: v.y };
  }
  if (step.timer) MISSION_TIMER = step.timer;
}

function currentStep() {
  if (!CURRENT_MISSION) return null;
  return CURRENT_MISSION.steps[STEP_INDEX];
}

function updateMissions(dt) {
  if (STATE !== 'PLAYING') return;
  if (!CURRENT_MISSION) { startMission(MISSION_INDEX); STATE = 'PLAYING'; /* fallback */ return; }
  if (MISSION_COMPLETE_TIMER > 0) {
    MISSION_COMPLETE_TIMER -= dt;
    if (MISSION_COMPLETE_TIMER <= 0) {
      // advance
      MISSION_INDEX++;
      saveMissionIndex();
      if (MISSION_INDEX < MISSIONS.length) startMission(MISSION_INDEX);
      else { /* all done */ }
    }
    return;
  }
  const step = currentStep();
  if (!step) return;
  // update marker for steal car
  if (step.type === 'stealCar' && STEAL_TARGET_ID != null) {
    const v = VEHICLES.find(x => x.id === STEAL_TARGET_ID);
    if (v) MISSION_MARKER = { x: v.x, y: v.y };
  }
  // timer
  if (step.timer && MISSION_TIMER > 0) {
    MISSION_TIMER -= dt;
    if (MISSION_TIMER <= 0) {
      // fail? just reset step timer
      MISSION_TIMER = step.timer;
    }
  }
  // check completion
  let done = false;
  if (step.type === 'goto') {
    const d = PLAYER.onFoot ? Math.hypot(PLAYER.x - step.x, PLAYER.y - step.y) : (function(){ const v=VEHICLES.find(x=>x.id===PLAYER.vehicleId); return v?Math.hypot(v.x-step.x,v.y-step.y):9999; })();
    if (d < (step.radius || 50)) done = true;
  } else if (step.type === 'stealCar') {
    if (!PLAYER.onFoot && PLAYER.vehicleId === STEAL_TARGET_ID) done = true;
    // also if target car destroyed fail? ignore
  } else if (step.type === 'deliver') {
    if (!PLAYER.onFoot && PLAYER.vehicleId != null) {
      const v = VEHICLES.find(x => x.id === PLAYER.vehicleId);
      if (v && Math.hypot(v.x - step.x, v.y - step.y) < (step.radius || 50)) done = true;
    }
  } else if (step.type === 'evade') {
    if (WANTED <= 0) done = true;
  }
  if (done) {
    // special: heat delivery spawns wanted
    if (step.heat) { WANTED = 2; }
    STEP_INDEX++;
    if (STEP_INDEX >= CURRENT_MISSION.steps.length) {
      // mission complete
      CASH += CURRENT_MISSION.reward;
      MISSION_COMPLETE_TIMER = 3;
      saveGame();
    } else {
      setupStep(CURRENT_MISSION.steps[STEP_INDEX]);
    }
  }
}

function getMissionMarker() {
  if (MISSION_COMPLETE_TIMER > 0) return null;
  return MISSION_MARKER;
}

// dialogue
let DIALOGUE_LINE = 0;
function advanceDialogue() {
  if (!CURRENT_MISSION) return;
  DIALOGUE_LINE++;
  if (DIALOGUE_LINE >= CURRENT_MISSION.briefingLines.length) {
    STATE = 'PLAYING';
  }
}

window.MISSIONS = MISSIONS;
window.initMissions = initMissions;
window.startMission = startMission;
window.updateMissions = updateMissions;
window.getMissionMarker = getMissionMarker;
window.advanceDialogue = advanceDialogue;
window.MISSION_COMPLETE_TIMER = MISSION_COMPLETE_TIMER;
// expose mutable via window for read
window.getMissionCompleteTimer = () => MISSION_COMPLETE_TIMER;
window.setMissionCompleteTimer = (t) => { MISSION_COMPLETE_TIMER = t; };
window.CURRENT_MISSION = () => CURRENT_MISSION;
window.STEP_INDEX = () => STEP_INDEX;
window.DIALOGUE_LINE = () => DIALOGUE_LINE;
window.setDialogueLine = (n) => { DIALOGUE_LINE = n; };
window.MISSION_TIMER = () => MISSION_TIMER;
window.setMissionTimer = (t) => { MISSION_TIMER = t; };
