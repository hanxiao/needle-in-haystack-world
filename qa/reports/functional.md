# round 3 — functional QA — 2026-11-06 06:48:56Z

Build: `qa/frozen/index.html` sha256 `69db5f97c42e7caa`, 5.00 MB (5241137 bytes), mtime 2026-11-06T06:43:43.256Z
Environment: headless Chrome (Apple M2 Metal), 1440x900, Node v22.22.3, server http://127.0.0.1:4181/, machine load 5.5/7.0/10.6 on 8 cores
Suite: `node qa/functional/run.mjs` — 57 gates, 57 passed, 0 failed (P0 0, P1 0, P2 0)

## PASS/FAIL

| # | gate | result | evidence |
| --- | --- | --- | --- |
| | **BUILD** | | |
| B1 | dist size 3-9 MB | PASS | 5.00 MB (5241137 bytes) |
| B2 | no external http(s) refs in HTML | PASS | 0 external src/href/url() refs |
| B3 | WASM + all assets inlined (no .wasm fetch) | PASS | inline data:application/wasm=true, .wasm requests=0 |
| B4 | page works from file://dist/index.html | PASS | ready from file://, drawCalls=299, consoleErrors=0, pageErrors=0, shots/02-file-url.png |
| | **LOAD** | | |
| L1 | ready and load <= 8 s | PASS | ready in 1472 ms |
| L2 | no console errors/warnings, no pageerrors | PASS | console errors/warnings=0, pageerrors=0, __APP__.errors=0 |
| L3 | no network beyond the single HTML | PASS | 1 request(s): / |
| L4 | no failed requests | PASS | 0 failed requests |
| | **PERF** | | |
| P1 | fps >= 50 over 2 s (1440x900) | PASS | rAF 60.4 fps (121 frames / 2.00 s), app counter 60 |
| P2 | draw calls < 500 | PASS | 299 draw calls |
| P3 | triangles < 250k | PASS | 68,532 triangles |
| P4 | 10 s soak: fps >= 50, draw calls stable, no errors | PASS | sustained 60.1 fps over 10 s, per-second buckets 60.7,60,60,60,60,60,60,60,60,60 (min 60); app fps 60,60,60,60,60,60,60,60,60,60; calls 299-299; errors 0; load 6.5/8 cores; 11.0 s |
| | **WORLD** | | |
| W1 | six rooms with plausible names | PASS | teleport probe: LIVING="LIVING ROOM", KITCHEN="KITCHEN / DINING", BEDROOM="BEDROOM", HALLWAY="HALLWAY", BATHROOM="BATHROOM", STUDY="STUDY"; world.rooms=6 |
| W2 | all six rooms reachable by real driving | PASS | living->hallway: OK \| hallway->bathroom: OK \| kitchen->study: OK \| living->kitchen: OK \| hallway->bedroom: OK |
| W3 | required objects exist | PASS | 16/16 present |
| W4 | realistic masses (kg) for required objects | PASS | sofa 85kg, fridge 95kg, bed 75kg, wardrobe 120kg, dining_table 34kg, chair_1 5.5kg, coffee_table 13kg, mug_white 0.32kg, laptop 1.6kg, needle 0.0012kg |
| W5 | >= 120 dynamic objects | PASS | 171 dynamic bodies, 193 objects, 334 colliders |
| W6 | no NaN positions (all bodies) | PASS | all positions finite |
| W7 | nothing below the floor (y < -0.1) | PASS | 0 objects below y=-0.1 |
| | **INPUT** | | |
| I1 | real W/S/A/D move the robot in 4 directions | PASS | {"KeyW":{"dx":0.003,"dz":-0.738,"moved":0.738},"KeyS":{"dx":0,"dz":0.746,"moved":0.746},"KeyA":{"dx":-0.713,"dz":0.04,"moved":0.714},"KeyD":{"dx":0.407,"dz":0.006,"moved":0.407}} |
| I2 | Shift boost is faster than normal | PASS | normal 1.223 m / 1.2 s (1.02 m/s), boost 1.942 m (1.62 m/s), ratio 1.59 |
| I3 | mouse drag orbits the camera | PASS | camera moved 1.325 m, quat delta 0.424 |
| I4 | mouse wheel zooms the camera | PASS | camera distance 1.884 m -> 1.266 m (delta -0.619 m) |
| I5 | real mouse click grabs a liftable object, second click places it | PASS | target=mug_white @ (605,276); click1 held=mug_white; click2 held=null; settle drift 0.0000 m; shots/08-real-click-grab.png |
| I6 | wall collision keeps the robot inside the apartment | PASS | final (-3.67, 0.00, -3.56), min z -3.56, max \|x\| 3.67 (bounds x±5.6 z±3.8) |
| I7 | robot does not tunnel through the outer wall | PASS | max z reached 3.110 m (wall interior 3.8, body radius ~0.15), final z 3.110 |
| I8 | interior partition blocks the robot | PASS | stopped at z=0.460 (wall interior face z=0.7), room=LIVING ROOM |
| | **GRAB** | | |
| G1 | teleportNear(mug_white,0.35)+grabByName works | PASS | near=[-2.9880235017421692,0,-2.038129342242], robotY=0.012, mugY=0.515, objDist=0.35 m, grab={"ok":true,"reason":null,"held":"mug_white"}, held=mug_white |
| G2 | held HUD label shows name + mass + action | PASS | found=true, grab={"ok":true,"reason":null,"held":"mug_white"}, held=mug_white, held label: "HOLDING · MUG WHITE · 320 g · CLICK TO PLACE" |
| G3 | held object follows the robot while driving | PASS | held mug_white->mug_white; robot moved 0.942 m, mug moved 0.943 m, mug-robot distance 0.71 m |
| G4 | release drops the object and it settles | PASS | held before=mug_white, grab={"ok":true}; held=null; settle pos (-3.725, 0.048, -2.647); drift over 0.6 s 0.0000 m |
| G5 | grab sofa -> {ok:false, reason:"too_heavy"} | PASS | {"g":{"ok":false,"reason":"too_heavy","held":null},"held":null} |
| G6 | static object is refused | PASS | static=true, grab={"ok":false,"reason":"static","held":null} |
| G7 | needle (1.2 g) is liftable | PASS | grab={"ok":true,"reason":null,"held":"needle"}, held=needle, needleFound=true |
| | **PHYS** | | |
| PH1 | push sofa (85 kg) < 0.05 m | PASS | mass 85 kg, robot 0.72 m away, hover=sofa, displacement 0.0004 m |
| PH2 | push chair_1 (5.5 kg) > 0.03 m | PASS | mass 5.5 kg, robot 0.60 m away, hover=chair_1, displacement 0.0783 m |
| PH3 | 10 untouched dynamic objects drift < 0.02 m over 3 s | PASS | 10 objects, max drift 0.0000 m over 3 s (shelf_book_1:0.000, shelf_book_7:0.000, shelf_book_12:0.000, shelf_book_16:0.000, shelf_book_19:0.000, cushion_1:0.000, cushion_2:0.000, cushion_3:0.000, mug_blue:0.000, book_2:0.000) |
| PH4 | stacked objects stay stacked | PASS | 8 supported items held position (max \|dy\| 0.0000 m) |
| PH5 | qa.reset() restores robot spawn and objects | PASS | spawn (-3.6,0,-1.2) restored delta 0.000 m; mug restored delta 0.000 m (had been moved 2.00 m); held=null |
| | **HUD360** | | |
| H1 | 4 panels + minimap show live scene (not black) | PASS | panels front lit 1.00/mean 137, right lit 1.00/mean 138, left lit 1.00/mean 130, back lit 1.00/mean 130; map lit 1.00/mean 135 |
| H2 | robot hidden from the HUD feeds | PASS | front panel mean: normal 137.39, robot forced visible 144.96 (delta +7.57), restored 137.39; map delta 0.17 |
| H3 | C toggles 360 HUD off (clears) and back on | PASS | surround=false; .hud-cam is-hidden=[true,true,true,true]; panel mean 137.4 -> 0.0; toggled back=true |
| H4 | night toggle changes main luminance > 15% | PASS | main mean day 108.5 -> night 77.6 (28.5% change), state.night=true |
| H5 | first-person camera mode works | PASS | mode=first, camera 0.38 m from robot, main mean 59, back to third; shots/03-first-person.png |
| | **HUD** | | |
| H6 | room label follows the robot | PASS | LIVING:"LIVING ROOM", KITCHEN:"KITCHEN / DINING", BEDROOM:"BEDROOM", HALLWAY:"HALLWAY", BATHROOM:"BATHROOM", STUDY:"STUDY" |
| H7 | target label shows mass + action (GRAB and PUSH) | PASS | grab hover=mug_white (canReach=true, dist 0.50 m) label "MUG WHITE · 320 g · GRAB"; push hover=sofa (canReach=true, dist 0.74 m) label "SOFA · 85 kg · PUSH" |
| H8 | UI text is lean (no paragraphs) | PASS | {"room":"LIVING ROOM","target":"SOFA · 85 kg · PUSH","held":null,"hint":"WASD DRIVE · DRAG LOOK · CLICK GRAB · V/C/L"} |
| H9 | no layout overflow at 390x844 (screenshot) | PASS | viewport 390x844; feed/map overflow=0; #hud element overflow=[]; scroll 390x844; shots/06-mobile-390x844.png |
| H10 | resize back to 1440x900 restores the layout | PASS | viewport 1440x900; map x=1244 y=16 180x180; panels bottom-left=true; rAF fps 60.5/59.9; app fps 60; drawCalls 239; shots/07-resize-back-1440.png |
| | **ADV** | | |
| A1 | grab while driving, release while moving | PASS | grab={"ok":true,"reason":null,"held":"mug_white"}; after drive+release held=null, robot (-2.53, 0.01, -1.76), mug y=0.515, errors=0 |
| A2 | click empty space does nothing bad | PASS | target before click=null, held after=null, errors 0->0 |
| A3 | spam grab/place 12x does not break physics | PASS | held=null, mug (-2.88, 0.52, -1.71), NaN=0, errors=0, dynamic=171 |
| A4 | repeated heavy pushes keep the sofa in the apartment | PASS | sofa (-2.50, 0.43, -2.76) -> (-2.50, 0.43, -2.76), moved 0.001 m, errors=0 |
| A5 | driving into furniture does not launch it or the robot | PASS | robot (-3.00, 0.00, -3.26), sofa moved 0.099 m, errors=0 |
| A6 | rapid view/surround/night toggles do not break the app | PASS | ready=true, mode=first, night=true, surround=false, errors=0, rAF fps after 60.5/60.2, calls 395 |
| A7 | resize during play keeps the app alive | PASS | robot moved 1.829 m while resizing; mid-resize overflow=0, errors 0->0, fps 60, map x=1244 |
| | **LOAD** | | |
| L5 | console/pageerrors still clean after the full suite | PASS | console=0, pageerrors=0, __APP__.errors=0, failed requests=0 |

