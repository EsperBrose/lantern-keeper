import { drawPerson } from './blocky.js';

// Zombies: spawn out of the darkness and shamble toward the player.
const RADIUS = 11;
const SKINS = ['#5f9e55', '#4f8f48', '#6aa85e'];
const SHIRTS = ['#2fa3a8', '#2b8f94', '#5a7f3a', '#7a4a3a'];

export function createSpawner() {
  return { timer: 0, interval: 1.6 };
}

export function updateSpawner(sp, zombies, player, night, viewRadius, dt) {
  // Each night brings zombies faster than the last.
  sp.interval = Math.max(0.3, 1.5 - (night - 1) * 0.2);
  sp.timer -= dt;
  while (sp.timer <= 0) {
    sp.timer += sp.interval;
    const a = Math.random() * Math.PI * 2;
    const d = viewRadius + 40 + Math.random() * 80;
    zombies.push({
      x: player.x + Math.cos(a) * d,
      y: player.y + Math.sin(a) * d,
      r: RADIUS,
      hp: 3,
      speed: 38 + Math.random() * 22,
      phase: Math.random() * 10,
      skin: SKINS[(Math.random() * SKINS.length) | 0],
      shirt: SHIRTS[(Math.random() * SHIRTS.length) | 0],
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

export function updateZombies(zombies, player, dt) {
  for (const z of zombies) {
    if (z.burn !== undefined) {
      z.burn -= dt;
      if (z.burn <= 0) z.dead = true;
      z.phase += dt * 12; // flailing
      continue;
    }
    z.phase += dt * 5;
    const dx = player.x - z.x;
    const dy = player.y - z.y;
    const d = Math.hypot(dx, dy) || 1;
    // Shambling: speed pulses with each lurching step.
    const lurch = 0.6 + 0.4 * Math.abs(Math.sin(z.phase));
    z.x += (dx / d) * z.speed * lurch * dt;
    z.y += (dy / d) * z.speed * lurch * dt;
    z.facing = dx >= 0 ? 1 : -1;
    z.hurt = Math.max(0, z.hurt - dt);
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

// Returns how many zombies are touching the player.
export function countTouching(zombies, player) {
  let n = 0;
  for (const z of zombies) {
    if (z.burn !== undefined) continue;
    if (Math.hypot(z.x - player.x, z.y - player.y) < z.r + 10) n++;
  }
  return n;
}

const HURT = { skin: '#ffffff', hair: '#ffffff', shirt: '#ffdddd', pants: '#ffdddd', boots: '#ffffff', eye: '#ff0000' };

export function drawZombie(ctx, z) {
  const colors = z.hurt > 0
    ? HURT
    : { skin: z.skin, hair: '#3a5e33', shirt: z.shirt, pants: '#3b3f9e', boots: '#2a2a3a', eye: '#1a1a1a' };
  drawPerson(ctx, z.x, z.y, z.facing, z.phase, true, colors, 'reach');
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
  const ex = Math.round(z.x) + (z.facing > 0 ? 1 : -5);
  const ey = Math.round(z.y) - 17 - bob;
  ctx.fillStyle = `rgba(255, 40, 30, ${0.95 * glow})`;
  ctx.shadowColor = '#ff2010';
  ctx.shadowBlur = 6;
  ctx.fillRect(ex, ey, 4, 2);
  ctx.shadowBlur = 0;
}
