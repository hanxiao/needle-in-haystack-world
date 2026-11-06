# needle-in-haystack-world — build contract (v1)

A 3D apartment you explore as a small robot. three.js + Rapier (WASM), one self-contained HTML.
Read this before writing code. `docs/CONTRACT.md` is frozen for v1; propose changes to the Lead.

## Stack
- three.js `0.187.0` — WebGL renderer, PBR materials, GPU shadows.
- `@dimforge/rapier3d-compat` `0.21.0` — rigid bodies, joints, character controller. WASM is inlined.
- Vite 8 + `vite-plugin-singlefile` → `dist/index.html` (single file, relative `base: './'`).
- Vanilla ES modules, no framework. Node 22. QA uses `puppeteer-core` with local Chrome.

## World
- Y up, meters, floor at `y = 0`, ceiling `2.7`.
- Outer shell `x ∈ [-5.6, 5.6]`, `z ∈ [-3.8, 3.8]`, wall thickness `0.12`.
- Rooms (interior, approximate):
  - `living` — `x [-5.6, 0.2]`, `z [-3.8, 0.7]`
  - `kitchen` — `x [0.2, 5.6]`, `z [-3.8, 0.7]` (open plan dining + kitchen)
  - `bedroom` — `x [-5.6, -1.4]`, `z [0.7, 3.8]`
  - `hallway` — `x [-1.4, 0.6]`, `z [0.7, 3.8]`
  - `bathroom` — `x [0.6, 2.8]`, `z [0.7, 3.8]`
  - `study` — `x [2.8, 5.6]`, `z [0.7, 3.8]`
  - Doorways ≥ `0.8 m` wide, no closed doors. Windows on outer walls.
- Spawn: living room `(-3.6, 0, -1.2)`, yaw `0` (facing −Z).

## Object conventions (important)
- One `Obj` = one `THREE.Object3D` mesh + one Rapier rigid body with 1..n colliders.
- **Mesh local origin = rigid-body origin.** Build geometry centered on the body origin (bounding-box center).
  `pos` is the body origin in world space, so an object resting on floor has `y = height / 2`.
- Colliders are in the same local space (`offset`, `quat`). Compound shapes are expected for furniture.
- Real masses in kg are mandatory for dynamic objects. Do not use density to fake weight.
- No initial interpenetration; stack objects with a `0.002` gap and let physics settle.
- Materials: `ctx.materials.get(name)` (shared, never mutate) or `ctx.materials.variant(name, overrides)`.

## Physics API — `src/core/physics.js` (Lead)
```js
ctx.physics.addObject({
  name,                    // unique string, used by HUD + QA
  mesh,                    // THREE.Object3D, local origin at body origin
  pos: [x, y, z],
  quat: [x, y, z, w],      // optional
  colliders: Collider[],   // required, >= 1
  mass,                    // kg, required when static:false
  material: 'wood',        // friction/restitution preset key
  static: false,
  tags: ['furniture'],
  room: 'living',
  grabbable: true,         // optional override; default mass <= 2.5
  linearDamping, angularDamping, ccd,
}) -> Obj

Collider =
  { shape:'box', half:[hx,hy,hz], offset?:[x,y,z], quat?:[x,y,z,w] }
| { shape:'ball', radius, offset?, quat? }
| { shape:'cylinder', halfHeight, radius, offset?, quat? }
| { shape:'capsule', halfHeight, radius, offset?, quat? }
| { shape:'hull', points:[x,y,z, ...], offset?, quat? }

physics.addStaticObject(opts)       // same, static:true, mass ignored; mesh optional
physics.addStaticBox({name,size:[w,h,d],pos,quat?,material,room,tags}) // convenience
physics.castRay(origin, dir, maxToi, exclude?) -> { obj, point:Vector3, normal:Vector3, distance } | null
physics.world                       // raw Rapier world
physics.RAPIER                      // raw Rapier namespace
physics.objects                     // Obj[] (creation order)
physics.dynamicObjects              // Obj[]
physics.removeObject(obj)
```
`Obj = { name, mesh, body, colliders, mass, isStatic, tags, room, grabbable }`.
Physics steps and mesh sync are driven by `main.js`; builders never step the world.

## Materials API — `src/core/materials.js` (Lead)
`ctx.materials.get(name)` / `ctx.materials.variant(name, { color, roughness, metalness, map? })`.
Available: `wallPaint, wallAccent, woodFloor, woodLight, woodDark, woodWarm, fabricSofa, fabricLinen,
fabricWool, fabricRug, leather, metalBrushed, metalDark, metalChrome, brass, glass, glassFrosted,
ceramicWhite, ceramicSage, ceramicClay, plasticWhite, plasticDark, paper, cardboard, plantLeaf,
plantSoil, concrete, tileFloor, tileWall, mirror, screen, lampShade, bulbWarm, water, rubber, foam,
stone, terracotta, bookCloth, denim, cotton, bookPage`.
All textures are procedural (canvas); no external assets, no network requests.

