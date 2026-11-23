// Wanted level is the dispatch scale: each extra star broadens the response.
// One and two stars call for patrol cars; three adds a road obstacle,
// four brings armored response, and five puts an aircraft overhead.
// Officers can also join nearby patrols, so the pressure is not only vehicular.
//
// Crimes and scripted jobs raise heat elsewhere, up to the five star cap.
// Here, sighting the player resets the quiet-time clock.
// Once pursuers can no longer spot the player long enough, a star drops;
// tougher alerts wait longer before easing, giving a high level more weight.
// The general wanted decay setting handles periods without close patrols,
// while this clock models time spent out of police view.
//
// Sight is sampled between pursuer and player positions, with solid city
// cells breaking the path. Patrol cars and foot officers use that test
// before firing or continuing to hold the chase; cover creates room
// to escape their view. Helicopter detection uses distance in this build.
//
// Arrest resolution is called when an officer or car reaches a player
// on foot, or when a stopped ride is surrounded by enough cruisers.
// Arrest clears the pursuit and cuts the cash balance in half.
// It also replaces the loadout with fists, no ammunition, and no armor.
// The BUSTED overlay lasts briefly, then returns the player to the station.
// Fatal damage follows the separate WASTED path in player handling:
// after its brief pause, the player returns near the hospital, loses cash,
// and sheds some alert. Both outcomes restore active play.
// Wanted heat builds a response from patrol cars to officers, SWAT, and air support.
// Sight lines and star-specific timers let a player break pursuit behind cover.
// Roadblocks, foot officers, arrest contact, and the busted overlay live here.
const POLICE_OFFICERS = [];
const ROADBLOCKS = [];
let HELI = null;
let BUSTED_TIMER = 0;
let WANTED_TIMER = 0;
let WANTED_FLASH = 0;

function pdPos() { return { x: CITY.worldW * 0.45, y: CITY.worldH * 0.4 }; }
function hospitalPos() { return { x: CITY.worldW * 0.35, y: CITY.worldH * 0.45 }; }
function wantedStars() { return Math.ceil(WANTED); }

function hasLOS(x1, y1, x2, y2) {
  for (let sample = 0; sample <= 16; sample++) {
    const fraction = sample / 16;
    const x = x1 + (x2 - x1) * fraction;
    const y = y1 + (y2 - y1) * fraction;
    if (CITY.isSolid(x, y)) return false;
  }
  return true;
}

function decayTimeForStar(star) {
  if (star >= 5) return 20;
  if (star === 4) return 16;
  if (star === 3) return 13;
  if (star === 2) return 10;
  return 8;
}

function removePoliceAll() {
  for (let index = VEHICLES.length - 1; index >= 0; index--) {
    if (!VEHICLES[index] || VEHICLES[index].isPolice) VEHICLES.splice(index, 1);
  }
  POLICE_OFFICERS.length = 0;
  ROADBLOCKS.length = 0;
  HELI = null;
}

function spawnPoliceCar(type, x, y, angle) {
  const patrol = spawnVehicle(type, x, y, angle, { ai: true });
  patrol.isPolice = true;
  patrol.policeShootCd = 1;
  patrol.speed = 0;
  return patrol;
}

function triggerBusted() {
  if (STATE !== "PLAYING") return;
  STATE = "BUSTED";
  BUSTED_TIMER = 3;
  CASH = Math.max(0, CASH - Math.floor(CASH / 2));
  PLAYER.weapon = "fists";
  PLAYER.ammo = 0;
  PLAYER.armor = 0;
  WANTED = 0;
  WANTED_TIMER = 0;
  removePoliceAll();
  if (window.playExplosion) playExplosion();
}

