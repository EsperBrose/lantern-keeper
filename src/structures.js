// Things you build: placed on a grid, solid to zombies and to you.
export const GRID = 24;

export const TYPES = {
  wood: { name: 'Wood Wall', cost: { wood: 4 }, hp: 60 },
  stone: { name: 'Stone Wall', cost: { stone: 3 }, hp: 160 },
  tower: { name: 'Arrow Tower', cost: { wood: 10, stone: 5 }, hp: 120, range: 150, reload: 0.7 },
  tesla: { name: 'Electric Gun', cost: { wood: 6, stone: 14 }, hp: 140, range: 115, reload: 1.3 },
};

export function createBase() {
  return { list: [], byCell: new Map() };
}

const key = (gx, gy) => `${gx},${gy}`;

export function cellAt(x, y) {
  return { gx: Math.floor(x / GRID), gy: Math.floor(y / GRID) };
}

export function structureAt(base, gx, gy) {
  return base.byCell.get(key(gx, gy));
}

export function canAfford(inv, type) {
  return Object.entries(TYPES[type].cost).every(([res, n]) => (inv[res] || 0) >= n);
}

export function costText(type) {
  return Object.entries(TYPES[type].cost)
    .map(([res, n]) => `${n}${res === 'wood' ? 'W' : 'S'}`)
    .join(' ');
}

export function place(base, inv, type, gx, gy) {
  if (structureAt(base, gx, gy) || !canAfford(inv, type)) return null;
  for (const [res, n] of Object.entries(TYPES[type].cost)) inv[res] -= n;
  const s = {
    type,
    gx,
    gy,
    x: gx * GRID + GRID / 2,
    y: gy * GRID + GRID / 2,
    hp: TYPES[type].hp,
    maxHp: TYPES[type].hp,
    hurt: 0,
  };
  base.list.push(s);
  base.byCell.set(key(gx, gy), s);
  return s;
}

// Removes a structure and refunds half its cost.
export function demolish(base, inv, gx, gy) {
  const s = structureAt(base, gx, gy);
  if (!s) return false;
  for (const [res, n] of Object.entries(TYPES[s.type].cost)) inv[res] += Math.floor(n / 2);
  s.hp = 0;
  cleanup(base);
  return true;
}

function cleanup(base) {
  base.list = base.list.filter((s) => {
    if (s.hp > 0) return true;
    base.byCell.delete(key(s.gx, s.gy));
    return false;
  });
}

export function updateStructures(base, dt) {
  for (const s of base.list) s.hurt = Math.max(0, s.hurt - dt);
  cleanup(base);
}

export function damage(s, amount) {
  s.hp -= amount;
  s.hurt = 0.1;
}

// Pushes a circle (e.x, e.y, radius r) out of any solid structure.
// Returns the structures it was touching.
export function collide(base, e, r) {
  const hits = [];
  const c = cellAt(e.x, e.y);
  for (let gy = c.gy - 1; gy <= c.gy + 1; gy++) {
    for (let gx = c.gx - 1; gx <= c.gx + 1; gx++) {
      const s = structureAt(base, gx, gy);
      if (!s) continue;
      const x0 = gx * GRID;
      const y0 = gy * GRID;
      const nx = Math.max(x0, Math.min(e.x, x0 + GRID));
      const ny = Math.max(y0, Math.min(e.y, y0 + GRID));
      let dx = e.x - nx;
      let dy = e.y - ny;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r * r) continue;
      if (d2 === 0) {
        // Center is inside the block: push out along the shortest axis.
        const left = e.x - x0;
        const right = x0 + GRID - e.x;
        const up = e.y - y0;
        const down = y0 + GRID - e.y;
        const m = Math.min(left, right, up, down);
        if (m === left) e.x = x0 - r;
        else if (m === right) e.x = x0 + GRID + r;
        else if (m === up) e.y = y0 - r;
        else e.y = y0 + GRID + r;
      } else {
        const d = Math.sqrt(d2);
        dx /= d;
        dy /= d;
        e.x = nx + dx * r;
        e.y = ny + dy * r;
      }
      hits.push(s);
    }
  }
  return hits;
}

// --- Drawing ---------------------------------------------------------------

const LOOK = {
  wood: { top: '#c48a4f', face: '#9c6a3a', line: '#6e4724' },
  stone: { top: '#b4b9bf', face: '#868b91', line: '#5c6066' },
};
const WALL_H = 16; // how tall walls look

// Draws any structure type with its top-left grid corner at (x, y).
export function drawShape(ctx, type, x, y, flash, angle = -0.6) {
  if (type === 'tower') drawTower(ctx, x, y, flash, angle);
  else if (type === 'tesla') drawTesla(ctx, x, y, flash);
  else drawWallBlock(ctx, type, x, y, flash);
}

// Where a tesla's orb sits, relative to its grid corner.
export const TESLA_ORB = { dx: 12, dy: -30 };

function drawTesla(ctx, x, y, flash) {
  const S = LOOK.stone;
  // Stone base
  ctx.fillStyle = flash ? '#ffffff' : S.top;
  ctx.fillRect(x, y + 4, GRID, 10);
  ctx.fillStyle = flash ? '#ffffff' : S.face;
  ctx.fillRect(x, y + 14, GRID, 12);
  // Copper coil
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = flash ? '#ffffff' : i % 2 ? '#b8662e' : '#e08a3c';
    ctx.fillRect(x + 7, y + 4 - i * 4 - 4, 10, 4);
  }
  ctx.fillStyle = flash ? '#ffffff' : '#3a3a3a';
  ctx.fillRect(x + 4, y - 26, 16, 3);
  // Glowing orb (pulses)
  const pulse = 0.75 + Math.sin(performance.now() / 120) * 0.25;
  ctx.fillStyle = `rgba(120, 210, 255, ${0.35 * pulse})`;
  ctx.fillRect(x + TESLA_ORB.dx - 9, y + TESLA_ORB.dy - 9, 18, 18);
  ctx.fillStyle = flash ? '#ffffff' : '#7fd8ff';
  ctx.fillRect(x + TESLA_ORB.dx - 6, y + TESLA_ORB.dy - 6, 12, 12);
  ctx.fillStyle = '#e8f8ff';
  ctx.fillRect(x + TESLA_ORB.dx - 4, y + TESLA_ORB.dy - 4, 4, 4);
}

