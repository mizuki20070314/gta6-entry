// Short-lived particles, tire marks, flashes, and blasts communicate impact.
// Effects stay separate from the world grid, so they never block a route.
// Camera shake is a decaying envelope that the renderer samples each frame.
let PARTICLES = [];
let SKIDMARKS = [];
let EXPLOSIONS = [];
let SCREEN_SHAKE = { t: 0, mag: 0 };
let MUZZLES = [];
window.PARTICLES = PARTICLES;
window.SKIDMARKS = SKIDMARKS;

function spawnParticles(x, y, color, n, speed) {
  const launchSpeed = speed || 120;
  for (let index = 0; index < n; index++) {
    const direction = Math.random() * Math.PI * 2;
    const velocity = launchSpeed * (0.3 + Math.random() * 0.7);
    PARTICLES.push({
      x, y,
      vx: Math.cos(direction) * velocity,
      vy: Math.sin(direction) * velocity,
      life: 0.4 + Math.random() * 0.4,
      maxLife: 0.8,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

function spawnMuzzle(x, y, angle) {
  MUZZLES.push({ x, y, angle, life: 0.08 });
}

function spawnSmoke(x, y) {
  if (Math.random() >= 0.3) return;
  PARTICLES.push({
    x: x + (Math.random() - 0.5) * 8,
    y: y + (Math.random() - 0.5) * 8,
    vx: (Math.random() - 0.5) * 40,
    vy: -60 - Math.random() * 60,
    life: 0.8, maxLife: 0.8,
    color: "rgba(120,120,120,0.6)", size: 3 + Math.random() * 4,
  });
}

function spawnExplosion(x, y) {
  for (let spark = 0; spark < 40; spark++) {
    const direction = Math.random() * Math.PI * 2;
    const velocity = 60 + Math.random() * 200;
    PARTICLES.push({
      x, y, vx: Math.cos(direction) * velocity, vy: Math.sin(direction) * velocity,
      life: 0.6 + Math.random() * 0.6, maxLife: 1.2,
      color: Math.random() < 0.5 ? "#ff6a00" : "#ffcc33", size: 3 + Math.random() * 5,
    });
  }
  for (let puff = 0; puff < 20; puff++) {
    const direction = Math.random() * Math.PI * 2;
    const velocity = 30 + Math.random() * 80;
    PARTICLES.push({
      x, y, vx: Math.cos(direction) * velocity, vy: Math.sin(direction) * velocity,
      life: 1 + Math.random() * 0.8, maxLife: 1.8,
      color: "#555", size: 4 + Math.random() * 6,
    });
  }
  EXPLOSIONS.push({ x, y, life: 1, maxLife: 1, radius: 0 });
  screenShake(12);
}

function screenShake(mag) {
  SCREEN_SHAKE.t = 0.4;
  SCREEN_SHAKE.mag = Math.max(SCREEN_SHAKE.mag, mag);
}

function updateEffects(dt) {
  for (let index = PARTICLES.length - 1; index >= 0; index--) {
    const particle = PARTICLES[index];
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.94;
    particle.vy *= 0.94;
    if (particle.life <= 0) PARTICLES.splice(index, 1);
  }
  for (let index = SKIDMARKS.length - 1; index >= 0; index--) {
    SKIDMARKS[index].life -= dt;
    if (SKIDMARKS[index].life <= 0) SKIDMARKS.splice(index, 1);
  }
  for (let index = EXPLOSIONS.length - 1; index >= 0; index--) {
    const blast = EXPLOSIONS[index];
    blast.life -= dt;
    blast.radius += dt * 120;
    if (blast.life <= 0) EXPLOSIONS.splice(index, 1);
  }
  for (let index = MUZZLES.length - 1; index >= 0; index--) {
    MUZZLES[index].life -= dt;
    if (MUZZLES[index].life <= 0) MUZZLES.splice(index, 1);
  }
  if (SCREEN_SHAKE.t > 0) {
    SCREEN_SHAKE.t -= dt;
    if (SCREEN_SHAKE.t <= 0) { SCREEN_SHAKE.t = 0; SCREEN_SHAKE.mag = 0; }
  }
}

function drawSkidMarks(ctx, cam) {
  for (const mark of SKIDMARKS) {
    const opacity = mark.life / mark.maxLife;
    ctx.save();
    ctx.translate(mark.x - cam.x, mark.y - cam.y);
    ctx.rotate(mark.angle);
    ctx.fillStyle = "rgba(20,20,20," + 0.5 * opacity + ")";
    ctx.fillRect(-8, -2, 16, 4);
    ctx.restore();
  }
}

function drawParticles(ctx, cam) {
  for (const particle of PARTICLES) {
    const opacity = Math.max(0, particle.life / particle.maxLife);
    ctx.globalAlpha = opacity;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x - cam.x, particle.y - cam.y, particle.size * (0.5 + opacity * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  for (const flash of MUZZLES) {
    ctx.globalAlpha = flash.life / 0.08;
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(flash.x - cam.x, flash.y - cam.y, 6, 0, Math.PI * 2); ctx.fill();
  }
  for (const blast of EXPLOSIONS) {
    const opacity = blast.life / blast.maxLife;
    const centerX = blast.x - cam.x;
    const centerY = blast.y - cam.y;
    ctx.globalAlpha = opacity;
    const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, blast.radius);
    glow.addColorStop(0, "rgba(255,200,80,0.9)");
    glow.addColorStop(0.5, "rgba(255,80,0,0.6)");
    glow.addColorStop(1, "rgba(80,80,80,0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(centerX, centerY, blast.radius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = opacity * 0.8;
    ctx.strokeStyle = "rgba(255,220,120,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(centerX, centerY, blast.radius * 1.1, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

window.spawnParticles = spawnParticles;
window.spawnMuzzle = spawnMuzzle;
window.spawnExplosion = spawnExplosion;
window.spawnSmoke = spawnSmoke;
window.screenShake = screenShake;
window.updateEffects = updateEffects;
window.drawSkidMarks = drawSkidMarks;
window.drawParticles = drawParticles;
window.SCREEN_SHAKE = SCREEN_SHAKE;
window.EXPLOSIONS = EXPLOSIONS;
window.MUZZLES = MUZZLES;
