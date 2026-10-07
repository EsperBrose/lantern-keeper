import { moveVector, attachTouch, drawJoystick } from './input.js';
import { createPlayer, updatePlayer, drawPlayer, lanternPos } from './player.js';
import { drawGround, drawTrees } from './world.js';
import { resizeLighting, drawDarkness } from './lighting.js';
import {
  createSpawner,
  updateSpawner,
  updateZombies,
  countTouching,
  igniteAll,
  drawZombie,
  drawZombieEyes,
} from './zombies.js';
import {
  createCycle,
  updateCycle,
  isNight,
  darkness,
  drawClock,
  drawBanner,
} from './daynight.js';

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
// Canvas text doesn't trigger web-font loading on its own.
if (document.fonts) document.fonts.load('10px "Press Start 2P"');

let state;

function newGame() {
  state = {
    mode: 'play',
    player: createPlayer(),
    zombies: [],
    spawner: createSpawner(),
    cycle: createCycle(),
    cam: { x: 0, y: 0 },
    time: 0,
    hurtFlash: 0,
  };
  state.cycle.banner = { text: 'Day 1', sub: 'Gather and build before night falls', color: '#ffd98a', t: 3 };
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

  const p = s.player;
  const started = updateCycle(s.cycle, dt);
  if (started === 'dawn') igniteAll(s.zombies);
  if (started === 'night') s.spawner.timer = 0;

  updatePlayer(p, moveVector(), dt);
  if (isNight(s.cycle)) updateSpawner(s.spawner, s.zombies, p, s.cycle.day, viewRadius(), dt);
  updateZombies(s.zombies, p, dt);
  s.zombies = s.zombies.filter((z) => !z.dead);

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

const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];

// One pixel heart; fill is 0..1 (how much of it, left to right, is red).
function drawHeart(x, y, px, fill) {
  for (let r = 0; r < HEART.length; r++) {
    for (let c = 0; c < 7; c++) {
      if (HEART[r][c] !== 'X') continue;
      ctx.fillStyle = c / 7 < fill ? (r === 1 && c < 3 ? '#ff8a80' : '#d62d2d') : '#3a1c1c';
      ctx.fillRect(x + c * px, y + r * px, px, px);
    }
  }
}

function drawHud() {
  const p = state.player;
  // Ten hearts, 10 HP each
  const px = 2.5;
  const hearts = p.maxHp / 10;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(10, 10, hearts * 20 + 6, 22);
  for (let i = 0; i < hearts; i++) {
    const fill = Math.max(0, Math.min(1, (p.hp - i * 10) / 10));
    drawHeart(14 + i * 20, 14, px, Math.ceil(fill * 2) / 2);
  }

  drawClock(ctx, state.cycle, W / 2, 32);
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(20, 0, 0, 0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b5a';
  ctx.font = '24px "Press Start 2P", monospace';
  ctx.fillText('The zombies got you', W / 2, H / 2 - 10);
  ctx.fillStyle = '#ffd98a';
  ctx.font = '12px "Press Start 2P", monospace';
  const n = state.cycle.nightsSurvived;
  ctx.fillText(`You survived ${n} night${n === 1 ? '' : 's'}`, W / 2, H / 2 + 24);
  ctx.fillStyle = '#a0a4ad';
  ctx.font = '10px "Press Start 2P", monospace';
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
  drawTrees(ctx, cam, vw, vh, p);
  ctx.restore();

  const lp = toScreen(lanternPos(p).x, lanternPos(p).y);
  const flicker = Math.sin(s.time * 7) * 4 + Math.sin(s.time * 19) * 2;
  const dark = darkness(s.cycle);
  drawDarkness(ctx, W, H, dark, [{ x: lp.x, y: lp.y, r: (p.lightRadius + flicker) * ZOOM }]);

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(ZOOM, ZOOM);
  ctx.translate(-cam.x, -cam.y);
  for (const z of s.zombies) drawZombieEyes(ctx, z, dark / 0.86);
  ctx.restore();

  if (s.hurtFlash > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, 'rgba(180,0,0,0)');
    g.addColorStop(1, `rgba(180,0,0,${s.hurtFlash * 1.6})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  drawHud();
  drawBanner(ctx, s.cycle, W, H);
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
