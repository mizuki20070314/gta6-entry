// game.js — main loop, state machine, drawing orchestration
function wantedRaise(amount) {
  WANTED = Math.min(5, WANTED + (amount || 1));
  if (window.setWantedFlash) window.setWantedFlash(0.6);
}
function getPlayerPos() {
  if (!PLAYER.onFoot && PLAYER.vehicleId >= 0) {
    const v = VEHICLES.find(x => x.id === PLAYER.vehicleId);
    if (v) return { x: v.x, y: v.y };
  }
  return { x: PLAYER.x, y: PLAYER.y };
}

function updateWanted(dt) {
  if (WANTED <= 0) return;
  let policeNear = false;
  const pp = getPlayerPos();
  for (const v of VEHICLES) if (v.isPolice && Math.hypot(v.x - pp.x, v.y - pp.y) < 500) policeNear = true;
  if (!policeNear) {
    WANTED = Math.max(0, WANTED - dt / CONFIG.WANTED_DECAY);
  }
}

function updateBullets(dt) {
  for (let i = BULLETS.length - 1; i >= 0; i--) {
    const b = BULLETS[i];
    b.life -= dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.life <= 0) { BULLETS.splice(i, 1); continue; }
    if (CITY.isSolid(b.x, b.y)) { spawnParticles(b.x, b.y, '#aaa', 4); BULLETS.splice(i, 1); continue; }
    if (b.owner === 'player') {
      let hit = false;
      for (const p of PEDS) {
        if (Math.hypot(p.x - b.x, p.y - b.y) < 10) {
          p.health -= b.damage; p.knocked = true; p.knockTimer = 0.8; p.state = 'flee';
          spawnParticles(b.x, b.y, '#f00', 6);
          BULLETS.splice(i, 1); hit = true; break;
        }
      }
      if (hit) continue;
      for (const v of VEHICLES) {
        if (Math.hypot(v.x - b.x, v.y - b.y) < 22) {
          v.health -= b.damage;
          spawnParticles(b.x, b.y, '#ffaa33', 6);
          BULLETS.splice(i, 1); hit = true; break;
        }
      }
    } else {
      if (PLAYER.onFoot) {
        if (Math.hypot(PLAYER.x - b.x, PLAYER.y - b.y) < 12) {
          damagePlayer(b.damage);
          spawnParticles(b.x, b.y, '#f00', 6);
          BULLETS.splice(i, 1); continue;
        }
      } else {
        const v = VEHICLES.find(x => x.id === PLAYER.vehicleId);
        if (v && Math.hypot(v.x - b.x, v.y - b.y) < 22) {
          v.health -= b.damage;
          BULLETS.splice(i, 1); continue;
        }
      }
    }
  }
}

function update(dt) {
  if (STATE === 'TITLE') return;
  if (STATE === 'PAUSED') return;
  if (STATE === 'SHOP') { updateEffects(dt); return; }
  if (STATE === 'DEAD') {
    updatePlayer(dt);
    updateEffects(dt);
    return;
  }
  if (STATE === 'BUSTED') {
    if (window.updateBusted) updateBusted(dt);
    updateEffects(dt);
    return;
  }
  if (STATE === 'MISSION_DIALOG') {
    updateEffects(dt);
    return;
  }
  // PLAYING
  if (SHOT_RECENT > 0) SHOT_RECENT = Math.max(0, SHOT_RECENT - dt);
  if (INPUT.justPressed['Space'] && PLAYER.onFoot) playerFire();
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
    const f = window.WANTED_FLASH();
    if (f > 0) window.setWantedFlash(Math.max(0, f - dt));
  }
  const tp = getPlayerPos();
  CAMERA.x += (tp.x - CONFIG.CANVAS_W / 2 - CAMERA.x) * Math.min(1, dt * 6);
  CAMERA.y += (tp.y - CONFIG.CANVAS_H / 2 - CAMERA.y) * Math.min(1, dt * 6);
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
  const dark = day < 0.35 || day > 0.75;
  if (!dark) return;
  ctx.globalCompositeOperation = 'lighter';
  const sources = [];
  for (const v of VEHICLES) sources.push(v);
  for (const v of sources) {
    const sx = v.x - cam.x, sy = v.y - cam.y;
    const coneLen = 180;
    const coneW = 0.35;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(v.angle);
    const g = ctx.createRadialGradient(coneLen * 0.5, 0, 10, coneLen * 0.5, 0, coneLen);
    g.addColorStop(0, 'rgba(255,240,180,0.35)');
    g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(coneLen, -coneLen * Math.tan(coneW));
    ctx.lineTo(coneLen, coneLen * Math.tan(coneW));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawLighting(ctx, day) {
  const darkness = day < 0.5 ? (0.5 - day) * 2 : (day > 0.7 ? (day - 0.7) * 3.33 : 0);
  const d = Math.max(0, Math.min(0.6, darkness * 0.6));
  if (d > 0) {
    ctx.fillStyle = 'rgba(10,10,40,' + d + ')';
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  }
  if (day > 0.4 && day < 0.65) {
    const t = 1 - Math.abs(day - 0.5) * 4;
    ctx.fillStyle = 'rgba(255,140,60,' + (0.12 * t) + ')';
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  }
  const g = ctx.createRadialGradient(CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2, CONFIG.CANVAS_H * 0.3, CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2, CONFIG.CANVAS_H * 0.85);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
}

function render() {
  let shx = 0, shy = 0;
  if (SCREEN_SHAKE.t > 0) {
    shx = (Math.random() - 0.5) * SCREEN_SHAKE.mag;
    shy = (Math.random() - 0.5) * SCREEN_SHAKE.mag;
  }
  ctx.save();
  ctx.translate(shx, shy);
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(-10, -10, CONFIG.CANVAS_W + 20, CONFIG.CANVAS_H + 20);
  if (STATE !== 'TITLE') {
    drawCity(ctx, CAMERA, DAY_TIME);
    drawSkidMarks(ctx, CAMERA);
    drawPeds(ctx, CAMERA);
    drawVehicles(ctx, CAMERA);
    if (window.drawPoliceExtras) drawPoliceExtras(ctx, CAMERA);
    if (PLAYER.onFoot && STATE !== 'TITLE') drawPlayer(ctx, CAMERA);
    for (const b of BULLETS) {
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(b.x - CAMERA.x, b.y - CAMERA.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    drawParticles(ctx, CAMERA);
    drawHeadlights(ctx, CAMERA, DAY_TIME);
    drawLighting(ctx, DAY_TIME);
    const mm = getMissionMarker();
    if (mm && STATE === 'PLAYING') {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 200);
      const sx = mm.x - CAMERA.x, sy = mm.y - CAMERA.y;
      ctx.strokeStyle = 'rgba(255,68,170,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sx, sy, 24 + pulse * 8, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,68,170,0.6)';
      ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
  if (STATE === 'TITLE') drawTitle(ctx);
  else {
    drawHUD(ctx, CAMERA);
    if (STATE === 'PAUSED') drawPause(ctx);
    if (STATE === 'DEAD') drawDead(ctx);
    if (STATE === 'BUSTED' && window.drawBustedOverlay) drawBustedOverlay(ctx);
    if (MISSION_COMPLETE_TIMER > 0) drawMissionComplete(ctx);
    if (STATE === 'MISSION_DIALOG') drawMissionDialog(ctx);
    if (STATE === 'SHOP' && typeof drawShop === 'function') drawShop(ctx);
  }
}

function startLoop() {
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!FROZEN) update(dt);
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
window.startLoop = startLoop;
window.update = update;
window.render = render;
window.getPlayerPos = getPlayerPos;
