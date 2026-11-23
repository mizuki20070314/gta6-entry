// menus.js — title, pause, dead, mission complete, dialogue overlays
let TITLE_BUTTONS = [];
let PAUSE = false;

const SHOPS = [{ x: (typeof CITY !== 'undefined' ? CITY.worldW * 0.32 : 1000), y: (typeof CITY !== 'undefined' ? CITY.worldH * 0.48 : 1000), name: 'Costa Defense' }];
window.SHOPS = SHOPS;

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyB' && STATE === 'PLAYING') {
    const pp = getPlayerPos();
    for (const s of SHOPS) {
      if (Math.hypot(s.x - pp.x, s.y - pp.y) < 90 && PLAYER.onFoot) { STATE = 'SHOP'; }
    }
  }
  if (e.code === 'Escape' && STATE === 'SHOP') STATE = 'PLAYING';
  if (STATE === 'SHOP') {
    if (e.code === 'Digit1') buyItem('ammo');
    if (e.code === 'Digit2') buyItem('armor');
    if (e.code === 'Digit3') buyItem('health');
  }
});

function buyItem(item) {
  if (item === 'ammo') { if (CASH >= 50) { CASH -= 50; PLAYER.ammo += 30; } }
  if (item === 'armor') { if (CASH >= 150) { CASH -= 150; PLAYER.armor = 100; } }
  if (item === 'health') { if (CASH >= 100) { CASH -= 100; PLAYER.health = Math.min(100, PLAYER.health + 50); } }
}

function drawShop(ctx) {
  const W = CONFIG.CANVAS_W, H = CONFIG.CANVAS_H;
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#f2e9d8';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Costa Defense — Shop', W / 2, 120);
  ctx.font = '18px sans-serif';
  const items = [
    ['1', 'Ammo (30) — $50'],
    ['2', 'Armor (full) — $150'],
    ['3', 'Health (+50) — $100'],
  ];
  let y = 220;
  for (const [k, t] of items) {
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(W / 2 - 220, y - 28, 440, 46);
    ctx.fillStyle = '#f2e9d8';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(k + '  ' + t, W / 2, y);
    y += 70;
  }
  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(242,233,216,0.6)';
  ctx.fillText('Cash: $' + CASH + '   Press Esc to close', W / 2, H - 80);
  ctx.textAlign = 'left';
}

function drawTitle(ctx) {
  const W = CONFIG.CANVAS_W, H = CONFIG.CANVAS_H;
  // sun gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#ff9a5a');
  g.addColorStop(0.4, '#f7b267');
  g.addColorStop(0.7, '#f2e9d8');
  g.addColorStop(1, '#3a7ca5');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // sun
  ctx.fillStyle = '#fff2cc';
  ctx.beginPath(); ctx.arc(W / 2, H * 0.35, 60, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,200,100,0.4)';
  ctx.beginPath(); ctx.arc(W / 2, H * 0.35, 90, 0, Math.PI * 2); ctx.fill();
  // title
  ctx.fillStyle = '#2a3a5a';
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SUNSET COAST', W / 2, H * 0.22);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#3a2a1a';
  ctx.fillText('An open-world crime story', W / 2, H * 0.28);
  // buttons
  TITLE_BUTTONS = [];
  const btns = [{ label: 'New Game', action: 'new' }];
  if (hasSave()) btns.push({ label: 'Continue', action: 'continue' });
  let by = H * 0.55;
  for (const b of btns) {
    const bw = 220, bh = 52;
    const bx = W / 2 - bw / 2, byb = by;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(ctx, bx, byb, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = '#f2e9d8'; ctx.lineWidth = 2;
    roundRect(ctx, bx, byb, bw, bh, 8); ctx.stroke();
    ctx.fillStyle = '#f2e9d8';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(b.label, W / 2, byb + 34);
    TITLE_BUTTONS.push({ x: bx, y: byb, w: bw, h: bh, action: b.action });
    by += 70;
  }
  // controls hint
  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(40,30,20,0.8)';
  ctx.fillText('WASD move/drive  Shift sprint  E enter/exit car  Mouse aim  Click/Space fire  F5 save  Esc pause', W / 2, H - 40);
  ctx.textAlign = 'left';
}

function handleTitleClick(mx, my) {
  for (const b of TITLE_BUTTONS) {
    if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
      if (b.action === 'new') {
        if (window.GAME && window.GAME.startNewGame) window.GAME.startNewGame();
      } else if (b.action === 'continue') {
        if (window.GAME && window.GAME.continueGame) window.GAME.continueGame();
      }
      return true;
    }
  }
  return false;
}

