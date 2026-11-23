// The frame loop routes updates by game state before drawing the shared world.
// Camera easing, wanted feedback, bullets, lighting, and shot timing meet here.
// A frozen capture stops simulation while leaving the final image on screen.
function wantedRaise(amount) {
  WANTED = Math.min(5, WANTED + (amount || 1));
  if (window.setWantedFlash) window.setWantedFlash(0.6);
}

function getPlayerPos() {
  if (!PLAYER.onFoot && PLAYER.vehicleId >= 0) {
    const ride = VEHICLES.find((vehicle) => vehicle.id === PLAYER.vehicleId);
    if (ride) return { x: ride.x, y: ride.y };
  }
  return { x: PLAYER.x, y: PLAYER.y };
}

function updateWanted(dt) {
  if (WANTED <= 0) return;
  const player = getPlayerPos();
  const nearby = VEHICLES.some((vehicle) => vehicle.isPolice && Math.hypot(vehicle.x - player.x, vehicle.y - player.y) < 500);
  if (!nearby) WANTED = Math.max(0, WANTED - dt / CONFIG.WANTED_DECAY);
}

function updateBullets(dt) {
  for (let index = BULLETS.length - 1; index >= 0; index--) {
    const bullet = BULLETS[index];
    bullet.life -= dt;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    if (bullet.life <= 0) { BULLETS.splice(index, 1); continue; }
    if (CITY.isSolid(bullet.x, bullet.y)) {
      spawnParticles(bullet.x, bullet.y, "#aaa", 4);
      BULLETS.splice(index, 1);
      continue;
    }

    if (bullet.owner === "player") {
      let hit = false;
      for (const pedestrian of PEDS) {
        if (Math.hypot(pedestrian.x - bullet.x, pedestrian.y - bullet.y) >= 10) continue;
        pedestrian.health -= bullet.damage;
        pedestrian.knocked = true;
        pedestrian.knockTimer = 0.8;
        pedestrian.state = "flee";
        spawnParticles(bullet.x, bullet.y, "#f00", 6);
        BULLETS.splice(index, 1);
        hit = true;
        break;
      }
      if (hit) continue;
      for (const vehicle of VEHICLES) {
        if (Math.hypot(vehicle.x - bullet.x, vehicle.y - bullet.y) >= 22) continue;
        vehicle.health -= bullet.damage;
        spawnParticles(bullet.x, bullet.y, "#ffaa33", 6);
        BULLETS.splice(index, 1);
        hit = true;
        break;
      }
      if (hit) continue;
    } else if (PLAYER.onFoot) {
      if (Math.hypot(PLAYER.x - bullet.x, PLAYER.y - bullet.y) < 12) {
        damagePlayer(bullet.damage);
        spawnParticles(bullet.x, bullet.y, "#f00", 6);
        BULLETS.splice(index, 1);
      }
    } else {
      const ride = VEHICLES.find((vehicle) => vehicle.id === PLAYER.vehicleId);
      if (ride && Math.hypot(ride.x - bullet.x, ride.y - bullet.y) < 22) {
        ride.health -= bullet.damage;
        BULLETS.splice(index, 1);
      }
    }
  }
}

function update(dt) {
  if (STATE === "TITLE" || STATE === "PAUSED") return;
  if (STATE === "SHOP") { updateEffects(dt); return; }
  if (STATE === "DEAD") {
    updatePlayer(dt);
    updateEffects(dt);
    return;
  }
  if (STATE === "BUSTED") {
    if (window.updateBusted) updateBusted(dt);
    updateEffects(dt);
    return;
  }
  if (STATE === "MISSION_DIALOG") { updateEffects(dt); return; }

  if (SHOT_RECENT > 0) SHOT_RECENT = Math.max(0, SHOT_RECENT - dt);
  if (INPUT.justPressed.Space && PLAYER.onFoot) playerFire();
  updatePlayer(dt);
  updateVehicles(dt);
  updatePeds(dt);
  updateBullets(dt);
  updateEffects(dt);
  if (window.updatePolice) updatePolice(dt);
  if (window.updateBusted) updateBusted(dt);
  updateMissions(dt);
  if (window.updateAudio) updateAudio(dt);

  if (window.WANTED_FLASH && window.setWantedFlash) {
    const remaining = window.WANTED_FLASH();
    if (remaining > 0) window.setWantedFlash(Math.max(0, remaining - dt));
  }
  const target = getPlayerPos();
  const follow = Math.min(1, dt * 6);
  CAMERA.x += (target.x - CONFIG.CANVAS_W / 2 - CAMERA.x) * follow;
  CAMERA.y += (target.y - CONFIG.CANVAS_H / 2 - CAMERA.y) * follow;
  CAMERA.x = Math.max(0, Math.min(CITY.worldW - CONFIG.CANVAS_W, CAMERA.x));
  CAMERA.y = Math.max(0, Math.min(CITY.worldH - CONFIG.CANVAS_H, CAMERA.y));
  MOUSE.worldX = MOUSE.x + CAMERA.x;
  MOUSE.worldY = MOUSE.y + CAMERA.y;
  spawnTrafficAround(CAMERA);
  spawnParkedAround(CAMERA);
  DAY_TIME = (DAY_TIME + dt / CONFIG.DAY_LENGTH) % 1;
  if (SHOT_MODE) updateShot(dt);
  INPUT.justPressed = {};
}

