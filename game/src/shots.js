// Capture layouts use the regular actors and drawing paths, with fixed placements.
let SHOT_BANNER = null;
let SHOT_RANDOM_ORIGINAL = null;
let SHOT_BASE_CITY_DRAW = null;
let SHOT_BASE_DIALOGUE_DRAW = null;
let SHOT_BASE_HUD_DRAW = null;
let SHOT_DECOR_ANCHOR = null;
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
  EXPLOSIONS.length = 0;
  MUZZLES.length = 0;
  PEDS.length = 0;
  VEHICLES.length = 0;
  POLICE_OFFICERS.length = 0;
  ROADBLOCKS.length = 0;
  VEHICLE_ID = 1;
  HELI = null;
  MISSION_MARKER = null;
  SHOT_BANNER = null;
  SHOT_DECOR_ANCHOR = null;
  SCREEN_SHAKE.t = 0;
  SCREEN_SHAKE.mag = 0;
  window.SHOT_BANNER = SHOT_BANNER;
}

function shotSetFrameSize() {
  CONFIG.CANVAS_H = 800;
  const canvas = document.getElementById("game");
  canvas.width = CONFIG.CANVAS_W;
  canvas.height = CONFIG.CANVAS_H;
}

function shotSetCamera(worldX, worldY, screenY) {
  CAMERA.x = Math.max(0, Math.min(CITY.worldW - CONFIG.CANVAS_W, worldX - CONFIG.CANVAS_W / 2));
  CAMERA.y = Math.max(0, Math.min(CITY.worldH - CONFIG.CANVAS_H, worldY - screenY));
}

function shotSetBanner(label) {
  SHOT_BANNER = label;
  window.SHOT_BANNER = label;
}

function shotAddVehicle(type, x, y, angle, details) {
  const setup = details || {};
  const vehicle = spawnVehicle(type, x, y, angle, {
    ai: !!setup.ai,
    aiDir: setup.aiDir === undefined ? angle : setup.aiDir,
    driver: setup.driver || null,
    siren: !!setup.siren,
  });
  if (setup.police) vehicle.isPolice = true;
  vehicle.siren = !!setup.siren;
  vehicle.vel = setup.speed || 0;
  return vehicle;
}

