// The player can walk, sprint, fight, and swap between nearby cars.
// Foot movement resolves each axis independently to slide along city blocks.
// Health, armor, equipment, and the current ride remain on one shared record.
const PLAYER = {
  x: 0, y: 0, angle: 0, health: 100, armor: 0, weapon: "fists", ammo: 30,
  onFoot: true, vehicleId: -1, fireCd: 0, meleeCd: 0, deadTimer: 0,
  radius: 12, speed: 210, sprint: 360,
};

function initPlayer(x, y) {
  Object.assign(PLAYER, {
    x, y, angle: 0, health: 100, armor: 0, weapon: "fists", ammo: 30,
    onFoot: true, vehicleId: -1, fireCd: 0, meleeCd: 0, deadTimer: 0,
  });
}

function playerSpeed() {
  return INPUT.keys.ShiftLeft || INPUT.keys.ShiftRight ? PLAYER.sprint : PLAYER.speed;
}

function circleHitsSolid(cx, cy, radius) {
  const tileSize = CITY.T;
  const firstCol = Math.floor((cx - radius) / tileSize);
  const lastCol = Math.floor((cx + radius) / tileSize);
  const firstRow = Math.floor((cy - radius) / tileSize);
  const lastRow = Math.floor((cy + radius) / tileSize);

  for (let row = firstRow; row <= lastRow; row++) {
    for (let col = firstCol; col <= lastCol; col++) {
      if (row < 0 || col < 0 || row >= CITY.H || col >= CITY.W) return true;
      if (!CITY.solid[row][col]) continue;
      const left = col * tileSize;
      const top = row * tileSize;
      const nearX = Math.max(left, Math.min(cx, left + tileSize));
      const nearY = Math.max(top, Math.min(cy, top + tileSize));
      const dx = cx - nearX;
      const dy = cy - nearY;
      if (dx * dx + dy * dy < radius * radius) return true;
    }
  }
  return false;
}

function updatePlayer(dt) {
  if (PLAYER.deadTimer > 0) {
    PLAYER.deadTimer -= dt;
    if (PLAYER.deadTimer <= 0) respawnPlayer();
    return;
  }
  if (!PLAYER.onFoot) return;

  PLAYER.angle = Math.atan2(MOUSE.worldY - PLAYER.y, MOUSE.worldX - PLAYER.x);
  let moveX = 0;
  let moveY = 0;
  if (INPUT.keys.KeyW || INPUT.keys.ArrowUp) moveY--;
  if (INPUT.keys.KeyS || INPUT.keys.ArrowDown) moveY++;
  if (INPUT.keys.KeyA || INPUT.keys.ArrowLeft) moveX--;
  if (INPUT.keys.KeyD || INPUT.keys.ArrowRight) moveX++;
  const magnitude = Math.hypot(moveX, moveY);
  if (magnitude > 0) { moveX /= magnitude; moveY /= magnitude; }

  const stride = playerSpeed() * dt;
  let nextX = PLAYER.x + moveX * stride;
  let nextY = PLAYER.y + moveY * stride;
  if (circleHitsSolid(nextX, PLAYER.y, PLAYER.radius)) nextX = PLAYER.x;
  if (circleHitsSolid(PLAYER.x, nextY, PLAYER.radius)) nextY = PLAYER.y;
  if (circleHitsSolid(nextX, nextY, PLAYER.radius)) { nextX = PLAYER.x; nextY = PLAYER.y; }
  PLAYER.x = nextX;
  PLAYER.y = nextY;

  PLAYER.fireCd = Math.max(0, PLAYER.fireCd - dt);
  PLAYER.meleeCd = Math.max(0, PLAYER.meleeCd - dt);
  if (INPUT.justPressed.KeyE) tryEnterExitVehicle();
}

