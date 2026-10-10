// Entry point: menus, this device's controls, camera, sounds and particles.
// Three ways to play:
//   solo  - this device runs the game for one player
//   host  - this device runs a 2-player game and streams it to a friend
//   guest - this device shows the host's game and sends its controls
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
  drawMessage,
  pauseButtonRect,
  drawPauseButton,
} from './screens.js';
import { sfx, toggleMute, isMuted } from './audio.js';
import { burst, updateParticles } from './particles.js';
import { hotbarSlotAt, updateTarget, createBuild } from './build.js';
import { collide } from './structures.js';
import { createPlayer, updatePlayer, trySwing } from './player.js';
import { resizeLighting } from './lighting.js';
import { createGame, stepGame, IDLE_INPUT } from './game.js';
import { drawScene, drawHud, ZOOM } from './render.js';
import { hostGame, joinGame, send, leave } from './net.js';
import { makeSnapshot, createView, applySnapshot, smoothView } from './snapshot.js';

const BUILD_KEYS = ['1', '2', '3', '4', '5', 'b', 'escape', 'x'];
const SNAPSHOT_EVERY = 0.05; // host -> friend, 20 per second
const INPUT_EVERY = 0.033; // friend -> host, 30 per second

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

// Everything about this device's session.
const app = {
  mode: 'title', // 'title' | 'play' | 'paused' | 'over'
  net: null, // null (solo) | 'host' | 'guest'
  g: createGame(1), // the game (solo/host) - on a guest, the view built from snapshots
  me: 0, // which player this device controls
  self: null, // guest only: our own player, moved locally for instant response
  cam: { x: 0, y: 0 },
  particles: [],
  shake: 0,
  time: 0,
  best: loadBest(),
  newBest: false,
  tappedKeys: [], // hotbar taps, delivered as key presses
  // host
  remoteInput: { ...IDLE_INPUT },
  remoteKeys: [],
  pendingEvents: [],
  snapTimer: 0,
  snapCount: 0,
  friendLeft: false,
  // guest
  inputTimer: 0,
  sendKeys: [],
};

// ---- Title menu (HTML buttons over the canvas) ----------------------------

const menu = document.getElementById('menu');
const panels = {
  main: document.getElementById('menu-main'),
  host: document.getElementById('menu-host'),
  join: document.getElementById('menu-join'),
};
const codeInput = document.getElementById('join-code');

function showMenu(name) {
  menu.hidden = !name;
  for (const [key, el] of Object.entries(panels)) el.hidden = key !== name;
  if (name === 'join') {
    codeInput.value = '';
    document.getElementById('join-status').textContent = '';
    codeInput.focus();
  }
}

function backToTitle(message) {
  leave();
  app.net = null;
  app.mode = 'title';
  app.g = createGame(1);
  app.me = 0;
  showMenu('main');
  if (message) panels.main.querySelector('.hint').textContent = message;
}

menu.addEventListener('click', (e) => {
  const act = e.target.dataset && e.target.dataset.act;
  if (act === 'solo') startSolo();
  else if (act === 'host') startHosting();
  else if (act === 'join') showMenu('join');
  else if (act === 'join-go') startJoining();
  else if (act === 'back') backToTitle();
});
codeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startJoining();
});

function resetSession() {
  app.particles = [];
  app.newBest = false;
  app.friendLeft = false;
  app.pendingEvents = [];
}

function startSolo() {
  resetSession();
  app.net = null;
  app.g = createGame(1);
  app.me = 0;
  app.mode = 'play';
  showMenu(null);
}

function startHosting() {
  showMenu('host');
  document.getElementById('room-code').textContent = '....';
  const status = document.getElementById('host-status');
  status.textContent = 'Getting a code...';
  hostGame({
    onCode: (code) => {
      document.getElementById('room-code').textContent = code;
      status.textContent = 'Tell your friend this code. Waiting for them to join...';
    },
    onConnect: () => {
      resetSession();
      app.net = 'host';
      app.g = createGame(2);
      app.me = 0;
      app.remoteInput = { ...IDLE_INPUT };
      app.mode = 'play';
      showMenu(null);
    },
    onData: (msg) => {
      if (msg.t !== 'in') return;
      app.remoteKeys.push(...msg.keys);
      app.remoteInput = msg;
    },
    onClose: () => {
      app.friendLeft = true;
      app.remoteInput = { ...IDLE_INPUT };
    },
    onError: (text) => {
      status.textContent = text;
    },
  });
}