function drawHeadlights(ctx, cam, day) {
  if (day >= 0.35 && day <= 0.75) return;
  ctx.globalCompositeOperation = "lighter";
  for (const vehicle of VEHICLES) {
    const screenX = vehicle.x - cam.x;
    const screenY = vehicle.y - cam.y;
    const reach = 180;
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(vehicle.angle);
    const beam = ctx.createRadialGradient(reach * 0.5, 0, 10, reach * 0.5, 0, reach);
    beam.addColorStop(0, "rgba(255,240,180,0.35)");
    beam.addColorStop(1, "rgba(255,240,180,0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(reach, -reach * Math.tan(0.35));
    ctx.lineTo(reach, reach * Math.tan(0.35));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.globalCompositeOperation = "source-over";
}

function drawLighting(ctx, day) {
  const darkness = day < 0.5 ? (0.5 - day) * 2 : (day > 0.7 ? (day - 0.7) * 3.33 : 0);
  const tint = Math.max(0, Math.min(0.6, darkness * 0.6));
  if (tint > 0) {
    ctx.fillStyle = "rgba(10,10,40," + tint + ")";
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  }
  if (day > 0.4 && day < 0.65) {
    const glow = 1 - Math.abs(day - 0.5) * 4;
    ctx.fillStyle = "rgba(255,140,60," + 0.12 * glow + ")";
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  }

  const vignette = ctx.createRadialGradient(
    CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2, CONFIG.CANVAS_H * 0.3,
    CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2, CONFIG.CANVAS_H * 0.85,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

  if (day > 0.76 || day < 0.24) drawMoonlight(ctx);
}

function drawMoonlight(ctx) {
  const moonX = CONFIG.CANVAS_W * 0.79;
  const moonY = 98;
  const halo = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 70);
  halo.addColorStop(0, "rgba(255,244,204,0.2)");
  halo.addColorStop(1, "rgba(255,244,204,0)");
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(moonX, moonY, 70, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,244,204,0.82)";
  ctx.beginPath(); ctx.arc(moonX, moonY, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(42,60,82,0.35)";
  ctx.beginPath(); ctx.arc(moonX + 8, moonY - 6, 17, 0, Math.PI * 2); ctx.fill();
}

function render() {
  let shakeX = 0;
  let shakeY = 0;
  if (SCREEN_SHAKE.t > 0) {
    shakeX = (Math.random() - 0.5) * SCREEN_SHAKE.mag;
    shakeY = (Math.random() - 0.5) * SCREEN_SHAKE.mag;
  }
  ctx.save();
  ctx.translate(shakeX, shakeY);
  ctx.fillStyle = "#1a1a2a";
  ctx.fillRect(-10, -10, CONFIG.CANVAS_W + 20, CONFIG.CANVAS_H + 20);
  if (STATE !== "TITLE") {
    drawCity(ctx, CAMERA, DAY_TIME);
    drawSkidMarks(ctx, CAMERA);
    drawPeds(ctx, CAMERA);
    drawVehicles(ctx, CAMERA);
    if (window.drawPoliceExtras) drawPoliceExtras(ctx, CAMERA);
    if (PLAYER.onFoot) drawPlayer(ctx, CAMERA);
    for (const bullet of BULLETS) {
      ctx.fillStyle = bullet.color;
      ctx.beginPath(); ctx.arc(bullet.x - CAMERA.x, bullet.y - CAMERA.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    drawParticles(ctx, CAMERA);
    drawLighting(ctx, DAY_TIME);
    drawHeadlights(ctx, CAMERA, DAY_TIME);

    const marker = getMissionMarker();
    const briefingMarker = SHOT_MODE === "mission" && STATE === "MISSION_DIALOG";
    if (marker && (STATE === "PLAYING" || briefingMarker)) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 200);
      const screenX = marker.x - CAMERA.x;
      const screenY = marker.y - CAMERA.y;
      ctx.strokeStyle = "rgba(255,68,170,0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(screenX, screenY, 24 + pulse * 8, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(255,68,170,0.6)";
      ctx.beginPath(); ctx.arc(screenX, screenY, 6, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();

  if (STATE === "TITLE") drawTitle(ctx);
  else {
    drawHUD(ctx, CAMERA);
    if (STATE === "PAUSED") drawPause(ctx);
    if (STATE === "DEAD") drawDead(ctx);
    if (STATE === "BUSTED" && window.drawBustedOverlay) drawBustedOverlay(ctx);
    if (MISSION_COMPLETE_TIMER > 0) drawMissionComplete(ctx);
    if (STATE === "MISSION_DIALOG") drawMissionDialog(ctx);
    if (STATE === "SHOP" && typeof drawShop === "function") drawShop(ctx);
  }
}

function startLoop() {
  let previous = performance.now();
  function loop(now) {
    const delta = Math.min(0.05, (now - previous) / 1000);
    previous = now;
    if (!FROZEN) update(delta);
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

window.startLoop = startLoop;
window.update = update;
window.render = render;
window.getPlayerPos = getPlayerPos;
window.wantedRaise = wantedRaise;
window.updateWanted = updateWanted;
window.updateBullets = updateBullets;
window.renderFrame = render;
window.drawHeadlights = drawHeadlights;
window.drawLighting = drawLighting;
window.startLoopPublic = startLoop;
