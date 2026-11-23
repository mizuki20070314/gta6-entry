// Shared car records cover traffic, player rides, emergency units, and the heli.
// Driving, steering decisions, contacts, and cleanup stay in one update pass.
// The draw helpers are exported too, since menus use the same rounded body path.
const VEHICLE_TYPES = {
  compact: { name: "Compact", maxSpeed: 230, accel: 190, brake: 260, handling: 3.0, color: "#d96a5a", w: 34, h: 18 },
  sedan: { name: "Sedan", maxSpeed: 250, accel: 200, brake: 280, handling: 2.8, color: "#4a6fa5", w: 40, h: 20 },
  sports: { name: "Sports", maxSpeed: 330, accel: 280, brake: 320, handling: 4.2, color: "#c94a5a", w: 38, h: 18 },
  van: { name: "Van", maxSpeed: 180, accel: 130, brake: 220, handling: 2.0, color: "#8a8a90", w: 46, h: 22 },
  taxi: { name: "Taxi", maxSpeed: 220, accel: 180, brake: 260, handling: 2.6, color: "#e8c547", w: 40, h: 20 },
  police: { name: "Cruiser", maxSpeed: 270, accel: 230, brake: 300, handling: 3.4, color: "#1f3a6b", w: 42, h: 20 },
  swat: { name: "SWAT", maxSpeed: 250, accel: 210, brake: 290, handling: 2.6, color: "#3a3a3a", w: 48, h: 24 },
  tow: { name: "Tow", maxSpeed: 170, accel: 120, brake: 200, handling: 2.0, color: "#f39c12", w: 52, h: 24 },
  helicopter: { name: "Heli", maxSpeed: 200, accel: 150, brake: 200, handling: 2.0, color: "#4a4a4a", w: 52, h: 16 },
};
window.VEHICLE_TYPES = VEHICLE_TYPES;

let VEHICLE_ID = 1;
let VEHICLES = [];
window.VEHICLES = VEHICLES;

function spawnVehicle(type, x, y, angle, opts) {
  const options = opts || {};
  const model = VEHICLE_TYPES[type];
  const vehicle = {
    id: VEHICLE_ID++, type, x, y, angle: angle || 0, vel: 0, health: 100,
    driver: options.driver || null,
    ai: !!options.ai,
    isPolice: type === "police" || type === "swat" || type === "helicopter",
    color: options.color || model.color,
    w: model.w, h: model.h, maxSpeed: model.maxSpeed,
    accel: model.accel, brake: model.brake, handling: model.handling,
    turnDir: 0, aiDir: options.aiDir || 0, aiTimer: 0, siren: !!options.siren,
    policeShootCd: 0, stuck: 0,
  };
  VEHICLES.push(vehicle);
  return vehicle;
}

function removeDeadVehicles() {
  for (let index = VEHICLES.length - 1; index >= 0; index--) {
    const vehicle = VEHICLES[index];
    if (vehicle.health > 0) continue;
    spawnExplosion(vehicle.x, vehicle.y);
    if (vehicle.driver === "player") {
      PLAYER.onFoot = true;
      PLAYER.vehicleId = -1;
      PLAYER.x = vehicle.x;
      PLAYER.y = vehicle.y;
      damagePlayer(60);
    }
    VEHICLES.splice(index, 1);
  }
}

