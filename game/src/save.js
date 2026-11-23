// Storage is optional: private windows and blocked browser storage still play.
// A parked ride is saved by type so loading does not strand the driver on foot.
// The seed check avoids placing progress into a different generated city.
function saveGame() {
  try {
    const ride = !PLAYER.onFoot
      ? VEHICLES.find((vehicle) => vehicle.id === PLAYER.vehicleId)
      : null;
    const position = ride || PLAYER;
    const record = {
      x: position.x,
      y: position.y,
      onFoot: !ride,
      vehicleType: ride ? ride.type : null,
      vehicleAngle: ride ? ride.angle : 0,
      health: PLAYER.health,
      armor: PLAYER.armor,
      cash: CASH,
      mission: MISSION_INDEX,
      weapon: PLAYER.weapon,
      ammo: PLAYER.ammo,
      seed: CITY.seed,
    };
    localStorage.setItem("sc_save", JSON.stringify(record));
  } catch (error) {
    // Quota and privacy errors should never interrupt a drive.
  }
}

function loadGame() {
  try {
    const packed = localStorage.getItem("sc_save");
    if (!packed) return false;

    const record = JSON.parse(packed);
    if (record.seed !== CITY.seed) return false;

    initPlayer(record.x, record.y);
    PLAYER.health = Number.isFinite(record.health) ? record.health : 100;
    PLAYER.armor = Number.isFinite(record.armor) ? record.armor : 0;
    PLAYER.weapon = record.weapon || "fists";
    PLAYER.ammo = Number.isFinite(record.ammo) ? record.ammo : 30;
    CASH = Number.isFinite(record.cash) ? record.cash : 0;
    MISSION_INDEX = Number.isFinite(record.mission) ? record.mission : 0;

    if (record.onFoot === false && VEHICLE_TYPES[record.vehicleType]) {
      const ride = spawnVehicle(record.vehicleType, record.x, record.y, record.vehicleAngle || 0, {
        ai: false,
        driver: "player",
      });
      PLAYER.onFoot = false;
      PLAYER.vehicleId = ride.id;
    }
    return true;
  } catch (error) {
    return false;
  }
}

function hasSave() {
  try {
    return localStorage.getItem("sc_save") !== null;
  } catch (error) {
    return false;
  }
}

window.saveGame = saveGame;
window.loadGame = loadGame;
window.hasSave = hasSave;
