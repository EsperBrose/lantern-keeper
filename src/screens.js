// Title screen, pause screen, game over screen and the saved best score.
const BEST_KEY = 'lanternKeeper.bestNights';
const FONT = (px) => `${px}px "Press Start 2P", monospace`;

// Browser storage can be unavailable (private mode, blocked), so never trust it.
export function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

// Saves nights if it beats the best. Returns true for a new record.
export function saveBest(nights) {
  if (nights <= loadBest()) return false;
  try {
    localStorage.setItem(BEST_KEY, String(nights));
  } catch {
    // Not saved, but still a record for this session.
  }
  return true;
}

function outlined(ctx, text, x, y, size, color) {
  ctx.font = FONT(size);
  ctx.lineWidth = Math.max(3, size / 4);
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function drawTitle(ctx, w, h, best, time) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 10, 20, 0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  const size = Math.min(40, Math.floor(w / 15));
  const bob = Math.round(Math.sin(time * 2) * 3);
  outlined(ctx, 'LANTERN', w / 2, h * 0.2 + bob, size, '#ffd25a');
  outlined(ctx, 'KEEPER', w / 2, h * 0.2 + size * 1.3 + bob, size, '#ffd25a');
  outlined(ctx, 'Build by day. Survive the night.', w / 2, h * 0.2 + size * 2.4, 10, '#e8e2d0');
  if (best > 0) {
    outlined(ctx, `Best: ${best} night${best === 1 ? '' : 's'}`, w / 2, h * 0.2 + size * 2.4 + 22, 9, '#7fd8ff');
  }
  ctx.restore();
}

// A message in the middle of the screen (e.g. "Connecting...").
export function drawMessage(ctx, w, h, text, sub) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  outlined(ctx, text, w / 2, h / 2, 14, '#ffffff');
  if (sub) outlined(ctx, sub, w / 2, h / 2 + 26, 9, '#bfc6d0');
  ctx.restore();
}

export function drawPaused(ctx, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  outlined(ctx, 'PAUSED', w / 2, h / 2 - 10, 28, '#ffffff');
  outlined(ctx, 'Press P or tap to resume', w / 2, h / 2 + 24, 10, '#bfc6d0');
  ctx.restore();
}

export function drawGameOver(ctx, w, h, nights, best, newBest, prompt = 'Press Enter or tap to try again') {
  ctx.save();
  ctx.fillStyle = 'rgba(20, 0, 0, 0.6)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  outlined(ctx, 'The zombies got you', w / 2, h / 2 - 20, Math.min(24, Math.floor(w / 22)), '#ff6b5a');
  outlined(ctx, `You survived ${nights} night${nights === 1 ? '' : 's'}`, w / 2, h / 2 + 16, 12, '#ffd98a');
  if (newBest) outlined(ctx, 'NEW BEST!', w / 2, h / 2 + 40, 12, '#7fd8ff');
  else outlined(ctx, `Best: ${best}`, w / 2, h / 2 + 40, 10, '#7fd8ff');
  outlined(ctx, prompt, w / 2, h / 2 + 70, 10, '#bfc6d0');
  ctx.restore();
}

// Small pause button for touch screens, top-right corner.
export function pauseButtonRect(w) {
  return { x: w - 46, y: 10, w: 36, h: 36 };
}

export function drawPauseButton(ctx, w) {
  const r = pauseButtonRect(w);
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(r.x + 11, r.y + 9, 5, 18);
  ctx.fillRect(r.x + 20, r.y + 9, 5, 18);
  ctx.restore();
}