function updateVehicles(dt) {
  for (const vehicle of VEHICLES) {
    if (vehicle.driver === "player") updatePlayerVehicle(vehicle, dt);
    else if (vehicle.ai && !vehicle.isPolice) updateTrafficVehicle(vehicle, dt);
  }

  for (let first = 0; first < VEHICLES.length; first++) {
    for (let second = first + 1; second < VEHICLES.length; second++) {
      const a = VEHICLES[first];
      const b = VEHICLES[second];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const separation = (a.w + b.w) * 0.35;
      if (distance >= separation || distance <= 0.01) continue;
      const axisX = (b.x - a.x) / distance;
      const axisY = (b.y - a.y) / distance;
      const overlap = separation - distance;
      a.x -= axisX * overlap * 0.5; a.y -= axisY * overlap * 0.5;
      b.x += axisX * overlap * 0.5; b.y += axisY * overlap * 0.5;
      const impact = Math.abs(a.vel - b.vel);
      if (impact > 60) {
        a.health -= impact * 0.02;
        b.health -= impact * 0.02;
        spawnParticles((a.x + b.x) / 2, (a.y + b.y) / 2, "#ffaa33", 4);
        if (a.driver === "player" || b.driver === "player") screenShake(4);
      }
      const oldA = a.vel;
      a.vel = b.vel * 0.6;
      b.vel = oldA * 0.6;
    }
  }

  for (const vehicle of VEHICLES) {
    for (const pedestrian of PEDS) {
      if (pedestrian.knocked && pedestrian.knockTimer > 0.5) continue;
      if (Math.hypot(vehicle.x - pedestrian.x, vehicle.y - pedestrian.y) >= 22) continue;
      pedestrian.knocked = true;
      pedestrian.knockTimer = 1.5;
      pedestrian.vx = Math.cos(vehicle.angle) * vehicle.vel * 0.5;
      pedestrian.vy = Math.sin(vehicle.angle) * vehicle.vel * 0.5;
      spawnParticles(pedestrian.x, pedestrian.y, "#fff", 5);
      if (vehicle.driver === "player") wantedRaise(0.3);
      vehicle.vel *= 0.85;
    }
  }

  for (const vehicle of VEHICLES) {
    if (!circleHitsSolidVehicle(vehicle.x, vehicle.y, 18)) continue;
    vehicle.x -= Math.cos(vehicle.angle) * vehicle.vel * dt * 2;
    vehicle.y -= Math.sin(vehicle.angle) * vehicle.vel * dt * 2;
    vehicle.vel *= -0.3;
    vehicle.health -= Math.abs(vehicle.vel) * 0.05;
    spawnParticles(vehicle.x, vehicle.y, "#aaa", 4);
    if (vehicle.driver === "player") screenShake(3);
  }
  removeDeadVehicles();
}

function circleHitsSolidVehicle(cx, cy, radius) {
  return circleHitsSolid(cx, cy, radius);
}

function updatePlayerVehicle(vehicle, dt) {
  const keys = INPUT.keys;
  const forward = keys.KeyW || keys.ArrowUp;
  const reverse = keys.KeyS || keys.ArrowDown;
  const left = keys.KeyA || keys.ArrowLeft;
  const right = keys.KeyD || keys.ArrowRight;
  if (forward) vehicle.vel += vehicle.accel * dt;
  if (reverse) vehicle.vel -= vehicle.brake * dt;
  if (!forward && !reverse) vehicle.vel *= 1 - 0.8 * dt;
  vehicle.vel = Math.max(-vehicle.maxSpeed * 0.4, Math.min(vehicle.maxSpeed, vehicle.vel));

  const steering = (left ? -1 : 0) + (right ? 1 : 0);
  const turnRate = vehicle.handling * Math.min(1, Math.abs(vehicle.vel) / 80);
  vehicle.angle += turnRate * steering * dt * (vehicle.vel < 0 ? -1 : 1);
  vehicle.x += Math.cos(vehicle.angle) * vehicle.vel * dt;
  vehicle.y += Math.sin(vehicle.angle) * vehicle.vel * dt;
  if (steering !== 0 && Math.abs(vehicle.vel) > 150) {
    SKIDMARKS.push({ x: vehicle.x, y: vehicle.y, angle: vehicle.angle, life: 6, maxLife: 6 });
  }
  if (INPUT.justPressed.KeyE) tryEnterExitVehicle();
}

function updateTrafficVehicle(vehicle, dt) {
  if (vehicle.aiDir === 0) {
    vehicle.aiDir = pickRoadDir(vehicle.x, vehicle.y);
    vehicle.vel = vehicle.maxSpeed * 0.5;
  }
  const tileSize = CITY.T;
  const centerX = Math.floor(vehicle.x / tileSize) * tileSize + tileSize / 2;
  const centerY = Math.floor(vehicle.y / tileSize) * tileSize + tileSize / 2;
  const centered = Math.hypot(vehicle.x - centerX, vehicle.y - centerY) < 8;
  if (centered && vehicle.aiTimer <= 0) {
    if (Math.random() < 0.35) {
      const chosen = turnChoice(vehicle.aiDir);
      if (isRoadDir(vehicle.x, vehicle.y, chosen)) vehicle.aiDir = chosen;
    }
    vehicle.aiTimer = 0.5;
  }
  if (vehicle.aiTimer > 0) vehicle.aiTimer -= dt;

  let blockedAhead = false;
  for (const other of VEHICLES) {
    if (other === vehicle) continue;
    const dx = other.x - vehicle.x;
    const dy = other.y - vehicle.y;
    const ahead = dx * Math.cos(vehicle.aiDir) + dy * Math.sin(vehicle.aiDir);
    const beside = Math.abs(-dx * Math.sin(vehicle.aiDir) + dy * Math.cos(vehicle.aiDir));
    if (ahead > 0 && ahead < 90 && beside < 24) { blockedAhead = true; break; }
  }
  const targetSpeed = blockedAhead ? 0 : vehicle.maxSpeed * 0.55;
  if (vehicle.vel < targetSpeed) vehicle.vel = Math.min(targetSpeed, vehicle.vel + vehicle.accel * dt);
  else vehicle.vel = Math.max(targetSpeed, vehicle.vel - vehicle.brake * dt);
  vehicle.x += Math.cos(vehicle.aiDir) * vehicle.vel * dt;
  vehicle.y += Math.sin(vehicle.aiDir) * vehicle.vel * dt;

  if (!CITY.isRoad(vehicle.x, vehicle.y)) {
    vehicle.stuck += dt;
    if (vehicle.stuck > 2) vehicle.health = 0;
  } else vehicle.stuck = 0;
}