function startJoining() {
  const code = codeInput.value.trim().toUpperCase();
  const status = document.getElementById('join-status');
  if (code.length !== 4) {
    status.textContent = 'Codes are 4 letters';
    return;
  }
  status.textContent = 'Connecting...';
  joinGame(code, {
    onConnect: () => {
      resetSession();
      app.net = 'guest';
      app.me = 1;
      app.g = createView();
      app.self = createPlayer(1);
      app.self.build = createBuild();
      app.mode = 'play';
      showMenu(null);
    },
    onData: (msg) => {
      if (msg.t === 'snap') receiveSnapshot(msg);
    },
    onClose: () => backToTitle('Lost connection to the host'),
    onError: (text) => {
      if (app.net === 'guest') backToTitle(text);
      else status.textContent = text;
    },
  });
}

// ---- Keyboard / taps -------------------------------------------------------

function me() {
  return app.net === 'guest' ? app.self : app.g.players[app.me];
}

function canPause() {
  return app.net === null; // can't freeze time on your friend
}

function togglePause() {
  if (!canPause()) return;
  if (app.mode === 'play') app.mode = 'paused';
  else if (app.mode === 'paused') app.mode = 'play';
}

// Host restarts a co-op game for both players.
function restart() {
  if (app.net === 'host') {
    resetSession();
    app.g = createGame(2);
    app.mode = 'play';
  } else if (app.net === null) {
    startSolo();
  }
}