## Scene API — `src/world/index.js` (scene-smith)
```js
export function buildWorld(ctx) -> {
  rooms: [{ id, label, bounds:{minX,maxX,minZ,maxZ}, center:[x,y,z] }],
  objects: Obj[],
  spawn: { pos:[x,y,z], yaw },
}
```
Owned files: `src/world/index.js`, `src/world/apartment.js`, `src/world/furniture.js`,
`src/world/clutter.js`, `src/world/helpers.js`. Do not edit files outside `src/world/`.
Requirements:
- Shell: floor, ceiling, walls with doorways/windows, baseboards, window frames + glass, curtains,
  ceiling fixtures. Static.
- Furniture: sofa, coffee table, TV + stand, rug, armchair, bookshelf, floor lamp, dining table + 4 chairs,
  kitchen counter/cabinets, sink, stove, fridge, bed, nightstand, wardrobe, bathroom fixtures,
  desk + chair, shelves, coat rack. Heavy items dynamic with real mass; built-ins static.
- Clutter: 90+ small dynamic objects, many **on** other objects (mugs on coffee table, books on shelf,
  plates in sink, clothes on chair/floor). Slightly rotated/tipped for a lived-in look; no interpenetration.
- Must include these exact names (QA depends on them):
  `sofa, coffee_table, tv, rug, bookshelf, dining_table, chair_1, fridge, bed, wardrobe, desk,
   mug_white, book_stack_1, laptop, plant_monstera, needle`
- Messy but plausible: a few things tipped over, papers on floor, clothes draped, blanket half off bed.
- Performance: merge repeated static geometry where cheap; target < 450 draw calls main view.

## Robot API — `src/robot/robot.js` (robot-smith)
```js
export function createRobot(ctx) -> Robot
Robot = {
  group,                      // THREE.Group added to ctx.scene
  cameras: { front, back, left, right, top }, // PerspectiveCameras, children of robot
  arm: { maxLiftKg: 2.5, reach: 0.62, held: Obj|null },
  update(dt, input),          // input: { move:[x,z] world dir, lookYaw, lookPitch, aim:Vector3|null, boost }
  grab(obj) -> { ok, reason? },   // fixed joint to kinematic gripper
  release(),                  // drop held object
  canReach(point) -> bool,
  getState() -> { pos:[x,y,z], yaw, held, grounded, speed },
  setPose(pos, yaw),          // teleport for QA
  setVisible(v),
}
```
Owned files: `src/robot/**`. Do not edit files outside `src/robot/`.
- Small rover ~0.42 m tall, 4 wheels, head camera ring, 2-link arm + gripper. Procedural meshes only.
- Movement: Rapier `KinematicCharacterController` (offset 0.02, autostep 0.18, snap 0.12,
  apply impulses to dynamic bodies, character mass 9 kg). Max speed 1.1 m/s, 1.7 boost.
- Arm IK: yaw base + 2-bone IK to aim point clamped to `reach`; gripper is a kinematic-position body.
  Grab = fixed joint, anchor at current relative pose. Refuse if `obj.mass > maxLiftKg` or unreachable.
- Cameras: front/back/left/right `fov 120`, aspect `4/3`, near `0.02`, far `40`; top camera above robot
  looking down `fov 75`, aspect `1`. Cameras must keep working when `group.visible = false` (HUD pass).
- Robot must not self-collide with held object (collision groups) and must not explode against walls.
- `setPose` teleports body + mesh + gripper safely (no physics launch).

## Integration (Lead)
- `main.js` owns input, fixed-step loop (1/60, max 3 substeps), third-person camera + first-person toggle,
  raycast selection, mass rules, push impulse for heavy objects, HUD updates, HUD viewport rendering,
  debug API `window.__APP__` and `window.__APP__.qa.*` for automated QA.
- 360 HUD: 2×2 grid bottom-left (F/R/B/L), top-down minimap top-right. Rendered with scissor viewports at
  20 Hz; robot hidden during HUD pass. Lean monospace UI, short labels, no prose.

## Acceptance gates (reviewers)
1. No console errors/warnings (except none), no network requests beyond the HTML itself.
2. Loads in ≤ 8 s on the built single file; steady ≥ 50 fps on Apple M2 at 1440×900.
3. WASD drives, mouse orbits, click grabs liftable object, click places it, heavy object refuses with mass shown.
4. 360 panels + minimap render live scene, not black; robot hidden from HUD pass.
5. Objects settle without jitter; stacked objects stay stacked; no floating/clipping.
6. Realistic masses visible in HUD; sofa/fridge/bed effectively immovable by hand; mug/book/laptop liftable.
7. Rooms: all six reachable; visual variety; lived-in mess; no obvious z-fighting.
8. Live URL `https://hanxiao.io/needle-in-haystack-world/` serves the same build.

## Commands
`npm run dev` (Vite), `npm run build` (dist/index.html), `npm run serve` (dist at :4173),
`node tools/shot.mjs <url> <out.png>` (headless Chrome screenshot + smoke info).
