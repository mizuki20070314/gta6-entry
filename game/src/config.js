// This board sets the shared scale and feel of the whole simulation.
// Movement, map construction, and drawing read from the same values,
// so one adjustment can be felt in several places at once.
// Canvas dimensions describe the visible frame presented to the player.
// The world extends beyond that frame and scrolls as the player travels.
// TILE is the city's basic measuring unit: one grid cell spans that many
// world pixels, and the world dimensions follow from the cell counts.
// Larger tiles make each block feel broader; smaller ones pack streets tighter.
//
// Grid width and height decide how many blocks fit across the coast.
// They also set the total travel area before the map edge is reached.
// Tile kinds give the generator and renderer a shared vocabulary for
// buildings, streets, sidewalks, green space, water, plazas, and sand.
// Keep these identifiers numeric so grid lookups stay simple and consistent.
//
// Walking pace sets the ordinary on-foot rhythm across a block.
// Sprint speed is a stronger burst, useful when a crossing needs urgency.
// Player and car radii describe collision footprints, not visual size.
// Maximum health gives damage a clear endpoint for the status display.
// Together, these values shape how quickly the city passes beneath the player.
//
// Wanted decay controls how fast heat fades when no nearby cruiser keeps
// pressure on; a larger value makes that relief arrive more slowly.
// Spawn delay spaces out new police arrivals instead of making them instant.
// Day length sets the cycle that moves the scenery from bright to dark.
//
// The colors give the coast its late-afternoon character: sunlit earth,
// pale architecture, warm sand, and green pockets sit beside cool blue water.
// Road and outline tones keep routes legible against those softer surfaces.
// Player, alert, and cash accents stand apart so important signals remain clear.
// One tuning board feeds movement, simulation, and every drawing pass.
// Tile values stay numeric so the generated grid remains compact.
// Keep the palette here: scene capture and normal play share the same colors.
const CONFIG = {
  CANVAS_W: 1280,
  CANVAS_H: 720,
  TILE: 160,
  GRID_W: 24,
  GRID_H: 18,
  WORLD_W: 24 * 160,
  WORLD_H: 18 * 160,

  T_BUILDING: 0,
  T_ROAD: 1,
  T_SIDEWALK: 2,
  T_PARK: 3,
  T_WATER: 4,
  T_PLAZA: 5,
  T_BEACH: 6,

  PLAYER_SPEED: 210,
  PLAYER_SPRINT: 360,
  PLAYER_RADIUS: 12,
  PLAYER_MAX_HEALTH: 100,
  CAR_RADIUS: 26,
  WANTED_DECAY: 12,
  POLICE_SPAWN_DELAY: 4,
  DAY_LENGTH: 240,

  COLORS: {
    sky: "#f7b267",
    road: "#3a3a42",
    roadLine: "#f2e9d8",
    sidewalk: "#b8a890",
    building: ["#e8c9a0", "#d9b89a", "#c9a882", "#f0d4b0", "#bfa07a", "#d4b89c"],
    roof: "#8a7a6a",
    park: "#7fb069",
    parkDark: "#5a8a4a",
    water: "#3a7ca5",
    waterShimmer: "#7fb3d5",
    beach: "#e8d4a0",
    plaza: "#c9b89a",
    player: "#2a3a5a",
    playerSkin: "#f0c8a0",
    shadow: "rgba(0,0,0,0.35)",
    hud: "#f2e9d8",
    star: "#f5c542",
    starEmpty: "rgba(255,255,255,0.35)",
    cash: "#7fd67f",
  },

  DISTRICTS: ["Costa Vista", "Puerto Viejo", "Palm Heights", "Marina District"],
};

window.CONFIG = CONFIG;
