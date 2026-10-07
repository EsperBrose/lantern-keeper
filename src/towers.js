// Defensive buildings: find zombies in range and shoot at them.
import { TYPES } from './structures.js';

const ARROW_SPEED = 340;
const ARROW_DAMAGE = 1;

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
export function updateTowers(base, zombies, shots, dt) {
  for (const t of base.list) {
    const def = TYPES[t.type];
    if (!def.range) continue;
    t.reload = Math.max(0, (t.reload || 0) - dt);
    const z = nearestZombie(zombies, t.x, t.y, def.range);
    if (!z) continue;

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

  let kills = 0;
  for (const a of shots) {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.life -= dt;
    for (const z of zombies) {
      if (z.dead || z.burn !== undefined) continue;
      if (Math.hypot(z.x - a.x, z.y - 8 - a.y) > 10) continue;
      z.hp -= ARROW_DAMAGE;
      z.hurt = 0.12;
      z.x += (a.vx / ARROW_SPEED) * 6;
      z.y += (a.vy / ARROW_SPEED) * 6;
      if (z.hp <= 0) {
        z.dead = true;
        kills++;
      }
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
