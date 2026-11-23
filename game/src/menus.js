// menus.js — title, pause, dead, mission complete, dialogue overlays
let TITLE_BUTTONS = [];
let PAUSE = false;

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
  ctx.fillStyle = '#f2e9d8';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', W / 2, H / 2 - 60);
  ctx.font = '16px sans-serif';
  const lines = [
    'WASD / Arrows — move or drive',
    'Shift — sprint',
    'E — enter/exit vehicle',
    'Mouse — aim   Click/Space — fire',
    'F5 — save    Esc — resume',
  ];
  let y = H / 2 - 10;
  for (const l of lines) { ctx.fillText(l, W / 2, y); y += 26; }
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
  ctx.fillStyle = '#f2e9d8';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
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
window.handleTitleClick = handleTitleClick;
window.TITLE_BUTTONS = TITLE_BUTTONS;
