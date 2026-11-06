# round 1 — functional QA — 2026-11-06 06:12:54Z

Build: `dist/index.html` sha256 `b9a6449261dc2b7d`, 4.99 MB (5236799 bytes), mtime 2026-11-06T06:08:51.911Z
Environment: headless Chrome (Apple M2 Metal), 1440x900, Node v22.22.3, server http://127.0.0.1:4181/
Suite: `node qa/functional/run.mjs` — 57 gates, 54 passed, 3 failed (P0 1, P1 2, P2 0)

## PASS/FAIL

| # | gate | result | evidence |
| --- | --- | --- | --- |
| | **BUILD** | | |
| B1 | dist size 3-9 MB | PASS | 4.99 MB (5236799 bytes) |
| B2 | no external http(s) refs in HTML | PASS | 0 external src/href/url() refs |
| B3 | WASM + all assets inlined (no .wasm fetch) | PASS | inline data:application/wasm=true, .wasm requests=0 |
| B4 | page works from file://dist/index.html | PASS | ready from file://, drawCalls=402, consoleErrors=0, pageErrors=0, shots/02-file-url.png |
| | **LOAD** | | |
| L1 | ready and load <= 8 s | PASS | ready in 3805 ms |
| L2 | no console errors/warnings, no pageerrors | PASS | console errors/warnings=0, pageerrors=0, __APP__.errors=0 |
| L3 | no network beyond the single HTML | PASS | 1 request(s): / |
| L4 | no failed requests | PASS | 0 failed requests |
| | **PERF** | | |
| P1 | fps >= 50 over 2 s (1440x900) | PASS | rAF 52.2 fps (106 frames / 2.03 s), app counter 56 |
| P2 | draw calls < 500 | PASS | 402 draw calls |
| P3 | triangles < 250k | PASS | 69,862 triangles |
| P4 | 10 s soak: fps >= 50, draw calls stable, no errors | FAIL | rAF fps/s min 40.3 mean 52.8 (53.4,60,60,58.1,60,60,51.1,42.6,40.3,42.3); app fps 50,60,60,58,60,60,48,43,43,43; calls 402-402; errors 0; 11.0 s |
| | **WORLD** | | |
| W1 | six rooms with plausible names | PASS | teleport probe: LIVING="LIVING ROOM", KITCHEN="KITCHEN / DINING", BEDROOM="BEDROOM", HALLWAY="HALLWAY", BATHROOM="BATHROOM", STUDY="STUDY"; world.rooms=6 |
| W2 | all six rooms reachable by real driving | PASS | living->hallway: OK \| hallway->bathroom: OK \| kitchen->study: OK \| living->kitchen: OK \| hallway->bedroom: OK |
| W3 | required objects exist | PASS | 16/16 present |
| W4 | realistic masses (kg) for required objects | PASS | sofa 85kg, fridge 95kg, bed 75kg, wardrobe 120kg, dining_table 34kg, chair_1 5.5kg, coffee_table 13kg, mug_white 0.32kg, laptop 1.6kg, needle 0.0012kg |
| W5 | >= 120 dynamic objects | PASS | 171 dynamic bodies, 193 objects, 332 colliders |
| W6 | no NaN positions (all bodies) | PASS | all positions finite |
| W7 | nothing below the floor (y < -0.1) | PASS | 0 objects below y=-0.1 |
| | **INPUT** | | |
| I1 | real W/S/A/D move the robot in 4 directions | PASS | {"KeyW":{"dx":0.002,"dz":-0.74,"moved":0.74},"KeyS":{"dx":0,"dz":0.767,"moved":0.767},"KeyA":{"dx":-0.738,"dz":0.031,"moved":0.738},"KeyD":{"dx":0.415,"dz":0.009,"moved":0.415}} |
| I2 | Shift boost is faster than normal | PASS | normal 1.195 m / 1.2 s (1.00 m/s), boost 1.826 m (1.52 m/s), ratio 1.53 |
| I3 | mouse drag orbits the camera | PASS | camera moved 1.327 m, quat delta 0.425 |
| I4 | mouse wheel zooms the camera | PASS | camera distance 1.884 m -> 1.267 m (delta -0.618 m) |
| I5 | real mouse click grabs a liftable object, second click places it | PASS | target=mug_white @ (605,276); click1 held=mug_white; click2 held=null; settle drift 0.0000 m; shots/08-real-click-grab.png |
| I6 | wall collision keeps the robot inside the apartment | PASS | final (-3.67, 0.00, -3.56), min z -3.56, max \|x\| 3.67 (bounds x±5.6 z±3.8) |
| I7 | robot does not tunnel through the outer wall | PASS | max z reached 3.000 m (wall interior 3.8, body radius ~0.15), final z 3.000 |
| I8 | interior partition blocks the robot | PASS | stopped at z=0.460 (wall interior face z=0.7), room=LIVING ROOM |
| | **GRAB** | | |
| G1 | teleportNear(mug_white,0.35)+grabByName works | PASS | near=[-2.987208825457379,0,-2.0380820161540485], robotY=0.012, mugY=0.515, objDist=0.35 m, grab={"ok":true,"reason":null,"held":"mug_white"}, held=mug_white |
| G2 | held HUD label shows name + mass + action | PASS | found=true, grab={"ok":true,"reason":null,"held":"mug_white"}, held=mug_white, held label: "HOLDING · MUG WHITE · 320 g · CLICK TO PLACE" |
| G3 | held object follows the robot while driving | PASS | held mug_white->mug_white; robot moved 0.942 m, mug moved 0.943 m, mug-robot distance 0.71 m |
| G4 | release drops the object and it settles | PASS | held before=mug_white, grab={"ok":true}; held=null; settle pos (-3.723, 0.048, -2.621); drift over 0.6 s 0.0000 m |
| G5 | grab sofa -> {ok:false, reason:"too_heavy"} | PASS | {"g":{"ok":false,"reason":"too_heavy","held":null},"held":null} |
| G6 | static object is refused | PASS | static=true, grab={"ok":false,"reason":"static","held":null} |
| G7 | needle (1.2 g) is liftable | PASS | grab={"ok":true,"reason":null,"held":"needle"}, held=needle, needleFound=true |
| | **PHYS** | | |
| PH1 | push sofa (85 kg) < 0.05 m | PASS | mass 85 kg, robot 0.72 m away, hover=sofa, displacement 0.0004 m |
| PH2 | push chair_1 (5.5 kg) > 0.03 m | PASS | mass 5.5 kg, robot 0.60 m away, hover=chair_1, displacement 0.0612 m |
| PH3 | 10 untouched dynamic objects drift < 0.02 m over 3 s | PASS | 10 objects, max drift 0.0000 m over 3 s (shelf_book_1:0.000, shelf_book_7:0.000, shelf_book_12:0.000, shelf_book_16:0.000, shelf_book_19:0.000, cushion_1:0.000, cushion_2:0.000, cushion_3:0.000, mug_blue:0.000, book_2:0.000) |
| PH4 | stacked objects stay stacked | PASS | 8 supported items held position (max \|dy\| 0.0000 m) |
| PH5 | qa.reset() restores robot spawn and objects | PASS | spawn (-3.6,0,-1.2) restored delta 0.000 m; mug restored delta 0.000 m (had been moved 1.84 m); held=null |
| | **HUD360** | | |
| H1 | 4 panels + minimap show live scene (not black) | PASS | panels front lit 1.00/mean 142, right lit 1.00/mean 142, left lit 1.00/mean 134, back lit 1.00/mean 135; map lit 1.00/mean 126 |
| H2 | robot hidden from the HUD feeds | PASS | front panel mean: normal 141.78, robot forced visible 148.32 (delta +6.54), restored 141.78; map delta 0.22 |
| H3 | C toggles 360 HUD off (clears) and back on | PASS | surround=false; .hud-cam is-hidden=[true,true,true,true]; panel mean 141.8 -> 181.3; toggled back=true |
| H4 | night toggle changes main luminance > 15% | PASS | main mean day 111.6 -> night 82.3 (26.2% change), state.night=true |
| H5 | first-person camera mode works | PASS | mode=first, camera 0.38 m from robot, main mean 22, back to third; shots/03-first-person.png |
| | **HUD** | | |
| H6 | room label follows the robot | PASS | LIVING:"LIVING ROOM", KITCHEN:"KITCHEN / DINING", BEDROOM:"BEDROOM", HALLWAY:"HALLWAY", BATHROOM:"BATHROOM", STUDY:"STUDY" |
| H7 | target label shows mass + action (GRAB and PUSH) | PASS | grab hover=mug_white (canReach=true, dist 0.50 m) label "MUG WHITE · 320 g · GRAB"; push hover=sofa (canReach=true, dist 0.74 m) label "SOFA · 85 kg · PUSH" |
| H8 | UI text is lean (no paragraphs) | PASS | {"room":"LIVING ROOM","target":"SOFA · 85 kg · PUSH","held":null,"hint":"WASD DRIVE · DRAG LOOK · CLICK GRAB · V/C/L"} |
| H9 | no layout overflow at 390x844 (screenshot) | PASS | viewport 390x844; feed/map overflow=0; #hud element overflow=[]; scroll 390x844; shots/06-mobile-390x844.png |
| H10 | resize back to 1440x900 restores the layout | FAIL | viewport 1440x900; map x=1244 y=16 180x180; panels bottom-left=true; rAF fps 47.4/39.3; app fps 43; drawCalls 388; shots/07-resize-back-1440.png |
| | **ADV** | | |
| A1 | grab while driving, release while moving | PASS | grab={"ok":true,"reason":null,"held":"mug_white"}; after drive+release held=null, robot (-2.50, 0.01, -1.67), mug y=0.515, errors=0 |
| A2 | click empty space does nothing bad | PASS | target before click=null, held after=null, errors 0->0 |
| A3 | spam grab/place 12x does not break physics | PASS | held=null, mug (-2.88, 0.52, -1.71), NaN=0, errors=0, dynamic=171 |
| A4 | repeated heavy pushes keep the sofa in the apartment | PASS | sofa (-2.50, 0.43, -2.76) -> (-2.50, 0.43, -2.76), moved 0.001 m, errors=0 |
| A5 | driving into furniture does not launch it or the robot | PASS | robot (-3.04, -0.00, -3.16), sofa moved 0.159 m, errors=0 |
| A6 | rapid view/surround/night toggles do not break the app | FAIL | ready=true, mode=first, night=true, surround=false, errors=0, fps after 32.1, calls 493 |
| A7 | resize during play keeps the app alive | PASS | robot moved 2.127 m while resizing; mid-resize overflow=0, errors 0->0, fps 50, map x=1244 |
| | **LOAD** | | |
| L5 | console/pageerrors still clean after the full suite | PASS | console=0, pageerrors=0, __APP__.errors=0, failed requests=0 |

