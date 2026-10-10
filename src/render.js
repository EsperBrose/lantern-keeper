// Draws a game (live, or a snapshot received from the host) from one player's view.
import { drawStructure, drawGhost, GRID } from './structures.js';
import { HOTBAR, canPlaceHere, drawHotbar } from './build.js';
import { drawShots, drawBolts, towerLights } from './towers.js';
import { drawPlayer, drawNameTag, lanternPos } from './player.js';
import { drawGround, drawTrees } from './world.js';
import { drawPopups, drawIcon } from './popups.js';
import { drawDarkness } from './lighting.js';
import { drawZombie, drawZombieEyes } from './zombies.js';
import { darkness, drawClock, drawBanner } from './daynight.js';
import { drawParticles } from './particles.js';

export const ZOOM = 1.7;

// view: { W, H, cam, me (local player), particles, showGhost, coop }
export function drawScene(ctx, g, view) {
  const { W, H, cam, me } = view;
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
    ...g.zombies.map((z) => ({ y: z.y, draw: () => drawZombie(ctx, z) })),
    ...g.base.list.map((st) => ({ y: st.gy * GRID + GRID - 2, draw: () => drawStructure(ctx, st) })),
    ...g.players.map((p) => ({ y: p.y, draw: () => drawPlayer(ctx, p) })),
  ].sort((a, b) => a.y - b.y);
  for (const t of things) t.draw();
  drawShots(ctx, g.shots);
  drawParticles(ctx, view.particles);

  const b = me.build;
  if (view.showGhost && b.on && b.target && !me.down) {
    drawGhost(ctx, HOTBAR[b.slot].type, b.target.gx, b.target.gy, canPlaceHere(b, g.base, g.inv, me));
  }
  drawTrees(ctx, cam, vw, vh, me);
  drawPopups(ctx, g.popups);
  if (view.coop) for (const p of g.players) drawNameTag(ctx, p);
  ctx.restore();

  // Night: everyone's lantern plus glowing buildings
  const flicker = Math.sin(g.time * 7) * 4 + Math.sin(g.time * 19) * 2;
  const dark = darkness(g.cycle);
  const lights = [];
  for (const p of g.players) {
    if (p.down) continue;
    const lp = lanternPos(p);
    const sp = toScreen(lp.x, lp.y);
    lights.push({ x: sp.x, y: sp.y, r: (p.lightRadius + flicker) * ZOOM });
  }
  for (const l of towerLights(g.base)) {
    const sp = toScreen(l.x, l.y);
    lights.push({ x: sp.x, y: sp.y, r: l.r * ZOOM });
  }
  drawDarkness(ctx, W, H, dark, lights);

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(ZOOM, ZOOM);
  ctx.translate(-cam.x, -cam.y);
  for (const z of g.zombies) drawZombieEyes(ctx, z, dark / 0.86);
  drawBolts(ctx, g.bolts); // lightning glows through the dark
  ctx.restore();

  if (me.hurtFlash > 0) {
    const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
    grad.addColorStop(0, 'rgba(180,0,0,0)');
    grad.addColorStop(1, `rgba(180,0,0,${me.hurtFlash * 1.6})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }
}

const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];

// One pixel heart; fill is 0..1 (how much of it, left to right, is red).
function drawHeart(ctx, x, y, px, fill) {
  for (let r = 0; r < HEART.length; r++) {
    for (let c = 0; c < 7; c++) {
      if (HEART[r][c] !== 'X') continue;
      ctx.fillStyle = c / 7 < fill ? (r === 1 && c < 3 ? '#ff8a80' : '#d62d2d') : '#3a1c1c';
      ctx.fillRect(x + c * px, y + r * px, px, px);
    }
  }
}

// opts: { muted, showHotbar, coop }
export function drawHud(ctx, g, me, W, H, opts) {
  // Ten hearts, 10 HP each
  const px = 2.5;
  const hearts = me.maxHp / 10;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(10, 10, hearts * 20 + 6, 22);
  for (let i = 0; i < hearts; i++) {
    const fill = Math.max(0, Math.min(1, (me.hp - i * 10) / 10));
    drawHeart(ctx, 14 + i * 20, 14, px, Math.ceil(fill * 2) / 2);
  }

  // Shared inventory
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(10, 36, 206, 26);
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  const items = [
    ['wood', g.inv.wood],
    ['stone', g.inv.stone],
    ['skull', g.kills],
  ];
  items.forEach(([icon, n], i) => {
    const x = 16 + i * 68;
    drawIcon(ctx, icon, x, 41, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(n), x + 20, 55);
  });

  drawClock(ctx, g.cycle, W / 2, 32);
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(opts.muted ? 'M: sound OFF' : 'M: sound on', 14, 76);

  // Your friend's health, top right
  if (opts.coop) {
    const friend = g.players.find((p) => p !== me);
    if (friend) {
      ctx.textAlign = 'right';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = friend.index === 1 ? '#8fc4ff' : '#ff9a8a';
      const status = friend.down ? 'DOWN until sunrise' : `${Math.ceil(friend.hp)} HP`;
      ctx.fillText(`P${friend.index + 1}: ${status}`, W - 56, 24);
    }
  }

  if (me.down) {
    ctx.textAlign = 'center';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 4;
    ctx.fillStyle = '#ff8a7a';
    ctx.strokeText('You are down! Back up at sunrise', W / 2, H * 0.7);
    ctx.fillText('You are down! Back up at sunrise', W / 2, H * 0.7);
  } else if (opts.showHotbar) {
    drawHotbar(ctx, me.build, g.inv, W, H);
  }
  drawBanner(ctx, g.cycle, W, H);
}
