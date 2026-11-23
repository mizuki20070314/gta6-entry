// pedestrians.js - foot traffic and fleeing crowds
// Pedestrians wander, flee from danger and can call the police.
// Knocked peds recover and then run away from the player.
// spawnPedsAround keeps a steady population near the camera.
let PEDS = [];
window.PEDS = PEDS;

function spawnPed(x, y) {
    const p = {
        x, y, angle: Math.random() * Math.PI * 2, speed: 40 + Math.random() * 30,
        state: "walk",
        knockTimer: 0, vx: 0, vy: 0, health: 60,
        color: ["#e8c9a0", "#d9b89a", "#bfa07a"][Math.floor(Math.random() * 3)],
        clothes: ["#4a6fa5", "#c94a5a", "#7fb069", "#e8c547", "#8a7a6a"][Math.floor(Math.random() * 5)],
        callPoliceTimer: 0,
    };
    PEDS.push(p);
    return p;
}

function updatePeds(dt) {
    for (let i = PEDS.length - 1; i >= 0; i--) {
        const p = PEDS[i];
        if (p.health <= 0) { PEDS.splice(i, 1); continue; }
        if (p.knocked) {
            p.knockTimer -= dt;
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.vx *= 0.9; p.vy *= 0.9;
            if (p.knockTimer <= 0) { p.knocked = false; p.state = "flee"; p.speed = 140; }
            continue;
        }
        if (p.state === "walk") {
            p.angle += (Math.random() - 0.5) * 2 * dt;
            if (SHOT_RECENT > 0) { p.state = "flee"; p.speed = 150; }
            for (const v of VEHICLES) {
                if (Math.abs(v.vel) > 200 && Math.hypot(v.x - p.x, v.y - p.y) < 120) { p.state = "flee"; p.speed = 160; }
            }
        }
        if (p.state === "flee") {
            const dpx = p.x - PLAYER.x, dpy = p.y - PLAYER.y;
            const d = Math.hypot(dpx, dpy) || 1;
            const tx = p.x + (dpx / d) * 100;
            const ty = p.y + (dpy / d) * 100;
            const ang = Math.atan2(ty - p.y, tx - p.x);
            p.angle = ang;
            p.callPoliceTimer += dt;
            if (p.callPoliceTimer > 2 && WANTED < 5 && Math.random() < 0.005) {
                wantedRaise(1); p.callPoliceTimer = 999;
            }
        }
        let nx = p.x + Math.cos(p.angle) * p.speed * dt;
        let ny = p.y + Math.sin(p.angle) * p.speed * dt;
        if (CITY.isSolid(nx, p.y)) nx = p.x;
        if (CITY.isSolid(p.x, ny)) ny = p.y;
        if (CITY.isSolid(nx, ny)) { nx = p.x; ny = p.y; p.angle += Math.PI * 0.5; }
        p.x = nx; p.y = ny;
        p.x = Math.max(10, Math.min(CITY.worldW - 10, p.x));
        p.y = Math.max(10, Math.min(CITY.worldH - 10, p.y));
    }
    spawnPedsAround(CAMERA);
}

function spawnPedsAround(cam) {
    if (PEDS.length < 40) {
        for (let i = 0; i < 3; i++) {
            const sp = CITY.roadSpawns[Math.floor(Math.random() * CITY.roadSpawns.length)];
            if (!sp) break;
            const x = sp.x + (Math.random() - 0.5) * 120;
            const y = sp.y + (Math.random() - 0.5) * 120;
            if (Math.hypot(x - cam.x, y - cam.y) < 900 && !CITY.isSolid(x, y)) {
                spawnPed(x, y);
            }
        }
    }
    for (let i = PEDS.length - 1; i >= 0; i--) {
        if (Math.hypot(PEDS[i].x - cam.x, PEDS[i].y - cam.y) > 1500) PEDS.splice(i, 1);
    }
}

function drawPeds(ctx, cam) {
    for (const p of PEDS) {
        const sx = p.x - cam.x, sy = p.y - cam.y;
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath(); ctx.ellipse(sx, sy + 6, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.translate(sx, sy);
        ctx.fillStyle = p.clothes;
        ctx.fillRect(-4, -2, 8, 10);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(0, -6, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        if (p.knocked) {
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            ctx.font = "10px sans-serif";
            ctx.fillText("!", sx, sy - 10);
        }
    }
}

window.spawnPed = spawnPed;
window.updatePeds = updatePeds;
window.drawPeds = drawPeds;
window.PEDS = PEDS;
window.spawnPedFleeImpl = function (x, y) { spawnPed(x, y); };