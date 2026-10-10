// Entry point: menus, this device's controls, camera, sounds and particles.
import {
  moveVector,
  attachTouch,
  attackHeld,
  drawTouchControls,
  consumeKey,
  mousePos,
  onTap,
  setAttackLabel,
  isTouchDevice,
} from './input.js';
import {
  loadBest,
  saveBest,
  drawTitle,
  drawPaused,
  drawGameOver,
  pauseButtonRect,
  drawPauseButton,
} from './screens.js';
import { sfx, toggleMute, isMuted } from './audio.js';
import { burst, updateParticles } from './particles.js';
import { hotbarSlotAt, updateTarget } from './build.js';
import { resizeLighting } from './lighting.js';
import { createGame, stepGame } from './game.js';
import { drawScene, drawHud, ZOOM } from './render.js';

const BUILD_KEYS = ['1', '2', '3', '4', '5', 'b', 'escape', 'x'];

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

// Everything about this device's session (the game itself lives in app.g).
const app = {
  mode: 'title', // 'title' | 'play' | 'paused' | 'over'
  g: createGame(1),
  me: 0, // which player this device controls
  cam: { x: 0, y: 0 },
  particles: [],
  shake: 0,
  time: 0,
  best: loadBest(),
  newBest: false,
  tappedKeys: [], // hotbar taps, delivered as key presses
};

function startSolo() {
  app.g = createGame(1);
  app.me = 0;
  app.mode = 'play';
  app.particles = [];
  app.newBest = false;
}

function togglePause() {
  if (app.mode === 'play') app.mode = 'paused';
  else if (app.mode === 'paused') app.mode = 'play';
}

function me() {
  return app.g.players[app.me];
}

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'enter' && (app.mode === 'title' || app.mode === 'over')) startSolo();
  else if (k === 'p') togglePause();
  else if (k === 'm') toggleMute();
  else if (k === 'escape' && (app.mode === 'paused' || !me().build.on)) togglePause();
});
// Pause automatically when the tab is hidden.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && app.mode === 'play') app.mode = 'paused';
});
onTap((x, y) => {
  if (app.mode === 'title' || app.mode === 'over') {
    startSolo();
    return true;
  }
  if (app.mode === 'paused') {
    togglePause();
    return true;
  }
  const r = pauseButtonRect(W);
  if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
    togglePause();
    return true;
  }
  const slot = hotbarSlotAt(x, y, W, H);
  if (slot < 0) return false;
  app.tappedKeys.push(String(slot + 1));
  return true;
});

function screenToWorld(x, y) {
  return { x: (x - W / 2) / ZOOM + app.cam.x, y: (y - H / 2) / ZOOM + app.cam.y };
}

// This device's controls for one frame, in the same shape the game expects.
function readLocalInput() {
  const mv = moveVector();
  const keys = BUILD_KEYS.filter((k) => consumeKey(k)).concat(app.tappedKeys);
  app.tappedKeys = [];
  let target = null;
  const mouse = mousePos();
  if (mouse.active) {
    const tmp = {};
    updateTarget(tmp, me(), mouse, screenToWorld);
    target = tmp.target;
  }
  return { mx: mv.x, my: mv.y, atk: attackHeld(), keys, target };
}

// World units visible from the center to the screen corner.
function viewRadius() {
  return Math.hypot(W, H) / 2 / ZOOM;
}

// Turn the game's events into sounds and particles on this device.
function playEvents(events) {
  for (const e of events) {
    if (e.sfx) sfx(e.sfx, e.sfx === 'hurt' ? 0.35 : 0.05);
    if (e.burst) burst(app.particles, ...e.burst);
  }
}

function update(dt) {
  app.time += dt;
  updateParticles(app.particles, dt);
  app.shake = Math.max(0, app.shake - dt * 3);
  if (app.mode !== 'play') return;

  const g = app.g;
  const inputs = [];
  inputs[app.me] = readLocalInput();
  stepGame(g, inputs, dt, viewRadius());
  playEvents(g.events);
  g.events = [];

  const p = me();
  if (p.hurtFlash > 0.2) app.shake = Math.max(app.shake, 0.5);
  setAttackLabel(p.build.on ? 'PLACE' : 'AXE');

  if (g.over) {
    app.mode = 'over';
    app.newBest = saveBest(g.cycle.nightsSurvived);
    app.best = loadBest();
  }

  const k = 1 - Math.exp(-dt * 8);
  app.cam.x += (p.x - app.cam.x) * k;
  app.cam.y += (p.y - app.cam.y) * k;
}

function draw() {
  const g = app.g;
  // Screen shake nudges the camera a little.
  const sh = app.shake * 4;
  const cam = { x: app.cam.x + (Math.random() - 0.5) * sh, y: app.cam.y + (Math.random() - 0.5) * sh };
  drawScene(ctx, g, {
    W,
    H,
    cam,
    me: me(),
    particles: app.particles,
    showGhost: app.mode === 'play',
    coop: g.players.length > 1,
  });

  if (app.mode === 'title') {
    drawTitle(ctx, W, H, app.best, app.time);
    return;
  }
  drawHud(ctx, g, me(), W, H, {
    muted: isMuted(),
    showHotbar: app.mode === 'play',
    coop: g.players.length > 1,
  });
  if (app.mode === 'over') {
    drawGameOver(ctx, W, H, g.cycle.nightsSurvived, app.best, app.newBest);
  } else if (app.mode === 'paused') {
    drawPaused(ctx, W, H);
  } else {
    drawTouchControls(ctx);
    if (isTouchDevice()) drawPauseButton(ctx, W);
  }
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