function tryEnterExitVehicle() {
  if (!PLAYER.onFoot) {
    const ride = VEHICLES.find((vehicle) => vehicle.id === PLAYER.vehicleId);
    if (ride) {
      PLAYER.x = ride.x + Math.cos(ride.angle + Math.PI / 2) * 40;
      PLAYER.y = ride.y + Math.sin(ride.angle + Math.PI / 2) * 40;
      ride.driver = null;
      PLAYER.onFoot = true;
      PLAYER.vehicleId = -1;
    }
    return;
  }

  let closest = null;
  let closestDistance = 70;
  for (const vehicle of VEHICLES) {
    const distance = Math.hypot(vehicle.x - PLAYER.x, vehicle.y - PLAYER.y);
    if (distance < closestDistance && !vehicle.driver) {
      closest = vehicle;
      closestDistance = distance;
    }
  }
  if (!closest) return;

  closest.driver = "player";
  PLAYER.onFoot = false;
  PLAYER.vehicleId = closest.id;
  if (closest.type !== "police" && closest.ai) {
    closest.ai = false;
    spawnPedFlee(closest.x, closest.y);
    wantedRaise(1);
  }
}

function playerFire() {
  if (PLAYER.deadTimer > 0 || !PLAYER.onFoot) return;
  if (PLAYER.weapon === "fists") {
    if (PLAYER.meleeCd > 0) return;
    PLAYER.meleeCd = 0.35;
    for (const pedestrian of PEDS) {
      if (Math.hypot(pedestrian.x - PLAYER.x, pedestrian.y - PLAYER.y) < 45) {
        pedestrian.health -= 40;
        pedestrian.knocked = true;
        pedestrian.knockTimer = 1.2;
        spawnParticles(pedestrian.x, pedestrian.y, "#fff", 6);
      }
    }
    for (const vehicle of VEHICLES) {
      if (Math.hypot(vehicle.x - PLAYER.x, vehicle.y - PLAYER.y) < 50) {
        vehicle.health -= 15;
        spawnParticles(vehicle.x, vehicle.y, "#ffaa33", 8);
      }
    }
    spawnMuzzle(PLAYER.x + Math.cos(PLAYER.angle) * 18, PLAYER.y + Math.sin(PLAYER.angle) * 18, PLAYER.angle);
    return;
  }

  if (PLAYER.weapon !== "pistol" || PLAYER.fireCd > 0 || PLAYER.ammo <= 0) return;
  PLAYER.fireCd = 0.18;
  PLAYER.ammo--;
  const bulletX = PLAYER.x + Math.cos(PLAYER.angle) * 20;
  const bulletY = PLAYER.y + Math.sin(PLAYER.angle) * 20;
  BULLETS.push({
    x: bulletX, y: bulletY,
    vx: Math.cos(PLAYER.angle) * 700, vy: Math.sin(PLAYER.angle) * 700,
    life: 1.2, damage: 35, owner: "player", color: "#ffe080",
  });
  spawnMuzzle(bulletX, bulletY, PLAYER.angle);
  spawnParticles(bulletX, bulletY, "#fff", 4);
}

function damagePlayer(amount) {
  if (PLAYER.deadTimer > 0) return;
  const absorbed = Math.min(PLAYER.armor, amount);
  PLAYER.armor -= absorbed;
  PLAYER.health -= amount - absorbed;
  if (PLAYER.health > 0) return;

  PLAYER.health = 0;
  if (!PLAYER.onFoot) {
    const ride = VEHICLES.find((vehicle) => vehicle.id === PLAYER.vehicleId);
    if (ride) ride.health = 0;
  }
  PLAYER.deadTimer = 3;
  STATE = "DEAD";
}

function respawnPlayer() {
  const hospital = hospitalPos();
  initPlayer(hospital.x, hospital.y);
  CASH = Math.max(0, CASH - 200);
  WANTED = Math.max(0, WANTED - 1);
  STATE = "PLAYING";
  if (window.GAME && window.GAME.onRespawn) window.GAME.onRespawn();
}

function drawPlayer(ctx, cam) {
  if (PLAYER.deadTimer > 0 || !PLAYER.onFoot) return;
  const screenX = PLAYER.x - cam.x;
  const screenY = PLAYER.y - cam.y;
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(screenX, screenY + 8, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(PLAYER.angle);
  ctx.fillStyle = CONFIG.COLORS.player; ctx.fillRect(-8, -6, 16, 12);
  ctx.fillStyle = CONFIG.COLORS.playerSkin;
  ctx.beginPath(); ctx.arc(6, 0, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PLAYER.weapon === "pistol" ? "#333" : "#555";
  ctx.fillRect(8, PLAYER.weapon === "pistol" ? -2 : -3, PLAYER.weapon === "pistol" ? 12 : 8, PLAYER.weapon === "pistol" ? 4 : 6);
  ctx.restore();
}

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
