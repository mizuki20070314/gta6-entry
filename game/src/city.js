// city.js — procedural city generation from a seed
function generateCity(seed) {
  const C = CONFIG;
  const rng = createRng(seed);
  const W = C.GRID_W, H = C.GRID_H, T = C.TILE;
  const grid = [];
  for (let y = 0; y < H; y++) { grid.push(new Array(W).fill(C.T_BUILDING)); }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (x % 4 === 0 || y % 4 === 0) grid[y][x] = C.T_ROAD;

  const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      if (grid[y][x] === C.T_BUILDING) grid[y][x] = C.T_PARK;
    }

  for (let x = 0; x < W; x++) {
    if (grid[H - 1][x] !== C.T_ROAD) grid[H - 1][x] = C.T_WATER;
    if (H - 2 >= 0 && grid[H - 2][x] !== C.T_ROAD) grid[H - 2][x] = C.T_BEACH;
  }

  const rng2 = createRng(seed + 99);
  for (let i = 0; i < 3; i++) {
    let tries = 0;
    while (tries < 50) {
      tries++;
      const x = rngInt(rng2, W - 2) + 1;
      const y = rngInt(rng2, H - 2) + 1;
      if (grid[y][x] !== C.T_BUILDING) continue;
      if (grid[y][x + 1] !== C.T_BUILDING) continue;
      if (grid[y + 1][x] !== C.T_BUILDING) continue;
      if (grid[y + 1][x + 1] !== C.T_BUILDING) continue;
      grid[y][x] = C.T_PLAZA; grid[y][x + 1] = C.T_PLAZA;
      grid[y + 1][x] = C.T_PLAZA; grid[y + 1][x + 1] = C.T_PLAZA;
      break;
    }
  }

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (grid[y][x] !== C.T_BUILDING) continue;
      let touch = false;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (grid[ny][nx] === C.T_ROAD) { touch = true; break; }
      }
      if (touch) grid[y][x] = C.T_SIDEWALK;
    }

  const solid = [];
  for (let y = 0; y < H; y++) {
    solid.push(new Array(W));
    for (let x = 0; x < W; x++) {
      const t = grid[y][x];
      solid[y][x] = (t === C.T_BUILDING || t === C.T_WATER);
    }
  }

  const buildingColors = [];
  for (let y = 0; y < H; y++) {
    buildingColors.push(new Array(W));
    for (let x = 0; x < W; x++) {
      buildingColors[y][x] = C.COLORS.building[rngInt(createRng(seed + x * 997 + y * 31), C.COLORS.building.length)];
    }
  }

  const roadSpawns = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (grid[y][x] === C.T_ROAD)
        roadSpawns.push({ x: x * T + T / 2, y: y * T + T / 2 });

  function districtAt(wx, wy) {
    const left = wx < (W * T) / 2;
    const top = wy < (H * T) / 2;
    if (top && left) return C.DISTRICTS[0];
    if (top && !left) return C.DISTRICTS[1];
    if (!top && left) return C.DISTRICTS[2];
    return C.DISTRICTS[3];
  }

  function isSolid(wx, wy) {
    const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
    return solid[ty][tx];
  }

  function isRoad(wx, wy) {
    const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return false;
    return grid[ty][tx] === C.T_ROAD;
  }

  const city = {
    seed, grid, solid, W, H, T, worldW: W * T, worldH: H * T,
    buildingColors, roadSpawns, districtAt, isSolid, isRoad,
  };
  return city;
}

