// police.js — wanted level, dispatch, pursuit AI, busted
const POLICE_OFFICERS = [];
const ROADBLOCKS = [];
let HELI = null;
let BUSTED_TIMER = 0;
let WANTED_TIMER = 0;
let WANTED_FLASH = 0;

function pdPos() { return { x: CITY.worldW * 0.45, y: CITY.worldH * 0.4 }; }
function hospitalPos() { return { x: CITY.worldW * 0.35, y: CITY.worldH * 0.45 }; }

function wantedStars() { return Math.ceil(WANTED); }

function hasLOS(x1, y1, x2, y2) {
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        if (CITY.isSolid(x, y)) return false;
    }
    return true;
}

function decayTimeForStar(s) {
    if (s >= 5) return 20;
    if (s === 4) return 16;
    if (s === 3) return 13;
    if (s === 2) return 10;
    return 8;
}

function removePoliceAll() {
    for (let i = VEHICLES.length - 1; i >= 0; i++) if (VEHICLES[i].isPolice) VEHICLES.splice(i, 1);
    POLICE_OFFICERS.length = 0;
    ROADBLOCKS.length = 0;
    HELI = null;
}

function spawnPoliceCar(type, x, y, angle) {
    const v = spawnVehicle(type, x, y, angle, { ai: true });
    v.isPolice = true;
    v.policeShootCd = 1;
    v.speed = 0;
    return v;
}

function triggerBusted() {
    if (STATE !== "PLAYING") return;
    STATE = "BUSTED";
    BUSTED_TIMER = 3;
    CASH = Math.max(0, CASH - Math.floor(CASH / 2));
    PLAYER.weapon = "fists"; PLAYER.ammo = 0; PLAYER.armor = 0;
    WANTED = 0; WANTED_TIMER = 0;
    removePoliceAll();
    if (window.playExplosion) playExplosion();
}

