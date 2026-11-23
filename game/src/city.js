// Pacificora is a seeded grid, so landmarks and driving lanes hold their shape.
// Tile solidity is prepared once and shared by movement, pedestrians, and police.
// Drawing clips work to the camera while keeping details anchored to world tiles.
function generateCity(seed) {
  const rules = CONFIG;
  const random = createRng(seed);
  const width = rules.GRID_W;
  const height = rules.GRID_H;
  const tileSize = rules.TILE;
  const grid = Array.from({ length: height }, () => Array(width).fill(rules.T_BUILDING));

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (col % 4 === 0 || row % 4 === 0) grid[row][col] = rules.T_ROAD;
    }
  }

  const middleX = Math.floor(width / 2);
  const middleY = Math.floor(height / 2);
  for (let row = middleY - 2; row <= middleY + 2; row++) {
    for (let col = middleX - 2; col <= middleX + 2; col++) {
      if (grid[row] && grid[row][col] === rules.T_BUILDING) grid[row][col] = rules.T_PARK;
    }
  }

  for (let col = 0; col < width; col++) {
    if (grid[height - 1][col] !== rules.T_ROAD) grid[height - 1][col] = rules.T_WATER;
    if (grid[height - 2][col] !== rules.T_ROAD) grid[height - 2][col] = rules.T_BEACH;
  }

  const plazaRandom = createRng(seed + 99);
  for (let attempt = 0; attempt < 3; attempt++) {
    let placed = false;
    for (let tries = 0; tries < 50 && !placed; tries++) {
      const col = rngInt(plazaRandom, width - 2) + 1;
      const row = rngInt(plazaRandom, height - 2) + 1;
      const corners = [[col, row], [col + 1, row], [col, row + 1], [col + 1, row + 1]];
      if (corners.every(([x, y]) => grid[y][x] === rules.T_BUILDING)) {
        for (const [x, y] of corners) grid[y][x] = rules.T_PLAZA;
        placed = true;
      }
    }
  }

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (grid[row][col] !== rules.T_BUILDING) continue;
      const besideRoad = [[col - 1, row], [col + 1, row], [col, row - 1], [col, row + 1]]
        .some(([x, y]) => x >= 0 && y >= 0 && x < width && y < height && grid[y][x] === rules.T_ROAD);
      if (besideRoad) grid[row][col] = rules.T_SIDEWALK;
    }
  }

  const solid = grid.map((row) => row.map((kind) => kind === rules.T_BUILDING || kind === rules.T_WATER));
  const buildingColors = grid.map((row, y) => row.map((kind, x) => {
    const shadePicker = createRng(seed + x * 997 + y * 31);
    return rngPick(shadePicker, rules.COLORS.building);
  }));
  const roadSpawns = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (grid[row][col] === rules.T_ROAD) {
        roadSpawns.push({ x: col * tileSize + tileSize / 2, y: row * tileSize + tileSize / 2 });
      }
    }
  }

  function districtAt(worldX, worldY) {
    const east = worldX >= width * tileSize / 2;
    const south = worldY >= height * tileSize / 2;
    if (!south && !east) return rules.DISTRICTS[0];
    if (!south && east) return rules.DISTRICTS[1];
    if (south && !east) return rules.DISTRICTS[2];
    return rules.DISTRICTS[3];
  }

  function isSolid(worldX, worldY) {
    const col = Math.floor(worldX / tileSize);
    const row = Math.floor(worldY / tileSize);
    return row < 0 || col < 0 || row >= height || col >= width || solid[row][col];
  }

  function isRoad(worldX, worldY) {
    const col = Math.floor(worldX / tileSize);
    const row = Math.floor(worldY / tileSize);
    return row >= 0 && col >= 0 && row < height && col < width && grid[row][col] === rules.T_ROAD;
  }

  return {
    seed, grid, solid, W: width, H: height, T: tileSize,
    worldW: width * tileSize, worldH: height * tileSize,
    buildingColors, roadSpawns, districtAt, isSolid, isRoad,
  };
}

function drawCity(ctx, cam, day) {
  const palette = CONFIG;
  const city = window.CITY;
  const tileSize = city.T;
  const firstCol = Math.floor(cam.x / tileSize) - 1;
  const firstRow = Math.floor(cam.y / tileSize) - 1;
  const lastCol = Math.ceil((cam.x + palette.CANVAS_W) / tileSize) + 1;
  const lastRow = Math.ceil((cam.y + palette.CANVAS_H) / tileSize) + 1;
  const isNight = day > 0.76 || day < 0.24;
  ctx.fillStyle = "#c9b89a";
  ctx.fillRect(0, 0, palette.CANVAS_W, palette.CANVAS_H);

  for (let row = firstRow; row <= lastRow; row++) {
    for (let col = firstCol; col <= lastCol; col++) {
      if (row < 0 || col < 0 || row >= city.H || col >= city.W) continue;
      const kind = city.grid[row][col];
      const left = col * tileSize - cam.x;
      const top = row * tileSize - cam.y;
      paintCityTile(ctx, city, kind, col, row, left, top, tileSize, isNight);
    }
  }
}