window.addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') return; // typing a room code
  const k = e.key.toLowerCase();
  if (k === 'enter' && app.mode === 'title') startSolo();
  else if (k === 'enter' && app.mode === 'over') restart();
  else if (k === 'p') togglePause();
  else if (k === 'm') toggleMute();
  else if (k === 'escape' && (app.mode === 'paused' || (app.mode === 'play' && !me().build.on))) togglePause();
});
// Pause automatically when the tab is hidden (solo only).
document.addEventListener('visibilitychange', () => {
  if (document.hidden && app.mode === 'play' && canPause()) app.mode = 'paused';
});
onTap((x, y) => {
  if (app.mode === 'title') return true;
  if (app.mode === 'over') {
    restart();
    return true;
  }
  if (app.mode === 'paused') {
    togglePause();
    return true;
  }
  const r = pauseButtonRect(W);
  if (canPause() && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
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

// Turn game events into sounds and particles on this device.
function playEvents(events) {
  for (const e of events) {
    if (e.sfx) sfx(e.sfx, e.sfx === 'hurt' ? 0.35 : 0.05);
    if (e.burst) burst(app.particles, ...e.burst);
  }
}

function checkGameOver(over, nights) {
  if (over && app.mode === 'play') {
    app.mode = 'over';
    app.newBest = saveBest(nights);
    app.best = loadBest();
  } else if (!over && app.mode === 'over' && app.net === 'guest') {
    app.mode = 'play'; // host started a new game
    app.particles = [];
  }
}

// ---- Solo / host -----------------------------------------------------------

function updateLocalGame(dt) {
  const g = app.g;
  const inputs = [];
  inputs[app.me] = readLocalInput();
  if (app.net === 'host') {
    // Friend's key presses apply once; movement/aim stay until the next message.
    inputs[1] = { ...app.remoteInput, keys: app.remoteKeys };
    app.remoteKeys = [];
  }
  stepGame(g, inputs, dt, viewRadius());
  playEvents(g.events);

  if (app.net === 'host') {
    app.pendingEvents.push(...g.events);
    app.snapTimer -= dt;
    if (app.snapTimer <= 0) {
      app.snapTimer = SNAPSHOT_EVERY;
      app.snapCount++;
      send(makeSnapshot(g, app.pendingEvents, app.snapCount % 5 === 0));
      app.pendingEvents = [];
    }
  }
  g.events = [];
  checkGameOver(g.over, g.cycle.nightsSurvived);
}

// ---- Guest -----------------------------------------------------------------

function receiveSnapshot(s) {
  const view = app.g;
  applySnapshot(view, s, app.me);
  playEvents(s.ev);
  // Our own player: take health/build state from the host, keep our position
  // unless we're far off (lag) or knocked out.
  const mine = view.mine;
  const self = app.self;
  if (mine) {
    const wasDown = self.down;
    Object.assign(self, { hp: mine.hp, maxHp: mine.mhp, down: mine.d, hurtFlash: mine.hf });
    self.build.on = mine.b.on;
    self.build.slot = mine.b.slot;
    self.build.toast = mine.b.toast;
    if (self.down || wasDown || Math.hypot(mine.x - self.x, mine.y - self.y) > 80) {
      self.x = mine.x;
      self.y = mine.y;
    }
    view.players[app.me] = self;
  }
  checkGameOver(s.over, s.cycle.nightsSurvived);
}

function updateGuest(dt) {
  const view = app.g;
  const self = app.self;
  const inp = readLocalInput();
  if (view.ready && !self.down && app.mode === 'play') {
    updatePlayer(self, { x: inp.mx, y: inp.my }, dt);
    collide(view.base, self, 7);
    if (!self.build.on && inp.atk) trySwing(self); // swing animation right away
    updateTarget(self.build, self, mousePos(), screenToWorld);
  }
  smoothView(view, dt, self);

  app.sendKeys.push(...inp.keys);
  app.inputTimer -= dt;
  if (app.inputTimer <= 0) {
    app.inputTimer = INPUT_EVERY;
    send({ t: 'in', ...inp, keys: app.sendKeys, pos: { x: Math.round(self.x), y: Math.round(self.y) } });
    app.sendKeys = [];
  }
}

// ---- Main loop -------------------------------------------------------------

function update(dt) {
  app.time += dt;
  updateParticles(app.particles, dt);
  app.shake = Math.max(0, app.shake - dt * 3);
  if (app.mode === 'title' || app.mode === 'paused') return;

  if (app.net === 'guest') updateGuest(dt);
  else if (app.mode === 'play') updateLocalGame(dt);

  const p = me();
  if (p.hurtFlash > 0.2) app.shake = Math.max(app.shake, 0.5);
  setAttackLabel(p.build.on ? 'PLACE' : 'AXE');
  const k = 1 - Math.exp(-dt * 8);
  app.cam.x += (p.x - app.cam.x) * k;
  app.cam.y += (p.y - app.cam.y) * k;
}

function draw() {
  const g = app.g;
  if (app.net === 'guest' && !g.ready) {
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, W, H);
    drawMessage(ctx, W, H, 'Connected!', 'Waiting for the game...');
    return;
  }
  const coop = app.net !== null;
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
    coop,
  });

  if (app.mode === 'title') {
    drawTitle(ctx, W, H, app.best, app.time);
    return;
  }
  drawHud(ctx, g, me(), W, H, { muted: isMuted(), showHotbar: app.mode === 'play', coop });
  if (app.friendLeft) {
    ctx.save();
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd98a';
    ctx.fillText('Your friend left the game', W / 2, 70);
    ctx.restore();
  }
  if (app.mode === 'over') {
    const prompt = app.net === 'guest' ? 'Waiting for the host to restart...' : undefined;
    drawGameOver(ctx, W, H, g.cycle.nightsSurvived, app.best, app.newBest, prompt);
  } else if (app.mode === 'paused') {
    drawPaused(ctx, W, H);
  } else {
    drawTouchControls(ctx);
    if (isTouchDevice() && canPause()) drawPauseButton(ctx, W);
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
showMenu('main');
requestAnimationFrame(frame);
