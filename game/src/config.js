// config.js — all tunable constants for Sunset Coast
const CONFIG = {
  CANVAS_W: 1280,
  CANVAS_H: 720,
  TILE: 160,
  GRID_W: 24,
  GRID_H: 18,
  WORLD_W: 24 * 160,
  WORLD_H: 18 * 160,

  // tile types
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

  VEHICLE_TYPES: null, // filled in vehicles.js? keep here
  CAR_RADIUS: 26,

  WANTED_DECAY: 12, // seconds per star to decay when out of sight
  POLICE_SPAWN_DELAY: 4,

  DAY_LENGTH: 240, // seconds

  COLORS: {
    sky: '#f7b267',
    road: '#3a3a42',
    roadLine: '#f2e9d8',
    sidewalk: '#b8a890',
    building: ['#e8c9a0', '#d9b89a', '#c9a882', '#f0d4b0', '#bfa07a', '#d4b89c'],
    roof: '#8a7a6a',
    park: '#7fb069',
    parkDark: '#5a8a4a',
    water: '#3a7ca5',
    waterShimmer: '#7fb3d5',
    beach: '#e8d4a0',
    plaza: '#c9b89a',
    player: '#2a3a5a',
    playerSkin: '#f0c8a0',
    shadow: 'rgba(0,0,0,0.35)',
    hud: '#f2e9d8',
    star: '#f5c542',
    starEmpty: 'rgba(255,255,255,0.35)',
    cash: '#7fd67f',
  },

  // districts by quadrant
  DISTRICTS: ['Costa Vista', 'Puerto Viejo', 'Palm Heights', 'Marina District'],
};
window.CONFIG = CONFIG;
