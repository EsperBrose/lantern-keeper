// The game simulation: players, zombies, building, towers, day/night.
// Runs on the solo player's device, or on the host's device in online co-op.
// It never draws or plays sounds itself — it records events (g.events) that the
// device(s) turn into sounds and particles.
import { createBase, updateStructures, collide, damage } from './structures.js';
import { createBuild, handleKeys, updateTarget, tryPlace, tryDemolish, updateBuild } from './build.js';
import { updateTowers, updateBolts, campfireHeal } from './towers.js';
import { createPlayer, updatePlayer, trySwing, swingPoint } from './player.js';
import { resetWorld, updateWorld, nodesNear, hitNode } from './world.js';
import { createPopups, addPopup, updatePopups } from './popups.js';
import { createSpawner, updateSpawner, updateZombies, biteLoad, igniteAll } from './zombies.js';
import { createCycle, updateCycle, isNight, phaseName } from './daynight.js';

const BITE_DPS = 18; // damage per second per zombie touching you
const WALL_SMASH_DPS = 12; // damage per second a blocked zombie does to a wall
const NO_MOUSE = { active: false };

// One frame of controls for one player.
export const IDLE_INPUT = { mx: 0, my: 0, atk: false, keys: [], target: null };

export function createGame(numPlayers) {
  const g = {
    players: [],
    zombies: [],
    spawner: createSpawner(),
    cycle: createCycle(),
    inv: { wood: 100, stone: 100 }, // start with enough to build a base
    kills: 0,
    popups: createPopups(),
    base: createBase(),
    shots: [],
    bolts: [],
    time: 0,
    over: false,
    events: [],
    nextZombieId: 1,
  };
  for (let i = 0; i < numPlayers; i++) {
    const p = createPlayer(i);
    p.build = createBuild();
    g.players.push(p);
  }
  resetWorld();
  g.cycle.banner = { text: 'Day 1', sub: 'Gather and build before night falls', color: '#ffd98a', t: 3 };
  return g;
}

function sound(g, name) {
  g.events.push({ sfx: name });
}

function particles(g, x, y, kind, n) {
  g.events.push({ burst: [Math.round(x), Math.round(y), kind, n] });
}

// One axe swing: hits zombies in front of the player and the nearest tree or rock.
function swingAxe(g, p) {
  const sp = swingPoint(p);
  sound(g, 'swing');
  for (const z of g.zombies) {
    if (z.burn !== undefined || z.dead) continue;
    if (Math.hypot(z.x - sp.x, z.y - 6 - sp.y) > 24) continue;
    z.hp -= 1;
    z.hurt = 0.12;
    z.x += p.aimX * 14;
    z.y += p.aimY * 14;
    particles(g, z.x, z.y - 10, 'zombie', 4);
    sound(g, 'hit');
    if (z.hp <= 0) {
      z.dead = true;
      g.kills++;
    }
  }

  const nodes = nodesNear(sp.x, sp.y + 6, 26);
  if (nodes.length === 0) return;
  nodes.sort((a, b) => Math.hypot(a.x - sp.x, a.y - sp.y) - Math.hypot(b.x - sp.x, b.y - sp.y));
  const n = nodes[0];
  const destroyed = hitNode(n);
  const res = n.kind === 'tree' ? 'wood' : 'stone';
  const gain = destroyed ? 3 : 1;
  g.inv[res] += gain;
  addPopup(g.popups, n.x, n.y - 24, `+${gain}`, res);
  particles(g, n.x, n.y - 8, res, destroyed ? 14 : 5);
  sound(g, res === 'wood' ? 'chop' : 'mine');
}

