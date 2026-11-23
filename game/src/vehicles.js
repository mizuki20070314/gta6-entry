// vehicles.js — vehicles, traffic, police
const VEHICLE_TYPES = {
  compact: { name: 'Compact', maxSpeed: 230, accel: 190, brake: 260, handling: 3.0, color: '#d96a5a', w: 34, h: 18 },
  sedan:   { name: 'Sedan',   maxSpeed: 250, accel: 200, brake: 280, handling: 2.8, color: '#4a6fa5', w: 40, h: 20 },
  sports:  { name: 'Sports',  maxSpeed: 330, accel: 280, brake: 320, handling: 4.2, color: '#c94a5a', w: 38, h: 18 },
  van:     { name: 'Van',     maxSpeed: 180, accel: 130, brake: 220, handling: 2.0, color: '#8a8a90', w: 46, h: 22 },
  taxi:    { name: 'Taxi',    maxSpeed: 220, accel: 180, brake: 260, handling: 2.6, color: '#e8c547', w: 40, h: 20 },
  police:  { name: 'Cruiser', maxSpeed: 270, accel: 230, brake: 300, handling: 3.4, color: '#1f3a6b', w: 42, h: 20 },
};
window.VEHICLE_TYPES = VEHICLE_TYPES;

let VEHICLE_ID = 1;
let VEHICLES = [];
window.VEHICLES = VEHICLES;

function spawnVehicle(type, x, y, angle, opts) {
  opts = opts || {};
  const t = VEHICLE_TYPES[type];
  const v = {
    id: VEHICLE_ID++, type, x, y, angle: angle || 0, vel: 0, health: 100,
    driver: opts.driver || null, ai: !!opts.ai, isPolice: type === 'police',
    color: opts.color || t.color, w: t.w, h: t.h, maxSpeed: t.maxSpeed,
    accel: t.accel, brake: t.brake, handling: t.handling,
    turnDir: 0, aiDir: opts.aiDir || 0, aiTimer: 0, siren: !!opts.siren,
    policeShootCd: 0, stuck: 0,
  };
  VEHICLES.push(v);
  return v;
}

function removeDeadVehicles() {
  for (let i = VEHICLES.length - 1; i >= 0; i--) {
    const v = VEHICLES[i];
    if (v.health <= 0) {
      // explosion
      spawnExplosion(v.x, v.y);
      // if player was driving
      if (v.driver === 'player') {
        PLAYER.onFoot = true; PLAYER.vehicleId = -1;
        PLAYER.x = v.x; PLAYER.y = v.y;
        damagePlayer(60);
      }
      VEHICLES.splice(i, 1);
    }
  }
}

