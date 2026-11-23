// effects.js — particles, skids, explosions, screen shake, muzzle flashes
let PARTICLES = [];
let SKIDMARKS = [];
let EXPLOSIONS = [];
let SCREEN_SHAKE = { t: 0, mag: 0 };
let MUZZLES = [];
window.PARTICLES = PARTICLES;
window.SKIDMARKS = SKIDMARKS;

function spawnParticles(x, y, color, n, speed) {
    speed = speed || 120;
    for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = speed * (0.3 + Math.random() * 0.7);
        PARTICLES.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0.4 + Math.random() * 0.4, maxLife: 0.8, color, size: 2 + Math.random() * 3 });
    }
}

function spawnMuzzle(x, y, angle) {
    MUZZLES.push({ x, y, angle, life: 0.08 });
}

function spawnSmoke(x, y) {
    if (Math.random() < 0.3) {
        PARTICLES.push({ x: x + (Math.random() - 0.5) * 8, y: y + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 40, vy: -60 - Math.random() * 60, life: 0.8, maxLife: 0.8, color: "rgba(120,120,120,0.6)", size: 3 + Math.random() * 4 });
    }
}

function spawnExplosion(x, y) {
    for (let i = 0; i < 40; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * 200;
        PARTICLES.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0.6 + Math.random() * 0.6, maxLife: 1.2, color: Math.random() < 0.5 ? "#ff6a00" : "#ffcc33", size: 3 + Math.random() * 5 });
    }
    for (let i = 0; i < 20; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 30 + Math.random() * 80;
        PARTICLES.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1.0 + Math.random() * 0.8, maxLife: 1.8, color: "#555", size: 4 + Math.random() * 6 });
    }
    EXPLOSIONS.push({ x, y, life: 1.0, maxLife: 1.0, radius: 0 });
    screenShake(12);
}

function screenShake(mag) { SCREEN_SHAKE.t = 0.4; SCREEN_SHAKE.mag = Math.max(SCREEN_SHAKE.mag, mag); }

function updateEffects(dt) {
    for (let i = PARTICLES.length - 1; i >= 0; i--) {
        const p = PARTICLES[i];
        p.life -= dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.94; p.vy *= 0.94;
        if (p.life <= 0) PARTICLES.splice(i, 1);
    }
    for (let i = SKIDMARKS.length - 1; i >= 0; i--) {
        SKIDMARKS[i].life -= dt;
        if (SKIDMARKS[i].life <= 0) SKIDMARKS.splice(i, 1);
    }
    for (let i = EXPLOSIONS.length - 1; i >= 0; i--) {
        const e = EXPLOSIONS[i];
        e.life -= dt;
        e.radius += dt * 120;
        if (e.life <= 0) EXPLOSIONS.splice(i, 1);
    }
    for (let i = MUZZLES.length - 1; i >= 0; i--) {
        MUZZLES[i].life -= dt;
        if (MUZZLES[i].life <= 0) MUZZLES.splice(i, 1);
    }
    if (SCREEN_SHAKE.t > 0) {
        SCREEN_SHAKE.t -= dt;
        if (SCREEN_SHAKE.t <= 0) { SCREEN_SHAKE.t = 0; SCREEN_SHAKE.mag = 0; }
    }
}

function drawSkidMarks(ctx, cam) {
    for (const s of SKIDMARKS) {
        const a = s.life / s.maxLife;
        ctx.save();
        ctx.translate(s.x - cam.x, s.y - cam.y);
        ctx.rotate(s.angle);
        ctx.fillStyle = "rgba(20,20,20," + (0.5 * a) + ")";
        ctx.fillRect(-8, -2, 16, 4);
        ctx.restore();
    }
}

function drawParticles(ctx, cam) {
    for (const p of PARTICLES) {
        const a = p.life / p.maxLife;
        ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x - cam.x, p.y - cam.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const m of MUZZLES) {
        const a = m.life / 0.08;
        ctx.globalAlpha = a;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(m.x - cam.x, m.y - cam.y, 6, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const e of EXPLOSIONS) {
        const a = e.life / e.maxLife;
        ctx.globalAlpha = a;
        const g = ctx.createRadialGradient(e.x - cam.x, e.y - cam.y, 0, e.x - cam.x, e.y - cam.y, e.radius);
        g.addColorStop(0, "rgba(255,200,80,0.9)");
        g.addColorStop(0.5, "rgba(255,80,0,0.6)");
        g.addColorStop(1, "rgba(80,80,80,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(e.x - cam.x, e.y - cam.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = a * 0.8;
        ctx.strokeStyle = "rgba(255,220,120,0.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x - cam.x, e.y - cam.y, e.radius * 1.1, 0, Math.PI * 2);
        ctx.stroke();
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
