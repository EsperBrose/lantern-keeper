// Shared blocky (Minecraft-style) side-view person, feet at y = +16.
// colors: { skin, hair, shirt, pants, boots, eye }
// pose: 'hold' (front arm held forward) or 'reach' (both arms stretched out)
export function drawPerson(ctx, x, y, facing, walk, moving, colors, pose) {
  const step = Math.sin(walk);
  const bob = moving ? Math.round(Math.abs(Math.cos(walk)) * 2) : 0;

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-9, 14, 18, 4);

  ctx.scale(facing, 1);
  ctx.translate(0, -bob);

  // Back arm (drawn first so the body covers its root)
  if (pose === 'reach') {
    ctx.fillStyle = colors.shirt;
    ctx.fillRect(-1, -10, 5, 4);
    ctx.fillStyle = colors.skin;
    ctx.fillRect(4, -10, 9, 4);
  } else {
    const swing = Math.round(-step * 3);
    ctx.fillStyle = colors.shirt;
    ctx.fillRect(-3 + swing, -10, 4, 6);
    ctx.fillStyle = colors.skin;
    ctx.fillRect(-3 + swing, -4, 4, 4);
  }

  // Legs
  const l1 = Math.round(step * 3);
  const l2 = -l1;
  ctx.fillStyle = colors.pants;
  ctx.fillRect(-4 + l1, 4, 4, 9 + bob);
  ctx.fillRect(0 + l2, 4, 4, 9 + bob);
  ctx.fillStyle = colors.boots;
  ctx.fillRect(-4 + l1, 13 + bob, 4, 3);
  ctx.fillRect(0 + l2, 13 + bob, 4, 3);

  // Body
  ctx.fillStyle = colors.shirt;
  ctx.fillRect(-5, -10, 10, 14);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(-5, 1, 10, 3);

  // Head
  ctx.fillStyle = colors.skin;
  ctx.fillRect(-6, -22, 12, 12);
  ctx.fillStyle = colors.hair;
  ctx.fillRect(-6, -22, 12, 3);
  ctx.fillRect(-6, -19, 4, 6);
  // Eye
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(1, -17, 2, 2);
  ctx.fillStyle = colors.eye;
  ctx.fillRect(3, -17, 2, 2);
  if (pose === 'reach') {
    ctx.fillStyle = 'rgba(40, 20, 20, 0.8)';
    ctx.fillRect(2, -13, 4, 1.5);
  }

  // Front arm
  if (pose === 'reach') {
    ctx.fillStyle = colors.shirt;
    ctx.fillRect(-2, -7, 5, 4);
    ctx.fillStyle = colors.skin;
    ctx.fillRect(3, -7, 10, 4);
  } else {
    ctx.fillStyle = colors.shirt;
    ctx.fillRect(-2, -9, 7, 4);
    ctx.fillStyle = colors.skin;
    ctx.fillRect(5, -9, 4, 4);
  }

  ctx.restore();
}