function updateVehicles(dt) {
  for (const v of VEHICLES) {
    if (v.driver === 'player') {
      updatePlayerVehicle(v, dt);
    } else if (v.ai) {
      if (v.isPolice) updatePoliceVehicle(v, dt);
      else updateTrafficVehicle(v, dt);
    } else {
      // parked: nothing
    }
  }
  // collisions vehicle-vehicle
  for (let i = 0; i < VEHICLES.length; i++) {
    for (let j = i + 1; j < VEHICLES.length; j++) {
      const a = VEHICLES[i], b = VEHICLES[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const minD = (a.w + b.w) * 0.35;
      if (d < minD && d > 0.01) {
        const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
        const overlap = minD - d;
        a.x -= nx * overlap * 0.5; a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5; b.y += ny * overlap * 0.5;
        // damage small
        const relSpeed = Math.abs(a.vel - b.vel);
        if (relSpeed > 60) {
          a.health -= relSpeed * 0.02; b.health -= relSpeed * 0.02;
          spawnParticles((a.x+b.x)/2, (a.y+b.y)/2, '#ffaa33', 4);
          if (a.driver === 'player' || b.driver === 'player') screenShake(4);
        }
        // bounce velocities
        const av = a.vel, bv = b.vel;
        a.vel = bv * 0.6; b.vel = av * 0.6;
      }
    }
  }
  // vehicle-ped collisions
  for (const v of VEHICLES) {
    for (const p of PEDS) {
      if (p.knocked && p.knockTimer > 0.5) continue;
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      if (d < 22) {
        p.knocked = true; p.knockTimer = 1.5;
        p.vx = Math.cos(v.angle) * v.vel * 0.5;
        p.vy = Math.sin(v.angle) * v.vel * 0.5;
        spawnParticles(p.x, p.y, '#fff', 5);
        if (v.driver === 'player') { wantedRaise(0.3); }
        v.vel *= 0.85;
      }
    }
  }
  // vehicle-solid collisions
  for (const v of VEHICLES) {
    if (circleHitsSolidVehicle(v.x, v.y, 18)) {
      // bounce back
      v.x -= Math.cos(v.angle) * v.vel * dt * 2;
      v.y -= Math.sin(v.angle) * v.vel * dt * 2;
      v.vel *= -0.3;
      v.health -= Math.abs(v.vel) * 0.05;
      spawnParticles(v.x, v.y, '#aaa', 4);
      if (v.driver === 'player') screenShake(3);
    }
  }
  removeDeadVehicles();
}

function circleHitsSolidVehicle(cx, cy, r) {
  return circleHitsSolid(cx, cy, r);
}

function updatePlayerVehicle(v, dt) {
  const up = INPUT.keys['KeyW'] || INPUT.keys['ArrowUp'];
  const down = INPUT.keys['KeyS'] || INPUT.keys['ArrowDown'];
  const left = INPUT.keys['KeyA'] || INPUT.keys['ArrowLeft'];
  const right = INPUT.keys['KeyD'] || INPUT.keys['ArrowRight'];
  if (up) v.vel += v.accel * dt;
  if (down) v.vel -= v.brake * dt;
  // friction
  if (!up && !down) v.vel *= (1 - 0.8 * dt);
  v.vel = Math.max(-v.maxSpeed * 0.4, Math.min(v.maxSpeed, v.vel));
  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  const turnRate = v.handling * Math.min(1, Math.abs(v.vel) / 80);
  if (v.vel < 0) v.angle += turnRate * steer * dt * -1; else v.angle += turnRate * steer * dt;
  v.x += Math.cos(v.angle) * v.vel * dt;
  v.y += Math.sin(v.angle) * v.vel * dt;
  // skid marks at high speed turns
  if (Math.abs(steer) > 0 && Math.abs(v.vel) > 150) {
    SKIDMARKS.push({ x: v.x, y: v.y, angle: v.angle, life: 6, maxLife: 6 });
  }
  if (INPUT.justPressed['KeyE']) tryEnterExitVehicle();
}

function updateTrafficVehicle(v, dt) {
  // cardinal movement along roads
  if (v.aiDir === 0) {
    // pick initial dir
    v.aiDir = pickRoadDir(v.x, v.y);
    v.vel = v.maxSpeed * 0.5;
  }
  // intersection handling
  const T = CITY.T;
  const cx = Math.floor(v.x / T) * T + T / 2;
  const cy = Math.floor(v.y / T) * T + T / 2;
  const nearCenter = Math.hypot(v.x - cx, v.y - cy) < 8;
  if (nearCenter && v.aiTimer <= 0) {
    // maybe turn
    if (Math.random() < 0.35) {
      const newDir = turnChoice(v.aiDir);
      if (isRoadDir(v.x, v.y, newDir)) v.aiDir = newDir;
    }
    v.aiTimer = 0.5;
  }
  if (v.aiTimer > 0) v.aiTimer -= dt;

  // car following
  let ahead = false;
  for (const o of VEHICLES) {
    if (o === v) continue;
    const dx = o.x - v.x, dy = o.y - v.y;
    const proj = dx * Math.cos(v.aiDir) + dy * Math.sin(v.aiDir);
    if (proj > 0 && proj < 90) {
      const side = Math.abs(-dx * Math.sin(v.aiDir) + dy * Math.cos(v.aiDir));
      if (side < 24) { ahead = true; break; }
    }
  }
  const targetSpeed = ahead ? 0 : v.maxSpeed * 0.55;
  if (v.vel < targetSpeed) v.vel = Math.min(targetSpeed, v.vel + v.accel * dt);
  else v.vel = Math.max(targetSpeed, v.vel - v.brake * dt);

  v.x += Math.cos(v.aiDir) * v.vel * dt;
  v.y += Math.sin(v.aiDir) * v.vel * dt;

  // keep on road; if off, snap back / remove
  if (!CITY.isRoad(v.x, v.y)) {
    v.stuck += dt;
    if (v.stuck > 2) { v.health = 0; }
  } else v.stuck = 0;

  // despawn if far from camera
}

function pickRoadDir(x, y) {
  const dirs = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  // choose dir that stays on road ahead
  for (let i = 0; i < 4; i++) {
    const d = dirs[Math.floor(Math.random() * 4)];
    const nx = x + Math.cos(d) * 40, ny = y + Math.sin(d) * 40;
    if (CITY.isRoad(nx, ny)) return d;
  }
  return 0;
}
function turnChoice(dir) {
  // turn left/right/straight
  const r = Math.random();
  if (r < 0.4) return dir; // straight
  if (r < 0.7) return dir + Math.PI / 2;
  return dir - Math.PI / 2;
}
function isRoadDir(x, y, dir) {
  const nx = x + Math.cos(dir) * 40, ny = y + Math.sin(dir) * 40;
  return CITY.isRoad(nx, ny);
}

function updatePoliceVehicle(v, dt) {
  // chase player
  const target = getPlayerPos();
  const dx = target.x - v.x, dy = target.y - v.y;
  const desired = Math.atan2(dy, dx);
  // steer toward desired
  let diff = desired - v.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  v.angle += Math.sign(diff) * Math.min(Math.abs(diff), v.handling * dt);
  const dist = Math.hypot(dx, dy);
  const targetSpeed = dist > 120 ? v.maxSpeed : v.maxSpeed * 0.6;
  if (v.vel < targetSpeed) v.vel = Math.min(targetSpeed, v.vel + v.accel * dt);
  else v.vel = Math.max(0, v.vel - v.brake * dt);
  v.x += Math.cos(v.angle) * v.vel * dt;
  v.y += Math.sin(v.angle) * v.vel * dt;
  // shoot
  v.policeShootCd -= dt;
  if (dist < 400 && v.policeShootCd <= 0) {
    v.policeShootCd = 0.6;
    const bx = v.x + Math.cos(v.angle) * 24;
    const by = v.y + Math.sin(v.angle) * 24;
    BULLETS.push({ x: bx, y: by, vx: Math.cos(v.angle) * 500, vy: Math.sin(v.angle) * 500, life: 1.5, damage: 8, owner: 'police', color: '#ff6666' });
  }
  v.siren = true;
}

function getPlayerPos() {
  if (!PLAYER.onFoot && PLAYER.vehicleId >= 0) {
    const v = VEHICLES.find(x => x.id === PLAYER.vehicleId);
    if (v) return { x: v.x, y: v.y };
  }
  return { x: PLAYER.x, y: PLAYER.y };
}

// traffic spawning
function spawnTrafficAround(cam) {
  // remove far vehicles (ai) 
  for (let i = VEHICLES.length - 1; i >= 0; i--) {
    const v = VEHICLES[i];
    if (v.ai && !v.isPolice) {
      if (Math.hypot(v.x - cam.x, v.y - cam.y) > 1400) VEHICLES.splice(i, 1);
    }
  }
  // police removal handled by wanted
  // spawn if few
  const aiCars = VEHICLES.filter(v => v.ai && !v.isPolice).length;
  if (aiCars < 18) {
    // pick spawn point near camera on road
    const sp = pickRoadSpawnNear(cam.x, cam.y, 700, 1100);
    if (sp) {
      const types = ['compact', 'sedan', 'sedan', 'taxi', 'van', 'compact'];
      const t = types[Math.floor(Math.random() * types.length)];
      const dir = pickRoadDir(sp.x, sp.y);
      spawnVehicle(t, sp.x, sp.y, dir, { ai: true, aiDir: dir });
    }
  }
}

function pickRoadSpawnNear(cx, cy, minD, maxD) {
  // find roadSpawn point within annulus
  let best = null, tries = 0;
  while (tries < 20) {
    tries++;
    const sp = CITY.roadSpawns[Math.floor(Math.random() * CITY.roadSpawns.length)];
    const d = Math.hypot(sp.x - cx, sp.y - cy);
    if (d >= minD && d <= maxD) { best = sp; break; }
  }
  return best;
}

function spawnParkedAround(cam) {
  // parked cars along curbs: ensure ~10 near camera
  const parked = VEHICLES.filter(v => !v.ai && v.driver === null).length;
  if (parked < 8) {
    const sp = pickRoadSpawnNear(cam.x, cam.y, 200, 600);
    if (sp) {
      // offset to curb
      const types = ['compact', 'sedan', 'sports', 'van'];
      const t = types[Math.floor(Math.random() * types.length)];
      const v = spawnVehicle(t, sp.x + 30, sp.y + 30, Math.random() * Math.PI * 2, { ai: false, driver: null });
      v.vel = 0;
    }
  }
  // remove far parked
  for (let i = VEHICLES.length - 1; i >= 0; i--) {
    const v = VEHICLES[i];
    if (!v.ai && v.driver === null && Math.hypot(v.x - cam.x, v.y - cam.y) > 1200) VEHICLES.splice(i, 1);
  }
}

function spawnPoliceIfNeeded(cam) {
  if (WANTED <= 0) {
    // remove police
    for (let i = VEHICLES.length - 1; i >= 0; i--) if (VEHICLES[i].isPolice) VEHICLES.splice(i, 1);
    return;
  }
  const police = VEHICLES.filter(v => v.isPolice).length;
  const desired = Math.min(WANTED + 1, 4);
  if (police < desired) {
    const sp = pickRoadSpawnNear(cam.x, cam.y, 600, 900);
    if (sp) {
      const v = spawnVehicle('police', sp.x, sp.y, 0, { ai: true, isPolice: true, siren: true });
      v.isPolice = true;
    }
  }
  // remove far police
  for (let i = VEHICLES.length - 1; i >= 0; i--) {
    const v = VEHICLES[i];
    if (v.isPolice && Math.hypot(v.x - cam.x, v.y - cam.y) > 1600) VEHICLES.splice(i, 1);
  }
}

function drawVehicles(ctx, cam) {
  for (const v of VEHICLES) {
    const sx = v.x - cam.x, sy = v.y - cam.y;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(sx, sy + 6, v.w * 0.45, v.h * 0.35, v.angle, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(v.angle);
    // body
    ctx.fillStyle = v.color;
    roundRect(ctx, -v.w / 2, -v.h / 2, v.w, v.h, 4);
    ctx.fill();
    // windshield
    ctx.fillStyle = 'rgba(200,230,255,0.5)';
    ctx.fillRect(v.w * 0.05, -v.h / 2 + 3, v.w * 0.25, v.h - 6);
    // headlights
    ctx.fillStyle = 'rgba(255,240,180,0.9)';
    ctx.fillRect(v.w / 2 - 4, -v.h / 2 + 2, 3, 4);
    ctx.fillRect(v.w / 2 - 4, v.h / 2 - 6, 3, 4);
    // taillights
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(-v.w / 2, -v.h / 2 + 2, 2, 4);
    ctx.fillRect(-v.w / 2, v.h / 2 - 6, 2, 4);
    if (v.isPolice) {
      // light bar
      const t = (performance.now() / 200) % 2;
      ctx.fillStyle = t < 1 ? '#ff3333' : '#3366ff';
      ctx.fillRect(-6, -v.h / 2 - 3, 6, 3);
      ctx.fillStyle = t < 1 ? '#3366ff' : '#ff3333';
      ctx.fillRect(0, -v.h / 2 - 3, 6, 3);
    }
    ctx.restore();
    // headlight cones at night if dark
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
