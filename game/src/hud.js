// hud.js — heads-up display and minimap
function drawHUD(ctx, cam) {
    const W = CONFIG.CANVAS_W, H = CONFIG.CANVAS_H;
    // health
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(12, 12, 220, 26);
    ctx.fillStyle = "#333";
    ctx.fillRect(16, 16, 212, 18);
    const hp = PLAYER.health / CONFIG.PLAYER_MAX_HEALTH;
    ctx.fillStyle = hp > 0.5 ? "#7fd67f" : (hp > 0.25 ? "#e8c547" : "#ff5555");
    ctx.fillRect(16, 16, 212 * hp, 18);
    ctx.fillStyle = "#fff";
    ctx.font = "12px sans-serif";
    ctx.fillText("HP " + Math.ceil(PLAYER.health), 20, 30);
    // armor
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(12, 40, 220, 14);
    ctx.fillStyle = "#333";
    ctx.fillRect(16, 42, 212, 10);
    const ap = (PLAYER.armor || 0) / 100;
    ctx.fillStyle = "#9bbcff";
    ctx.fillRect(16, 42, 212 * ap, 10);
    ctx.fillStyle = "#fff";
    ctx.font = "10px sans-serif";
    ctx.fillText("AR " + Math.ceil(PLAYER.armor || 0), 20, 50);
    // cash
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(W - 180, 12, 168, 26);
    ctx.fillStyle = CONFIG.COLORS.cash;
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("$" + CASH, W - 20, 30);
    ctx.textAlign = "left";
    // wanted stars
    const starsX = W - 180, starsY = 46;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(starsX, starsY - 4, 168, 24);
    const flash = (window.WANTED_FLASH ? window.WANTED_FLASH() : 0) > 0;
    for (let i = 0; i < 5; i++) {
        const filled = i < WANTED;
        const r = flash && filled ? 13 : 10;
        drawStar(ctx, starsX + 16 + i * 30, starsY + 8, r, filled);
    }
    // weapon
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(12, H - 180, 120, 22);
    ctx.fillStyle = "#fff";
    ctx.font = "12px sans-serif";
    const wname = PLAYER.onFoot ? PLAYER.weapon + (PLAYER.weapon === "pistol" ? " (" + PLAYER.ammo + ")" : "") : "In vehicle";
    ctx.fillText(wname, 18, H - 164);

    drawMinimap(ctx);

    // mission banner
    const step = (typeof currentStep === "function") ? currentStep() : null;
    const sb = (typeof window.SHOT_BANNER === "function") ? window.SHOT_BANNER() : window.SHOT_BANNER;
    const banner = sb || (step ? step.label : null);
    if (banner && STATE === "PLAYING") {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(W / 2 - 260, H - 60, 520, 40);
        ctx.fillStyle = "#f2e9d8";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(banner, W / 2, H - 36);
        if (step && step.timer) {
            ctx.font = "12px sans-serif";
            ctx.fillStyle = "#e8c547";
            ctx.fillText("Time: " + Math.ceil(MISSION_TIMER), W / 2, H - 18);
        }
        ctx.textAlign = "left";
    }
    // target arrow
    const mm = (typeof getMissionMarker === "function") ? getMissionMarker() : null;
    if (mm && STATE === "PLAYING") {
        const cx = CONFIG.CANVAS_W / 2, cy = CONFIG.CANVAS_H / 2;
        const sx = mm.x - CAMERA.x, sy = mm.y - CAMERA.y;
        const margin = 40;
        const onScreen = sx >= margin && sx <= CONFIG.CANVAS_W - margin && sy >= margin && sy <= CONFIG.CANVAS_H - margin;
        if (!onScreen) {
            const ang = Math.atan2(sy - cy, sx - cx);
            const edgeX = Math.max(margin, Math.min(CONFIG.CANVAS_W - margin, cx + Math.cos(ang) * (CONFIG.CANVAS_W / 2 - margin)));
            const edgeY = Math.max(margin, Math.min(CONFIG.CANVAS_H - margin, cy + Math.sin(ang) * (CONFIG.CANVAS_H / 2 - margin)));
            ctx.save();
            ctx.translate(edgeX, edgeY);
            ctx.rotate(ang);
            ctx.fillStyle = "#ff44aa";
            ctx.beginPath();
            ctx.moveTo(14, 0); ctx.lineTo(-8, -8); ctx.lineTo(-8, 8); ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }
    // district
    const dname = CITY.districtAt(PLAYER.onFoot ? PLAYER.x : (VEHICLES.find(v => v.id === PLAYER.vehicleId) || PLAYER).x, PLAYER.onFoot ? PLAYER.y : (VEHICLES.find(v => v.id === PLAYER.vehicleId) || PLAYER).y);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(12, 46, 140, 18);
    ctx.fillStyle = "#f2e9d8";
    ctx.font = "11px sans-serif";
    ctx.fillText(dname, 18, 59);
}

function drawStar(ctx, cx, cy, r, filled) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const ang = (i * Math.PI) / 5 - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.45;
        const x = cx + Math.cos(ang) * rad;
        const y = cy + Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = filled ? CONFIG.COLORS.star : CONFIG.COLORS.starEmpty;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.stroke();
}

