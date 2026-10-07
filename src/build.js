// Build mode: hotbar, choosing a cell, placing and removing structures.
import {
  GRID,
  TYPES,
  cellAt,
  structureAt,
  canAfford,
  costText,
  place,
  demolish,
  drawShape,
} from './structures.js';

// Hotbar slots. Locked slots unlock in later milestones.
export const HOTBAR = [{ type: 'wood' }, { type: 'stone' }, { type: 'tower' }, { type: null, label: 'ZAP' }];
const SLOT = 52;
const GAP = 6;
const PLACE_COOLDOWN = 0.12;
const REACH = 130;

export function createBuild() {
  return { on: false, slot: 0, cooldown: 0, target: null, toast: null };
}

export function toast(b, text) {
  b.toast = { text, t: 2 };
}

function slotRects(w, h) {
  const total = HOTBAR.length * SLOT + (HOTBAR.length - 1) * GAP;
  const x0 = w / 2 - total / 2;
  const y = h - SLOT - 14;
  return HOTBAR.map((_, i) => ({ x: x0 + i * (SLOT + GAP), y, w: SLOT, h: SLOT }));
}

function select(b, i) {
  if (!HOTBAR[i].type) {
    toast(b, `${HOTBAR[i].label} coming soon!`);
    return;
  }
  if (b.on && b.slot === i) b.on = false;
  else {
    b.on = true;
    b.slot = i;
  }
}

// Click/tap on the hotbar. Returns true if it was used.
export function handleTap(b, x, y, w, h) {
  const rects = slotRects(w, h);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      select(b, i);
      return true;
    }
  }
  return false;
}

export function handleKeys(b, consumeKey) {
  if (consumeKey('b')) b.on = !b.on;
  if (consumeKey('escape')) b.on = false;
  for (let i = 0; i < HOTBAR.length; i++) {
    if (consumeKey(String(i + 1))) select(b, i);
  }
}

// Picks the cell to build in: under the mouse if it's close, else in front of you.
export function updateTarget(b, p, mouse, screenToWorld) {
  let tx = p.x + p.aimX * 26;
  let ty = p.y + p.aimY * 26;
  if (mouse.active) {
    const m = screenToWorld(mouse.x, mouse.y);
    if (Math.hypot(m.x - p.x, m.y - p.y) < REACH) {
      tx = m.x;
      ty = m.y;
    }
  }
  b.target = cellAt(tx, ty);
}

function overlapsPlayer(p, gx, gy) {
  const nx = Math.max(gx * GRID, Math.min(p.x, gx * GRID + GRID));
  const ny = Math.max(gy * GRID, Math.min(p.y, gy * GRID + GRID));
  return Math.hypot(p.x - nx, p.y - ny) < 9;
}

// Tries to build at the target. canBuild is false at night.
export function tryPlace(b, base, inv, p, canBuild) {
  if (b.cooldown > 0 || !b.target) return;
  const type = HOTBAR[b.slot].type;
  const { gx, gy } = b.target;
  if (!canBuild) {
    toast(b, 'Too dark to build - survive the night!');
    b.cooldown = 0.6;
    return;
  }
  if (structureAt(base, gx, gy) || overlapsPlayer(p, gx, gy)) return;
  if (!canAfford(inv, type)) {
    const need = Object.entries(TYPES[type].cost)
      .map(([res, n]) => `${n} ${res}`)
      .join(' + ');
    toast(b, `Need ${need}`);
    b.cooldown = 0.6;
    return;
  }
  place(base, inv, type, gx, gy);
  b.cooldown = PLACE_COOLDOWN;
}

export function tryDemolish(b, base, inv) {
  if (b.target) demolish(base, inv, b.target.gx, b.target.gy);
}

export function updateBuild(b, dt) {
  b.cooldown = Math.max(0, b.cooldown - dt);
  if (b.toast) {
    b.toast.t -= dt;
    if (b.toast.t <= 0) b.toast = null;
  }
}

export function canPlaceHere(b, base, inv, p) {
  if (!b.target) return false;
  const { gx, gy } = b.target;
  return (
    !structureAt(base, gx, gy) && !overlapsPlayer(p, gx, gy) && canAfford(inv, HOTBAR[b.slot].type)
  );
}

export function drawHotbar(ctx, b, inv, w, h) {
  const rects = slotRects(w, h);
  ctx.save();
  ctx.textAlign = 'center';
  rects.forEach((r, i) => {
    const slot = HOTBAR[i];
    const selected = b.on && b.slot === i;
    ctx.fillStyle = 'rgba(20,20,20,0.75)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = selected ? '#ffffff' : '#6b6b6b';
    ctx.lineWidth = selected ? 3 : 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = '#bbbbbb';
    ctx.textAlign = 'left';
    ctx.fillText(String(i + 1), r.x + 4, r.y + 11);
    ctx.textAlign = 'center';

    if (slot.type) {
      ctx.save();
      if (slot.type === 'tower') {
        ctx.translate(r.x + r.w / 2 - 7, r.y + 24);
        ctx.scale(0.55, 0.55);
      } else {
        ctx.translate(r.x + r.w / 2 - 12, r.y + 18);
        ctx.scale(1, 0.8);
      }
      drawShape(ctx, slot.type, 0, 0, false);
      ctx.restore();
      ctx.fillStyle = canAfford(inv, slot.type) ? '#ffffff' : '#ff7a6a';
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.fillText(costText(slot.type), r.x + r.w / 2, r.y + r.h - 4);
    } else {
      ctx.fillStyle = '#777777';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillText(slot.label, r.x + r.w / 2, r.y + 30);
      ctx.fillText('SOON', r.x + r.w / 2, r.y + 42);
    }
  });

  const top = rects[0].y;
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.lineWidth = 3;
  const hint = b.on
    ? `${TYPES[HOTBAR[b.slot].type].name}: click/Space place  X remove  B close`
    : 'B or 1-3: build';
  ctx.strokeText(hint, w / 2, top - 10);
  ctx.fillText(hint, w / 2, top - 10);
  if (b.toast) {
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffd98a';
    ctx.globalAlpha = Math.min(1, b.toast.t * 2);
    ctx.strokeText(b.toast.text, w / 2, top - 30);
    ctx.fillText(b.toast.text, w / 2, top - 30);
  }
  ctx.restore();
}