function pickRoadDir(x, y) {
  const headings = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  for (let attempt = 0; attempt < 4; attempt++) {
    const heading = headings[Math.floor(Math.random() * headings.length)];
    if (CITY.isRoad(x + Math.cos(heading) * 40, y + Math.sin(heading) * 40)) return heading;
  }
  return 0;
}

function turnChoice(direction) {
  const choice = Math.random();
  if (choice < 0.4) return direction;
  return direction + (choice < 0.7 ? Math.PI / 2 : -Math.PI / 2);
}

function isRoadDir(x, y, direction) {
  return CITY.isRoad(x + Math.cos(direction) * 40, y + Math.sin(direction) * 40);
}

function updatePoliceVehicle(vehicle, dt) {
  const player = getPlayerPos();
  const dx = player.x - vehicle.x;
  const dy = player.y - vehicle.y;
  const targetAngle = Math.atan2(dy, dx);
  let difference = targetAngle - vehicle.angle;
  while (difference > Math.PI) difference -= Math.PI * 2;
  while (difference < -Math.PI) difference += Math.PI * 2;
  vehicle.angle += Math.sign(difference) * Math.min(Math.abs(difference), vehicle.handling * dt);
  const distance = Math.hypot(dx, dy);
  const targetSpeed = distance > 120 ? vehicle.maxSpeed : vehicle.maxSpeed * 0.6;
  if (vehicle.vel < targetSpeed) vehicle.vel = Math.min(targetSpeed, vehicle.vel + vehicle.accel * dt);
  else vehicle.vel = Math.max(0, vehicle.vel - vehicle.brake * dt);
  vehicle.x += Math.cos(vehicle.angle) * vehicle.vel * dt;
  vehicle.y += Math.sin(vehicle.angle) * vehicle.vel * dt;
  vehicle.policeShootCd -= dt;
  if (distance < 400 && vehicle.policeShootCd <= 0) {
    vehicle.policeShootCd = 0.6;
    BULLETS.push({
      x: vehicle.x + Math.cos(vehicle.angle) * 24,
      y: vehicle.y + Math.sin(vehicle.angle) * 24,
      vx: Math.cos(vehicle.angle) * 500, vy: Math.sin(vehicle.angle) * 500,
      life: 1.5, damage: 8, owner: "police", color: "#ff6666",
    });
  }
  vehicle.siren = true;
}

function getPlayerPos() {
  if (!PLAYER.onFoot && PLAYER.vehicleId >= 0) {
    const ride = VEHICLES.find((vehicle) => vehicle.id === PLAYER.vehicleId);
    if (ride) return { x: ride.x, y: ride.y };
  }
  return { x: PLAYER.x, y: PLAYER.y };
}

function pickRoadSpawnNear(cx, cy, minD, maxD) {
  let selected = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    const road = CITY.roadSpawns[Math.floor(Math.random() * CITY.roadSpawns.length)];
    const distance = Math.hypot(road.x - cx, road.y - cy);
    if (distance >= minD && distance <= maxD) { selected = road; break; }
  }
  return selected;
}

function spawnTrafficAround(cam) {
  for (let index = VEHICLES.length - 1; index >= 0; index--) {
    const vehicle = VEHICLES[index];
    if (vehicle.ai && !vehicle.isPolice && Math.hypot(vehicle.x - cam.x, vehicle.y - cam.y) > 1400) {
      VEHICLES.splice(index, 1);
    }
  }
  const trafficCount = VEHICLES.filter((vehicle) => vehicle.ai && !vehicle.isPolice).length;
  if (trafficCount >= 18) return;
  const road = pickRoadSpawnNear(cam.x, cam.y, 700, 1100);
  if (!road) return;
  const models = ["compact", "sedan", "sedan", "taxi", "van", "compact"];
  const type = models[Math.floor(Math.random() * models.length)];
  const direction = pickRoadDir(road.x, road.y);
  spawnVehicle(type, road.x, road.y, direction, { ai: true, aiDir: direction });
}