function drawMinimap(ctx) {
    const mx = 12, my = CONFIG.CANVAS_H - 152, mw = 200, mh = 140;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.strokeRect(mx, my, mw, mh);
    const scaleX = mw / CITY.worldW, scaleY = mh / CITY.worldH;
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    for (let y = 0; y < CITY.H; y++)
        for (let x = 0; x < CITY.W; x++) {
            if (CITY.grid[y][x] === CONFIG.T_ROAD) {
                ctx.fillStyle = "#555";
                ctx.fillRect(mx + x * CITY.T * scaleX, my + y * CITY.T * scaleY, CITY.T * scaleX, CITY.T * scaleY);
            }
        }
    ctx.fillStyle = "rgba(180,150,120,0.3)";
    for (let y = 0; y < CITY.H; y++)
        for (let x = 0; x < CITY.W; x++) {
            if (CITY.grid[y][x] === CONFIG.T_BUILDING) {
                ctx.fillRect(mx + x * CITY.T * scaleX, my + y * CITY.T * scaleY, CITY.T * scaleX, CITY.T * scaleY);
            }
        }
    ctx.fillStyle = "rgba(60,120,180,0.5)";
    for (let y = 0; y < CITY.H; y++)
        for (let x = 0; x < CITY.W; x++) {
            if (CITY.grid[y][x] === CONFIG.T_WATER) {
                ctx.fillRect(mx + x * CITY.T * scaleX, my + y * CITY.T * scaleY, CITY.T * scaleX, CITY.T * scaleY);
            }
        }
    const mm = getMissionMarker();
    if (mm) {
        const bx = mx + mm.x * scaleX, by = my + mm.y * scaleY;
        ctx.fillStyle = "#ff44aa";
        ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
    }
    if (WANTED > 0) {
        for (const v of VEHICLES) {
            if (v.isPolice) {
                const bx = mx + v.x * scaleX, by = my + v.y * scaleY;
                if (v.type === "helicopter") {
                    ctx.fillStyle = "#ffff66";
                    ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
                } else {
                    ctx.fillStyle = "#ff3333";
                    ctx.fillRect(bx - 2, by - 2, 4, 4);
                }
            }
        }
    }
    const px = PLAYER.onFoot ? PLAYER.x : (VEHICLES.find(v => v.id === PLAYER.vehicleId) || PLAYER).x;
    const py = PLAYER.onFoot ? PLAYER.y : (VEHICLES.find(v => v.id === PLAYER.vehicleId) || PLAYER).y;
    const pa = PLAYER.onFoot ? PLAYER.angle : (VEHICLES.find(v => v.id === PLAYER.vehicleId) || { angle: 0 }).angle;
    const triX = mx + px * scaleX, triY = my + py * scaleY;
    ctx.save();
    ctx.translate(triX, triY);
    ctx.rotate(pa);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(8, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath();
    ctx.fill();
    ctx.restore();
}

window.drawHUD = drawHUD;
