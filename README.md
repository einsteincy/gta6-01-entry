# SOLMAR SUNSET — open-world crime in Solmar

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/einsteincy/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/einsteincy/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>

**SOLMAR SUNSET** is an open-world crime game in the spirit of GTA 6, built for make.fun's "Make GTA 6" bounty ($1,666 in USDC). You are Leo Marín, a getaway driver new to the sun-soaked coastal city of Solmar. Drive and steal cars, outrun the police, run story missions for the crew, and build a name for yourself.

## What is in the game

- **A city of its own** — Solmar: 8 named districts on a road grid, a beach and sea to the east, palms, lamps, signs, a day sky with a low sun.
- **On foot and by car** — third-person on foot (walk/run), chase-cam driving with arcade physics, enter and exit cars, steal parked and traffic cars.
- **Traffic and pedestrians** — cars driving the road network, pedestrians on the sidewalks.
- **Wanted system and police** — 1–5 stars for stealing, hitting pedestrians and shooting; police cars chase and ram, on-foot cops join at 2 stars, a helicopter with a searchlight hunts you at 4–5 stars, and roadblocks are thrown across the road ahead of you at 4–5 stars.
- **Story missions** — eight jobs with objectives, markers, dialogue, timers and cash rewards (click a mission on the title screen to play it): First Wheels, The Drop, Street Heat, Hot Pursuit, On the Clock, Vipers' Last Stand, Quiet Hands and Sunset Run. Each completed mission earns Respect.
- **Radio, shops and safehouse** — three synthesized in-car radio stations (Q to change station), a shop on Marlin Street for ammo, first aid, body armor and garage upgrades (B to open, the street keeps moving while you shop), and a safehouse that heals you.
- **A sun-soaked look** — bright sky-blue daylight, warm haze, cream and terracotta facades with sky-reflecting glass.
- **Combat** — a weapon wheel: pistol, SMG and shotgun, switched with 1/2/3, each with its own magazine and reserve ammo; enemies that fight back.
- **HUD and minimap** — health, cash, Respect, current weapon and ammo, wanted stars, speed, clock, the district you are in, mission objective, a live minimap, message feed.
- **Start and save** — title screen, pause menu, localStorage save (cash, missions, garage, Respect, garage upgrades).

## How to play

Open `game/index.html` in a desktop browser (or `node serve.ts`, then http://localhost:8080). WASD drive/walk, Shift run, E steal a car, F or click to shoot, 1/2/3 switch weapon, R reload, Space brake, Q radio, B shop, P pause, drag the mouse to look around. Click a mission on the title screen to play it. No network requests at runtime; three.js is vendored under `game/vendor/`.

## Structure

`game/src/` holds one file per job: `config`, `random`, `input`, `city`, `vehicles`, `player`, `traffic`, `police`, `combat`, `missions`, `hud`, `audio`, `save`, `radio`, `shop`, `shots`, `main`. `main.ts` (repo root) copies `game/` and `screenshots/` to the output and writes `dossier.json`. Screenshots are real renders of the game's own code, staged deterministically with `?shot=cover|drive|chase|mission&seed=7`.

All original: the city, characters, vehicles, names, story, art and sound are invented for this game — nothing from Rockstar Games.
