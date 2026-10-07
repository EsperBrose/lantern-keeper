// Endless forest floor, generated deterministically per tile.
const TILE = 160;

function hash(x, y, n) {
  let h = (x * 374761393 + y * 668265263 + n * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function forEachTile(cam, w, h, fn) {
  const x0 = Math.floor((cam.x - w / 2) / TILE) - 1;
  const y0 = Math.floor((cam.y - h / 2) / TILE) - 1;
  const x1 = Math.floor((cam.x + w / 2) / TILE) + 1;
  const y1 = Math.floor((cam.y + h / 2) / TILE) + 1;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) fn(tx, ty);
  }
}

export function drawGround(ctx, cam, w, h) {
  ctx.fillStyle = '#4a7a3a';
  ctx.fillRect(cam.x - w / 2, cam.y - h / 2, w, h);

  forEachTile(cam, w, h, (tx, ty) => {
    const bx = tx * TILE;
    const by = ty * TILE;
    // Grass tufts
    for (let i = 0; i < 6; i++) {
      const gx = bx + hash(tx, ty, i) * TILE;
      const gy = by + hash(tx, ty, i + 20) * TILE;
      ctx.strokeStyle = hash(tx, ty, i + 40) > 0.5 ? '#5a8c45' : '#3d6b31';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx - 3, gy);
      ctx.lineTo(gx - 4, gy - 6);
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx, gy - 8);
      ctx.moveTo(gx + 3, gy);
      ctx.lineTo(gx + 4, gy - 6);
      ctx.stroke();
    }
    // Occasional flower or stone
    if (hash(tx, ty, 99) > 0.6) {
      const fx = bx + hash(tx, ty, 100) * TILE;
      const fy = by + hash(tx, ty, 101) * TILE;
      if (hash(tx, ty, 102) > 0.5) {
        ctx.fillStyle = '#e6b8f0';
        ctx.beginPath();
        ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#8a8f88';
        ctx.beginPath();
        ctx.ellipse(fx, fy, 7, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

// Trees are drawn after the player so canopies overlap them.
export function drawTrees(ctx, cam, w, h) {
  forEachTile(cam, w, h, (tx, ty) => {
    if (hash(tx, ty, 7) < 0.55) return;
    const x = tx * TILE + hash(tx, ty, 8) * TILE;
    const y = ty * TILE + hash(tx, ty, 9) * TILE;
    const s = 0.8 + hash(tx, ty, 10) * 0.6;
    // Trunk
    ctx.fillStyle = '#5a3d28';
    ctx.fillRect(x - 5 * s, y - 14 * s, 10 * s, 18 * s);
    // Pine layers
    const shades = ['#2d5a35', '#356b3d', '#3f7a47'];
    for (let i = 0; i < 3; i++) {
      const ly = y - 14 * s - i * 16 * s;
      const lw = (30 - i * 7) * s;
      ctx.fillStyle = shades[i];
      ctx.beginPath();
      ctx.moveTo(x - lw, ly);
      ctx.lineTo(x + lw, ly);
      ctx.lineTo(x, ly - 30 * s);
      ctx.closePath();
      ctx.fill();
    }
  });
}
