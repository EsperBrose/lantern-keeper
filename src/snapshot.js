// Online co-op: the host packs the game into compact snapshots; the friend's
// device unpacks them into a "view" that render.js can draw, smoothing movement.
import { createBase } from './structures.js';
import { createBuild } from './build.js';
import { createPlayer } from './player.js';
import { getWorldDamage, setWorldDamage } from './world.js';

const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;

// withWorld: include tree/rock damage (sent a few times a second, not every snapshot).
export function makeSnapshot(g, events, withWorld) {
  return {
    t: 'snap',
    time: r2(g.time),
    over: g.over,
    inv: g.inv,
    kills: g.kills,
    cycle: g.cycle,
    players: g.players.map((p) => ({
      i: p.index,
      x: r1(p.x),
      y: r1(p.y),
      f: p.facing,
      w: r2(p.walk),
      m: p.moving,
      hp: r1(p.hp),
      mhp: p.maxHp,
      d: p.down,
      hf: r2(p.hurtFlash),
      sw: r2(p.swing),
      ax: r2(p.aimX),
      ay: r2(p.aimY),
      lr: p.lightRadius,
      b: { on: p.build.on, slot: p.build.slot, toast: p.build.toast, target: p.build.target },
    })),
    zombies: g.zombies.map((z) => [
      z.id,
      z.kind,
      r1(z.x),
      r1(z.y),
      z.facing,
      r2(z.phase),
      r2(z.hurt),
      z.burn === undefined ? -1 : r2(z.burn),
      z.scale,
      z.skin,
      z.shirt,
    ]),
    base: g.base.list.map((s) => [s.type, s.gx, s.gy, r1(s.hp), s.maxHp, r2(s.angle || -0.6), r2(s.hurt)]),
    shots: g.shots.map((a) => [r1(a.x), r1(a.y), Math.round(a.vx), Math.round(a.vy)]),
    bolts: g.bolts.map((b) => [b.points.flatMap((p) => [r1(p.x), r1(p.y)]), r2(b.life)]),
    popups: g.popups,
    world: withWorld ? getWorldDamage() : null,
    ev: events,
  };
}

export function createView() {
  return {
    players: [],
    zombies: [],
    zombieById: new Map(),
    base: createBase(),
    shots: [],
    bolts: [],
    popups: [],
    inv: { wood: 0, stone: 0 },
    kills: 0,
    cycle: null,
    time: 0,
    over: false,
    ready: false,
  };
}

// Applies a snapshot to the view. Characters get a target position (tx, ty)
// that smoothView() glides them toward, so movement looks smooth between snapshots.
// The local player (localIndex) is left alone; its data goes in view.mine.
export function applySnapshot(view, s, localIndex) {
  view.time = s.time;
  view.over = s.over;
  view.inv = s.inv;
  view.kills = s.kills;
  view.cycle = s.cycle;
  view.popups = s.popups;

  s.players.forEach((sp) => {
    if (sp.i === localIndex) {
      view.mine = sp;
      return;
    }
    let p = view.players[sp.i];
    if (!p) {
      p = createPlayer(sp.i);
      p.build = createBuild();
      p.x = sp.x;
      p.y = sp.y;
      view.players[sp.i] = p;
    }
    Object.assign(p, {
      tx: sp.x,
      ty: sp.y,
      facing: sp.f,
      walk: sp.w,
      moving: sp.m,
      hp: sp.hp,
      maxHp: sp.mhp,
      down: sp.d,
      hurtFlash: sp.hf,
      swing: sp.sw,
      aimX: sp.ax,
      aimY: sp.ay,
      lightRadius: sp.lr,
    });
    Object.assign(p.build, sp.b);
  });

  const seen = new Map();
  view.zombies = s.zombies.map(([id, kind, x, y, facing, phase, hurt, burn, scale, skin, shirt]) => {
    let z = view.zombieById.get(id);
    if (!z) z = { id, x, y };
    Object.assign(z, { kind, tx: x, ty: y, facing, phase, hurt, scale, skin, shirt });
    z.burn = burn < 0 ? undefined : burn;
    seen.set(id, z);
    return z;
  });
  view.zombieById = seen;

  const base = createBase();
  for (const [type, gx, gy, hp, maxHp, angle, hurt] of s.base) {
    const st = { type, gx, gy, x: gx * 24 + 12, y: gy * 24 + 12, hp, maxHp, angle, hurt };
    base.list.push(st);
    base.byCell.set(`${gx},${gy}`, st);
  }
  view.base = base;

  view.shots = s.shots.map(([x, y, vx, vy]) => ({ x, y, vx, vy }));
  view.bolts = s.bolts.map(([flat, life]) => {
    const points = [];
    for (let i = 0; i < flat.length; i += 2) points.push({ x: flat[i], y: flat[i + 1] });
    return { points, life };
  });
  if (s.world) setWorldDamage(s.world);
  view.ready = true;
}

// Glides characters toward their latest known positions. skip: the local
// player, who moves instantly on this device instead.
export function smoothView(view, dt, skip) {
  const k = 1 - Math.exp(-dt * 15);
  const glide = (e) => {
    if (e.tx === undefined) return;
    // Teleport if very far behind (e.g. just respawned)
    if (Math.hypot(e.tx - e.x, e.ty - e.y) > 120) {
      e.x = e.tx;
      e.y = e.ty;
      return;
    }
    e.x += (e.tx - e.x) * k;
    e.y += (e.ty - e.y) * k;
  };
  for (const p of view.players) if (p && p !== skip) glide(p);
  for (const z of view.zombies) glide(z);
  for (const a of view.shots) {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
  }
}