function drawCity(ctx, cam, day) {
  const T = CITY.T;
  const startX = Math.floor(cam.x / T) - 1;
  const startY = Math.floor(cam.y / T) - 1;
  const endX = Math.ceil((cam.x + CONFIG.CANVAS_W) / T) + 1;
  const endY = Math.ceil((cam.y + CONFIG.CANVAS_H) / T) + 1;
  ctx.fillStyle = '#c9b89a';
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  for (let ty = startY; ty <= endY; ty++) {
    for (let tx = startX; tx <= endX; tx++) {
      if (tx < 0 || ty < 0 || tx >= CITY.W || ty >= CITY.H) continue;
      const t = CITY.grid[ty][tx];
      const x = tx * T - cam.x;
      const y = ty * T - cam.y;
      if (t === CONFIG.T_ROAD) {
        ctx.fillStyle = CONFIG.COLORS.road;
        ctx.fillRect(x, y, T, T);
        const isHoriz = (ty % 4 === 0);
        const isVert = (tx % 4 === 0);
        if (isHoriz && !(tx % 4 === 0)) {
          ctx.strokeStyle = CONFIG.COLORS.roadLine;
          ctx.setLineDash([20, 20]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y + T / 2);
          ctx.lineTo(x + T, y + T / 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if (isVert && !(ty % 4 === 0)) {
          ctx.strokeStyle = CONFIG.COLORS.roadLine;
          ctx.setLineDash([20, 20]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + T / 2, y);
          ctx.lineTo(x + T / 2, y + T);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if (tx % 4 === 0 && ty % 4 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          for (let i = 0; i < 6; i++) {
            ctx.fillRect(x + 4 + i * 24, y + 6, 14, 6);
            ctx.fillRect(x + 4 + i * 24, y + T - 12, 14, 6);
            ctx.fillRect(x + 6, y + 4 + i * 24, 6, 14);
            ctx.fillRect(x + T - 12, y + 4 + i * 24, 6, 14);
          }
        }
      } else if (t === CONFIG.T_SIDEWALK) {
        ctx.fillStyle = CONFIG.COLORS.sidewalk;
        ctx.fillRect(x, y, T, T);
      } else if (t === CONFIG.T_PARK) {
        ctx.fillStyle = CONFIG.COLORS.park;
        ctx.fillRect(x, y, T, T);
        const seed = tx * 7 + ty * 13;
        for (let i = 0; i < 3; i++) {
          const px = x + 20 + ((seed * (i + 1) * 37) % (T - 40));
          const py = y + 20 + ((seed * (i + 2) * 53) % (T - 40));
          ctx.fillStyle = CONFIG.COLORS.parkDark;
          ctx.beginPath(); ctx.arc(px, py, 14, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#3a6a2a';
          ctx.beginPath(); ctx.arc(px - 4, py - 4, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#5a4a2a';
          ctx.fillRect(px - 2, py, 4, 10);
        }
      } else if (t === CONFIG.T_WATER) {
        ctx.fillStyle = CONFIG.COLORS.water;
        ctx.fillRect(x, y, T, T);
        ctx.strokeStyle = CONFIG.COLORS.waterShimmer;
        ctx.lineWidth = 1;
        const off = (performance.now() / 600) % T;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(x, y + i * 40 + (off % 40));
          ctx.lineTo(x + T, y + i * 40 + (off % 40));
          ctx.stroke();
        }
      } else if (t === CONFIG.T_BEACH) {
        ctx.fillStyle = CONFIG.COLORS.beach;
        ctx.fillRect(x, y, T, T);
      } else if (t === CONFIG.T_PLAZA) {
        ctx.fillStyle = CONFIG.COLORS.plaza;
        ctx.fillRect(x, y, T, T);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x + 10, y + 10, T - 20, T - 20);
      } else if (t === CONFIG.T_BUILDING) {
        const col = CITY.buildingColors[ty][tx];
        ctx.fillStyle = col;
        ctx.fillRect(x, y, T, T);
        ctx.fillStyle = 'rgba(255,255,220,0.18)';
        ctx.fillRect(x, y + T * 0.6, T, T * 0.4);
        const rseed = tx * 131 + ty * 97;
        ctx.fillStyle = CONFIG.COLORS.roof;
        for (let i = 0; i < 2; i++) {
          const ax = x + 16 + ((rseed * (i + 1) * 17) % (T - 40));
          const ay = y + 16 + ((rseed * (i + 2) * 23) % (T - 40));
          ctx.fillRect(ax, ay, 18, 14);
          ctx.fillStyle = '#5a5a5a';
          ctx.fillRect(ax + 2, ay + 2, 14, 10);
          ctx.fillStyle = CONFIG.COLORS.roof;
        }
        if (rseed % 5 === 0) {
          ctx.fillStyle = '#3a7ca5';
          ctx.fillRect(x + T * 0.3, y + T * 0.3, T * 0.4, T * 0.25);
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.fillRect(x + T * 0.3, y + T * 0.3, T * 0.4, 4);
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(x + 4, y + T - 2, T - 4, 6);
      }
    }
  }
}

window.generateCity = generateCity;
window.drawCity = drawCity;