function updatePolice(dt) {
    if (WANTED <= 0) { removePoliceAll(); WANTED_TIMER = 0; return; }
    const stars = wantedStars();
    let desiredCruisers = (stars === 1) ? 1 : 2;
    let desiredSwat = (stars >= 4) ? 1 : 0;
    let wantHeli = (stars >= 5);
    let wantRoadblocks = (stars >= 3);

    const pp = getPlayerPos();
    let cruisers = VEHICLES.filter(v => v.isPolice && v.type === "police").length;
    while (cruisers < desiredCruisers) {
        const sp = pickRoadSpawnNear(CAMERA.x, CAMERA.y, 500, 900);
        if (!sp) break;
        spawnPoliceCar("police", sp.x, sp.y, 0);
        cruisers++;
    }
    let swats = VEHICLES.filter(v => v.isPolice && v.type === "swat").length;
    while (swats < desiredSwat) {
        const sp = pickRoadSpawnNear(CAMERA.x, CAMERA.y, 500, 900);
        if (!sp) break;
        spawnPoliceCar("swat", sp.x, sp.y, 0);
        swats++;
    }
    if (wantHeli && !HELI) {
        const sp = pickRoadSpawnNear(CAMERA.x, CAMERA.y, 600, 900);
        if (sp) {
            HELI = spawnPoliceCar("helicopter", sp.x, sp.y, 0);
            HELI.isHeli = true;
        }
    }
    if (!wantHeli && HELI) {
        const idx = VEHICLES.indexOf(HELI); if (idx >= 0) VEHICLES.splice(idx, 1);
        HELI = null;
    }
    if (wantRoadblocks && ROADBLOCKS.length < 1) {
        const ang = PLAYER.onFoot ? PLAYER.angle : (VEHICLES.find(v => v.id === PLAYER.vehicleId) || { angle: 0 }).angle;
        const rx = pp.x + Math.cos(ang) * 400;
        const ry = pp.y + Math.sin(ang) * 400;
        let best = null, bestD = 1e9;
        for (const s of CITY.roadSpawns) { const d = Math.hypot(s.x - rx, s.y - ry); if (d < bestD) { bestD = d; best = s; } }
        if (best) ROADBLOCKS.push({ x: best.x, y: best.y, angle: ang, life: 60 });
    }
    if (!wantRoadblocks) ROADBLOCKS.length = 0;
    for (let i = ROADBLOCKS.length - 1; i >= 0; i--) if (Math.hypot(ROADBLOCKS[i].x - pp.x, ROADBLOCKS[i].y - pp.y) > 1200) ROADBLOCKS.splice(i, 1);

    for (const v of VEHICLES) {
        if (!v.isPolice || v.type === "helicopter") continue;
        const dx = pp.x - v.x, dy = pp.y - v.y;
        const desired = Math.atan2(dy, dx);
        let diff = desired - v.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const turn = v.type === "swat" ? 2.6 : 3.5;
        v.angle += Math.sign(diff) * Math.min(Math.abs(diff), turn * dt);
        const dist = Math.hypot(dx, dy);
        const targetSpeed = dist > 120 ? v.maxSpeed : v.maxSpeed * 0.5;
        if ((v.speed || 0) < targetSpeed) v.speed = Math.min(targetSpeed, (v.speed || 0) + v.accel * dt);
        else v.speed = Math.max(0, (v.speed || 0) - v.accel * dt);
        const nx = v.x + Math.cos(v.angle) * v.speed * dt;
        const ny = v.y + Math.sin(v.angle) * v.speed * dt;
        if (!circleHitsSolid(nx, v.y, 14)) v.x = nx;
        if (!circleHitsSolid(v.x, ny, 14)) v.y = ny;
        if (dist < 35 && !PLAYER.onFoot) {
            const pv = VEHICLES.find(x => x.id === PLAYER.vehicleId);
            if (pv) pv.health -= 5 * dt;
        }
        v.policeShootCd = (v.policeShootCd || 0) - dt;
        if (dist < 450 && v.policeShootCd <= 0 && hasLOS(v.x, v.y, pp.x, pp.y)) {
            v.policeShootCd = 0.9;
            const bx = v.x + Math.cos(v.angle) * 24;
            const by = v.y + Math.sin(v.angle) * 24;
            BULLETS.push({ x: bx, y: by, vx: Math.cos(v.angle) * 520, vy: Math.sin(v.angle) * 520, life: 1.4, damage: 10, owner: "police", color: "#ff6666" });
            if (window.playGunshot) playGunshot();
        }
    }
    if (HELI) {
        const h = HELI;
        const d = Math.hypot(h.x - pp.x, h.y - pp.y);
        const desiredR = 220;
        const ang = Math.atan2(h.y - pp.y, h.x - pp.x);
        const targetX = pp.x + Math.cos(ang + 0.02) * desiredR;
        const targetY = pp.y + Math.sin(ang + 0.02) * desiredR;
        const dx = targetX - h.x, dy = targetY - h.y;
        const da = Math.atan2(dy, dx);
        h.angle += (da - h.angle) * 2 * dt;
        h.speed = Math.min(h.maxSpeed, (h.speed || 0) + h.accel * dt);
        h.x += Math.cos(h.angle) * h.speed * dt;
        h.y += Math.sin(h.angle) * h.speed * dt;
    }

    if (POLICE_OFFICERS.length < stars) {
        for (const v of VEHICLES) {
            if (!v.isPolice || v.type === "helicopter") continue;
            const d = Math.hypot(v.x - pp.x, v.y - pp.y);
            if (d < 250 && POLICE_OFFICERS.length < stars) {
                if (Math.random() < 0.02) {
                    POLICE_OFFICERS.push({ x: v.x, y: v.y, angle: 0, health: 60, shootCd: 1, speed: 110 });
                }
            }
        }
    }
    for (let i = POLICE_OFFICERS.length - 1; i >= 0; i--) {
        const o = POLICE_OFFICERS[i];
        if (o.health <= 0) { POLICE_OFFICERS.splice(i, 1); continue; }
        const dx = pp.x - o.x, dy = pp.y - o.y;
        const ang = Math.atan2(dy, dx);
        o.angle = ang;
        const dist = Math.hypot(dx, dy);
        if (dist > 50) { o.x += Math.cos(ang) * o.speed * dt; o.y += Math.sin(ang) * o.speed * dt; }
        o.shootCd -= dt;
        if (dist < 500 && o.shootCd <= 0 && hasLOS(o.x, o.y, pp.x, pp.y)) {
            o.shootCd = 0.9;
            const bx = o.x + Math.cos(ang) * 16, by = o.y + Math.sin(ang) * 16;
            BULLETS.push({ x: bx, y: by, vx: Math.cos(ang) * 580, vy: Math.sin(ang) * 580, life: 1.3, damage: 12, owner: "police", color: "#ff6666" });
            if (window.playGunshot) playGunshot();
        }
    }
    for (let i = BULLETS.length - 1; i >= 0; i--) {
        const b = BULLETS[i];
        if (b.owner !== "player") continue;
        for (const o of POLICE_OFFICERS) {
            if (Math.hypot(o.x - b.x, o.y - b.y) < 10) {
                o.health -= b.damage;
                BULLETS.splice(i, 1);
                spawnParticles(b.x, b.y, "#f00", 4);
                break;
            }
        }
    }

    let seen = false;
    for (const v of VEHICLES) {
        if (!v.isPolice) continue;
        const d = Math.hypot(v.x - pp.x, v.y - pp.y);
        if (d < 700 && hasLOS(v.x, v.y, pp.x, pp.y)) { seen = true; break; }
    }
    for (const o of POLICE_OFFICERS) {
        const d = Math.hypot(o.x - pp.x, o.y - pp.y);
        if (d < 600 && hasLOS(o.x, o.y, pp.x, pp.y)) { seen = true; break; }
    }
    if (HELI) {
        const d = Math.hypot(HELI.x - pp.x, HELI.y - pp.y);
        if (d < 320) seen = true;
    }

    if (seen) {
        WANTED_TIMER = 0;
    } else {
        WANTED_TIMER += dt;
        const thr = decayTimeForStar(stars);
        if (WANTED_TIMER >= thr) {
            WANTED = Math.max(0, WANTED - 1);
            WANTED_TIMER = 0;
            if (WANTED <= 0) removePoliceAll();
        }
    }

    if (PLAYER.onFoot) {
        for (const v of VEHICLES) {
            if (v.isPolice && Math.hypot(v.x - PLAYER.x, v.y - PLAYER.y) < 42) { triggerBusted(); return; }
        }
        for (const o of POLICE_OFFICERS) {
            if (Math.hypot(o.x - PLAYER.x, o.y - PLAYER.y) < 42) { triggerBusted(); return; }
        }
    } else {
        const pv = VEHICLES.find(x => x.id === PLAYER.vehicleId);
        if (pv) {
            const spd = Math.abs(pv.speed || 0);
            if (spd < 20) {
                let nearC = 0;
                for (const v of VEHICLES) if (v.isPolice && Math.hypot(v.x - pv.x, v.y - pv.y) < 130) nearC++;
                if (nearC >= 3) { triggerBusted(); return; }
            }
        }
    }
    if (!PLAYER.onFoot) {
        const pv = VEHICLES.find(x => x.id === PLAYER.vehicleId);
        if (pv) {
            for (const rb of ROADBLOCKS) {
                if (Math.hypot(pv.x - rb.x, pv.y - rb.y) < 60) {
                    pv.speed *= 0.92;
                }
            }
        }
    }
}

