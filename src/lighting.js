// Darkness overlay with a hole cut out around light sources.
const dark = document.createElement('canvas');
const dctx = dark.getContext('2d');

export function resizeLighting(w, h, dpr) {
  dark.width = Math.floor(w * dpr);
  dark.height = Math.floor(h * dpr);
  dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// lights: [{ x, y, r }] in screen space
export function drawDarkness(ctx, w, h, lights) {
  dctx.globalCompositeOperation = 'source-over';
  dctx.clearRect(0, 0, w, h);
  dctx.fillStyle = 'rgba(3, 4, 10, 0.93)';
  dctx.fillRect(0, 0, w, h);

  dctx.globalCompositeOperation = 'destination-out';
  for (const l of lights) {
    const g = dctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.85)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = g;
    dctx.beginPath();
    dctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    dctx.fill();
  }

  ctx.drawImage(dark, 0, 0, w, h);

  // Warm tint inside the light
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.8);
    g.addColorStop(0, 'rgba(255, 170, 70, 0.22)');
    g.addColorStop(1, 'rgba(255, 170, 70, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  ctx.restore();
}
