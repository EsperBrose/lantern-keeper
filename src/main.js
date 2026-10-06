import { moveVector, attachTouch, drawJoystick } from './input.js';
import { createPlayer, updatePlayer, drawPlayer, lanternPos } from './player.js';
import { drawGround, drawTrees } from './world.js';
import { resizeLighting, drawDarkness } from './lighting.js';
import {
  createSpawner,
  updateSpawner,
  updateZombies,
  countTouching,
  drawZombie,
  drawZombieEyes,
} from './zombies.js';

const ZOOM = 1.7;
const BITE_DPS = 18; // damage per second per zombie touching you

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

let state;

function newGame() {
  state = {
    mode: 'play',
    player: createPlayer(),
    zombies: [],
    spawner: createSpawner(),
    cam: { x: 0, y: 0 },
    elapsed: 0,
    time: 0,
    hurtFlash: 0,
  };
}
newGame();

function restart() {
  if (state.mode === 'over') newGame();
}
window.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') restart();
});
canvas.addEventListener('pointerdown', restart);

// World units visible from the center to the screen corner.
function viewRadius() {
  return Math.hypot(W, H) / 2 / ZOOM;
}

function update(dt) {
  const s = state;
  s.time += dt;
  if (s.mode !== 'play') return;

  s.elapsed += dt;
  const p = s.player;
  updatePlayer(p, moveVector(), dt);
  updateSpawner(s.spawner, s.zombies, p, s.elapsed, viewRadius(), dt);
  updateZombies(s.zombies, p, dt);

  const biting = countTouching(s.zombies, p);
  if (biting > 0) {
    p.hp -= biting * BITE_DPS * dt;
    s.hurtFlash = 0.25;
  }
  s.hurtFlash = Math.max(0, s.hurtFlash - dt);
  if (p.hp <= 0) {
    p.hp = 0;
    s.mode = 'over';
  }

  // Forget zombies that wandered far away.
  const far = viewRadius() * 3;
  s.zombies = s.zombies.filter((z) => Math.hypot(z.x - p.x, z.y - p.y) < far);

  const k = 1 - Math.exp(-dt * 8);
  s.cam.x += (p.x - s.cam.x) * k;
  s.cam.y += (p.y - s.cam.y) * k;
}

function drawHud() {
  const p = state.player;
  // Health bar
  const bw = 180;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(14, 14, bw + 4, 16);
  ctx.fillStyle = p.hp > 30 ? '#c0392b' : '#ff5a3c';
  ctx.fillRect(16, 16, (bw * p.hp) / p.maxHp, 12);
  ctx.fillStyle = '#ffd98a';
  ctx.font = '12px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, 20, 26);

  // Survival time
  const t = Math.floor(state.elapsed);
  const mm = String(Math.floor(t / 60)).padStart(2, '0');
  const ss = String(t % 60).padStart(2, '0');
  ctx.font = 'bold 22px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${mm}:${ss}`, W / 2, 32);
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(20, 0, 0, 0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b5a';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText('The zombies got you', W / 2, H / 2 - 10);
  ctx.fillStyle = '#ffd98a';
  ctx.font = '18px Georgia, serif';
  const t = Math.floor(state.elapsed);
  ctx.fillText(`You survived ${t} seconds`, W / 2, H / 2 + 24);
  ctx.fillStyle = '#a0a4ad';
  ctx.font = '15px Georgia, serif';
  ctx.fillText('Press Space or tap to try again', W / 2, H / 2 + 54);
}

function draw() {
  const s = state;
  const p = s.player;
  const cam = s.cam;
  const vw = W / ZOOM;
  const vh = H / ZOOM;
  const toScreen = (x, y) => ({ x: (x - cam.x) * ZOOM + W / 2, y: (y - cam.y) * ZOOM + H / 2 });

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(ZOOM, ZOOM);
  ctx.translate(-cam.x, -cam.y);
  drawGround(ctx, cam, vw, vh);

  // Draw characters back-to-front for correct overlap.
  const actors = [...s.zombies, p].sort((a, b) => a.y - b.y);
  for (const a of actors) {
    if (a === p) drawPlayer(ctx, p);
    else drawZombie(ctx, a);
  }
  drawTrees(ctx, cam, vw, vh);
  ctx.restore();

  const lp = toScreen(lanternPos(p).x, lanternPos(p).y);
  const flicker = Math.sin(s.time * 7) * 4 + Math.sin(s.time * 19) * 2;
  drawDarkness(ctx, W, H, [{ x: lp.x, y: lp.y, r: (p.lightRadius + flicker) * ZOOM }]);

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(ZOOM, ZOOM);
  ctx.translate(-cam.x, -cam.y);
  for (const z of s.zombies) drawZombieEyes(ctx, z);
  ctx.restore();

  if (s.hurtFlash > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, 'rgba(180,0,0,0)');
    g.addColorStop(1, `rgba(180,0,0,${s.hurtFlash * 1.6})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  drawHud();
  if (s.mode === 'over') drawGameOver();
  else drawJoystick(ctx);
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
