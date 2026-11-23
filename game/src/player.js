// player.js — on-foot player
const PLAYER = {
  x: 0, y: 0, angle: 0, health: 100, weapon: 'fists', ammo: 30,
  onFoot: true, vehicleId: -1, fireCd: 0, meleeCd: 0, deadTimer: 0,
  radius: 12, speed: 210, sprint: 360,
};

function initPlayer(x, y) {
  PLAYER.x = x; PLAYER.y = y; PLAYER.angle = 0; PLAYER.health = 100;
  PLAYER.weapon = 'fists'; PLAYER.ammo = 30; PLAYER.onFoot = true;
  PLAYER.vehicleId = -1; PLAYER.fireCd = 0; PLAYER.meleeCd = 0; PLAYER.deadTimer = 0;
}

function playerSpeed() {
  const s = INPUT.keys['ShiftLeft'] || INPUT.keys['ShiftRight'] ? PLAYER.sprint : PLAYER.speed;
  return s;
}

function moveCircle(x, y, r) {
  // returns {x,y} adjusted for collisions
  let nx = x, ny = y;
  // x
  if (CITY.isSolid(nx + (nx > PLAYER.x ? r : -r), PLAYER.y)) nx = PLAYER.x;
  // Actually handle axis separately using current
  return { x: nx, y: ny };
}

function updatePlayer(dt) {
  if (PLAYER.deadTimer > 0) { PLAYER.deadTimer -= dt; if (PLAYER.deadTimer <= 0) respawnPlayer(); return; }
  if (!PLAYER.onFoot) return;
  // aim
  const dx = MOUSE.worldX - PLAYER.x, dy = MOUSE.worldY - PLAYER.y;
  PLAYER.angle = Math.atan2(dy, dx);
  // movement
  let mx = 0, my = 0;
  if (INPUT.keys['KeyW'] || INPUT.keys['ArrowUp']) my -= 1;
  if (INPUT.keys['KeyS'] || INPUT.keys['ArrowDown']) my += 1;
  if (INPUT.keys['KeyA'] || INPUT.keys['ArrowLeft']) mx -= 1;
  if (INPUT.keys['KeyD'] || INPUT.keys['ArrowRight']) mx += 1;
  const len = Math.hypot(mx, my);
  if (len > 0) { mx /= len; my /= len; }
  const sp = playerSpeed();
  let nx = PLAYER.x + mx * sp * dt;
  let ny = PLAYER.y + my * sp * dt;
  // collision X
  if (circleHitsSolid(nx, PLAYER.y, PLAYER.radius)) nx = PLAYER.x;
  // collision Y
  if (circleHitsSolid(PLAYER.x, ny, PLAYER.radius)) ny = PLAYER.y;
  // both
  if (circleHitsSolid(nx, ny, PLAYER.radius)) { nx = PLAYER.x; ny = PLAYER.y; }
  PLAYER.x = nx; PLAYER.y = ny;

  if (PLAYER.fireCd > 0) PLAYER.fireCd -= dt;
  if (PLAYER.meleeCd > 0) PLAYER.meleeCd -= dt;

  // enter/exit vehicle
  if (INPUT.justPressed['KeyE']) tryEnterExitVehicle();
}

function circleHitsSolid(cx, cy, r) {
  // check tile neighbors
  const T = CITY.T;
  const minTx = Math.floor((cx - r) / T), maxTx = Math.floor((cx + r) / T);
  const minTy = Math.floor((cy - r) / T), maxTy = Math.floor((cy + r) / T);
  for (let ty = minTy; ty <= maxTy; ty++)
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (tx < 0 || ty < 0 || tx >= CITY.W || ty >= CITY.H) return true;
      if (!CITY.solid[ty][tx]) continue;
      // tile rect
      const rx = tx * T, ry = ty * T;
      // circle vs rect
      const closestX = Math.max(rx, Math.min(cx, rx + T));
      const closestY = Math.max(ry, Math.min(cy, ry + T));
      const ddx = cx - closestX, ddy = cy - closestY;
      if (ddx * ddx + ddy * ddy < r * r) return true;
    }
  return false;
}

function tryEnterExitVehicle() {
  if (PLAYER.onFoot) {
    // find nearest vehicle within 70
    let best = null, bestD = 70;
    for (const v of VEHICLES) {
      const d = Math.hypot(v.x - PLAYER.x, v.y - PLAYER.y);
      if (d < bestD && !v.driver) { bestD = d; best = v; }
    }
    if (best) {
      // carjack if traffic car? raises wanted
      if (best.type !== 'police' && best.ai) {
        best.ai = false;
        best.driver = 'player';
        PLAYER.onFoot = false;
        PLAYER.vehicleId = best.id;
        spawnPedFlee(best.x, best.y);
        wantedRaise(1);
      } else if (!best.ai) {
        best.driver = 'player';
        PLAYER.onFoot = false;
        PLAYER.vehicleId = best.id;
      } else {
        // parked/static (no driver) steal
        best.driver = 'player';
        PLAYER.onFoot = false;
        PLAYER.vehicleId = best.id;
      }
    }
  } else {
    // exit
    const v = VEHICLES.find(x => x.id === PLAYER.vehicleId);
    if (v) {
      PLAYER.x = v.x + Math.cos(v.angle + Math.PI / 2) * 40;
      PLAYER.y = v.y + Math.sin(v.angle + Math.PI / 2) * 40;
      v.driver = null;
      PLAYER.onFoot = true;
      PLAYER.vehicleId = -1;
    }
  }
}

