// Keyboard (WASD / arrows, Space/J to swing), mouse click to swing,
// and on touch screens a floating joystick plus an axe button.
const keys = new Set();
const touch = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
const JOY_RADIUS = 50;
const BUTTON_RADIUS = 38;
let attackTouchId = null;
let mouseDown = false;
let isTouch = false;
const pressed = new Set(); // keys pressed since last consumeKey
const mouse = { x: 0, y: 0, active: false };
let tapHandler = () => false;

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (!e.repeat) pressed.add(k);
  keys.add(k);
  if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault();
});

// Returns true once per press of key k.
export function consumeKey(k) {
  return pressed.delete(k);
}

// Screen position of the mouse, if it is being used.
export function mousePos() {
  return mouse;
}

// handler(x, y) is called on every click/tap first; return true to swallow it.
export function onTap(handler) {
  tapHandler = handler;
}

export function setAttackLabel(label) {
  attackLabel = label;
}
let attackLabel = 'AXE';
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => {
  keys.clear();
  mouseDown = false;
});

function buttonPos() {
  return { x: window.innerWidth - 70, y: window.innerHeight - 80 };
}

export function attachTouch(el) {
  el.addEventListener('pointerdown', (e) => {
    if (tapHandler(e.clientX, e.clientY)) return;
    if (e.pointerType === 'mouse') {
      mouseDown = true;
      return;
    }
    isTouch = true;
    mouse.active = false;
    const b = buttonPos();
    if (Math.hypot(e.clientX - b.x, e.clientY - b.y) < BUTTON_RADIUS + 12) {
      attackTouchId = e.pointerId;
      return;
    }
    if (touch.active) return;
    touch.active = true;
    touch.id = e.pointerId;
    touch.ox = touch.x = e.clientX;
    touch.oy = touch.y = e.clientY;
  });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }
    if (e.pointerId !== touch.id) return;
    touch.x = e.clientX;
    touch.y = e.clientY;
  });
  const end = (e) => {
    if (e.pointerType === 'mouse') mouseDown = false;
    if (e.pointerId === attackTouchId) attackTouchId = null;
    if (e.pointerId !== touch.id) return;
    touch.active = false;
    touch.id = null;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

export function isTouchDevice() {
  return isTouch;
}

export function attackHeld() {
  return keys.has(' ') || keys.has('j') || mouseDown || attackTouchId !== null;
}

// Returns a movement vector with length <= 1.
export function moveVector() {
  let x = 0;
  let y = 0;
  if (keys.has('a') || keys.has('arrowleft')) x -= 1;
  if (keys.has('d') || keys.has('arrowright')) x += 1;
  if (keys.has('w') || keys.has('arrowup')) y -= 1;
  if (keys.has('s') || keys.has('arrowdown')) y += 1;

  if (touch.active) {
    const dx = touch.x - touch.ox;
    const dy = touch.y - touch.oy;
    const len = Math.hypot(dx, dy);
    if (len > 6) {
      const k = Math.min(len, JOY_RADIUS) / JOY_RADIUS / len;
      return { x: dx * k, y: dy * k };
    }
  }

  const len = Math.hypot(x, y);
  return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
}

export function drawTouchControls(ctx) {
  if (!isTouch) return;
  ctx.save();
  // Axe button
  const b = buttonPos();
  ctx.globalAlpha = attackTouchId !== null ? 0.8 : 0.5;
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(b.x - BUTTON_RADIUS, b.y - BUTTON_RADIUS, BUTTON_RADIUS * 2, BUTTON_RADIUS * 2);
  ctx.strokeStyle = '#ffd98a';
  ctx.lineWidth = 3;
  ctx.strokeRect(b.x - BUTTON_RADIUS, b.y - BUTTON_RADIUS, BUTTON_RADIUS * 2, BUTTON_RADIUS * 2);
  ctx.fillStyle = '#ffd98a';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(attackLabel, b.x, b.y + 5);

  if (touch.active) {
    const dx = touch.x - touch.ox;
    const dy = touch.y - touch.oy;
    const len = Math.hypot(dx, dy);
    const k = len > JOY_RADIUS ? JOY_RADIUS / len : 1;
    ctx.globalAlpha = 0.35;
    ctx.strokeRect(touch.ox - JOY_RADIUS, touch.oy - JOY_RADIUS, JOY_RADIUS * 2, JOY_RADIUS * 2);
    ctx.fillRect(touch.ox + dx * k - 16, touch.oy + dy * k - 16, 32, 32);
  }
  ctx.restore();
}
