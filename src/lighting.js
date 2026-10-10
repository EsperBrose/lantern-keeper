// Darkness overlay with holes cut out around light sources.
const dark = document.createElement('canvas');
const dctx = dark.getContext('2d');

export function resizeLighting(w, h, dpr) {
  dark.width = Math.floor(w * dpr);
  dark.height = Math.floor(h * dpr);
  dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// level: 0 = full daylight, ~0.86 = deep night.
// lights: [{ x, y, r }] in screen space
export function drawDarkness(ctx, w, h, level, lights) {
  if (level <= 0.01) return;
  const night = level / 0.86; // 0..1, how "night-like" the sky is

  dctx.globalCompositeOperation = 'source-over';
  dctx.clearRect(0, 0, w, h);
  // Sky shifts from orange sunset to deep blue night.
  const r = Math.round(40 * (1 - night) + 3 * night);
  const g = Math.round(14 * (1 - night) + 4 * night);
  const b = Math.round(30 * (1 - night) + 10 * night);
  dctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${level})`;
  dctx.fillRect(0, 0, w, h);

  dctx.globalCompositeOperation = 'destination-out';
  for (const l of lights) {
    const grad = dctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.85)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = grad;
    dctx.beginPath();
    dctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    dctx.fill();
  }

  ctx.drawImage(dark, 0, 0, w, h);

  // Warm lantern tint, stronger the darker it is.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    const grad = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.8);
    grad.addColorStop(0, `rgba(255, 170, 70, ${0.22 * night})`);
    grad.addColorStop(1, 'rgba(255, 170, 70, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  ctx.restore();
}
