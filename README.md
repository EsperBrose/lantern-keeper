# 🏮 Lantern Keeper

A blocky browser survival base-builder.

☀️ **By day** the forest is bright and safe — chop trees, mine stone and build your base.
🌙 **By night** you light your lantern and zombies pour out of the dark to attack you and your base. Survive until sunrise — the sun burns them away. Every night is harder than the last.

## ▶️ Play

**https://esperbrose.github.io/lantern-keeper/** — works on desktop and phones, nothing to install.

### 👥 2-player online (each on your own device)

1. One player opens the game and taps **Host 2-player** — a 4-letter room code appears.
2. The other player opens the game on their own phone or computer, taps **Join 2-player** and types the code.
3. You share one base and one pile of wood and stone. Zombies chase whoever is closest. If you get knocked out you come back at sunrise — it's only game over if you're **both** down.

The two devices connect directly (WebRTC via [PeerJS](https://peerjs.com/)); PeerJS's free public server just helps them find each other. Some strict school or work networks block this — home Wi-Fi and phone data usually work.

## 🎮 Controls

| Action | Keyboard / mouse | Phone |
|---|---|---|
| Move | WASD / arrow keys | Drag anywhere |
| Swing axe (chop, mine, fight) | Space / J / click | AXE button |
| Build | 1–5 or B, then click / Space (hold to paint walls) | Tap a hotbar slot, then PLACE |
| Remove a block (half refund) | X while building | — |
| Pause | P / Esc | Pause button (top right) |
| Sound on/off | M | — |
| Start / restart | Enter | Tap |

## 🧱 What you can build (daytime only)

| # | Build | Cost | What it does |
|---|---|---|---|
| 1 | Wood wall | 4 wood | Blocks zombies (60 HP) |
| 2 | Stone wall | 3 stone | Blocks zombies (160 HP) |
| 3 | 🏹 Arrow tower | 10 wood + 5 stone | Shoots arrows at the nearest zombie |
| 4 | ⚡ Electric gun | 6 wood + 14 stone | Chain lightning hits up to 4 zombies; its orb lights up the night |
| 5 | 🔥 Campfire | 8 wood + 2 stone | Heals you while you stand near it; lights up the night |

You start with 100 wood and 100 stone.

## 🧟 Zombies

- **Walkers** — the classic shambling horde.
- **Runners** (from night 2) — fast but fragile.
- **Brutes** (from night 3) — big, tough, bite harder and smash walls 3× faster.

Your best score (most nights survived) is saved in your browser.

## 🛠️ Tech

Plain HTML5 Canvas + JavaScript modules — no build step, no dependencies. Sounds are synthesized with Web Audio. Lint runs in GitHub Actions and every merge to `main` deploys to GitHub Pages. See [PLAN.md](PLAN.md) for how it was built, milestone by milestone.
