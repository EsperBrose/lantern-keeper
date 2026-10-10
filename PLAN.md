# Lantern Keeper — Plan

A browser survival base-builder. By **day** it's bright and safe: gather wood and stone and build your base — walls, arrow towers and electric guns. At **night** you light your lantern and zombies pour out of the forest to attack you and your base. Survive until sunrise; every night is harder. Score = nights survived.

**Tech:** HTML5 Canvas + vanilla JS (ES modules), hosted on GitHub Pages, linted in GitHub Actions.

## Phase 1 — Core
- [x] M1. Repo setup: README, PLAN.md, canvas page, Pages deploy + lint CI
- [x] M2. The wanderer: move with WASD/arrows/touch, forest, lantern light
- [x] M3. Zombies spawn and chase you; health + game over

## Phase 2 — Day, night and building
- [x] M4. Day/night cycle: game starts in daytime, sunset → night (zombies come) → sunrise (leftover zombies burn); night counter
- [x] M5a. Boxy look: Minecraft-style blocky grass, trees, stone, characters, pixel hearts and pixel font
- [x] M5. Fight back + gather: swing an axe (Space/tap) to kill zombies, chop trees for wood, mine rocks for stone; inventory HUD
- [x] M6. Build your base: build menu, place wood and stone walls; zombies must smash through them
- [x] M7. Arrow tower: auto-shoots arrows at the nearest zombie
- [x] M8. Electric gun: tesla tower that zaps zombies with chain lightning

## Phase 3 — Challenge and polish
- [x] M9. Harder nights + new zombies (fast runners, wall-smashing brutes); campfire that heals
- [ ] M10. Title screen, pause, best score (most nights survived)
- [ ] M11. Sounds, particles, mobile build controls, balance, final README
