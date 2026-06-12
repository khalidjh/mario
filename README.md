# Mario 3D 🍄

A 3D Mario-style platformer that runs in any modern browser — **including mobile** —
built with [Three.js](https://threejs.org/). No build step, no dependencies to
install, no asset downloads: every texture, model and sound effect is generated
procedurally at runtime.

## Play it

The game must be served over HTTP (ES modules don't load from `file://`):

```bash
# any static server works, e.g.:
python3 -m http.server 8000
# or
npx serve .
```

Then open `http://localhost:8000` — on your phone, use your computer's LAN IP
(e.g. `http://192.168.1.20:8000`). It also works out of the box on GitHub Pages.

## Controls

| | Move | Jump |
|---|---|---|
| **Desktop** | WASD / Arrow keys | Space (hold for a higher jump) |
| **Mobile** | Drag anywhere on the left side (virtual joystick) | Tap the **A** button (hold = higher) |

## The game

One classic course: stomp goombas, bonk **?** blocks, smash bricks, cross a
sky section on moving platforms, pass the checkpoint, climb the staircase and
grab the flagpole. 3 lives, 300 seconds, ~45 coins to find.

## Why the physics feel good

The character controller is hand-tuned rather than a generic physics engine:

- **Variable jump height** — release the button early for a short hop
- **Asymmetric gravity** — floaty rise, snappy fall (the classic Mario arc)
- **Coyote time** (120 ms) — you can still jump just after running off a ledge
- **Jump buffering** (150 ms) — press jump slightly before landing and it still counts
- **Stomp bounces** — hold jump while stomping a goomba to bounce extra high
- **Acceleration + friction** ground movement with air control
- **Squash & stretch** + dust particles for landing impact feedback
- Moving platforms **carry the player** correctly (analytic platform velocity)
- Fixed-timestep physics substepping so fast falls never tunnel through platforms

## Mobile performance

- Pixel ratio capped at 2, MSAA disabled on high-DPI screens
- Single 1024px shadow map that follows the player
- Distance-culled enemy updates, fog-limited draw distance
- `viewport-fit=cover` + safe-area insets for notched phones

## Files

```
index.html      page, HUD, touch UI, overlays
js/main.js      renderer, camera, game loop, game state
js/player.js    player model + platformer character controller
js/level.js     level 1-1 layout, enemies, coins, platforms, scenery
js/input.js     keyboard + virtual joystick / jump button
js/textures.js  procedural pixel-art canvas textures
js/audio.js     WebAudio synthesized retro sound effects
```
