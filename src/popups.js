// Floating "+1" pickups and the small pixel item icons used in the HUD.
const ICONS = {
  wood: {
    palette: { a: '#8a5a2b', b: '#6b4423', c: '#c9a27a', d: '#a77b4f' },
    rows: ['.bbbbb.', 'bacdcab', 'bcdddcb', 'bacdcab', '.bbbbb.', '.aaaaa.', '.aaaaa.'],
  },
  stone: {
    palette: { a: '#a3a8ae', b: '#7b8086', c: '#5e6267' },
    rows: ['..aaa..', '.aaaab.', 'aaabbbb', 'abbbcbb', 'bbcbbbb', '.bbbbc.', '..ccc..'],
  },
  skull: {
    palette: { a: '#e8e8e0', b: '#1a1a1a' },
    rows: ['.aaaaa.', 'aaaaaaa', 'abbabba', 'abbabba', 'aaaaaaa', '.aabaa.', '.a.a.a.'],
  },
};

export function drawIcon(ctx, name, x, y, px) {
  const icon = ICONS[name];
  icon.rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const color = icon.palette[row[c]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + c * px, y + r * px, px, px);
    }
  });
}

export function createPopups() {
  return [];
}

export function addPopup(list, x, y, text, icon) {
  list.push({ x, y, text, icon, t: 0.9 });
}

export function updatePopups(list, dt) {
  for (const p of list) {
    p.t -= dt;
    p.y -= dt * 24;
  }
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].t <= 0) list.splice(i, 1);
  }
}

export function drawPopups(ctx, list) {
  ctx.save();
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  for (const p of list) {
    ctx.globalAlpha = Math.min(1, p.t * 2);
    drawIcon(ctx, p.icon, p.x - 14, p.y - 7, 1.2);
    ctx.fillStyle = '#000000';
    ctx.fillText(p.text, p.x - 3, p.y + 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(p.text, p.x - 4, p.y);
  }
  ctx.restore();
}