## Bugs

No failures in this round.
## Numbers

- P1 fps >= 50 over 2 s (1440x900): PASS — rAF 60.4 fps (121 frames / 2.00 s), app counter 60
- P2 draw calls < 500: PASS — 299 draw calls
- P3 triangles < 250k: PASS — 68,532 triangles
- P4 10 s soak: fps >= 50, draw calls stable, no errors: PASS — sustained 60.1 fps over 10 s, per-second buckets 60.7,60,60,60,60,60,60,60,60,60 (min 60); app fps 60,60,60,60,60,60,60,60,60,60; calls 299-299; errors 0; load 6.5/8 cores; 11.0 s
- W5 >= 120 dynamic objects: PASS — 171 dynamic bodies, 193 objects, 334 colliders
- PH1 push sofa (85 kg) < 0.05 m: PASS — mass 85 kg, robot 0.72 m away, hover=sofa, displacement 0.0004 m
- PH2 push chair_1 (5.5 kg) > 0.03 m: PASS — mass 5.5 kg, robot 0.60 m away, hover=chair_1, displacement 0.0783 m
- H1 4 panels + minimap show live scene (not black): PASS — panels front lit 1.00/mean 137, right lit 1.00/mean 138, left lit 1.00/mean 130, back lit 1.00/mean 130; map lit 1.00/mean 135
- H4 night toggle changes main luminance > 15%: PASS — main mean day 108.5 -> night 77.6 (28.5% change), state.night=true

## Screenshots

- [shots/02-file-url.png](shots/02-file-url.png)
- [shots/08-real-click-grab.png](shots/08-real-click-grab.png)
- [shots/03-first-person.png](shots/03-first-person.png)
- [shots/06-mobile-390x844.png](shots/06-mobile-390x844.png)
- [shots/07-resize-back-1440.png](shots/07-resize-back-1440.png)
- [shots/01-overview-1440.png](shots/01-overview-1440.png)

## Verdict: SHIP

No failed P0/P1 gates. Build is shippable from a functional standpoint.