function spawnParkedAround(cam) {
  const parkedCount = VEHICLES.filter((vehicle) => !vehicle.ai && vehicle.driver === null).length;
  if (parkedCount < 8) {
    const road = pickRoadSpawnNear(cam.x, cam.y, 200, 600);
    if (road) {
      const models = ["compact", "sedan", "sports", "van"];
      const type = models[Math.floor(Math.random() * models.length)];
      const parked = spawnVehicle(type, road.x + 30, road.y + 30, Math.random() * Math.PI * 2, { driver: null });
      parked.vel = 0;
    }
  }
  for (let index = VEHICLES.length - 1; index >= 0; index--) {
    const vehicle = VEHICLES[index];
    if (!vehicle.ai && vehicle.driver === null && Math.hypot(vehicle.x - cam.x, vehicle.y - cam.y) > 1200) {
      VEHICLES.splice(index, 1);
    }
  }
}

function spawnPoliceIfNeeded(cam) {
  if (WANTED <= 0) {
    for (let index = VEHICLES.length - 1; index >= 0; index--) {
      if (!VEHICLES[index] || VEHICLES[index].isPolice) VEHICLES.splice(index, 1);
    }
    return;
  }
  const patrolCount = VEHICLES.filter((vehicle) => vehicle.isPolice).length;
  const desired = Math.min(WANTED + 1, 4);
  if (patrolCount < desired) {
    const road = pickRoadSpawnNear(cam.x, cam.y, 600, 900);
    if (road) {
      const patrol = spawnVehicle("police", road.x, road.y, 0, { ai: true, siren: true });
      patrol.isPolice = true;
    }
  }
  for (let index = VEHICLES.length - 1; index >= 0; index--) {
    const vehicle = VEHICLES[index];
    if (vehicle.isPolice && Math.hypot(vehicle.x - cam.x, vehicle.y - cam.y) > 1600) VEHICLES.splice(index, 1);
  }
}

function drawVehicles(ctx, cam) {
  for (const vehicle of VEHICLES) {
    const screenX = vehicle.x - cam.x;
    const screenY = vehicle.y - cam.y;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + 6, vehicle.w * 0.45, vehicle.h * 0.35, vehicle.angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(vehicle.angle);
    ctx.fillStyle = vehicle.color;
    roundRect(ctx, -vehicle.w / 2, -vehicle.h / 2, vehicle.w, vehicle.h, 4);
    ctx.fill();
    ctx.fillStyle = "rgba(200,230,255,0.5)";
    ctx.fillRect(vehicle.w * 0.05, -vehicle.h / 2 + 3, vehicle.w * 0.25, vehicle.h - 6);
    ctx.fillStyle = "rgba(255,240,180,0.9)";
    ctx.fillRect(vehicle.w / 2 - 4, -vehicle.h / 2 + 2, 3, 4);
    ctx.fillRect(vehicle.w / 2 - 4, vehicle.h / 2 - 6, 3, 4);
    ctx.fillStyle = "#ff3333";
    ctx.fillRect(-vehicle.w / 2, -vehicle.h / 2 + 2, 2, 4);
    ctx.fillRect(-vehicle.w / 2, vehicle.h / 2 - 6, 2, 4);
    if (vehicle.isPolice) {
      const phase = performance.now() / 200 % 2;
      ctx.fillStyle = phase < 1 ? "#ff3333" : "#3366ff";
      ctx.fillRect(-6, -vehicle.h / 2 - 3, 6, 3);
      ctx.fillStyle = phase < 1 ? "#3366ff" : "#ff3333";
      ctx.fillRect(0, -vehicle.h / 2 - 3, 6, 3);
    }
    ctx.restore();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

window.spawnVehicle = spawnVehicle;
window.updateVehicles = updateVehicles;
window.drawVehicles = drawVehicles;
window.spawnTrafficAround = spawnTrafficAround;
window.spawnParkedAround = spawnParkedAround;
window.spawnPoliceIfNeeded = spawnPoliceIfNeeded;
window.VEHICLES = VEHICLES;
window.roundRect = roundRect;
window.updatePoliceVehicle = updatePoliceVehicle;
window.getPlayerPos = getPlayerPos;