function drawPause(ctx) {
  const W = CONFIG.CANVAS_W, H = CONFIG.CANVAS_H;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);
  // big map
  const mx = W/2 - 260, my = 80, mw = 520, mh = 360;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.strokeRect(mx, my, mw, mh);
  const scaleX = mw / CITY.worldW, scaleY = mh / CITY.worldH;
  for (let y = 0; y < CITY.H; y++)
    for (let x = 0; x < CITY.W; x++) {
      if (CITY.grid[y][x] === CONFIG.T_ROAD) {
        ctx.fillStyle = '#555';
        ctx.fillRect(mx + x * CITY.T * scaleX, my + y * CITY.T * scaleY, CITY.T * scaleX, CITY.T * scaleY);
      }
      if (CITY.grid[y][x] === CONFIG.T_WATER) {
        ctx.fillStyle = 'rgba(60,120,180,0.6)';
        ctx.fillRect(mx + x * CITY.T * scaleX, my + y * CITY.T * scaleY, CITY.T * scaleX, CITY.T * scaleY);
      }
    }
  // player
  const px = (PLAYER.onFoot ? PLAYER.x : (VEHICLES.find(v=>v.id===PLAYER.vehicleId)||PLAYER).x);
  const py = (PLAYER.onFoot ? PLAYER.y : (VEHICLES.find(v=>v.id===PLAYER.vehicleId)||PLAYER).y);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(mx + px*scaleX, my + py*scaleY, 5, 0, Math.PI*2); ctx.fill();
  // mission marker
  const mm = (typeof getMissionMarker === 'function') ? getMissionMarker() : null;
  if (mm) {
    ctx.fillStyle = '#ff44aa';
    ctx.beginPath(); ctx.arc(mx + mm.x*scaleX, my + mm.y*scaleY, 5, 0, Math.PI*2); ctx.fill();
  }
  ctx.fillStyle = '#f2e9d8';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', W / 2, 60);
  ctx.font = '16px sans-serif';
  const lines = [
    'WASD / Arrows — move or drive',
    'Shift — sprint',
    'E — enter/exit vehicle',
    'Mouse — aim   Click/Space — fire',
    'B — shop (near Costa Defense)   M — mute',
    'F5 — save    Esc — resume',
  ];
  let y = H - 150;
  for (const l of lines) { ctx.fillText(l, W / 2, y); y += 24; }
  ctx.textAlign = 'left';
}

function drawDead(ctx) {
  const W = CONFIG.CANVAS_W, H = CONFIG.CANVAS_H;
  ctx.fillStyle = 'rgba(60,0,0,0.7)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WASTED', W / 2, H / 2);
  ctx.font = '20px sans-serif';
  ctx.fillText('Respawning at hospital...', W / 2, H / 2 + 40);
  ctx.textAlign = 'left';
}

function drawMissionComplete(ctx) {
  const W = CONFIG.CANVAS_W, H = CONFIG.CANVAS_H;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(W / 2 - 220, H / 2 - 60, 440, 120);
  ctx.fillStyle = '#7fd67f';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  const m = (typeof CURRENT_MISSION === 'function') ? CURRENT_MISSION() : CURRENT_MISSION;
  const title = m ? m.title : '';
  ctx.fillText('MISSION COMPLETE', W / 2, H / 2 - 10);
  ctx.fillStyle = '#f2e9d8';
  ctx.font = '18px sans-serif';
  ctx.fillText(title + '  +$' + (m ? m.reward : 0), W / 2, H / 2 + 24);
  ctx.textAlign = 'left';
}

function drawMissionDialog(ctx) {
  const W = CONFIG.CANVAS_W, H = CONFIG.CANVAS_H;
  // letterbox
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, W, 120);
  ctx.fillRect(0, H - 120, W, 120);
  const m = (typeof CURRENT_MISSION === 'function') ? CURRENT_MISSION() : CURRENT_MISSION;
  if (!m) return;
  const dl = (typeof DIALOGUE_LINE === 'function') ? DIALOGUE_LINE() : DIALOGUE_LINE;
  const line = m.briefingLines[dl];
  // portrait initial
  const speaker = m.speaker || 'M';
  const initial = speaker.charAt(0).toUpperCase();
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath(); ctx.arc(80, H - 60, 40, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a3a5a';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(initial + '.', 80, H - 48);
  ctx.fillStyle = '#f2e9d8';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(m.title, W / 2, H - 80);
  ctx.font = '18px sans-serif';
  ctx.fillText(line || '', W / 2, H - 45);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(242,233,216,0.6)';
  ctx.fillText('Press Space / Enter to continue', W / 2, H - 20);
  ctx.textAlign = 'left';
}

window.drawTitle = drawTitle;
window.drawPause = drawPause;
window.drawDead = drawDead;
window.drawMissionComplete = drawMissionComplete;
window.drawMissionDialog = drawMissionDialog;
window.drawShop = drawShop;
window.handleTitleClick = handleTitleClick;
window.TITLE_BUTTONS = TITLE_BUTTONS;
