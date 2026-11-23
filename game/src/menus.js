// Menus share the canvas and keep the control prompts close to play.
// Costa Defense sells the basics only while the player is on foot nearby.
// Title actions are stored as hit boxes so mouse clicks match what is drawn.
let TITLE_BUTTONS = [];
let PAUSE = false;

const SHOPS = [{
  x: typeof CITY !== "undefined" ? CITY.worldW * 0.32 : 1000,
  y: typeof CITY !== "undefined" ? CITY.worldH * 0.48 : 1000,
  name: "Costa Defense",
}];
window.SHOPS = SHOPS;

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyB" && STATE === "PLAYING") {
    const player = getPlayerPos();
    for (const shop of SHOPS) {
      if (PLAYER.onFoot && Math.hypot(shop.x - player.x, shop.y - player.y) < 90) STATE = "SHOP";
    }
  }
  if (event.code === "Escape" && STATE === "SHOP") {
    STATE = "PLAYING";
    event.stopImmediatePropagation();
  }
  if (STATE !== "SHOP") return;
  if (event.code === "Digit1") buyItem("ammo");
  if (event.code === "Digit2") buyItem("armor");
  if (event.code === "Digit3") buyItem("health");
});

function buyItem(item) {
  if (item === "ammo" && CASH >= 50) {
    CASH -= 50;
    PLAYER.ammo += 30;
  } else if (item === "armor" && CASH >= 150) {
    CASH -= 150;
    PLAYER.armor = 100;
  } else if (item === "health" && CASH >= 100) {
    CASH -= 100;
    PLAYER.health = Math.min(100, PLAYER.health + 50);
  }
}

function drawShop(ctx) {
  const width = CONFIG.CANVAS_W;
  const height = CONFIG.CANVAS_H;
  ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#f2e9d8"; ctx.font = "bold 36px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("Costa Defense — Shop", width / 2, 120);
  const offers = [["1", "Ammo (30) — $50"], ["2", "Armor (full) — $150"], ["3", "Health (+50) — $100"]];
  let lineY = 220;
  for (const [key, label] of offers) {
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(width / 2 - 220, lineY - 28, 440, 46);
    ctx.fillStyle = "#f2e9d8"; ctx.font = "bold 22px sans-serif";
    ctx.fillText(key + "  " + label, width / 2, lineY);
    lineY += 70;
  }
  ctx.font = "14px sans-serif"; ctx.fillStyle = "rgba(242,233,216,0.6)";
  ctx.fillText("Cash: $" + CASH + "   Press Esc to close", width / 2, height - 80);
  ctx.textAlign = "left";
}