function updateBusted(dt) {
    if (STATE !== "BUSTED") return;
    BUSTED_TIMER -= dt;
    if (BUSTED_TIMER <= 0) {
        const p = pdPos();
        initPlayer(p.x, p.y);
        STATE = "PLAYING";
        WANTED = 0;
        removePoliceAll();
    }
}

function drawPoliceExtras(ctx, cam) {
    for (const rb of ROADBLOCKS) {
        ctx.save();
        ctx.translate(rb.x - cam.x, rb.y - cam.y);
        ctx.rotate(rb.angle);
        for (const off of [-1, 1]) {
            ctx.save();
            ctx.translate(0, off * 18);
            ctx.rotate(off * 0.6);
            ctx.fillStyle = "#1a3a6a";
            ctx.fillRect(-23, -11, 46, 22);
            ctx.fillStyle = (performance.now() / 200 % 2 < 1) ? "#ff3333" : "#3366ff";
            ctx.fillRect(-6, -14, 12, 3);
            ctx.restore();
        }
        ctx.fillStyle = "#ffcc33";
        for (let i = -3; i <= 3; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 14 - 4, 30);
            ctx.lineTo(i * 14, 40);
            ctx.lineTo(i * 14 + 4, 30);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
    for (const o of POLICE_OFFICERS) {
        const sx = o.x - cam.x, sy = o.y - cam.y;
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath(); ctx.ellipse(sx, sy + 6, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(o.angle);
        ctx.fillStyle = "#1a3a6a";
        ctx.fillRect(-5, -3, 10, 8);
        ctx.fillStyle = "#f0c8a0";
        ctx.beginPath(); ctx.arc(4, 0, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#333";
        ctx.fillRect(6, -1, 8, 2);
        ctx.restore();
    }
    if (HELI) {
        const h = HELI;
        const sx = h.x - cam.x, sy = h.y - cam.y;
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath(); ctx.ellipse(sx, sy + 4, 28, 10, h.angle, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(h.angle);
        ctx.fillStyle = "#4a4a4a";
        ctx.fillRect(-30, -9, 60, 18);
        ctx.fillStyle = "#888";
        ctx.fillRect(-4, -18, 8, 36);
        ctx.restore();
        const pp = getPlayerPos();
        const cx = pp.x - cam.x, cy = pp.y - cam.y;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 140);
        g.addColorStop(0, "rgba(255,255,220,0.35)");
        g.addColorStop(1, "rgba(255,255,220,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, 140, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();
    }
}

function drawBustedOverlay(ctx) {
    const W = CONFIG.CANVAS_W, H = CONFIG.CANVAS_H;
    ctx.fillStyle = "rgba(0,0,20,0.75)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ff5555";
    ctx.font = "bold 64px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BUSTED", W / 2, H / 2);
    ctx.fillStyle = "#f2e9d8";
    ctx.font = "20px sans-serif";
    ctx.fillText("Respawning at Pacificora PD...", W / 2, H / 2 + 40);
    ctx.textAlign = "left";
}

window.POLICE_OFFICERS = POLICE_OFFICERS;
window.ROADBLOCKS = ROADBLOCKS;
window.HELI = () => HELI;
window.BUSTED_TIMER = () => BUSTED_TIMER;
window.setBustedTimer = (t) => { BUSTED_TIMER = t; };
window.updatePolice = updatePolice;
window.updateBusted = updateBusted;
window.drawPoliceExtras = drawPoliceExtras;
window.drawBustedOverlay = drawBustedOverlay;
window.triggerBusted = triggerBusted;
window.removePoliceAll = removePoliceAll;
window.WANTED_TIMER = () => WANTED_TIMER;
window.WANTED_FLASH = () => WANTED_FLASH;
window.setWantedFlash = (t) => { WANTED_FLASH = t; };
window.pdPos = pdPos;
window.hospitalPos = hospitalPos;
window.wantedStars = wantedStars;