function updatePolice(dt) {
  if (WANTED <= 0) {
    removePoliceAll();
    WANTED_TIMER = 0;
    return;
  }

  const stars = wantedStars();
  const cruiserGoal = stars === 1 ? 1 : 2;
  const swatGoal = stars >= 4 ? 1 : 0;
  const needsHelicopter = stars >= 5;
  const needsRoadblock = stars >= 3;
  const player = getPlayerPos();

  let cruisers = VEHICLES.filter((vehicle) => vehicle.isPolice && vehicle.type === "police").length;
  while (cruisers < cruiserGoal) {
    const road = pickRoadSpawnNear(CAMERA.x, CAMERA.y, 500, 900);
    if (!road) break;
    spawnPoliceCar("police", road.x, road.y, 0);
    cruisers++;
  }
  let swatUnits = VEHICLES.filter((vehicle) => vehicle.isPolice && vehicle.type === "swat").length;
  while (swatUnits < swatGoal) {
    const road = pickRoadSpawnNear(CAMERA.x, CAMERA.y, 500, 900);
    if (!road) break;
    spawnPoliceCar("swat", road.x, road.y, 0);
    swatUnits++;
  }

  if (needsHelicopter && !HELI) {
    const road = pickRoadSpawnNear(CAMERA.x, CAMERA.y, 600, 900);
    if (road) {
      HELI = spawnPoliceCar("helicopter", road.x, road.y, 0);
      HELI.isHeli = true;
    }
  } else if (!needsHelicopter && HELI) {
    const oldHeliIndex = VEHICLES.indexOf(HELI);
    if (oldHeliIndex >= 0) VEHICLES.splice(oldHeliIndex, 1);
    HELI = null;
  }

  if (needsRoadblock && ROADBLOCKS.length < 1) {
    const heading = PLAYER.onFoot
      ? PLAYER.angle
      : (VEHICLES.find((vehicle) => vehicle.id === PLAYER.vehicleId) || { angle: 0 }).angle;
    const interceptX = player.x + Math.cos(heading) * 400;
    const interceptY = player.y + Math.sin(heading) * 400;
    let closestRoad = null;
    let closestGap = Infinity;
    for (const road of CITY.roadSpawns) {
      const gap = Math.hypot(road.x - interceptX, road.y - interceptY);
      if (gap < closestGap) { closestRoad = road; closestGap = gap; }
    }
    if (closestRoad) ROADBLOCKS.push({ x: closestRoad.x, y: closestRoad.y, angle: heading, life: 60 });
  }
  if (!needsRoadblock) ROADBLOCKS.length = 0;
  for (let index = ROADBLOCKS.length - 1; index >= 0; index--) {
    if (Math.hypot(ROADBLOCKS[index].x - player.x, ROADBLOCKS[index].y - player.y) > 1200) {
      ROADBLOCKS.splice(index, 1);
    }
  }

  pursueOnFootAndInCars(dt, player);
  if (HELI) circleThePlayer(dt, player);
  enlistOfficers(player, stars);
  moveOfficers(dt, player);
  resolveOfficerHits();

  const spotted = canSeePlayer(player);
  if (spotted) WANTED_TIMER = 0;
  else {
    WANTED_TIMER += dt;
    if (WANTED_TIMER >= decayTimeForStar(stars)) {
      WANTED = Math.max(0, WANTED - 1);
      WANTED_TIMER = 0;
      if (WANTED <= 0) removePoliceAll();
    }
  }

  if (checkBusted(player)) return;
  slowAtRoadblocks();
}

function pursueOnFootAndInCars(dt, player) {
  for (const patrol of VEHICLES) {
    if (!patrol.isPolice || patrol.type === "helicopter") continue;
    const dx = player.x - patrol.x;
    const dy = player.y - patrol.y;
    const targetAngle = Math.atan2(dy, dx);
    let difference = targetAngle - patrol.angle;
    while (difference > Math.PI) difference -= Math.PI * 2;
    while (difference < -Math.PI) difference += Math.PI * 2;
    const turnRate = patrol.type === "swat" ? 2.6 : 3.5;
    patrol.angle += Math.sign(difference) * Math.min(Math.abs(difference), turnRate * dt);
    const distance = Math.hypot(dx, dy);
    const desiredSpeed = distance > 120 ? patrol.maxSpeed : patrol.maxSpeed * 0.5;
    if ((patrol.speed || 0) < desiredSpeed) patrol.speed = Math.min(desiredSpeed, (patrol.speed || 0) + patrol.accel * dt);
    else patrol.speed = Math.max(0, (patrol.speed || 0) - patrol.accel * dt);

    const nextX = patrol.x + Math.cos(patrol.angle) * patrol.speed * dt;
    const nextY = patrol.y + Math.sin(patrol.angle) * patrol.speed * dt;
    if (!circleHitsSolid(nextX, patrol.y, 14)) patrol.x = nextX;
    if (!circleHitsSolid(patrol.x, nextY, 14)) patrol.y = nextY;
    if (distance < 35 && !PLAYER.onFoot) {
      const playerRide = VEHICLES.find((vehicle) => vehicle.id === PLAYER.vehicleId);
      if (playerRide) playerRide.health -= 5 * dt;
    }

    patrol.policeShootCd = (patrol.policeShootCd || 0) - dt;
    if (distance < 450 && patrol.policeShootCd <= 0 && hasLOS(patrol.x, patrol.y, player.x, player.y)) {
      patrol.policeShootCd = 0.9;
      BULLETS.push({
        x: patrol.x + Math.cos(patrol.angle) * 24,
        y: patrol.y + Math.sin(patrol.angle) * 24,
        vx: Math.cos(patrol.angle) * 520, vy: Math.sin(patrol.angle) * 520,
        life: 1.4, damage: 10, owner: "police", color: "#ff6666",
      });
      if (window.playGunshot) playGunshot();
    }
  }
}

