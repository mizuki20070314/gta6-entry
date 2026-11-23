// The HUD keeps health, armor, cash, heat, and equipment readable at a glance.
// Its compact map mirrors the street grid and marks objectives and police units.
// Off-screen objectives also get an edge arrow, while the district name stays visible.
function drawHUD(ctx, cam) {
  const width = CONFIG.CANVAS_W;
  const height = CONFIG.CANVAS_H;
  const player = PLAYER;

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(12, 12, 220, 26);
  ctx.fillStyle = "#333"; ctx.fillRect(16, 16, 212, 18);
  const healthRatio = player.health / CONFIG.PLAYER_MAX_HEALTH;
  ctx.fillStyle = healthRatio > 0.5 ? "#7fd67f" : (healthRatio > 0.25 ? "#e8c547" : "#ff5555");
  ctx.fillRect(16, 16, 212 * healthRatio, 18);
  ctx.fillStyle = "#fff"; ctx.font = "12px sans-serif";
  ctx.fillText("HP " + Math.ceil(player.health), 20, 30);

  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(12, 40, 220, 14);
  ctx.fillStyle = "#333"; ctx.fillRect(16, 42, 212, 10);
  ctx.fillStyle = "#9bbcff"; ctx.fillRect(16, 42, 212 * ((player.armor || 0) / 100), 10);
  ctx.fillStyle = "#fff"; ctx.font = "10px sans-serif";
  ctx.fillText("AR " + Math.ceil(player.armor || 0), 20, 50);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(width - 180, 12, 168, 26);
  ctx.fillStyle = CONFIG.COLORS.cash; ctx.font = "bold 16px sans-serif";
  ctx.fillText("$" + CASH, width - 20, 30);
  ctx.textAlign = "left";

  const starsX = width - 180;
  const starsY = 46;
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(starsX, starsY - 4, 168, 24);
  const flashing = window.WANTED_FLASH && window.WANTED_FLASH() > 0;
  for (let star = 0; star < 5; star++) {
    drawStar(ctx, starsX + 16 + star * 30, starsY + 8, flashing && star < WANTED ? 13 : 10, star < WANTED);
  }

  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(12, height - 180, 120, 22);
  ctx.fillStyle = "#fff"; ctx.font = "12px sans-serif";
  const equipment = player.onFoot
    ? player.weapon + (player.weapon === "pistol" ? " (" + player.ammo + ")" : "")
    : "In vehicle";
  ctx.fillText(equipment, 18, height - 164);
  drawMinimap(ctx);

  const step = typeof currentStep === "function" ? currentStep() : null;
  const shotLabel = typeof window.SHOT_BANNER === "function" ? window.SHOT_BANNER() : window.SHOT_BANNER;
  const label = shotLabel || (step ? step.label : null);
  if (label && STATE === "PLAYING") {
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(width / 2 - 260, height - 60, 520, 40);
    ctx.fillStyle = "#f2e9d8"; ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center"; ctx.fillText(label, width / 2, height - 36);
    if (step && step.timer) {
      ctx.font = "12px sans-serif"; ctx.fillStyle = "#e8c547";
      ctx.fillText("Time: " + Math.ceil(MISSION_TIMER), width / 2, height - 18);
    }
    ctx.textAlign = "left";
  }

  const marker = typeof getMissionMarker === "function" ? getMissionMarker() : null;
  if (marker && STATE === "PLAYING") drawTargetArrow(ctx, marker);
  const position = playerPosition();
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(12, 46, 140, 18);
  ctx.fillStyle = "#f2e9d8"; ctx.font = "11px sans-serif";
  ctx.fillText(CITY.districtAt(position.x, position.y), 18, 59);
}

function playerPosition() {
  if (PLAYER.onFoot) return PLAYER;
  return VEHICLES.find((vehicle) => vehicle.id === PLAYER.vehicleId) || PLAYER;
}

function drawStar(ctx, cx, cy, radius, filled) {
  ctx.beginPath();
  for (let point = 0; point < 10; point++) {
    const angle = point * Math.PI / 5 - Math.PI / 2;
    const reach = point % 2 === 0 ? radius : radius * 0.45;
    const x = cx + Math.cos(angle) * reach;
    const y = cy + Math.sin(angle) * reach;
    if (point === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? CONFIG.COLORS.star : CONFIG.COLORS.starEmpty;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.stroke();
}

function drawTargetArrow(ctx, marker) {
  const centerX = CONFIG.CANVAS_W / 2;
  const centerY = CONFIG.CANVAS_H / 2;
  const screenX = marker.x - CAMERA.x;
  const screenY = marker.y - CAMERA.y;
  const margin = 40;
  const visible = screenX >= margin && screenX <= CONFIG.CANVAS_W - margin
    && screenY >= margin && screenY <= CONFIG.CANVAS_H - margin;
  if (visible) return;
  const angle = Math.atan2(screenY - centerY, screenX - centerX);
  const edgeX = Math.max(margin, Math.min(CONFIG.CANVAS_W - margin,
    centerX + Math.cos(angle) * (CONFIG.CANVAS_W / 2 - margin)));
  const edgeY = Math.max(margin, Math.min(CONFIG.CANVAS_H - margin,
    centerY + Math.sin(angle) * (CONFIG.CANVAS_H / 2 - margin)));
  ctx.save();
  ctx.translate(edgeX, edgeY);
  ctx.rotate(angle);
  ctx.fillStyle = "#ff44aa";
  ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -8); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawMinimap(ctx) {
  const left = 12;
  const top = CONFIG.CANVAS_H - 152;
  const width = 200;
  const height = 140;
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(left, top, width, height);
  ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.strokeRect(left, top, width, height);
  const scaleX = width / CITY.worldW;
  const scaleY = height / CITY.worldH;

  for (let row = 0; row < CITY.H; row++) {
    for (let col = 0; col < CITY.W; col++) {
      const kind = CITY.grid[row][col];
      if (kind === CONFIG.T_ROAD) ctx.fillStyle = "#555";
      else if (kind === CONFIG.T_BUILDING) ctx.fillStyle = "rgba(180,150,120,0.3)";
      else if (kind === CONFIG.T_WATER) ctx.fillStyle = "rgba(60,120,180,0.5)";
      else continue;
      ctx.fillRect(left + col * CITY.T * scaleX, top + row * CITY.T * scaleY,
        CITY.T * scaleX, CITY.T * scaleY);
    }
  }

  const marker = getMissionMarker();
  if (marker) {
    ctx.fillStyle = "#ff44aa";
    ctx.beginPath(); ctx.arc(left + marker.x * scaleX, top + marker.y * scaleY, 4, 0, Math.PI * 2); ctx.fill();
  }
  if (WANTED > 0) {
    for (const vehicle of VEHICLES) {
      if (!vehicle.isPolice) continue;
      const x = left + vehicle.x * scaleX;
      const y = top + vehicle.y * scaleY;
      ctx.fillStyle = vehicle.type === "helicopter" ? "#ffff66" : "#ff3333";
      if (vehicle.type === "helicopter") {
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      } else ctx.fillRect(x - 2, y - 2, 4, 4);
    }
  }

  const player = playerPosition();
  const playerAngle = PLAYER.onFoot ? PLAYER.angle
    : (VEHICLES.find((vehicle) => vehicle.id === PLAYER.vehicleId) || { angle: 0 }).angle;
  ctx.save();
  ctx.translate(left + player.x * scaleX, top + player.y * scaleY);
  ctx.rotate(playerAngle);
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
}

window.drawHUD = drawHUD;
