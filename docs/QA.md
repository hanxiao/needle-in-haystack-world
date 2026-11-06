# QA guide — needle-in-haystack-world

Two reviewers run in parallel: **functional** (behaviour/physics/perf/build) and **visual** (realism/lighting/UI/room
composition). Reviewers do not edit `src/**`; they write tests, screenshots and reports under `qa/**`, and send the
Lead a concise findings list. The Lead fixes and asks for a re-run.

## Build & serve

```bash
npm run build                 # -> dist/index.html (single file)
node tools/serve.mjs          # http://127.0.0.1:4173/
node tools/shot.mjs http://127.0.0.1:4173/ qa/shots/x.png 4000
```

Puppeteer-core is installed; local Chrome is at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
Headless Chrome uses the real Apple M2 Metal GPU (`ANGLE Metal Renderer`) at 60 fps. Use:

```js
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900 },
});
```

The app is a single HTML with inline JS/WASM: it must also work from `file://`.

## Debug API (`window.__APP__`)

| call | returns |
| --- | --- |
| `ready` | true after first rendered frame |
| `fps`, `frame` | live counters |
| `state()` | room, robot pos/yaw/held/mode, physics counts, drawCalls, triangles, HUD text, errors |
| `qa.object(name)` | `{ name, mass, static, pos, tags, room, grabbable }` |
| `qa.objects()` | all objects |
| `qa.teleport(x, z, yaw)` / `qa.setPose([x,y,z], yaw)` | move robot (feet position) |
| `qa.teleportNear(name, dist)` | put robot `dist` m from an object, facing it |
| `qa.aimAt(name)` / `qa.aimAtPoint([x,y,z])` | point arm/camera at object |
| `qa.grabByName(name)` | `{ ok, reason, held }` (no Rapier objects) |
| `qa.action()` | same as click: grab / place / push |
| `qa.release()` | drop held |
| `qa.press(code, ms)` / `qa.hold(code)` / `qa.releaseKey(code)` | drive keys |
| `qa.setView('third'|'first')`, `qa.look(yaw,pitch)` | camera mode |
| `qa.setCamera(yaw,pitch,dist)` | third-person orbit pose |
| `qa.setSurround(bool)`, `qa.setNight(bool)`, `qa.reset()` | toggles |
| `qa.hudRects()` | HUD viewport rects in CSS px |
| `qa.hudText()` | room / target / held / hint strings |
| `qa.sampleMain(rect)` / `qa.sampleHud(rect)` | `{ litRatio, mean }` via WebGL readPixels |
| `qa.cameraInfo()` | main camera mode/pos/quat/fov |
| `qa.drawCalls()` | renderer stats |
| `qa.settle(ms)` | await timeout helper |

`window.__APP__.errors` accumulates runtime errors.

## Targeting model (v3)

Third person is pointer-based: the mouse cursor aims, the highlight ring/target label follows the pointer, and the
selection ray goes from the camera through the pointer. In first person the centre crosshair is used. QA helpers:
`qa.screenOf(name)` → projected screen position, `qa.pointerAt(x,y)` → move the virtual pointer, `qa.raycast()` →
what is under the pointer. `qa.aimAt(name)` also sets the pointer after the camera settles.

## Known gaps (v3, accepted)

- Arm/gripper has no solid collision (visual arm may pass through a tabletop; no physics effect).
- First person hides the whole robot model (no visible arm in FP).
- Arm always follows the aim point; no park pose in normal play.
- Minimap top camera covers ~3.4 m half-width and has a robot dot/heading; it is a perspective top view, not a
  stitched bowl.
- Some furniture remains stylised/low-poly; the apartment is intentionally readable rather than photoreal.

## Acceptance gates

1. No console errors/warnings; no failed requests; no network beyond the HTML itself.
2. Single-file build 3–9 MB; loads in ≤ 8 s; ≥ 50 fps at 1440×900 on M2.
3. WASD + boost drive; mouse orbit/zoom; click grabs a liftable object, click places it; heavy objects refuse with mass shown.
4. 360 panels + minimap show live scene (not black/white); robot hidden from feeds.
5. Objects settle without jitter; stacked items stay stacked; no floating/clipping.
6. Masses are realistic and visible: sofa 85 kg / fridge 95 / bed 75 / wardrobe 120 immovable by arm; mug 0.32 / laptop 1.6 / needle 1.2 g liftable.
7. All six rooms reachable, furnished, plausible lived-in mess; no visible holes/z-fighting.
8. UI is lean, monospace, no prose paragraphs; no layout overflow at 390×844.
9. Live URL serves the same build marker.

## Report format

`qa/reports/functional.md`, `qa/reports/visual.md`:

```
# round N — <date>
PASS/FAIL table: gate | result | evidence (numbers, screenshot path)
Bugs: [P0/P1/P2] description + repro steps + expected/actual
Top 5 visual issues with screenshot paths
Verdict: SHIP / FIX
```

Screenshots: `qa/functional/shots/`, `qa/visual/shots/`.
