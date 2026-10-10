// Little square bits that fly out and fall: wood chips, stone chips, zombie goo.
export const COLORS = {
  wood: ['#8a5a2b', '#c9a27a', '#6b4423'],
  stone: ['#a3a8ae', '#7b8086', '#5e6267'],
  zombie: ['#5f9e55', '#3a5e33', '#8fcf7f'],
  wall: ['#9c6a3a', '#868b91', '#5c6066'],
};

export function burst(list, x, y, kind, n = 6) {
  const colors = COLORS[kind];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 30 + Math.random() * 70;
    list.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 60,
      size: 2 + Math.random() * 2.5,
      color: colors[(Math.random() * colors.length) | 0],
      life: 0.4 + Math.random() * 0.3,
    });
  }
}

export function updateParticles(list, dt) {
  for (const p of list) {
    p.vy += 260 * dt; // gravity
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].life <= 0) list.splice(i, 1);
  }
}

export function drawParticles(ctx, list) {
  for (const p of list) {
    ctx.globalAlpha = Math.min(1, p.life * 4);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}
