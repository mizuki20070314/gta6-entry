// Neighbors stroll on sidewalks, scatter from danger, and sometimes call in heat.
// Knockback and recovery give crowds a little physical response to a collision.
// Population is replenished around the camera and trimmed beyond the active area.
let PEDS = [];
window.PEDS = PEDS;

function spawnPed(x, y) {
  const skinTones = ["#e8c9a0", "#d9b89a", "#bfa07a"];
  const outfits = ["#4a6fa5", "#c94a5a", "#7fb069", "#e8c547", "#8a7a6a"];
  const pedestrian = {
    x, y,
    angle: Math.random() * Math.PI * 2,
    speed: 40 + Math.random() * 30,
    state: "walk",
    knockTimer: 0, vx: 0, vy: 0, health: 60,
    color: skinTones[Math.floor(Math.random() * skinTones.length)],
    clothes: outfits[Math.floor(Math.random() * outfits.length)],
    callPoliceTimer: 0,
  };
  PEDS.push(pedestrian);
  return pedestrian;
}

function updatePeds(dt) {
  for (let index = PEDS.length - 1; index >= 0; index--) {
    const pedestrian = PEDS[index];
    if (pedestrian.health <= 0) { PEDS.splice(index, 1); continue; }

    if (pedestrian.knocked) {
      pedestrian.knockTimer -= dt;
      pedestrian.x += pedestrian.vx * dt;
      pedestrian.y += pedestrian.vy * dt;
      pedestrian.vx *= 0.9;
      pedestrian.vy *= 0.9;
      if (pedestrian.knockTimer <= 0) {
        pedestrian.knocked = false;
        pedestrian.state = "flee";
        pedestrian.speed = 140;
      }
      continue;
    }

    if (pedestrian.state === "walk") {
      pedestrian.angle += (Math.random() - 0.5) * 2 * dt;
      if (SHOT_RECENT > 0) { pedestrian.state = "flee"; pedestrian.speed = 150; }
      for (const vehicle of VEHICLES) {
        if (Math.abs(vehicle.vel) > 200 && Math.hypot(vehicle.x - pedestrian.x, vehicle.y - pedestrian.y) < 120) {
          pedestrian.state = "flee";
          pedestrian.speed = 160;
        }
      }
    }

    if (pedestrian.state === "flee") {
      const awayX = pedestrian.x - PLAYER.x;
      const awayY = pedestrian.y - PLAYER.y;
      const gap = Math.hypot(awayX, awayY) || 1;
      pedestrian.angle = Math.atan2(awayY / gap * 100, awayX / gap * 100);
      pedestrian.callPoliceTimer += dt;
      if (pedestrian.callPoliceTimer > 2 && WANTED < 5 && Math.random() < 0.005) {
        wantedRaise(1);
        pedestrian.callPoliceTimer = 999;
      }
    }

    let nextX = pedestrian.x + Math.cos(pedestrian.angle) * pedestrian.speed * dt;
    let nextY = pedestrian.y + Math.sin(pedestrian.angle) * pedestrian.speed * dt;
    if (CITY.isSolid(nextX, pedestrian.y)) nextX = pedestrian.x;
    if (CITY.isSolid(pedestrian.x, nextY)) nextY = pedestrian.y;
    if (CITY.isSolid(nextX, nextY)) {
      nextX = pedestrian.x;
      nextY = pedestrian.y;
      pedestrian.angle += Math.PI / 2;
    }
    pedestrian.x = Math.max(10, Math.min(CITY.worldW - 10, nextX));
    pedestrian.y = Math.max(10, Math.min(CITY.worldH - 10, nextY));
  }
  spawnPedsAround(CAMERA);
}

function spawnPedsAround(cam) {
  if (PEDS.length < 40) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const road = CITY.roadSpawns[Math.floor(Math.random() * CITY.roadSpawns.length)];
      if (!road) break;
      const x = road.x + (Math.random() - 0.5) * 120;
      const y = road.y + (Math.random() - 0.5) * 120;
      if (Math.hypot(x - cam.x, y - cam.y) < 900 && !CITY.isSolid(x, y)) spawnPed(x, y);
    }
  }
  for (let index = PEDS.length - 1; index >= 0; index--) {
    if (Math.hypot(PEDS[index].x - cam.x, PEDS[index].y - cam.y) > 1500) PEDS.splice(index, 1);
  }
}

function drawPeds(ctx, cam) {
  for (const pedestrian of PEDS) {
    const screenX = pedestrian.x - cam.x;
    const screenY = pedestrian.y - cam.y;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(screenX, screenY + 6, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.fillStyle = pedestrian.clothes; ctx.fillRect(-4, -2, 8, 10);
    ctx.fillStyle = pedestrian.color;
    ctx.beginPath(); ctx.arc(0, -6, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (pedestrian.knocked) {
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "10px sans-serif";
      ctx.fillText("!", screenX, screenY - 10);
    }
  }
}

window.spawnPed = spawnPed;
window.updatePeds = updatePeds;
window.drawPeds = drawPeds;
window.PEDS = PEDS;
window.spawnPedFleeImpl = function (x, y) { spawnPed(x, y); };