function playerFire() {
  if (PLAYER.deadTimer > 0) return;
  if (!PLAYER.onFoot) return;
  if (PLAYER.weapon === 'fists') {
    if (PLAYER.meleeCd > 0) return;
    PLAYER.meleeCd = 0.35;
    // hit peds/vehicles near
    for (const p of PEDS) {
      if (Math.hypot(p.x - PLAYER.x, p.y - PLAYER.y) < 45) {
        p.health -= 40; p.knocked = true; p.knockTimer = 1.2;
        spawnParticles(p.x, p.y, '#fff', 6);
      }
    }
    for (const v of VEHICLES) {
      if (Math.hypot(v.x - PLAYER.x, v.y - PLAYER.y) < 50) {
        v.health -= 15; spawnParticles(v.x, v.y, '#ffaa33', 8);
      }
    }
    spawnMuzzle(PLAYER.x + Math.cos(PLAYER.angle) * 18, PLAYER.y + Math.sin(PLAYER.angle) * 18, PLAYER.angle);
  } else if (PLAYER.weapon === 'pistol') {
    if (PLAYER.fireCd > 0) return;
    if (PLAYER.ammo <= 0) return;
    PLAYER.fireCd = 0.18;
    PLAYER.ammo--;
    const bx = PLAYER.x + Math.cos(PLAYER.angle) * 20;
    const by = PLAYER.y + Math.sin(PLAYER.angle) * 20;
    BULLETS.push({ x: bx, y: by, vx: Math.cos(PLAYER.angle) * 700, vy: Math.sin(PLAYER.angle) * 700, life: 1.2, damage: 35, owner: 'player', color: '#ffe080' });
    spawnMuzzle(bx, by, PLAYER.angle);
    spawnParticles(bx, by, '#fff', 4);
  }
}

function damagePlayer(amount) {
  if (PLAYER.deadTimer > 0) return;
  PLAYER.health -= amount;
  if (PLAYER.health <= 0) {
    PLAYER.health = 0;
    // if in vehicle, explode?
    if (!PLAYER.onFoot) {
      const v = VEHICLES.find(x => x.id === PLAYER.vehicleId);
      if (v) { v.health = 0; }
    }
    PLAYER.deadTimer = 3; // respawn after
    STATE = 'DEAD';
  }
}

function respawnPlayer() {
  const hosp = { x: CITY.worldW * 0.35, y: CITY.worldH * 0.45 };
  // find hospital? just fixed near center-west
  initPlayer(hosp.x, hosp.y);
  CASH = Math.max(0, CASH - 200);
  WANTED = Math.max(0, WANTED - 1);
  STATE = 'PLAYING';
  if (window.GAME && window.GAME.onRespawn) window.GAME.onRespawn();
}

function drawPlayer(ctx, cam) {
  if (PLAYER.deadTimer > 0) return;
  if (!PLAYER.onFoot) return;
  const sx = PLAYER.x - cam.x, sy = PLAYER.y - cam.y;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 8, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
  // body
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(PLAYER.angle);
  // legs/body
  ctx.fillStyle = CONFIG.COLORS.player;
  ctx.fillRect(-8, -6, 16, 12);
  ctx.fillStyle = CONFIG.COLORS.playerSkin;
  ctx.beginPath(); ctx.arc(6, 0, 5, 0, Math.PI * 2); ctx.fill();
  // weapon
  if (PLAYER.weapon === 'pistol') {
    ctx.fillStyle = '#333';
    ctx.fillRect(8, -2, 12, 4);
  } else {
    ctx.fillStyle = '#555';
    ctx.fillRect(8, -3, 8, 6);
  }
  ctx.restore();
}

// helpers for vehicles module to call
function spawnPedFlee(x, y) {
  if (window.spawnPedFleeImpl) window.spawnPedFleeImpl(x, y);
}

window.PLAYER = PLAYER;
window.initPlayer = initPlayer;
window.updatePlayer = updatePlayer;
window.drawPlayer = drawPlayer;
window.damagePlayer = damagePlayer;
window.respawnPlayer = respawnPlayer;
window.playerFire = playerFire;
window.circleHitsSolid = circleHitsSolid;
window.tryEnterExitVehicle = tryEnterExitVehicle;
