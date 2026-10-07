// Endless forest, generated deterministically per tile.
// Trees give wood and rocks give stone; damage to them is remembered per game.
const TILE = 160;
const NODE_HP = { tree: 4, rock: 5 };

// key -> { hp, shake }
let damaged = new Map();

export function resetWorld() {
  damaged = new Map();
}

function hash(x, y, n) {
  let h = (x * 374761393 + y * 668265263 + n * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function forEachTile(cam, w, h, fn) {
  const x0 = Math.floor((cam.x - w / 2) / TILE) - 1;
  const y0 = Math.floor((cam.y - h / 2) / TILE) - 1;
  const x1 = Math.floor((cam.x + w / 2) / TILE) + 1;
  const y1 = Math.floor((cam.y + h / 2) / TILE) + 1;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) fn(tx, ty);
  }
}

function treeAt(tx, ty) {
  // Clearing around the spawn point — a good spot for a base.
  if (Math.abs(tx + 0.5) < 2 && Math.abs(ty + 0.5) < 2) return null;
  if (hash(tx, ty, 7) < 0.55) return null;
  return {
    kind: 'tree',
    key: `tree:${tx},${ty}`,
    x: tx * TILE + hash(tx, ty, 8) * TILE,
    y: ty * TILE + hash(tx, ty, 9) * TILE,
    s: 0.8 + hash(tx, ty, 10) * 0.6,
  };
}

function rockAt(tx, ty) {
  if (hash(tx, ty, 200) < 0.7) return null;
  // Keep rocks in the opposite half of the tile from the tree.
  const x = tx * TILE + ((hash(tx, ty, 8) + 0.5) % 1) * TILE;
  const y = ty * TILE + ((hash(tx, ty, 9) + 0.5) % 1) * TILE;
  return { kind: 'rock', key: `rock:${tx},${ty}`, x, y, s: 0.9 + hash(tx, ty, 203) * 0.5 };
}

function state(node) {
  return damaged.get(node.key);
}

function isGone(node) {
  const st = state(node);
  return st !== undefined && st.hp <= 0;
}

function shakeOf(node) {
  const st = state(node);
  return st && st.shake > 0 ? Math.sin(st.shake * 60) * st.shake * 12 : 0;
}

// Resource nodes (still standing) within r of (x, y).
export function nodesNear(x, y, r) {
  const out = [];
  const tx0 = Math.floor((x - r) / TILE);
  const ty0 = Math.floor((y - r) / TILE);
  const tx1 = Math.floor((x + r) / TILE);
  const ty1 = Math.floor((y + r) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      for (const n of [treeAt(tx, ty), rockAt(tx, ty)]) {
        if (n && !isGone(n) && Math.hypot(n.x - x, n.y - y) < r) out.push(n);
      }
    }
  }
  return out;
}

// Hits a node once. Returns true when the hit destroys it.
export function hitNode(node) {
  let st = state(node);
  if (!st) {
    st = { hp: NODE_HP[node.kind], shake: 0 };
    damaged.set(node.key, st);
  }
  st.hp -= 1;
  st.shake = 0.2;
  return st.hp <= 0;
}

export function updateWorld(dt) {
  for (const st of damaged.values()) {
    if (st.shake > 0) st.shake = Math.max(0, st.shake - dt);
  }
}

const BLOCK = 20;
const GRASS = ['#5d9e3f', '#579639', '#62a645', '#529034'];
const FLOWERS = ['#f2d14b', '#e8577a', '#f4f4f4', '#7ab8ff'];

