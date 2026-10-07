import { drawPerson } from './blocky.js';

// The wanderer: a blocky human carrying a lantern.
export function createPlayer() {
  return {
    x: 0,
    y: 0,
    speed: 170,
    facing: 1, // 1 = right, -1 = left
    walk: 0, // walk-cycle phase
    moving: false,
    lightRadius: 125,
    hp: 100,
    maxHp: 100,
    aimX: 1, // direction of the last movement; where the axe swings
    aimY: 0,
    swing: 0, // time left in the current swing animation
    cooldown: 0,
  };
}

export const SWING_TIME = 0.22;
const SWING_COOLDOWN = 0.38;

export function updatePlayer(p, move, dt) {
  p.x += move.x * p.speed * dt;
  p.y += move.y * p.speed * dt;
  p.moving = move.x !== 0 || move.y !== 0;
  if (move.x > 0.1) p.facing = 1;
  else if (move.x < -0.1) p.facing = -1;
  if (p.moving) {
    p.walk += dt * 10;
    const len = Math.hypot(move.x, move.y);
    p.aimX = move.x / len;
    p.aimY = move.y / len;
  } else {
    p.walk *= 0.85;
  }
  p.swing = Math.max(0, p.swing - dt);
  p.cooldown = Math.max(0, p.cooldown - dt);
}

// Starts a swing if the axe is ready. Returns true when a swing starts.
export function trySwing(p) {
  if (p.cooldown > 0) return false;
  p.swing = SWING_TIME;
  p.cooldown = SWING_COOLDOWN;
  return true;
}

// Point in front of the player where the axe lands.
export function swingPoint(p) {
  return { x: p.x + p.aimX * 16, y: p.y - 4 + p.aimY * 14 };
}

const COLORS = {
  skin: '#e8b48a',
  hair: '#4a2f1b',
  shirt: '#b5452f',
  pants: '#3d4a6b',
  boots: '#3a2a1a',
  eye: '#3a6ea5',
};

function bobOf(p) {
  return p.moving ? Math.round(Math.abs(Math.cos(p.walk)) * 2) : 0;
}

// Where the lantern hangs, in world space.
export function lanternPos(p) {
  return { x: p.x + p.facing * 8, y: p.y + 2 - bobOf(p) };
}

export function drawPlayer(ctx, p) {
  drawPerson(ctx, p.x, p.y, p.facing, p.walk, p.moving, COLORS, 'hold');

  // Lantern hanging from the hand
  const bob = bobOf(p);
  ctx.save();
  ctx.translate(Math.round(p.x), Math.round(p.y) - bob);
  ctx.scale(p.facing, 1);
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(7, -5, 1.5, 3);
  ctx.fillRect(4, -2, 8, 2);
  ctx.fillStyle = '#ffd25a';
  ctx.fillRect(5, 0, 6, 6);
  ctx.fillStyle = '#fff3b0';
  ctx.fillRect(7, 1, 2, 3);
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(4, 6, 8, 2);
  ctx.restore();

  if (p.swing > 0) drawAxeSwing(ctx, p);
}

// Pixel axe sweeping through an arc toward the aim direction.
function drawAxeSwing(ctx, p) {
  const t = 1 - p.swing / SWING_TIME; // 0..1 through the swing
  const aim = Math.atan2(p.aimY, p.aimX);
  const a = aim - 1.2 + t * 2.4;
  const cx = p.x;
  const cy = p.y - 6;

  // Swoosh trail
  for (let i = 0; i < 6; i++) {
    const ta = a - i * 0.18;
    if (ta < aim - 1.2) break;
    ctx.fillStyle = `rgba(255,255,255,${0.5 - i * 0.08})`;
    ctx.fillRect(cx + Math.cos(ta) * 20 - 2, cy + Math.sin(ta) * 20 - 2, 4, 4);
  }

  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.rotate(a);
  ctx.fillStyle = '#8a5a2b'; // handle
  ctx.fillRect(4, -1.5, 16, 3);
  ctx.fillStyle = '#c9ccd1'; // blade
  ctx.fillRect(16, -6, 5, 7);
  ctx.fillStyle = '#eef0f2';
  ctx.fillRect(20, -6, 2, 7);
  ctx.restore();
}