## Bugs

### [P0] P4 10 s soak: fps >= 50, draw calls stable, no errors

- expected: pass (P0 gate)
- actual: rAF fps/s min 40.3 mean 52.8 (53.4,60,60,58.1,60,60,51.1,42.6,40.3,42.3); app fps 50,60,60,58,60,60,48,43,43,43; calls 402-402; errors 0; 11.0 s
- repro: leave the app running for 10 s and sample fps/drawCalls every second
- automated repro: `node qa/functional/run.mjs` (gate P4)

### [P1] H10 resize back to 1440x900 restores the layout

- expected: pass (P1 gate)
- actual: viewport 1440x900; map x=1244 y=16 180x180; panels bottom-left=true; rAF fps 47.4/39.3; app fps 43; drawCalls 388; shots/07-resize-back-1440.png
- repro: setViewport back to 1440x900, re-read qa.hudRects(), measure sustained fps, screenshot
- automated repro: `node qa/functional/run.mjs` (gate H10)

### [P1] A6 rapid view/surround/night toggles do not break the app

- expected: pass (P1 gate)
- actual: ready=true, mode=first, night=true, surround=false, errors=0, fps after 32.1, calls 493
- repro: press V/C/L three times each in quick succession, then measure fps
- automated repro: `node qa/functional/run.mjs` (gate A6)