function updateOnePlayer(g, p, inp, dt) {
  updatePlayer(p, { x: inp.mx, y: inp.my }, dt);
  // An online friend moves on their own device (so it feels instant) and
  // tells us where they are; trust it unless it's an impossible jump.
  if (inp.pos && Math.hypot(inp.pos.x - p.x, inp.pos.y - p.y) < 80) {
    p.x = inp.pos.x;
    p.y = inp.pos.y;
  }
  collide(g.base, p, 7);

  // Building (day and sunset only) or swinging the axe
  const b = p.build;
  handleKeys(b, (k) => inp.keys.includes(k));
  updateBuild(b, dt);
  if (inp.target) b.target = inp.target;
  else updateTarget(b, p, NO_MOUSE, null);
  if (b.on) {
    const phase = phaseName(g.cycle);
    const before = g.base.list.length;
    if (inp.atk) tryPlace(b, g.base, g.inv, p, phase === 'day' || phase === 'dusk');
    if (g.base.list.length > before) sound(g, 'place');
    if (inp.keys.includes('x')) tryDemolish(b, g.base, g.inv);
  } else if (inp.atk && trySwing(p)) {
    swingAxe(g, p);
  }
}

// Advances the game by dt. inputs[i] is player i's controls this frame.
// viewRadius: how far from a player zombies should spawn (just off-screen).
export function stepGame(g, inputs, dt, viewRadius) {
  if (g.over) return;
  g.time += dt;

  const started = updateCycle(g.cycle, dt);
  if (started === 'dawn') {
    igniteAll(g.zombies);
    sound(g, 'dawn');
    // Knocked-out players get back up at sunrise.
    for (const p of g.players) {
      if (!p.down) continue;
      p.down = false;
      p.hp = p.maxHp / 2;
    }
  }
  if (started === 'night') {
    g.spawner.timer = 0;
    sound(g, 'night');
  }
  updateWorld(dt);
  updatePopups(g.popups, dt);

  g.players.forEach((p, i) => {
    if (!p.down) updateOnePlayer(g, p, inputs[i] || IDLE_INPUT, dt);
  });
  const alive = g.players.filter((p) => !p.down);

  if (isNight(g.cycle) && alive.length > 0) {
    const target = alive[Math.floor(Math.random() * alive.length)];
    updateSpawner(g.spawner, g.zombies, target, g.cycle.day, viewRadius, dt);
    for (const z of g.zombies) if (!z.id) z.id = g.nextZombieId++;
  }
  updateZombies(g.zombies, alive, dt);

  // Walls block zombies; blocked zombies smash the wall in their way.
  for (const z of g.zombies) {
    if (z.burn !== undefined) continue;
    const hits = collide(g.base, z, z.r - 2);
    if (hits.length > 0) damage(hits[0], WALL_SMASH_DPS * z.wall * dt);
  }
  for (const st of g.base.list) {
    if (st.hp > 0) continue;
    particles(g, st.x, st.y - 6, 'wall', 14);
    sound(g, 'break');
  }
  updateStructures(g.base, dt);

  const shotsBefore = g.shots.length;
  const boltsBefore = g.bolts.length;
  g.kills += updateTowers(g.base, g.zombies, g.shots, g.bolts, dt);
  if (g.shots.length > shotsBefore) sound(g, 'arrow');
  if (g.bolts.length > boltsBefore) sound(g, 'zap');
  updateBolts(g.bolts, dt);

  // Death poofs for zombies killed this frame (burning ones just fade away).
  for (const z of g.zombies) {
    if (!z.dead || z.burn !== undefined) continue;
    particles(g, z.x, z.y - 10, 'zombie', z.kind === 'brute' ? 16 : 9);
    sound(g, 'kill');
  }
  g.zombies = g.zombies.filter((z) => !z.dead);

  for (const p of alive) {
    const biting = biteLoad(g.zombies, p);
    if (biting > 0) {
      p.hp -= biting * BITE_DPS * dt;
      p.hurtFlash = 0.25;
      sound(g, 'hurt');
    }
    campfireHeal(g.base, p, dt);
    if (p.hp <= 0) {
      p.hp = 0;
      p.down = true;
      p.build.on = false;
    }
  }
  if (g.players.every((p) => p.down)) {
    g.over = true;
    sound(g, 'over');
  }

  // Forget zombies that wandered far from everyone.
  const far = viewRadius * 3;
  const standing = g.players.filter((p) => !p.down);
  g.zombies = g.zombies.filter((z) =>
    standing.some((p) => Math.hypot(z.x - p.x, z.y - p.y) < far),
  );
}