function drawTower(ctx, x, y, flash, angle) {
  const S = LOOK.stone;
  // Stone pillar
  ctx.fillStyle = flash ? '#ffffff' : S.face;
  ctx.fillRect(x + 2, y - 22, 20, 48);
  ctx.fillStyle = flash ? '#ffffff' : '#9a9fa5';
  ctx.fillRect(x + 2, y - 22, 6, 48);
  if (!flash) {
    ctx.fillStyle = S.line;
    for (let i = 0; i < 6; i++) ctx.fillRect(x + 2, y - 16 + i * 7, 20, 1);
    ctx.fillRect(x + 11, y - 10, 2, 6); // arrow slit
  }
  // Wooden platform with crenellations
  ctx.fillStyle = flash ? '#ffffff' : LOOK.wood.top;
  ctx.fillRect(x - 1, y - 28, 26, 7);
  ctx.fillStyle = flash ? '#ffffff' : LOOK.wood.face;
  ctx.fillRect(x - 1, y - 22, 26, 3);
  ctx.fillStyle = flash ? '#ffffff' : S.top;
  ctx.fillRect(x - 1, y - 33, 6, 5);
  ctx.fillRect(x + 19, y - 33, 6, 5);
  // Crossbow, turned toward its target
  ctx.save();
  ctx.translate(x + 12, y - 29);
  ctx.rotate(angle);
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(-4, -1.5, 14, 3);
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(6, -7, 2.5, 14);
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(10, -0.5, 3, 1);
  ctx.restore();
}

export function drawStructure(ctx, s) {
  const x = s.gx * GRID;
  const y = s.gy * GRID;
  drawShape(ctx, s.type, x, y, s.hurt > 0, s.angle);
  drawHealth(ctx, s, x, s.type === 'wood' || s.type === 'stone' ? y : y - 22);
}

// Cracks + health bar when damaged
function drawHealth(ctx, s, x, y) {
  if (s.hp < s.maxHp) {
    const f = s.hp / s.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    if (f < 0.66) {
      ctx.fillRect(x + 6, y - WALL_H + 10, 2, 2);
      ctx.fillRect(x + 8, y - WALL_H + 12, 2, 2);
      ctx.fillRect(x + 10, y - WALL_H + 14, 2, 2);
    }
    if (f < 0.33) {
      ctx.fillRect(x + 16, y + 6, 2, 2);
      ctx.fillRect(x + 14, y + 8, 2, 2);
      ctx.fillRect(x + 17, y + 10, 2, 2);
    }
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 2, y - WALL_H - 6, GRID - 4, 3);
    ctx.fillStyle = f > 0.5 ? '#5ad65a' : f > 0.25 ? '#f2c94c' : '#e2453a';
    ctx.fillRect(x + 2, y - WALL_H - 6, (GRID - 4) * f, 3);
  }
}

export function drawWallBlock(ctx, type, x, y, flash) {
  const c = LOOK[type];
  // Front face (extends below the top face)
  ctx.fillStyle = flash ? '#ffffff' : c.face;
  ctx.fillRect(x, y + GRID - WALL_H + 2, GRID, WALL_H);
  // Top face
  ctx.fillStyle = flash ? '#ffffff' : c.top;
  ctx.fillRect(x, y - WALL_H + 2, GRID, GRID);
  if (flash) return;
  ctx.fillStyle = c.line;
  if (type === 'wood') {
    // Planks
    for (let i = 1; i < 3; i++) ctx.fillRect(x, y - WALL_H + 2 + i * 8, GRID, 1);
    ctx.fillRect(x + 11, y - WALL_H + 2, 1, 8);
    ctx.fillRect(x + 5, y - WALL_H + 10, 1, 8);
    ctx.fillRect(x + 17, y - WALL_H + 18, 1, 8);
    for (let i = 1; i < 3; i++) ctx.fillRect(x, y + GRID - WALL_H + 2 + i * 5, GRID, 1);
  } else {
    // Bricks
    for (let i = 1; i < 4; i++) ctx.fillRect(x, y - WALL_H + 2 + i * 6, GRID, 1);
    for (let i = 0; i < 4; i++) {
      const off = i % 2 ? 6 : 0;
      ctx.fillRect(x + off + 11, y - WALL_H + 2 + i * 6, 1, 6);
    }
    for (let i = 1; i < 3; i++) ctx.fillRect(x, y + GRID - WALL_H + 2 + i * 5, GRID, 1);
  }
  // Outline
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x, y + GRID + 1, GRID, 1);
}

export function drawGhost(ctx, type, gx, gy, ok) {
  ctx.save();
  const range = TYPES[type].range;
  if (range) {
    // Show how far the tower can reach
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(gx * GRID + GRID / 2, gy * GRID + GRID / 2, range, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.globalAlpha = 0.5;
  drawShape(ctx, type, gx * GRID, gy * GRID, false);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = ok ? '#ffffff' : '#ff4a3a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(gx * GRID + 0.5, gy * GRID - WALL_H + 2.5, GRID - 1, GRID + WALL_H - 3);
  ctx.restore();
}
