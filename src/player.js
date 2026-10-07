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
  };
}

export function updatePlayer(p, move, dt) {
  p.x += move.x * p.speed * dt;
  p.y += move.y * p.speed * dt;
  p.moving = move.x !== 0 || move.y !== 0;
  if (move.x > 0.1) p.facing = 1;
  else if (move.x < -0.1) p.facing = -1;
  if (p.moving) p.walk += dt * 10;
  else p.walk *= 0.85;
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
}
