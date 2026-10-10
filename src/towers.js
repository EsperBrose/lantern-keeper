// Defensive buildings: find zombies in range and shoot at them.
import { TYPES, GRID, TESLA_ORB } from './structures.js';

const ARROW_SPEED = 340;
const ARROW_DAMAGE = 1;
const ZAP_DAMAGE = 2;
const ZAP_CHAIN = 4; // zombies hit per zap (first target + jumps)
const ZAP_JUMP = 70; // max distance lightning jumps between zombies

function hurt(z, dmg) {
  z.hp -= dmg;
  z.hurt = 0.12;
  if (z.hp <= 0 && !z.dead) {
    z.dead = true;
    return 1;
  }
  return 0;
}

// Chain lightning from (x, y): hits a zombie, then jumps to the next nearest.
function zap(zombies, first, x, y, bolts) {
  let kills = 0;
  const hit = new Set();
  let from = { x, y };
  let z = first;
  for (let i = 0; i < ZAP_CHAIN && z; i++) {
    hit.add(z);
    const to = { x: z.x, y: z.y - 8 };
    bolts.push({ points: jagged(from, to), life: 0.18 });
    kills += hurt(z, ZAP_DAMAGE);
    from = to;
    let next = null;
    let best = ZAP_JUMP;
    for (const o of zombies) {
      if (hit.has(o) || o.dead || o.burn !== undefined) continue;
      const d = Math.hypot(o.x - z.x, o.y - z.y);
      if (d < best) {
        best = d;
        next = o;
      }
    }
    z = next;
  }
  return kills;
}

// A zig-zag line between two points.
function jagged(a, b) {
  const pts = [a];
  const steps = Math.max(3, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 10));
  const nx = -(b.y - a.y);
  const ny = b.x - a.x;
  const nl = Math.hypot(nx, ny) || 1;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const off = (Math.random() - 0.5) * 12;
    pts.push({ x: a.x + (b.x - a.x) * t + (nx / nl) * off, y: a.y + (b.y - a.y) * t + (ny / nl) * off });
  }
  pts.push(b);
  return pts;
}

export function updateBolts(bolts, dt) {
  for (const b of bolts) b.life -= dt;
  for (let i = bolts.length - 1; i >= 0; i--) {
    if (bolts[i].life <= 0) bolts.splice(i, 1);
  }
}

export function drawBolts(ctx, bolts) {
  ctx.save();
  ctx.lineJoin = 'miter';
  for (const b of bolts) {
    ctx.globalAlpha = Math.min(1, b.life * 8);
    for (const [color, width] of [
      ['rgba(120, 210, 255, 0.5)', 5],
      ['#e8f8ff', 1.8],
    ]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(b.points[0].x, b.points[0].y);
      for (const p of b.points) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Light sources from glowing buildings (for the night darkness).
export function towerLights(base) {
  const lights = [];
  for (const t of base.list) {
    if (t.type === 'tesla') {
      lights.push({ x: t.gx * GRID + TESLA_ORB.dx, y: t.gy * GRID + TESLA_ORB.dy, r: 70 });
    } else if (t.type === 'campfire') {
      lights.push({ x: t.x, y: t.y, r: 95 + Math.sin(performance.now() / 90) * 4 });
    }
  }
  return lights;
}

// Standing near a campfire slowly heals you.
export function campfireHeal(base, p, dt) {
  for (const t of base.list) {
    const def = TYPES[t.type];
    if (!def.heal || Math.hypot(t.x - p.x, t.y - p.y) > def.healRange) continue;
    p.hp = Math.min(p.maxHp, p.hp + def.heal * dt);
    return true;
  }
  return false;
}

function nearestZombie(zombies, x, y, range) {
  let best = null;
  let bestD = range;
  for (const z of zombies) {
    if (z.dead || z.burn !== undefined) continue;
    const d = Math.hypot(z.x - x, z.y - y);
    if (d < bestD) {
      bestD = d;
      best = z;
    }
  }
  return best;
}

// Returns how many zombies were killed this frame.
export function updateTowers(base, zombies, shots, bolts, dt) {
  let kills = 0;
  for (const t of base.list) {
    const def = TYPES[t.type];
    if (!def.range) continue;
    t.reload = Math.max(0, (t.reload || 0) - dt);
    const z = nearestZombie(zombies, t.x, t.y, def.range);
    if (!z) continue;

    if (t.type === 'tesla') {
      if (t.reload > 0) continue;
      t.reload = def.reload;
      const ox = t.gx * GRID + TESLA_ORB.dx;
      const oy = t.gy * GRID + TESLA_ORB.dy;
      kills += zap(zombies, z, ox, oy, bolts);
      continue;
    }

    // Fire from the crossbow on top, aimed at the zombie's body.
    const sx = t.x;
    const sy = t.y - 29;
    const dx = z.x - sx;
    const dy = z.y - 8 - sy;
    t.angle = Math.atan2(dy, dx);
    if (t.reload > 0) continue;
    t.reload = def.reload;
    const d = Math.hypot(dx, dy) || 1;
    shots.push({
      x: sx,
      y: sy,
      vx: (dx / d) * ARROW_SPEED,
      vy: (dy / d) * ARROW_SPEED,
      life: (def.range + 60) / ARROW_SPEED,
    });
  }

  for (const a of shots) {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.life -= dt;
    for (const z of zombies) {
      if (z.dead || z.burn !== undefined) continue;
      if (Math.hypot(z.x - a.x, z.y - 8 - a.y) > 10) continue;
      z.x += (a.vx / ARROW_SPEED) * 6;
      z.y += (a.vy / ARROW_SPEED) * 6;
      kills += hurt(z, ARROW_DAMAGE);
      a.life = 0;
      break;
    }
  }
  for (let i = shots.length - 1; i >= 0; i--) {
    if (shots[i].life <= 0) shots.splice(i, 1);
  }
  return kills;
}

export function drawShots(ctx, shots) {
  for (const a of shots) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(Math.atan2(a.vy, a.vx));
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(-7, -0.75, 10, 1.5);
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(3, -1.25, 3, 2.5);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(-8, -1.75, 3, 1);
    ctx.fillRect(-8, 0.75, 3, 1);
    ctx.restore();
  }
}