## Numbers

- P1 fps >= 50 over 2 s (1440x900): PASS — rAF 52.2 fps (106 frames / 2.03 s), app counter 56
- P2 draw calls < 500: PASS — 402 draw calls
- P3 triangles < 250k: PASS — 69,862 triangles
- P4 10 s soak: fps >= 50, draw calls stable, no errors: FAIL — rAF fps/s min 40.3 mean 52.8 (53.4,60,60,58.1,60,60,51.1,42.6,40.3,42.3); app fps 50,60,60,58,60,60,48,43,43,43; calls 402-402; errors 0; 11.0 s
- W5 >= 120 dynamic objects: PASS — 171 dynamic bodies, 193 objects, 332 colliders
- PH1 push sofa (85 kg) < 0.05 m: PASS — mass 85 kg, robot 0.72 m away, hover=sofa, displacement 0.0004 m
- PH2 push chair_1 (5.5 kg) > 0.03 m: PASS — mass 5.5 kg, robot 0.60 m away, hover=chair_1, displacement 0.0612 m
- H1 4 panels + minimap show live scene (not black): PASS — panels front lit 1.00/mean 142, right lit 1.00/mean 142, left lit 1.00/mean 134, back lit 1.00/mean 135; map lit 1.00/mean 126
- H4 night toggle changes main luminance > 15%: PASS — main mean day 111.6 -> night 82.3 (26.2% change), state.night=true

## Screenshots

- [shots/02-file-url.png](shots/02-file-url.png)
- [shots/08-real-click-grab.png](shots/08-real-click-grab.png)
- [shots/03-first-person.png](shots/03-first-person.png)
- [shots/06-mobile-390x844.png](shots/06-mobile-390x844.png)
- [shots/07-resize-back-1440.png](shots/07-resize-back-1440.png)
- [shots/01-overview-1440.png](shots/01-overview-1440.png)

## Verdict: FIX

P0/P1 gates failed — fix the bugs above and re-run `node qa/functional/run.mjs`.
