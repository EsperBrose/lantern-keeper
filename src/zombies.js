// Zombies: spawn out of the darkness and shamble toward the player.
const RADIUS = 11;
const SKINS = ['#7d9a6a', '#6f8c5e', '#8aa37a', '#748f73'];
const SHIRTS = ['#5a4636', '#3f4e5e', '#5e3a3a', '#4b4b3c'];

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

export function drawZombie(ctx, z) {
  const step = Math.sin(z.phase);
  ctx.save();
  ctx.translate(z.x, z.y);

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 18, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(z.facing, 1);
  ctx.rotate(Math.sin(z.phase * 0.5) * 0.08 + 0.1); // hunched sway

  // Legs (one drags)
  ctx.strokeStyle = '#2f2b26';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-3, 8);
  ctx.lineTo(-4 + step * 3, 17);
  ctx.moveTo(3, 8);
  ctx.lineTo(4 - step * 1.5, 17);
  ctx.stroke();

  // Torn shirt
  ctx.fillStyle = z.shirt;
  ctx.beginPath();
  ctx.moveTo(-8, 9);
  ctx.lineTo(-7, -9);
  ctx.lineTo(7, -9);
  ctx.lineTo(8, 9);
  ctx.lineTo(4, 6);
  ctx.lineTo(1, 10);
  ctx.lineTo(-3, 6);
  ctx.closePath();
  ctx.fill();

  // Arms reaching forward
  ctx.strokeStyle = z.skin;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(2, -6);
  ctx.lineTo(15, -7 + step * 1.5);
  ctx.moveTo(-2, -5);
  ctx.lineTo(12, -3 - step * 1.5);
  ctx.stroke();

  // Head
  ctx.fillStyle = z.skin;
  ctx.beginPath();
  ctx.arc(2, -15, 6, 0, Math.PI * 2);
  ctx.fill();
  // Messy hair
  ctx.fillStyle = '#2a2420';
  ctx.beginPath();
  ctx.arc(1, -17, 6, Math.PI * 1.05, Math.PI * 1.85);
  ctx.fill();
  // Mouth
  ctx.fillStyle = '#3a1a1a';
  ctx.fillRect(4, -12, 3, 1.5);

  ctx.restore();

  if (z.burn !== undefined) drawFlames(ctx, z);
}

function drawFlames(ctx, z) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const fx = z.x + Math.sin(z.phase * 1.3 + i * 2.1) * 7;
    const fy = z.y - 4 - i * 5 - Math.abs(Math.sin(z.phase + i)) * 6;
    const fr = 7 - i;
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
    g.addColorStop(0, 'rgba(255, 230, 120, 0.9)');
    g.addColorStop(0.5, 'rgba(255, 120, 30, 0.6)');
    g.addColorStop(1, 'rgba(255, 60, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(fx, fy, fr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Glowing eyes, drawn on top of the darkness so you can see them coming.
export function drawZombieEyes(ctx, z, glow) {
  if (z.burn !== undefined || glow <= 0) return;
  const ex = z.x + z.facing * 4;
  const ey = z.y - 16;
  ctx.fillStyle = `rgba(255, 60, 40, ${0.9 * glow})`;
  ctx.shadowColor = '#ff3020';
  ctx.shadowBlur = 6;
  ctx.fillRect(ex - 1, ey, 1.8, 1.8);
  ctx.fillRect(ex + z.facing * 3 - 1, ey, 1.8, 1.8);
  ctx.shadowBlur = 0;
}
