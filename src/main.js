const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
let time = 0;

function update(dt) {
  time += dt;
}

function draw() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, w, h);

  // Flickering lantern glow placeholder
  const r = 140 + Math.sin(time * 6) * 4 + Math.sin(time * 17) * 2;
  const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r);
  glow.addColorStop(0, 'rgba(255, 200, 110, 0.55)');
  glow.addColorStop(1, 'rgba(255, 200, 110, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 36px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('Lantern Keeper', w / 2, h / 2 + 12);
  ctx.fillStyle = '#8a8f99';
  ctx.font = '16px Georgia, serif';
  ctx.fillText('coming soon…', w / 2, h / 2 + 40);
}

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
