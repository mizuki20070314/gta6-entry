// shots.js — deterministic screenshot scenes
function setupShot(name) {
  SHOT_MODE = name;
  SHOT_TIMER = 0;
  SHOT_READY_FIRED = false;
  FROZEN = false;
  // reset world
  CASH = 500; WANTED = 0; BULLETS.length = 0; PARTICLES.length = 0; SKIDMARKS.length = 0; PEDS.length = 0; VEHICLES.length = 0;
  DAY_TIME = 0.35;

  if (name === 'night') DAY_TIME = 0.82;

  // spawn traffic
  // player spawn on a main vertical road
  let spawn = null;
  for (const sp of CITY.roadSpawns) {
    if (sp.x > CITY.worldW * 0.45 && sp.x < CITY.worldW * 0.55) { spawn = sp; break; }
  }
  if (!spawn) spawn = CITY.roadSpawns[0];

  const dur = (name === 'chase') ? 8000 : (name === 'mission' ? 2000 : 10000);
  setTimeout(() => { if (!SHOT_READY_FIRED) fireShotReady(); }, dur);

  if (name === 'mission') {
    initPlayer(spawn.x + 40, spawn.y);
    // setup mission 0 dialog
    initMissions();
    startMission(0);
    STATE = 'MISSION_DIALOG';
    // ensure marker near player
    MISSION_MARKER = { x: spawn.x + 80, y: spawn.y - 60 };
    // override marker
    if (MISSIONS && MISSIONS[0]) MISSIONS[0].steps[0].x = spawn.x + 80;
    MISSIONS[0].steps[0].y = spawn.y - 60;
    MISSION_MARKER = { x: spawn.x + 80, y: spawn.y - 60 };
    CAMERA.x = PLAYER.x - CONFIG.CANVAS_W / 2;
    CAMERA.y = PLAYER.y - CONFIG.CANVAS_H / 2;
    return;
  }

  // driving scenes: put player in sedan
  initPlayer(spawn.x, spawn.y);
  const car = spawnVehicle('sedan', spawn.x, spawn.y, Math.PI / 2, { driver: 'player' });
  PLAYER.onFoot = false;
  PLAYER.vehicleId = car.id;
  PLAYER.x = car.x; PLAYER.y = car.y;
  // traffic
  for (let i = 0; i < 12; i++) {
    const s = CITY.roadSpawns[Math.floor(Math.random() * CITY.roadSpawns.length)];
    if (s) {
      const dir = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
      spawnVehicle('compact', s.x + (Math.random()-0.5)*20, s.y + (Math.random()-0.5)*20, dir, { ai: true, aiDir: dir });
    }
  }
  if (name === 'chase') {
    WANTED = 3;
    // spawn 2 police
    for (let i = 0; i < 2; i++) {
      const s = CITY.roadSpawns[Math.floor(Math.random() * CITY.roadSpawns.length)];
      if (s) {
        const v = spawnVehicle('police', s.x, s.y, Math.PI / 2, { ai: true });
        v.isPolice = true;
      }
    }
    STATE = 'PLAYING';
  } else {
    STATE = 'PLAYING';
  }
  CAMERA.x = car.x - CONFIG.CANVAS_W / 2;
  CAMERA.y = car.y - CONFIG.CANVAS_H / 2;
}

function updateShot(dt) {
  SHOT_TIMER += dt;
  // autopilot
  if (SHOT_MODE === 'city' || SHOT_MODE === 'night' || SHOT_MODE === 'chase') {
    // drive forward
    INPUT.keys['KeyW'] = true;
    INPUT.keys['KeyA'] = false;
    INPUT.keys['KeyD'] = false;
    // keep straight (no steer)
  }
  // duration
  const dur = (SHOT_MODE === 'chase') ? 8 : 10;
  if (SHOT_MODE === 'mission') {
    // no driving; ready after 2s
    if (SHOT_TIMER >= 2 && !SHOT_READY_FIRED) fireShotReady();
  } else {
    if (SHOT_TIMER >= dur && !SHOT_READY_FIRED) fireShotReady();
  }
}

function fireShotReady() {
  SHOT_READY_FIRED = true;
  FROZEN = true;
  window.__SHOT_READY__ = true;
  try { document.body.dataset.shotReady = '1'; } catch (e) {}
  console.log('SHOT_READY_FIRED', SHOT_MODE);
}

window.setupShot = setupShot;
window.updateShot = updateShot;
window.SHOT_MODE = () => SHOT_MODE;
// make SHOT_MODE global readable
window.SHOT_MODE_VAR = SHOT_MODE;