export function drawGround(ctx, cam, w, h) {
  // Grass blocks
  const bx0 = Math.floor((cam.x - w / 2) / BLOCK) - 1;
  const by0 = Math.floor((cam.y - h / 2) / BLOCK) - 1;
  const bx1 = Math.floor((cam.x + w / 2) / BLOCK) + 1;
  const by1 = Math.floor((cam.y + h / 2) / BLOCK) + 1;
  for (let by = by0; by <= by1; by++) {
    for (let bx = bx0; bx <= bx1; bx++) {
      const v = hash(bx, by, 1);
      const x = bx * BLOCK;
      const y = by * BLOCK;
      ctx.fillStyle = GRASS[(v * GRASS.length) | 0];
      ctx.fillRect(x, y, BLOCK + 0.5, BLOCK + 0.5);
      if (v > 0.975) {
        // Flower: stem + petals
        ctx.fillStyle = '#3f7a2a';
        ctx.fillRect(x + 9, y + 10, 2, 6);
        ctx.fillStyle = FLOWERS[(hash(bx, by, 2) * FLOWERS.length) | 0];
        ctx.fillRect(x + 7, y + 5, 6, 6);
      } else if (v > 0.9) {
        // Tall grass pixels
        ctx.fillStyle = '#477f2c';
        ctx.fillRect(x + 4, y + 8, 2, 6);
        ctx.fillRect(x + 9, y + 5, 2, 9);
        ctx.fillRect(x + 14, y + 9, 2, 5);
      }
    }
  }

  forEachTile(cam, w, h, (tx, ty) => {
    // Stumps of felled trees
    const t = treeAt(tx, ty);
    if (t && isGone(t)) {
      const s = t.s;
      ctx.fillStyle = '#6b4a2b';
      ctx.fillRect(t.x - 6 * s, t.y - 6 * s, 12 * s, 8 * s);
      ctx.fillStyle = '#b58a5a';
      ctx.fillRect(t.x - 6 * s, t.y - 8 * s, 12 * s, 3 * s);
    }

    // Stone blocks
    const r = rockAt(tx, ty);
    if (r && !isGone(r)) {
      const st = state(r);
      const x = r.x + shakeOf(r);
      const y = r.y;
      const s = r.s;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x - 15 * s, y - 2 * s, 32 * s, 6 * s);
      drawCube(ctx, x - 14 * s, y - 18 * s, 18 * s, 18 * s);
      drawCube(ctx, x + 2 * s, y - 12 * s, 13 * s, 12 * s);
      if (st && st.hp < NODE_HP.rock) {
        ctx.fillStyle = '#3e4246';
        const p = 2 * s;
        ctx.fillRect(x - 6 * s, y - 15 * s, p, p);
        ctx.fillRect(x - 4 * s, y - 13 * s, p, p);
        ctx.fillRect(x - 6 * s, y - 11 * s, p, p);
        if (st.hp < 3) {
          ctx.fillRect(x + 6 * s, y - 9 * s, p, p);
          ctx.fillRect(x + 8 * s, y - 7 * s, p, p);
          ctx.fillRect(x - 10 * s, y - 7 * s, p, p);
        }
      }
    }
  });
}

function drawCube(ctx, x, y, w, h) {
  const top = h * 0.3;
  ctx.fillStyle = '#7b8086';
  ctx.fillRect(x, y + top, w, h - top);
  ctx.fillStyle = '#a3a8ae';
  ctx.fillRect(x, y, w, top);
  ctx.fillStyle = '#62666b';
  ctx.fillRect(x + w * 0.2, y + top + h * 0.2, w * 0.2, h * 0.15);
  ctx.fillRect(x + w * 0.6, y + top + h * 0.45, w * 0.18, h * 0.15);
}

// Trees are drawn after the characters so canopies overlap them.
// A tree turns see-through while the player stands behind it.
export function drawTrees(ctx, cam, w, h, player) {
  forEachTile(cam, w, h, (tx, ty) => {
    const t = treeAt(tx, ty);
    if (!t || isGone(t)) return;
    const x = t.x + shakeOf(t);
    const y = t.y;
    const s = t.s;
    const behind =
      Math.abs(player.x - x) < 26 * s && player.y < y && player.y > y - 85 * s;
    ctx.globalAlpha = behind ? 0.4 : 1;
    // Shadow + trunk
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x - 12 * s, y - 2 * s, 24 * s, 5 * s);
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(x - 5 * s, y - 24 * s, 10 * s, 26 * s);
    ctx.fillStyle = '#563a20';
    ctx.fillRect(x + 1 * s, y - 24 * s, 4 * s, 26 * s);

    // Leaf blocks: big lower block, smaller top block
    const L = 44 * s;
    const ly = y - 24 * s - L * 0.8;
    leafBlock(ctx, x - L / 2, ly, L, L * 0.8, tx, ty, 0);
    const T = 28 * s;
    leafBlock(ctx, x - T / 2, ly - T * 0.75, T, T * 0.75, tx, ty, 50);
  });
  ctx.globalAlpha = 1;
}

function leafBlock(ctx, x, y, w, h, tx, ty, seed) {
  ctx.fillStyle = '#2f7a2c';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#3c9338';
  ctx.fillRect(x, y, w, h * 0.3);
  ctx.fillStyle = '#25632a';
  ctx.fillRect(x, y + h * 0.82, w, h * 0.18);
  // Leaf texture pixels
  const p = w / 7;
  ctx.fillStyle = '#286d27';
  for (let i = 0; i < 6; i++) {
    const px = Math.floor(hash(tx, ty, seed + i) * 6) * p;
    const py = Math.floor(hash(tx, ty, seed + i + 10) * 4) * (h / 5) + h * 0.3;
    ctx.fillRect(x + px, Math.min(y + py, y + h * 0.82 - p * 0.6), p, p * 0.6);
  }
  ctx.fillStyle = '#4aa645';
  ctx.fillRect(x + p, y + p * 0.4, p, p * 0.5);
}