function circleThePlayer(dt, player) {
  const heli = HELI;
  const angle = Math.atan2(heli.y - player.y, heli.x - player.x);
  const orbitX = player.x + Math.cos(angle + 0.02) * 220;
  const orbitY = player.y + Math.sin(angle + 0.02) * 220;
  const toward = Math.atan2(orbitY - heli.y, orbitX - heli.x);
  heli.angle += (toward - heli.angle) * 2 * dt;
  heli.speed = Math.min(heli.maxSpeed, (heli.speed || 0) + heli.accel * dt);
  heli.x += Math.cos(heli.angle) * heli.speed * dt;
  heli.y += Math.sin(heli.angle) * heli.speed * dt;
}

function enlistOfficers(player, stars) {
  if (POLICE_OFFICERS.length >= stars) return;
  for (const patrol of VEHICLES) {
    if (!patrol.isPolice || patrol.type === "helicopter") continue;
    const distance = Math.hypot(patrol.x - player.x, patrol.y - player.y);
    if (distance < 250 && POLICE_OFFICERS.length < stars && Math.random() < 0.02) {
      POLICE_OFFICERS.push({ x: patrol.x, y: patrol.y, angle: 0, health: 60, shootCd: 1, speed: 110 });
    }
  }
}

function moveOfficers(dt, player) {
  for (let index = POLICE_OFFICERS.length - 1; index >= 0; index--) {
    const officer = POLICE_OFFICERS[index];
    if (officer.health <= 0) { POLICE_OFFICERS.splice(index, 1); continue; }
    const dx = player.x - officer.x;
    const dy = player.y - officer.y;
    const direction = Math.atan2(dy, dx);
    officer.angle = direction;
    const distance = Math.hypot(dx, dy);
    if (distance > 50) {
      officer.x += Math.cos(direction) * officer.speed * dt;
      officer.y += Math.sin(direction) * officer.speed * dt;
    }
    officer.shootCd -= dt;
    if (distance < 500 && officer.shootCd <= 0 && hasLOS(officer.x, officer.y, player.x, player.y)) {
      officer.shootCd = 0.9;
      BULLETS.push({
        x: officer.x + Math.cos(direction) * 16,
        y: officer.y + Math.sin(direction) * 16,
        vx: Math.cos(direction) * 580, vy: Math.sin(direction) * 580,
        life: 1.3, damage: 12, owner: "police", color: "#ff6666",
      });
      if (window.playGunshot) playGunshot();
    }
  }
}

function resolveOfficerHits() {
  for (let bulletIndex = BULLETS.length - 1; bulletIndex >= 0; bulletIndex--) {
    const bullet = BULLETS[bulletIndex];
    if (bullet.owner !== "player") continue;
    for (const officer of POLICE_OFFICERS) {
      if (Math.hypot(officer.x - bullet.x, officer.y - bullet.y) >= 10) continue;
      officer.health -= bullet.damage;
      BULLETS.splice(bulletIndex, 1);
      spawnParticles(bullet.x, bullet.y, "#f00", 4);
      break;
    }
  }
}

function canSeePlayer(player) {
  for (const patrol of VEHICLES) {
    if (!patrol.isPolice) continue;
    if (Math.hypot(patrol.x - player.x, patrol.y - player.y) < 700 && hasLOS(patrol.x, patrol.y, player.x, player.y)) return true;
  }
  for (const officer of POLICE_OFFICERS) {
    if (Math.hypot(officer.x - player.x, officer.y - player.y) < 600 && hasLOS(officer.x, officer.y, player.x, player.y)) return true;
  }
  return !!HELI && Math.hypot(HELI.x - player.x, HELI.y - player.y) < 320;
}

function checkBusted(player) {
  if (PLAYER.onFoot) {
    for (const patrol of VEHICLES) {
      if (patrol.isPolice && Math.hypot(patrol.x - PLAYER.x, patrol.y - PLAYER.y) < 42) {
        triggerBusted();
        return true;
      }
    }
    for (const officer of POLICE_OFFICERS) {
      if (Math.hypot(officer.x - PLAYER.x, officer.y - PLAYER.y) < 42) {
        triggerBusted();
        return true;
      }
    }
    return false;
  }

  const ride = VEHICLES.find((vehicle) => vehicle.id === PLAYER.vehicleId);
  if (!ride || Math.abs(ride.speed || 0) >= 20) return false;
  let nearbyCruisers = 0;
  for (const patrol of VEHICLES) {
    if (patrol.isPolice && Math.hypot(patrol.x - ride.x, patrol.y - ride.y) < 130) nearbyCruisers++;
  }
  if (nearbyCruisers < 3) return false;
  triggerBusted();
  return true;
}

