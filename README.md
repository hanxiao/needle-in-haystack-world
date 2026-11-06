# needle-in-haystack-world

A messy six-room apartment you explore as a 0.42 m rover with 360° vision and one arm. Everything has weight.

Live: <https://hanxiao.io/needle-in-haystack-world/>

## Stack

- three.js 0.187 (WebGL2, PBR, shadow maps, procedural textures)
- Rapier 0.21 (`@dimforge/rapier3d-compat`, WASM inlined) — rigid bodies, real kg masses, fixed-joint grasping, kinematic character controller
- Vite 8 + `vite-plugin-singlefile` → one self-contained `dist/index.html` (~4.9 MB, no external assets)

## Controls

| Input | Action |
| --- | --- |
| `W A S D` | drive (camera-relative) |
| `Shift` | boost |
| drag mouse | orbit camera |
| wheel | zoom |
| click / `Space` | grab, place, or push |
| `V` | first / third person |
| `C` | 360 feeds |
| `L` | day / night |
| `H` | toggle hint |
| `R` | reset |

Objects under 2.5 kg can be lifted. Heavier objects only get pushed — the sofa (85 kg), fridge (95 kg) and wardrobe (120 kg) barely move. A sewing needle (1.2 g) is hidden somewhere.

## Develop

```bash
npm install
npm run dev            # http://127.0.0.1:5173/
npm run build          # dist/index.html (single file)
npm run serve          # serve dist at http://127.0.0.1:4173/
node tools/shot.mjs http://127.0.0.1:4173/ qa/shots/page.png
```

## Deploy

Source lives here (private). The built single file is published into the public
`hanxiao/hanxiao.github.io` Pages repo under `needle-in-haystack-world/index.html`,
so it serves at `https://hanxiao.io/needle-in-haystack-world/` without touching the homepage.

```bash
node tools/deploy.mjs
```

## Layout

```
src/core/    engine: physics, materials, renderer, camera, config
src/world/   apartment shell, furniture, clutter (scene-smith)
src/robot/   rover model, drive controller, arm IK, 360 cameras (robot-smith)
src/ui/      lean HUD
src/main.js  input, fixed-step loop, interaction, QA hooks
qa/          automated functional + visual review
```
