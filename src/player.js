// The wanderer: a hooded human carrying a lantern.
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

// Where the lantern hangs, in world space.
export function lanternPos(p) {
  const swing = Math.sin(p.walk) * 2;
  return { x: p.x + p.facing * 13, y: p.y - 4 + Math.abs(swing) };
}

export function drawPlayer(ctx, p) {
  const step = Math.sin(p.walk);
  const bob = p.moving ? Math.abs(Math.cos(p.walk)) * 2 : 0;

  ctx.save();
  ctx.translate(p.x, p.y);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 18, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(p.facing, 1);
  ctx.translate(0, -bob);

  // Legs
  ctx.strokeStyle = '#3b2f2a';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-3, 8);
  ctx.lineTo(-3 + step * 4, 17 + bob);
  ctx.moveTo(3, 8);
  ctx.lineTo(3 - step * 4, 17 + bob);
  ctx.stroke();

  // Cloak
  ctx.fillStyle = '#4a5a7a';
  ctx.beginPath();
  ctx.moveTo(-9, 10);
  ctx.quadraticCurveTo(-11, -4, -6, -10);
  ctx.lineTo(6, -10);
  ctx.quadraticCurveTo(10, -2, 9, 10);
  ctx.closePath();
  ctx.fill();

  // Back arm
  ctx.strokeStyle = '#3d4a66';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-4, -6);
  ctx.lineTo(-7 - step * 2, 3);
  ctx.stroke();

  // Head + hood
  ctx.fillStyle = '#e8b896';
  ctx.beginPath();
  ctx.arc(1, -15, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#34405c';
  ctx.beginPath();
  ctx.arc(-1, -16, 7, Math.PI * 0.55, Math.PI * 1.9);
  ctx.quadraticCurveTo(4, -21, 6, -14);
  ctx.closePath();
  ctx.fill();
  // Eye
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(3, -16, 1.6, 1.6);

  // Front arm holding the lantern out
  ctx.strokeStyle = '#4a5a7a';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(3, -6);
  ctx.lineTo(12, -9);
  ctx.stroke();

  // Lantern
  const ly = -4 + Math.abs(Math.sin(p.walk) * 2) + bob;
  ctx.strokeStyle = '#2b2b2b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(13, -9);
  ctx.lineTo(13, ly - 4);
  ctx.stroke();
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(10, ly - 5, 6, 2);
  ctx.fillStyle = '#ffcf6a';
  ctx.fillRect(10.5, ly - 3, 5, 6);
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(10, ly + 3, 6, 1.5);

  ctx.restore();
}
