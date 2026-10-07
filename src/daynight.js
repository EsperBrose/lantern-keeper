// Day / night cycle. The game starts at the beginning of day 1.
export const PHASES = [
  { name: 'day', length: 60 },
  { name: 'dusk', length: 8 },
  { name: 'night', length: 60 },
  { name: 'dawn', length: 8 },
];
const MAX_DARK = 0.86;

export function createCycle() {
  return { phase: 0, t: 0, day: 1, nightsSurvived: 0, banner: null };
}

// Advances the clock. Returns the name of a phase that just started, or null.
export function updateCycle(c, dt) {
  c.t += dt;
  if (c.banner) {
    c.banner.t -= dt;
    if (c.banner.t <= 0) c.banner = null;
  }
  if (c.t < PHASES[c.phase].length) return null;

  c.t -= PHASES[c.phase].length;
  c.phase = (c.phase + 1) % PHASES.length;
  const name = PHASES[c.phase].name;
  if (name === 'night') {
    c.banner = { text: `Night ${c.day}`, sub: 'The zombies are coming…', color: '#ff6b5a', t: 3 };
  } else if (name === 'dawn') {
    c.nightsSurvived++;
  } else if (name === 'day') {
    c.day++;
    c.banner = { text: `Day ${c.day}`, sub: 'Gather and build while it’s light', color: '#ffd98a', t: 3 };
  }
  return name;
}

export function phaseName(c) {
  return PHASES[c.phase].name;
}

export function isNight(c) {
  return phaseName(c) === 'night';
}

// How dark the world is right now, 0 (noon) to MAX_DARK (midnight).
export function darkness(c) {
  const p = PHASES[c.phase];
  const f = c.t / p.length;
  switch (p.name) {
    case 'dusk':
      return MAX_DARK * f;
    case 'night':
      return MAX_DARK;
    case 'dawn':
      return MAX_DARK * (1 - f);
    default:
      return 0;
  }
}

export function drawClock(ctx, c, x, y) {
  const name = phaseName(c);
  const p = PHASES[c.phase];
  const left = Math.ceil(p.length - c.t);
  const isDark = name === 'night' || name === 'dusk';

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.fillStyle = isDark ? '#ff8a7a' : '#ffe9a8';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 4;
  const label = name === 'night' || name === 'dawn' ? `🌙 Night ${c.day}` : `☀️ Day ${c.day}`;
  ctx.strokeText(label, x, y);
  ctx.fillText(label, x, y);

  // Progress bar for the current phase
  const bw = 140;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x - bw / 2 - 2, y + 8, bw + 4, 8);
  ctx.fillStyle = isDark ? '#7a8cff' : '#ffc94a';
  ctx.fillRect(x - bw / 2, y + 10, bw * (1 - c.t / p.length), 4);

  ctx.font = '9px "Press Start 2P", monospace';
  ctx.fillStyle = '#e8e2d0';
  const hint = {
    day: `Night falls in ${left + PHASES[1].length}s`,
    dusk: `Night falls in ${left}s`,
    night: `Sunrise in ${left + PHASES[3].length}s`,
    dawn: `Sunrise in ${left}s`,
  }[name];
  ctx.strokeText(hint, x, y + 32);
  ctx.fillText(hint, x, y + 32);
  ctx.restore();
}

export function drawBanner(ctx, c, w, h) {
  const b = c.banner;
  if (!b) return;
  const a = Math.min(1, b.t, 3 - b.t + 0.2);
  ctx.save();
  ctx.globalAlpha = Math.max(0, a);
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.lineWidth = 6;
  ctx.font = '28px "Press Start 2P", monospace';
  ctx.fillStyle = b.color;
  ctx.strokeText(b.text, w / 2, h * 0.3);
  ctx.fillText(b.text, w / 2, h * 0.3);
  ctx.font = '11px "Press Start 2P", monospace';
  ctx.fillStyle = '#e8e2d0';
  ctx.lineWidth = 4;
  ctx.strokeText(b.sub, w / 2, h * 0.3 + 32);
  ctx.fillText(b.sub, w / 2, h * 0.3 + 32);
  ctx.restore();
}
