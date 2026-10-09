import {
  moveVector,
  attachTouch,
  attackHeld,
  drawTouchControls,
  consumeKey,
  mousePos,
  onTap,
  setAttackLabel,
} from './input.js';
import {
  createBase,
  updateStructures,
  collide,
  damage,
  drawStructure,
  drawGhost,
  GRID,
} from './structures.js';
import {
  HOTBAR,
  createBuild,
  handleTap,
  handleKeys,
  updateTarget,
  tryPlace,
  tryDemolish,
  updateBuild,
  canPlaceHere,
  drawHotbar,
} from './build.js';
import { updateTowers, drawShots, updateBolts, drawBolts, towerLights } from './towers.js';
import { createPlayer, updatePlayer, drawPlayer, lanternPos, trySwing, swingPoint } from './player.js';
import { drawGround, drawTrees, resetWorld, updateWorld, nodesNear, hitNode } from './world.js';
import { createPopups, addPopup, updatePopups, drawPopups, drawIcon } from './popups.js';
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
  phaseName,
  darkness,
  drawClock,
  drawBanner,
} from './daynight.js';

const ZOOM = 1.7;
const BITE_DPS = 18; // damage per second per zombie touching you
const WALL_SMASH_DPS = 12; // damage per second a blocked zombie does to a wall

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
    inv: { wood: 100, stone: 100 }, // start with enough to build a base
    kills: 0,
    popups: createPopups(),
    base: createBase(),
    build: createBuild(),
    shots: [],
    bolts: [],
  };
  resetWorld();
  state.cycle.banner = { text: 'Day 1', sub: 'Gather and build before night falls', color: '#ffd98a', t: 3 };
}
newGame();

function restart() {
  if (state.mode === 'over') newGame();
}
window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') restart();
});
canvas.addEventListener('pointerdown', restart);
onTap((x, y) => state.mode === 'play' && handleTap(state.build, x, y, W, H));

function screenToWorld(x, y) {
  return { x: (x - W / 2) / ZOOM + state.cam.x, y: (y - H / 2) / ZOOM + state.cam.y };
}

// One axe swing: hits zombies in front of you and the nearest tree or rock.
function swingAxe(s) {
  const p = s.player;
  const sp = swingPoint(p);
  for (const z of s.zombies) {
    if (z.burn !== undefined || z.dead) continue;
    if (Math.hypot(z.x - sp.x, z.y - 6 - sp.y) > 24) continue;
    z.hp -= 1;
    z.hurt = 0.12;
    z.x += p.aimX * 14;
    z.y += p.aimY * 14;
    if (z.hp <= 0) {
      z.dead = true;
      s.kills++;
    }
  }

  const nodes = nodesNear(sp.x, sp.y + 6, 26);
  if (nodes.length === 0) return;
  nodes.sort((a, b) => Math.hypot(a.x - sp.x, a.y - sp.y) - Math.hypot(b.x - sp.x, b.y - sp.y));
  const n = nodes[0];
  const destroyed = hitNode(n);
  const res = n.kind === 'tree' ? 'wood' : 'stone';
  const gain = destroyed ? 3 : 1;
  s.inv[res] += gain;
  addPopup(s.popups, n.x, n.y - 24, `+${gain}`, res);
}

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
  collide(s.base, p, 7);
  updateWorld(dt);
  updatePopups(s.popups, dt);

  // Building (day and sunset only) or swinging the axe
  const b = s.build;
  handleKeys(b, consumeKey);
  updateBuild(b, dt);
  updateTarget(b, p, mousePos(), screenToWorld);
  setAttackLabel(b.on ? 'PLACE' : 'AXE');
  if (b.on) {
    const phase = phaseName(s.cycle);
    if (attackHeld()) tryPlace(b, s.base, s.inv, p, phase === 'day' || phase === 'dusk');
    if (consumeKey('x')) tryDemolish(b, s.base, s.inv);
  } else if (attackHeld() && trySwing(p)) {
    swingAxe(s);
  }

  if (isNight(s.cycle)) updateSpawner(s.spawner, s.zombies, p, s.cycle.day, viewRadius(), dt);
  updateZombies(s.zombies, p, dt);
  // Walls block zombies; blocked zombies smash the wall in their way.
  for (const z of s.zombies) {
    if (z.burn !== undefined) continue;
    const hits = collide(s.base, z, 9);
    if (hits.length > 0) damage(hits[0], WALL_SMASH_DPS * dt);
  }
  updateStructures(s.base, dt);
  s.kills += updateTowers(s.base, s.zombies, s.shots, s.bolts, dt);
  updateBolts(s.bolts, dt);
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

  // Inventory
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(10, 36, 206, 26);
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  const items = [
    ['wood', state.inv.wood],
    ['stone', state.inv.stone],
    ['skull', state.kills],
  ];
  items.forEach(([icon, n], i) => {
    const x = 16 + i * 68;
    drawIcon(ctx, icon, x, 41, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(n), x + 20, 55);
  });

  drawClock(ctx, state.cycle, W / 2, 32);
  if (state.mode === 'play') drawHotbar(ctx, state.build, state.inv, W, H);
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
  ctx.fillText('Press Enter or tap to try again', W / 2, H / 2 + 54);
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

  // Draw characters and buildings back-to-front for correct overlap.
  const things = [
    ...s.zombies.map((z) => ({ y: z.y, draw: () => drawZombie(ctx, z) })),
    ...s.base.list.map((st) => ({ y: st.gy * GRID + GRID - 2, draw: () => drawStructure(ctx, st) })),
    { y: p.y, draw: () => drawPlayer(ctx, p) },
  ].sort((a, b) => a.y - b.y);
  for (const t of things) t.draw();
  drawShots(ctx, s.shots);

  const b = s.build;
  if (b.on && b.target && s.mode === 'play') {
    drawGhost(ctx, HOTBAR[b.slot].type, b.target.gx, b.target.gy, canPlaceHere(b, s.base, s.inv, p));
  }
  drawTrees(ctx, cam, vw, vh, p);
  drawPopups(ctx, s.popups);
  ctx.restore();

  const lp = toScreen(lanternPos(p).x, lanternPos(p).y);
  const flicker = Math.sin(s.time * 7) * 4 + Math.sin(s.time * 19) * 2;
  const dark = darkness(s.cycle);
  const lights = [{ x: lp.x, y: lp.y, r: (p.lightRadius + flicker) * ZOOM }];
  for (const l of towerLights(s.base)) {
    const sp = toScreen(l.x, l.y);
    lights.push({ x: sp.x, y: sp.y, r: l.r * ZOOM });
  }
  drawDarkness(ctx, W, H, dark, lights);

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(ZOOM, ZOOM);
  ctx.translate(-cam.x, -cam.y);
  for (const z of s.zombies) drawZombieEyes(ctx, z, dark / 0.86);
  drawBolts(ctx, s.bolts); // lightning glows through the dark
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
  else drawTouchControls(ctx);
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