function shotAddCrowd(anchor, lateralSpots, rows, reaction) {
  for (const row of rows) {
    for (const offset of lateralSpots) {
      const person = spawnPed(anchor.x + offset, anchor.y + row);
      person.speed = 0;
      person.state = reaction || "walk";
      person.angle = row < 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  }
}

function shotAttachMissionMarker(marker) {
  MISSION_MARKER = { x: marker.x, y: marker.y };
  if (MISSIONS && MISSIONS[0] && MISSIONS[0].steps[0]) {
    MISSIONS[0].steps[0].x = marker.x;
    MISSIONS[0].steps[0].y = marker.y;
  }
}

function shotDrawCity(ctx, camera, day) {
  SHOT_BASE_CITY_DRAW(ctx, camera, day);
  if (SHOT_MODE === "city") shotDrawPalms(ctx, camera);
  if (SHOT_MODE === "night") shotDrawNeon(ctx, camera);
}

function shotDrawHud(ctx, camera) {
  SHOT_BASE_HUD_DRAW(ctx, camera);
  if (SHOT_MODE === "mission") return;
  const position = playerPosition();
  const armor = PLAYER.armor || 0;
  ctx.save();
  ctx.fillStyle = "#15151b";
  ctx.fillRect(12, 40, 220, 36);
  ctx.fillStyle = "#333";
  ctx.fillRect(16, 42, 212, 10);
  ctx.fillStyle = "#9bbcff";
  ctx.fillRect(16, 42, 212 * (armor / 100), 10);
  ctx.fillStyle = "#fff";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("AR " + Math.ceil(armor), 20, 50);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(12, 56, 140, 18);
  ctx.fillStyle = "#f2e9d8";
  ctx.font = "11px sans-serif";
  ctx.fillText(CITY.districtAt(position.x, position.y), 18, 69);
  ctx.restore();
}

function shotInstallHudLayout() {
  if (SHOT_BASE_HUD_DRAW) return;
  SHOT_BASE_HUD_DRAW = window.drawHUD;
  window.drawHUD = shotDrawHud;
}

function shotInstallCityArt() {
  if (SHOT_BASE_CITY_DRAW) return;
  SHOT_BASE_CITY_DRAW = window.drawCity;
  window.drawCity = shotDrawCity;
}

function shotDrawPalm(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = "rgba(18,25,18,0.28)";
  ctx.beginPath(); ctx.ellipse(x + 12, y + 3, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#74502d";
  ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 8, y - 27, x + 3, y - 53); ctx.stroke();
  const crownX = x + 3;
  const crownY = y - 53;
  for (let leaf = 0; leaf <= 8; leaf++) {
    const angle = Math.PI + leaf * Math.PI / 8;
    const reachX = Math.cos(angle) * 48;
    const reachY = Math.sin(angle) * 36;
    ctx.strokeStyle = leaf % 2 ? "#276844" : "#367e4b";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(crownX + reachX * 0.58, crownY + reachY * 0.05, crownX + reachX, crownY + reachY);
    ctx.stroke();
    ctx.strokeStyle = "rgba(163,193,95,0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(crownX, crownY); ctx.lineTo(crownX + reachX, crownY + reachY); ctx.stroke();
  }
  ctx.restore();
}

function shotDrawPalms(ctx, camera) {
  const trees = [
    [-560, -260], [560, -260], [-560, 200], [560, 200],
  ];
  for (const [offsetX, offsetY] of trees) {
    shotDrawPalm(ctx, SHOT_DECOR_ANCHOR.x + offsetX - camera.x,
      SHOT_DECOR_ANCHOR.y + offsetY - camera.y);
  }
}

function shotDrawSign(ctx, x, y, label, color) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = "rgba(13,16,29,0.88)";
  ctx.fillRect(x - 8, y - 18, 140, 34);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 8, y - 18, 140, 34);
  ctx.fillStyle = color;
  ctx.font = "bold 15px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x + 62, y + 5);
  ctx.restore();
}

function shotDrawNeon(ctx, camera) {
  const centerX = SHOT_DECOR_ANCHOR.x - camera.x;
  const centerY = SHOT_DECOR_ANCHOR.y - camera.y;
  shotDrawSign(ctx, centerX - 430, centerY - 270, "MARINA", "#47e8ff");
  shotDrawSign(ctx, centerX + 260, centerY - 245, "OPEN 24H", "#ff54bc");
  shotDrawSign(ctx, centerX - 65, centerY - 365, "SUNSET", "#a78bff");
}