function slowAtRoadblocks() {
  if (PLAYER.onFoot) return;
  const ride = VEHICLES.find((vehicle) => vehicle.id === PLAYER.vehicleId);
  if (!ride) return;
  for (const block of ROADBLOCKS) {
    if (Math.hypot(ride.x - block.x, ride.y - block.y) < 60) ride.speed *= 0.92;
  }
}

function updateBusted(dt) {
  if (STATE !== "BUSTED") return;
  BUSTED_TIMER -= dt;
  if (BUSTED_TIMER <= 0) {
    const station = pdPos();
    initPlayer(station.x, station.y);
    STATE = "PLAYING";
    WANTED = 0;
    removePoliceAll();
  }
}

function drawPoliceExtras(ctx, cam) {
  for (const block of ROADBLOCKS) {
    ctx.save();
    ctx.translate(block.x - cam.x, block.y - cam.y);
    ctx.rotate(block.angle);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(0, side * 18);
      ctx.rotate(side * 0.6);
      ctx.fillStyle = "#1a3a6a"; ctx.fillRect(-23, -11, 46, 22);
      ctx.fillStyle = performance.now() / 200 % 2 < 1 ? "#ff3333" : "#3366ff";
      ctx.fillRect(-6, -14, 12, 3);
      ctx.restore();
    }
    ctx.fillStyle = "#ffcc33";
    for (let cone = -3; cone <= 3; cone++) {
      ctx.beginPath();
      ctx.moveTo(cone * 14 - 4, 30); ctx.lineTo(cone * 14, 40); ctx.lineTo(cone * 14 + 4, 30);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  for (const officer of POLICE_OFFICERS) {
    const screenX = officer.x - cam.x;
    const screenY = officer.y - cam.y;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.ellipse(screenX, screenY + 6, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(officer.angle);
    ctx.fillStyle = "#1a3a6a"; ctx.fillRect(-5, -3, 10, 8);
    ctx.fillStyle = "#f0c8a0";
    ctx.beginPath(); ctx.arc(4, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#333"; ctx.fillRect(6, -1, 8, 2);
    ctx.restore();
  }

  if (!HELI) return;
  const heli = HELI;
  const screenX = heli.x - cam.x;
  const screenY = heli.y - cam.y;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(screenX, screenY + 4, 28, 10, heli.angle, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(heli.angle);
  ctx.fillStyle = "#4a4a4a"; ctx.fillRect(-30, -9, 60, 18);
  ctx.fillStyle = "#888"; ctx.fillRect(-4, -18, 8, 36);
  ctx.restore();

  const player = getPlayerPos();
  const lightX = player.x - cam.x;
  const lightY = player.y - cam.y;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const beam = ctx.createRadialGradient(lightX, lightY, 10, lightX, lightY, 140);
  beam.addColorStop(0, "rgba(255,255,220,0.35)");
  beam.addColorStop(1, "rgba(255,255,220,0)");
  ctx.fillStyle = beam;
  ctx.beginPath(); ctx.arc(lightX, lightY, 140, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBustedOverlay(ctx) {
  const width = CONFIG.CANVAS_W;
  const height = CONFIG.CANVAS_H;
  ctx.fillStyle = "rgba(0,0,20,0.75)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ff5555";
  ctx.font = "bold 64px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("BUSTED", width / 2, height / 2);
  ctx.fillStyle = "#f2e9d8";
  ctx.font = "20px sans-serif";
  ctx.fillText("Respawning at Pacificora PD...", width / 2, height / 2 + 40);
  ctx.textAlign = "left";
}

window.POLICE_OFFICERS = POLICE_OFFICERS;
window.ROADBLOCKS = ROADBLOCKS;
window.HELI = () => HELI;
window.BUSTED_TIMER = () => BUSTED_TIMER;
window.setBustedTimer = (time) => { BUSTED_TIMER = time; };
window.updatePolice = updatePolice;
window.updateBusted = updateBusted;
window.drawPoliceExtras = drawPoliceExtras;
window.drawBustedOverlay = drawBustedOverlay;
window.triggerBusted = triggerBusted;
window.removePoliceAll = removePoliceAll;
window.WANTED_TIMER = () => WANTED_TIMER;
window.WANTED_FLASH = () => WANTED_FLASH;
window.setWantedFlash = (time) => { WANTED_FLASH = time; };
window.pdPos = pdPos;
window.hospitalPos = hospitalPos;
window.wantedStars = wantedStars;