function drawTitle(ctx) {
  const width = CONFIG.CANVAS_W;
  const height = CONFIG.CANVAS_H;
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#ff9a5a");
  sky.addColorStop(0.4, "#f7b267");
  sky.addColorStop(0.7, "#f2e9d8");
  sky.addColorStop(1, "#3a7ca5");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#fff2cc";
  ctx.beginPath(); ctx.arc(width / 2, height * 0.35, 60, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,200,100,0.4)";
  ctx.beginPath(); ctx.arc(width / 2, height * 0.35, 90, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#2a3a5a"; ctx.font = "bold 72px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("SUNSET COAST", width / 2, height * 0.22);
  ctx.font = "20px sans-serif"; ctx.fillStyle = "#3a2a1a";
  ctx.fillText("An open-world crime story", width / 2, height * 0.28);

  TITLE_BUTTONS.length = 0;
  const actions = [{ label: "New Game", action: "new" }];
  if (hasSave()) actions.push({ label: "Continue", action: "continue" });
  let buttonY = height * 0.55;
  for (const action of actions) {
    const button = { x: width / 2 - 110, y: buttonY, w: 220, h: 52, action: action.action };
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    roundRect(ctx, button.x, button.y, button.w, button.h, 8); ctx.fill();
    ctx.strokeStyle = "#f2e9d8"; ctx.lineWidth = 2;
    roundRect(ctx, button.x, button.y, button.w, button.h, 8); ctx.stroke();
    ctx.fillStyle = "#f2e9d8"; ctx.font = "bold 22px sans-serif";
    ctx.fillText(action.label, width / 2, button.y + 34);
    TITLE_BUTTONS.push(button);
    buttonY += 70;
  }
  ctx.font = "13px sans-serif"; ctx.fillStyle = "rgba(40,30,20,0.8)";
  ctx.fillText("WASD move/drive  Shift sprint  E enter/exit car  Mouse aim  Click/Space fire  F5 save  Esc pause", width / 2, height - 40);
  ctx.textAlign = "left";
}

function handleTitleClick(mx, my) {
  for (const button of TITLE_BUTTONS) {
    if (mx < button.x || mx > button.x + button.w || my < button.y || my > button.y + button.h) continue;
    if (button.action === "new" && window.GAME && window.GAME.startNewGame) window.GAME.startNewGame();
    else if (button.action === "continue" && window.GAME && window.GAME.continueGame) window.GAME.continueGame();
    return true;
  }
  return false;
}

function drawPause(ctx) {
  const width = CONFIG.CANVAS_W;
  const height = CONFIG.CANVAS_H;
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, width, height);
  const map = { x: width / 2 - 260, y: 80, w: 520, h: 360 };
  ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(map.x, map.y, map.w, map.h);
  ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.strokeRect(map.x, map.y, map.w, map.h);
  const scaleX = map.w / CITY.worldW;
  const scaleY = map.h / CITY.worldH;
  for (let row = 0; row < CITY.H; row++) {
    for (let col = 0; col < CITY.W; col++) {
      if (CITY.grid[row][col] === CONFIG.T_ROAD) ctx.fillStyle = "#555";
      else if (CITY.grid[row][col] === CONFIG.T_WATER) ctx.fillStyle = "rgba(60,120,180,0.6)";
      else continue;
      ctx.fillRect(map.x + col * CITY.T * scaleX, map.y + row * CITY.T * scaleY,
        CITY.T * scaleX, CITY.T * scaleY);
    }
  }
  const player = menuPlayerPosition();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(map.x + player.x * scaleX, map.y + player.y * scaleY, 5, 0, Math.PI * 2); ctx.fill();
  const marker = typeof getMissionMarker === "function" ? getMissionMarker() : null;
  if (marker) {
    ctx.fillStyle = "#ff44aa";
    ctx.beginPath(); ctx.arc(map.x + marker.x * scaleX, map.y + marker.y * scaleY, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = "#f2e9d8"; ctx.font = "bold 48px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("PAUSED", width / 2, 60);
  ctx.font = "16px sans-serif";
  const instructions = [
    "WASD / Arrows — move or drive", "Shift — sprint", "E — enter/exit vehicle",
    "Mouse — aim   Click/Space — fire", "B — shop (near Costa Defense)   M — mute", "F5 — save    Esc — resume",
  ];
  let instructionY = height - 150;
  for (const instruction of instructions) {
    ctx.fillText(instruction, width / 2, instructionY);
    instructionY += 24;
  }
  ctx.textAlign = "left";
}

function menuPlayerPosition() {
  if (PLAYER.onFoot) return PLAYER;
  return VEHICLES.find((vehicle) => vehicle.id === PLAYER.vehicleId) || PLAYER;
}

function drawDead(ctx) {
  const width = CONFIG.CANVAS_W;
  const height = CONFIG.CANVAS_H;
  ctx.fillStyle = "rgba(60,0,0,0.7)"; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#fff"; ctx.font = "bold 64px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("WASTED", width / 2, height / 2);
  ctx.font = "20px sans-serif"; ctx.fillText("Respawning at hospital...", width / 2, height / 2 + 40);
  ctx.textAlign = "left";
}

function drawMissionComplete(ctx) {
  const width = CONFIG.CANVAS_W;
  const height = CONFIG.CANVAS_H;
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(width / 2 - 220, height / 2 - 60, 440, 120);
  ctx.fillStyle = "#7fd67f"; ctx.font = "bold 32px sans-serif"; ctx.textAlign = "center";
  const mission = typeof CURRENT_MISSION === "function" ? CURRENT_MISSION() : CURRENT_MISSION;
  ctx.fillText("MISSION COMPLETE", width / 2, height / 2 - 10);
  ctx.fillStyle = "#f2e9d8"; ctx.font = "18px sans-serif";
  ctx.fillText((mission ? mission.title : "") + "  +$" + (mission ? mission.reward : 0), width / 2, height / 2 + 24);
  ctx.textAlign = "left";
}

function drawMissionDialog(ctx) {
  const width = CONFIG.CANVAS_W;
  const height = CONFIG.CANVAS_H;
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.fillRect(0, 0, width, 120);
  ctx.fillRect(0, height - 120, width, 120);
  const mission = typeof CURRENT_MISSION === "function" ? CURRENT_MISSION() : CURRENT_MISSION;
  if (!mission) return;
  const lineIndex = typeof DIALOGUE_LINE === "function" ? DIALOGUE_LINE() : DIALOGUE_LINE;
  const speaker = mission.speaker || "M";
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath(); ctx.arc(80, height - 60, 40, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#2a3a5a"; ctx.font = "bold 36px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(speaker.charAt(0).toUpperCase() + ".", 80, height - 48);
  ctx.fillStyle = "#f2e9d8"; ctx.font = "bold 24px sans-serif";
  ctx.fillText(mission.title, width / 2, height - 80);
  ctx.font = "18px sans-serif";
  ctx.fillText(mission.briefingLines[lineIndex] || "", width / 2, height - 45);
  ctx.font = "13px sans-serif"; ctx.fillStyle = "rgba(242,233,216,0.6)";
  ctx.fillText("Press Space / Enter to continue", width / 2, height - 20);
  ctx.textAlign = "left";
}

window.drawTitle = drawTitle;
window.drawPause = drawPause;
window.drawDead = drawDead;
window.drawMissionComplete = drawMissionComplete;
window.drawMissionDialog = drawMissionDialog;
window.drawShop = drawShop;
window.handleTitleClick = handleTitleClick;
window.TITLE_BUTTONS = TITLE_BUTTONS;
window.buyItem = buyItem;
window.SHOPS = SHOPS;
