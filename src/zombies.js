import { drawPerson } from './blocky.js';

// Zombies: spawn out of the darkness and shamble toward the player.
const SKINS = ['#5f9e55', '#4f8f48', '#6aa85e'];
const SHIRTS = ['#2fa3a8', '#2b8f94', '#5a7f3a', '#7a4a3a'];

// bite / wall: multipliers for damage to the player and to walls.
const KINDS = {
  walker: { r: 11, hp: 3, speed: [38, 60], scale: 1, bite: 1, wall: 1, lurch: 0.4 },
  runner: { r: 9, hp: 2, speed: [95, 115], scale: 0.85, bite: 0.7, wall: 0.7, lurch: 0.1, shirt: '#c0392b' },
  brute: {
    r: 16,
    hp: 12,
    speed: [26, 32],
    scale: 1.45,
    bite: 2,
    wall: 3,
    lurch: 0.3,
    shirt: '#4a3a2a',
    skin: '#4a7f42',
  },
};

export function createSpawner() {
  return { timer: 0, interval: 1.6 };
}

// Runners join from night 2, brutes from night 3; both get more common.
function pickKind(night) {
  const r = Math.random();
  const brute = night >= 3 ? Math.min(0.2, 0.06 * (night - 2)) : 0;
  const runner = night >= 2 ? Math.min(0.35, 0.12 * (night - 1)) : 0;
  if (r < brute) return 'brute';
  if (r < brute + runner) return 'runner';
  return 'walker';
}

export function updateSpawner(sp, zombies, player, night, viewRadius, dt) {
  // Each night brings zombies faster than the last.
  sp.interval = Math.max(0.3, 1.5 - (night - 1) * 0.2);
  sp.timer -= dt;
  while (sp.timer <= 0) {
    sp.timer += sp.interval;
    const a = Math.random() * Math.PI * 2;
    const d = viewRadius + 40 + Math.random() * 80;
    const kind = pickKind(night);
    const k = KINDS[kind];
    zombies.push({
      kind,
      x: player.x + Math.cos(a) * d,
      y: player.y + Math.sin(a) * d,
      r: k.r,
      hp: k.hp,
      speed: k.speed[0] + Math.random() * (k.speed[1] - k.speed[0]),
      scale: k.scale,
      bite: k.bite,
      wall: k.wall,
      lurch: k.lurch,
      phase: Math.random() * 10,
      skin: k.skin || SKINS[(Math.random() * SKINS.length) | 0],
      shirt: k.shirt || SHIRTS[(Math.random() * SHIRTS.length) | 0],
      facing: 1,
      hurt: 0,
    });
  }
}

// Sunrise: every zombie catches fire and burns away.
export function igniteAll(zombies) {
  for (const z of zombies) {
    if (z.burn === undefined) z.burn = 1 + Math.random() * 1.5;
  }
}

function nearestPlayer(players, z) {
  let best = null;
  let bestD = Infinity;
  for (const p of players) {
    const d = Math.hypot(p.x - z.x, p.y - z.y);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

// players: the players zombies can chase (the ones still standing).
export function updateZombies(zombies, players, dt) {
  for (const z of zombies) {
    if (z.burn !== undefined) {
      z.burn -= dt;
      if (z.burn <= 0) z.dead = true;
      z.phase += dt * 12; // flailing
      continue;
    }
    z.hurt = Math.max(0, z.hurt - dt);
    const player = nearestPlayer(players, z);
    if (!player) continue;
    z.phase += dt * (z.kind === 'runner' ? 11 : 5);
    const dx = player.x - z.x;
    const dy = player.y - z.y;
    const d = Math.hypot(dx, dy) || 1;
    // Shambling: speed pulses with each lurching step.
    const lurch = 1 - z.lurch + z.lurch * Math.abs(Math.sin(z.phase));
    z.x += (dx / d) * z.speed * lurch * dt;
    z.y += (dy / d) * z.speed * lurch * dt;
    z.facing = dx >= 0 ? 1 : -1;
  }
  // Keep zombies from stacking on top of each other.
  for (let i = 0; i < zombies.length; i++) {
    for (let j = i + 1; j < zombies.length; j++) {
      const a = zombies[i];
      const b = zombies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = a.r + b.r;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0 && d2 < min * min) {
        const d = Math.sqrt(d2);
        const push = (min - d) / 2;
        a.x -= (dx / d) * push;
        a.y -= (dy / d) * push;
        b.x += (dx / d) * push;
        b.y += (dy / d) * push;
      }
    }
  }
}

// Total bite strength of the zombies touching the player (brutes bite harder).
export function biteLoad(zombies, player) {
  let n = 0;
  for (const z of zombies) {
    if (z.burn !== undefined) continue;
    if (Math.hypot(z.x - player.x, z.y - player.y) < z.r + 10) n += z.bite;
  }
  return n;
}

const HURT = { skin: '#ffffff', hair: '#ffffff', shirt: '#ffdddd', pants: '#ffdddd', boots: '#ffffff', eye: '#ff0000' };

export function drawZombie(ctx, z) {
  const colors = z.hurt > 0
    ? HURT
    : { skin: z.skin, hair: '#3a5e33', shirt: z.shirt, pants: '#3b3f9e', boots: '#2a2a3a', eye: '#1a1a1a' };
  ctx.save();
  ctx.translate(Math.round(z.x), Math.round(z.y));
  ctx.scale(z.scale, z.scale);
  drawPerson(ctx, 0, 0, z.facing, z.phase, true, colors, 'reach');
  ctx.restore();
  if (z.burn !== undefined) drawFlames(ctx, z);
}

const FLAME_COLORS = ['#fff3a0', '#ffc23a', '#ff7a1a', '#e2401a'];

function drawFlames(ctx, z) {
  for (let i = 0; i < 9; i++) {
    const life = (z.phase * 0.4 + i * 0.37) % 1; // 0 = just spawned, 1 = burnt out
    const fx = Math.round(z.x + Math.sin(i * 2.3 + z.phase * 0.2) * 8);
    const fy = Math.round(z.y + 6 - life * 30);
    const size = Math.max(2, 6 * (1 - life));
    ctx.fillStyle = FLAME_COLORS[Math.min(3, Math.floor(life * 4))];
    ctx.fillRect(fx - size / 2, fy - size / 2, size, size);
  }
}

// Glowing eyes, drawn on top of the darkness so you can see them coming.
export function drawZombieEyes(ctx, z, glow) {
  if (z.burn !== undefined || glow <= 0) return;
  const bob = Math.round(Math.abs(Math.cos(z.phase)) * 2);
  const s = z.scale;
  const ex = Math.round(z.x) + (z.facing > 0 ? 1 : -5) * s;
  const ey = Math.round(z.y) + (-17 - bob) * s;
  ctx.fillStyle = `rgba(255, 40, 30, ${0.95 * glow})`;
  ctx.shadowColor = '#ff2010';
  ctx.shadowBlur = 6;
  ctx.fillRect(ex, ey, 4 * s, 2 * s);
  ctx.shadowBlur = 0;
}