function paintCityTile(ctx, city, kind, col, row, x, y, size, isNight) {
  const colors = CONFIG.COLORS;
  if (kind === CONFIG.T_ROAD) {
    ctx.fillStyle = colors.road;
    ctx.fillRect(x, y, size, size);
    if (row % 4 === 0 && col % 4 !== 0) {
      ctx.strokeStyle = colors.roadLine;
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 20]);
      ctx.beginPath(); ctx.moveTo(x, y + size / 2); ctx.lineTo(x + size, y + size / 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (col % 4 === 0 && row % 4 !== 0) {
      ctx.strokeStyle = colors.roadLine;
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 20]);
      ctx.beginPath(); ctx.moveTo(x + size / 2, y); ctx.lineTo(x + size / 2, y + size); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (col % 4 === 0 && row % 4 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (let stripe = 0; stripe < 6; stripe++) {
        ctx.fillRect(x + 4 + stripe * 24, y + 6, 14, 6);
        ctx.fillRect(x + 4 + stripe * 24, y + size - 12, 14, 6);
        ctx.fillRect(x + 6, y + 4 + stripe * 24, 6, 14);
        ctx.fillRect(x + size - 12, y + 4 + stripe * 24, 6, 14);
      }
    }
    return;
  }

  if (kind === CONFIG.T_SIDEWALK) {
    ctx.fillStyle = colors.sidewalk; ctx.fillRect(x, y, size, size); return;
  }
  if (kind === CONFIG.T_PARK) {
    ctx.fillStyle = colors.park; ctx.fillRect(x, y, size, size);
    const landmark = col * 7 + row * 13;
    for (let tree = 0; tree < 3; tree++) {
      const treeX = x + 20 + ((landmark * (tree + 1) * 37) % (size - 40));
      const treeY = y + 20 + ((landmark * (tree + 2) * 53) % (size - 40));
      const sway = Math.sin(performance.now() / 800 + col + row) * 3;
      ctx.fillStyle = colors.parkDark;
      ctx.beginPath(); ctx.arc(treeX + sway, treeY, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#3a6a2a";
      ctx.beginPath(); ctx.arc(treeX - 4 + sway, treeY - 4, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#5a4a2a"; ctx.fillRect(treeX - 2, treeY, 4, 10);
    }
    return;
  }
  if (kind === CONFIG.T_WATER) {
    ctx.fillStyle = colors.water; ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = isNight ? "rgba(220,220,190,0.48)" : colors.waterShimmer;
    ctx.lineWidth = 1.5;
    const drift = (performance.now() / 500) % size;
    for (let ripple = 0; ripple < 5; ripple++) {
      const lineY = y + ripple * 32 + (drift % 32);
      ctx.beginPath(); ctx.moveTo(x, lineY);
      ctx.quadraticCurveTo(x + size / 2, lineY + 6, x + size, lineY); ctx.stroke();
    }
    if (isNight) {
      ctx.fillStyle = "rgba(255,238,185,0.3)";
      for (let glint = 0; glint < 4; glint++) {
        const glintX = x + 24 + ((col * 23 + glint * 37) % (size - 48));
        const glintY = y + 20 + glint * 31;
        ctx.fillRect(glintX, glintY, 34, 2);
      }
    }
    return;
  }
  if (kind === CONFIG.T_BEACH) {
    ctx.fillStyle = colors.beach; ctx.fillRect(x, y, size, size); return;
  }
  if (kind === CONFIG.T_PLAZA) {
    ctx.fillStyle = colors.plaza; ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(x + 10, y + 10, size - 20, size - 20); return;
  }
  if (kind !== CONFIG.T_BUILDING) return;

  ctx.fillStyle = city.buildingColors[row][col];
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = "rgba(255,255,220,0.18)";
  ctx.fillRect(x, y + size * 0.6, size, size * 0.4);
  const roofMark = col * 131 + row * 97;
  ctx.fillStyle = colors.roof;
  for (let unit = 0; unit < 2; unit++) {
    const roofX = x + 16 + ((roofMark * (unit + 1) * 17) % (size - 40));
    const roofY = y + 16 + ((roofMark * (unit + 2) * 23) % (size - 40));
    ctx.fillRect(roofX, roofY, 18, 14);
    ctx.fillStyle = "#5a5a5a"; ctx.fillRect(roofX + 2, roofY + 2, 14, 10);
    ctx.fillStyle = colors.roof;
  }
  if (roofMark % 5 === 0) {
    ctx.fillStyle = "#3a7ca5"; ctx.fillRect(x + size * 0.3, y + size * 0.3, size * 0.4, size * 0.25);
    ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fillRect(x + size * 0.3, y + size * 0.3, size * 0.4, 4);
  }
  if (isNight) {
    ctx.fillStyle = "rgba(255,218,132,0.78)";
    for (let pane = 0; pane < 4; pane++) {
      const wx = x + 26 + pane * 30;
      const wy = y + size * 0.64;
      if ((roofMark + pane * 3) % 4 !== 0) ctx.fillRect(wx, wy, 12, 16);
    }
  }
  ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(x + 4, y + size - 2, size - 4, 6);
}

window.generateCity = generateCity;
window.drawCity = drawCity;
