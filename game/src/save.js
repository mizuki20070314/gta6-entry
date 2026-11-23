// save.js — localStorage save/load
function saveGame() {
  try {
    const data = {
      x: PLAYER.onFoot ? PLAYER.x : (VEHICLES.find(v => v.id === PLAYER.vehicleId) || PLAYER).x,
      y: PLAYER.onFoot ? PLAYER.y : (VEHICLES.find(v => v.id === PLAYER.vehicleId) || PLAYER).y,
      onFoot: PLAYER.onFoot,
      health: PLAYER.health,
      cash: CASH,
      mission: MISSION_INDEX,
      weapon: PLAYER.weapon,
      ammo: PLAYER.ammo,
      seed: CITY.seed,
    };
    localStorage.setItem('sc_save', JSON.stringify(data));
  } catch (e) {}
}

function loadGame() {
  try {
    const s = localStorage.getItem('sc_save');
    if (!s) return false;
    const data = JSON.parse(s);
    if (data.seed !== CITY.seed) return false;
    initPlayer(data.x, data.y);
    PLAYER.health = data.health || 100;
    PLAYER.weapon = data.weapon || 'fists';
    PLAYER.ammo = data.ammo || 30;
    PLAYER.onFoot = data.onFoot !== false;
    CASH = data.cash || 0;
    MISSION_INDEX = data.mission || 0;
    return true;
  } catch (e) { return false; }
}

function hasSave() {
  try { return !!localStorage.getItem('sc_save'); } catch (e) { return false; }
}

window.saveGame = saveGame;
window.loadGame = loadGame;
window.hasSave = hasSave;
