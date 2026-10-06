import { moveVector, attachTouch, drawJoystick } from './input.js';
import { createPlayer, updatePlayer, drawPlayer, lanternPos } from './player.js';
import { drawGround, drawTrees } from './world.js';
import { resizeLighting, drawDarkness } from './lighting.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 0;
let H = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  resizeLighting(W, H, dpr);
}
window.addEventListener('resize', resize);
resize();
attachTouch(canvas);

const player = createPlayer();
const cam = { x: 0, y: 0 };
let time = 0;

function update(dt) {
  time += dt;
  updatePlayer(player, moveVector(), dt);
  // Smooth camera follow
  const k = 1 - Math.exp(-dt * 8);
  cam.x += (player.x - cam.x) * k;
  cam.y += (player.y - cam.y) * k;
}

function draw() {
  ctx.save();
  ctx.translate(W / 2 - cam.x, H / 2 - cam.y);
  drawGround(ctx, cam, W, H);
  drawPlayer(ctx, player);
  drawTrees(ctx, cam, W, H);
  ctx.restore();

  const lp = lanternPos(player);
  const flicker = Math.sin(time * 7) * 4 + Math.sin(time * 19) * 2;
  drawDarkness(ctx, W, H, [
    { x: lp.x - cam.x + W / 2, y: lp.y - cam.y + H / 2, r: player.lightRadius + flicker },
  ]);

  drawJoystick(ctx);

  ctx.fillStyle = 'rgba(255, 217, 138, 0.6)';
  ctx.font = '14px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('WASD / arrows / drag to move', 14, H - 16);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