function shotDrawMissionDialog(ctx) {
  SHOT_BASE_DIALOGUE_DRAW(ctx);
  if (SHOT_MODE !== "mission") return;
  drawMinimap(ctx);
  ctx.save();
  ctx.fillStyle = "rgba(242,233,216,0.18)";
  ctx.beginPath(); ctx.arc(258, CONFIG.CANVAS_H - 60, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f2e9d8";
  ctx.textAlign = "center";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("M", 258, CONFIG.CANVAS_H - 53);
  ctx.textAlign = "left";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("MARISOL", 291, CONFIG.CANVAS_H - 55);
  ctx.restore();
}

function shotInstallMissionArt() {
  if (SHOT_BASE_DIALOGUE_DRAW) return;
  SHOT_BASE_DIALOGUE_DRAW = window.drawMissionDialog;
  window.drawMissionDialog = shotDrawMissionDialog;
}

function shotStageCity(anchor) {
  initPlayer(anchor.x, anchor.y);
  const ride = shotAddVehicle("sedan", anchor.x, anchor.y, 0,
    { driver: "player", speed: 115 });
  PLAYER.onFoot = false;
  PLAYER.vehicleId = ride.id;
  PLAYER.x = ride.x;
  PLAYER.y = ride.y;
  PLAYER.angle = 0;
  shotSetCamera(anchor.x, anchor.y, 400);

  const lanes = [
    [-390, 28, "taxi", 0, 70], [-230, -34, "compact", 0, 0],
    [190, 34, "sedan", Math.PI, 65], [370, -34, "taxi", Math.PI, 0],
    [520, 62, "compact", Math.PI, 20],
  ];
  for (const [dx, dy, model, angle, speed] of lanes) {
    shotAddVehicle(model, anchor.x + dx, anchor.y + dy, angle, { ai: true, speed });
  }
  shotAddVehicle("police", anchor.x - 130, anchor.y + 72, 0,
    { ai: true, police: true, siren: true, speed: 90 });
  WANTED = 1;
  window.setWantedFlash(12);

  shotAddCrowd(anchor, [-400, -260, -100, 180, 330, 500], [-160, 160], "walk");
  shotSetBanner("Drive to Marisol's cafe");
  initMissions();
  startMission(0);
  shotAttachMissionMarker({ x: anchor.x + 320, y: anchor.y - 120 });
  STATE = "PLAYING";
  SHOT_DECOR_ANCHOR = anchor;
  shotInstallCityArt();
}

function shotStageChase(anchor) {
  initPlayer(anchor.x, anchor.y);
  const ride = shotAddVehicle("sedan", anchor.x, anchor.y, 0,
    { driver: "player", speed: 195 });
  PLAYER.onFoot = false;
  PLAYER.vehicleId = ride.id;
  PLAYER.x = ride.x;
  PLAYER.y = ride.y;
  PLAYER.angle = 0;
  shotSetCamera(anchor.x, anchor.y, 400);

  shotAddVehicle("police", anchor.x - 132, anchor.y - 34, 0,
    { ai: true, police: true, siren: true, speed: 170 });
  shotAddVehicle("police", anchor.x - 232, anchor.y + 42, 0,
    { ai: true, police: true, siren: true, speed: 165 });
  shotAddVehicle("swat", anchor.x - 345, anchor.y + 88, 0,
    { ai: true, police: true, siren: true, speed: 145 });
  HELI = shotAddVehicle("helicopter", anchor.x + 24, anchor.y - 188, 0,
    { ai: true, police: true, siren: true, speed: 0 });
  HELI.isHeli = true;
  HELI.color = "#718095";
  HELI.w = 68;
  HELI.h = 22;
  HELI.x = anchor.x + 85;
  HELI.y = anchor.y - 145;
  ROADBLOCKS.push({ x: anchor.x + 480, y: anchor.y + 12, angle: Math.PI / 2, life: 60 });

  WANTED = 5;
  window.setWantedFlash(12);
  shotSetBanner("Escape the heat");
  SKIDMARKS.push(
    { x: anchor.x - 53, y: anchor.y - 12, angle: 0, life: 6, maxLife: 6 },
    { x: anchor.x - 53, y: anchor.y + 12, angle: 0, life: 6, maxLife: 6 },
    { x: anchor.x - 27, y: anchor.y + 28, angle: 0.06, life: 6, maxLife: 6 },
    { x: anchor.x - 78, y: anchor.y - 20, angle: -0.02, life: 6, maxLife: 6 },
    { x: anchor.x - 78, y: anchor.y + 20, angle: 0.02, life: 6, maxLife: 6 },
    { x: anchor.x - 103, y: anchor.y - 16, angle: 0, life: 6, maxLife: 6 },
    { x: anchor.x - 103, y: anchor.y + 16, angle: 0, life: 6, maxLife: 6 },
  );
  spawnParticles(anchor.x - 28, anchor.y + 9, "#ffb12e", 10, 50);
  spawnParticles(anchor.x + 18, anchor.y - 20, "#fff3b0", 7, 35);
  const sparks = [
    [-18, -12], [-13, 4], [-9, -19], [-5, 15], [0, -7], [5, 10],
    [9, -15], [13, 1], [18, -8], [21, 12], [26, -17], [30, 5],
  ];
  const sparkColors = ["#fff3b0", "#ffcc33", "#ff8c24", "#fff3b0"];
  for (let index = 0; index < sparks.length; index++) {
    PARTICLES.push({
      x: anchor.x - 25 + sparks[index][0], y: anchor.y + 6 + sparks[index][1],
      vx: 0, vy: 0, life: 1, maxLife: 1,
      color: sparkColors[index % sparkColors.length], size: index % 3 === 0 ? 5 : 4,
    });
  }
  STATE = "PLAYING";
}

function shotStageMission(anchor) {
  initMissions();
  startMission(0);
  initPlayer(anchor.x - 90, anchor.y);
  PLAYER.angle = -0.15;
  STATE = "MISSION_DIALOG";
  DIALOGUE_LINE = 0;
  window.setDialogueLine(0);

  shotAttachMissionMarker({ x: PLAYER.x + 82, y: PLAYER.y - 12 });
  shotAddVehicle("sports", PLAYER.x + 145, PLAYER.y + 38, 0.18, { speed: 0 });
  const bystanders = [
    [-370, -150], [-260, -150], [245, -148], [360, -150],
  ];
  for (const [dx, dy] of bystanders) {
    const person = spawnPed(PLAYER.x + dx, PLAYER.y + dy);
    person.speed = 0;
    person.state = "flee";
    person.angle = Math.atan2(PLAYER.y - person.y, PLAYER.x - person.x);
  }
  shotSetCamera(PLAYER.x, PLAYER.y, 380);
  shotInstallMissionArt();
}

function shotStageNight(anchor) {
  initPlayer(anchor.x, anchor.y);
  const ride = shotAddVehicle("sedan", anchor.x, anchor.y, 0,
    { driver: "player", speed: 125 });
  PLAYER.onFoot = false;
  PLAYER.vehicleId = ride.id;
  PLAYER.x = ride.x;
  PLAYER.y = ride.y;
  PLAYER.angle = 0;
  shotSetCamera(anchor.x, anchor.y, 560);

  shotAddVehicle("taxi", anchor.x + 255, anchor.y - 14, 0, { ai: true, speed: 75 });
  shotAddVehicle("compact", anchor.x - 215, anchor.y + 18, 0, { ai: true, speed: 65 });
  shotAddVehicle("sedan", anchor.x + 430, anchor.y + 30, Math.PI, { ai: true, speed: 45 });
  shotAddVehicle("police", anchor.x - 380, anchor.y - 10, 0,
    { ai: true, police: true, siren: true, speed: 80 });
  WANTED = 2;
  window.setWantedFlash(12);
  shotSetBanner("Neon Coast: evade the patrol");
  SHOT_DECOR_ANCHOR = anchor;
  shotInstallCityArt();
  STATE = "PLAYING";
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
  shotSetFrameSize();
  DAY_TIME = name === "night" ? 0.82 : (name === "chase" ? 0.72 : (name === "city" ? 0.5 : 0.38));

  if (name === "mission") {
    const shoreRoad = nearestRoadSpawn(CITY.worldW * 0.625, CITY.worldH * 0.92);
    shotStageMission(shoreRoad);
    fireShotReady();
    return;
  }

  if (name === "night") {
    const shoreRoad = nearestRoadSpawn(CITY.worldW * 0.625, CITY.worldH * 0.92);
    shotStageNight(shoreRoad);
  } else if (name === "chase") {
    const centralRoad = nearestRoadSpawn(CITY.worldW * 0.5, CITY.worldH * 0.48);
    shotStageChase(centralRoad);
  } else {
    const palmHeightsRoad = nearestRoadSpawn(CITY.worldW * 0.43, CITY.worldH * 0.7);
    shotStageCity(palmHeightsRoad);
  }
  shotInstallHudLayout();
  fireShotReady();
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
