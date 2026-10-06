// Keyboard (WASD / arrows) and a floating touch joystick.
const keys = new Set();
const touch = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
const JOY_RADIUS = 50;

window.addEventListener('keydown', (e) => {
  keys.add(e.key.toLowerCase());
  if (e.key.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

export function attachTouch(el) {
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || touch.active) return;
    touch.active = true;
    touch.id = e.pointerId;
    touch.ox = touch.x = e.clientX;
    touch.oy = touch.y = e.clientY;
  });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerId !== touch.id) return;
    touch.x = e.clientX;
    touch.y = e.clientY;
  });
  const end = (e) => {
    if (e.pointerId !== touch.id) return;
    touch.active = false;
    touch.id = null;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
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

export function drawJoystick(ctx) {
  if (!touch.active) return;
  const dx = touch.x - touch.ox;
  const dy = touch.y - touch.oy;
  const len = Math.hypot(dx, dy);
  const k = len > JOY_RADIUS ? JOY_RADIUS / len : 1;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#ffd98a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(touch.ox, touch.oy, JOY_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath();
  ctx.arc(touch.ox + dx * k, touch.oy + dy * k, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
