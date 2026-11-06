# round 6 — functional QA — 2026-11-06 08:05:56Z

Build: `qa/frozen/index.html` sha256 `289f40eecdde62c1`, 5.01 MB (5253632 bytes), mtime 2026-11-06T08:01:29.589Z
Environment: headless Chrome (Apple M2 Metal), 1440x900, Node v22.22.3, server http://127.0.0.1:4181/, machine load 2.5/3.4/4.2 on 8 cores
Suite: `node qa/functional/run.mjs` — 66 gates, 66 passed, 0 failed (P0 0, P1 0, P2 0)

## PASS/FAIL

| # | gate | result | evidence |
| --- | --- | --- | --- |
| | **BUILD** | | |
| B1 | dist size 3-9 MB | PASS | 5.01 MB (5253632 bytes) |
| B2 | no external http(s) refs in HTML | PASS | 0 external src/href/url() refs |
| B3 | WASM + all assets inlined (no .wasm fetch) | PASS | inline data:application/wasm=true, .wasm requests=0 |
| B4 | page works from file:// (frozen artifact) | PASS | ready from file:///qa/frozen/index.html, drawCalls=298, consoleErrors=0, pageErrors=0, shots/02-file-url.png |
| | **LOAD** | | |
| L1 | ready and load <= 8 s | PASS | ready in 881 ms |
| L2 | no console errors/warnings, no pageerrors | PASS | console errors/warnings=0, pageerrors=0, __APP__.errors=0 |
| L3 | no network beyond the single HTML | PASS | 1 request(s): / |
| L4 | no failed requests | PASS | 0 failed requests |
| | **PERF** | | |
| P1 | fps >= 50 over 2 s (1440x900) | PASS | rAF 53.8 fps (108 frames / 2.01 s), app counter 60 |
| P2 | draw calls < 500 | PASS | 298 draw calls |
| P3 | triangles < 250k | PASS | 61,916 triangles |
| P4 | 10 s soak: fps >= 50, draw calls stable, no errors | PASS | sustained 60.1 fps over 10 s, per-second buckets 60.9,60,60,60,60,60,60,60,60,60 (min 60); app fps 60,60,60,60,60,60,60,60,60,60; calls 298-298; errors 0; load 3.0/8 cores; 10.9 s |
| | **WORLD** | | |
| W1 | six rooms with plausible names | PASS | teleport probe: LIVING="LIVING ROOM", KITCHEN="KITCHEN / DINING", BEDROOM="BEDROOM", HALLWAY="HALLWAY", BATHROOM="BATHROOM", STUDY="STUDY"; world.rooms=6 |
| W2 | all six rooms reachable by real driving | PASS | living->hallway: OK \| hallway->bathroom: OK \| kitchen->study: OK \| living->kitchen: OK \| hallway->bedroom: OK |
| W3 | required objects exist | PASS | 16/16 present |
| W4 | realistic masses (kg) for required objects | PASS | sofa 85kg, fridge 95kg, bed 75kg, wardrobe 120kg, dining_table 34kg, chair_1 5.5kg, coffee_table 13kg, mug_white 0.32kg, laptop 1.6kg, needle 0.0012kg |
| W5 | >= 120 dynamic objects | PASS | 171 dynamic bodies, 193 objects, 333 colliders |
| W6 | no NaN positions (all bodies) | PASS | all positions finite |
| W7 | nothing below the floor (y < -0.1) | PASS | 0 objects below y=-0.1 |
| | **INPUT** | | |
| I1 | real W/S/A/D move the robot in 4 directions | PASS | {"KeyW":{"dx":-0.017,"dz":-0.761,"moved":0.761},"KeyS":{"dx":0,"dz":0.77,"moved":0.77},"KeyA":{"dx":-0.722,"dz":0.066,"moved":0.725},"KeyD":{"dx":0.681,"dz":0.094,"moved":0.687}} (robot v2: 0.40 m/s, 2.0 s holds) |
| I2 | Shift boost is faster than normal | PASS | normal 0.772 m / 2.0 s (0.39 m/s), boost 1.006 m (0.50 m/s), ratio 1.30 |
| I3 | mouse drag orbits the camera | PASS | camera moved 1.327 m, quat delta 0.425 |
| I4 | mouse wheel zooms the camera | PASS | camera distance 1.853 m -> 1.228 m (delta -0.624 m) |
| I5 | real mouse click grabs a liftable object, second click places it | PASS | target=mug_white @ (618,269); click1 held=mug_white; click2 held=null; settle drift 0.0000 m; shots/08-real-click-grab.png |
| I6 | wall collision keeps the robot inside the apartment | PASS | final (-3.67, 0.00, -3.56), min z -3.56, max \|x\| 3.67 (bounds x±5.6 z±3.8) |
| I7 | robot does not tunnel through the outer wall | PASS | max x reached 5.365 m (wall interior 5.6, body radius ~0.155), final x 5.365 |
| I8 | interior partition blocks the robot | PASS | stopped at z=0.465 (wall interior face z=0.7), room=LIVING ROOM |
| | **GRAB** | | |
| G1 | teleportNear(mug_white,0.33)+grabByName works | PASS | near=[-2.6725615233919706,0,-1.9897772372844664], robotY=0.012, mugY=0.586, objDist=0.26 m, grab={"ok":true,"reason":null,"held":"mug_white"}, held=mug_white |
| G2 | held HUD label shows name + mass + action | PASS | found=true, grab={"ok":true,"reason":null,"held":"mug_white"}, held=mug_white, held label: "HOLDING · MUG WHITE · 320 g · CLICK TO PLACE" |
| G3 | held object follows the robot while driving | PASS | held mug_white->mug_white; robot moved 0.593 m, mug moved 0.598 m, mug-robot distance 0.63 m |
| G4 | release drops the object and it settles | PASS | held before=mug_white, grab={"ok":true}; dropped 0.54 m to y=0.032; vertical rest \|dy\| 0.0001 m over 1 s; residual roll 0.036 m/s (rug roll allowed) |
| G5 | grab sofa -> {ok:false, reason:"too_heavy"} | PASS | {"g":{"ok":false,"reason":"too_heavy","held":null},"held":null} |
| G6 | static object is refused | PASS | static=true, grab={"ok":false,"reason":"static","held":null} |
| G7 | needle (1.2 g) is liftable | PASS | grab={"ok":true,"reason":null,"held":"needle"}, held=needle, needleFound=true |
| G8 | laptop (1.6 kg) refused: payload is now 0.5 kg | PASS | laptop 1.6 kg vs arm 0.5 kg -> {"ok":false,"reason":"too_heavy","held":null} |
| G9 | arm lifts the mug >= 0.04 m when it grabs | PASS | grab={"ok":true,"reason":null,"held":"mug_white"}; mug y 0.515 -> 0.586 (rise 0.070 m) |
| | **PHYS** | | |
| PH1 | heavy furniture push < 0.01 m (7 objects) | PASS | sofa(85kg):0.0004m, bed(75kg):0.0006m, wardrobe(120kg):0.0000m, fridge(95kg):0.0001m, bookshelf(42kg):0.0003m, dining_table(34kg):0.0032m, desk(26kg):0.0037m — threshold <0.01 m |
| PH2 | chair_1 (5.5 kg) push > 0.03 m | PASS | mass 5.5 kg, robot 0.50 m away, hover=chair_1, displacement 0.0994 m |
| PH3 | trash bin / laundry basket push > 0.03 m | PASS | trash_bin(1.6kg):0.1709m, laundry_basket(1kg):0.9364m — threshold >0.03 m |
| PH4 | 10 untouched dynamic objects drift < 0.02 m over 3 s | PASS | 10 objects, max drift 0.0000 m over 3 s (shelf_book_1:0.000, shelf_book_7:0.000, shelf_book_12:0.000, shelf_book_16:0.000, shelf_book_19:0.000, cushion_1:0.000, cushion_2:0.000, cushion_3:0.000, mug_blue:0.000, book_2:0.000) |
| PH5 | stacked objects stay stacked | PASS | 8 supported items held position (max \|dy\| 0.0000 m) |
| PH6 | qa.reset() restores robot spawn and objects | PASS | spawn (-3.6,0,-1.2) restored delta 0.000 m; mug restored delta 0.000 m (had been moved 1.45 m); held=null |
| | **HUD360** | | |
| H1 | 4 panels + minimap show live scene (not black) | PASS | panels front lit 1.00/mean 125, right lit 1.00/mean 140, left lit 1.00/mean 110, back lit 1.00/mean 126; map lit 1.00/mean 131 |
| H2 | robot hidden from the HUD feeds | PASS | front panel mean: normal 124.90, robot forced visible 110.27 (delta +-14.62), restored 124.90; map delta 0.12 |
| H3 | C toggles 360 HUD off (clears) and back on | PASS | surround=false; .hud-cam is-hidden=[true,true,true,true]; panel mean 124.9 -> 0.0; toggled back=true |
| H4 | night toggle changes main luminance > 15% | PASS | main mean day 108.3 -> night 74.6 (31.1% change), state.night=true |
| H5 | first-person camera mode works | PASS | mode=first, camera 0.33 m from robot, main mean 134, back to third; shots/03-first-person.png |
| | **HUD** | | |
| H6 | room label follows the robot | PASS | LIVING:"LIVING ROOM", KITCHEN:"KITCHEN / DINING", BEDROOM:"BEDROOM", HALLWAY:"HALLWAY", BATHROOM:"BATHROOM", STUDY:"STUDY" |
| H7 | target label shows mass + action (GRAB and PUSH) | PASS | near mug: hover=mug_white canReach=true dist 0.28 m -> "MUG WHITE · 320 g · GRAB"; near chair_1: hover=chair_1 canReach=true dist 0.38 m -> "CHAIR 1 · 5.5 kg · PUSH"; far sofa (2.72 m) -> "SOFA · 85 kg · OUT OF REACH" |
| H7b | large-furniture PUSH label (sofa at closest reachable range) | PASS | closest approach 0.64 m, canReach(centre)=false, label "SOFA · 85 kg · PUSH" (expected SOFA · 85 kg · PUSH) |
| H8 | UI text is lean (no paragraphs) | PASS | {"room":"LIVING ROOM","target":"SOFA · 85 kg · PUSH","held":null,"hint":"WASD DRIVE · DRAG LOOK · CLICK GRAB · V/C/L"} |
| H9 | no layout overflow at 390x844 (screenshot) | PASS | viewport 390x844; feed/map overflow=0; #hud element overflow=[]; scroll 390x844; shots/06-mobile-390x844.png |
| H9b | mobile DPR 2: viewport units + canvas sizes stay 1:1 | PASS | dpr=2 viewport 390x844; canvas [780,1688] vs css*dpr [780,1688]; hudCanvas [780,1688] (1x ok); feed overflow=0; #hud overflow=0; front feed lit=0.99/mean 60 |
| H10 | resize back to 1440x900 restores the layout | PASS | viewport 1440x900; map x=1244 y=16 180x180; panels bottom-left=true; rAF fps 60.6/60.0; app fps 60; drawCalls 454; shots/07-resize-back-1440.png |
| H11 | control panel exists with keycaps + arm badge | PASS | #hud-controls=true, 13 keycaps, missing=[], arm="ARM 500 g · 0.34 M", badges THIRD/ON/DAY |
| H12 | keycaps highlight on real keydown | PASS | W keycap: before=false held=true released=false; active keycaps while W held=["KeyW"]; Shift held=true released=false |
| H13 | badges follow real V/C/L toggles | PASS | initial THIRD/ON/DAY; V -> FIRST; C -> OFF; L -> NIGHT |
| | **HUD360** | | |
| H14 | trajectory trail renders only on the minimap camera | PASS | trail points 0 -> 14; mesh layer2=true, outline layer2=true; top cam layer2=true, front/back/left/right layer2=false/false/false/false |
| | **ADV** | | |
| A1 | grab while driving, release while moving | PASS | grab={"ok":true,"reason":null,"held":"mug_white"}; after drive+release held=null, robot (-3.27, 0.01, -1.31), mug y=0.031, errors=0 |
| A2 | click empty space does nothing bad | PASS | target before click=null, held after=null, errors 0->0 |
| A3 | spam grab/place 12x does not break physics | PASS | held=null, mug (-2.71, 0.52, -1.72), NaN=0, errors=0, dynamic=171 |
| A4 | repeated heavy pushes keep the sofa in the apartment | PASS | sofa (-2.50, 0.43, -2.76) -> (-2.50, 0.43, -2.75), moved 0.001 m, errors=0 |
| A5 | driving into furniture does not launch it or the robot | PASS | robot (-2.58, 0.01, -2.11), sofa moved 0.000 m, errors=0 |
| A6 | rapid view/surround/night toggles do not break the app | PASS | ready=true, mode=first, night=true, surround=false, errors=0, rAF fps after 59.8/60.1, calls 159 |
| A7 | resize during play keeps the app alive | PASS | robot moved 0.625 m while resizing; mid-resize overflow=0, errors 0->0, fps 60, map x=1244 |
| | **LOAD** | | |
| L5 | console/pageerrors still clean after the full suite | PASS | console=0, pageerrors=0, __APP__.errors=0, failed requests=0 |

## Bugs

No failures in this round.
## Numbers

- P1 fps >= 50 over 2 s (1440x900): PASS — rAF 53.8 fps (108 frames / 2.01 s), app counter 60
- P2 draw calls < 500: PASS — 298 draw calls
- P3 triangles < 250k: PASS — 61,916 triangles
- P4 10 s soak: fps >= 50, draw calls stable, no errors: PASS — sustained 60.1 fps over 10 s, per-second buckets 60.9,60,60,60,60,60,60,60,60,60 (min 60); app fps 60,60,60,60,60,60,60,60,60,60; calls 298-298; errors 0; load 3.0/8 cores; 10.9 s
- W5 >= 120 dynamic objects: PASS — 171 dynamic bodies, 193 objects, 333 colliders
- PH1 heavy furniture push < 0.01 m (7 objects): PASS — sofa(85kg):0.0004m, bed(75kg):0.0006m, wardrobe(120kg):0.0000m, fridge(95kg):0.0001m, bookshelf(42kg):0.0003m, dining_table(34kg):0.0032m, desk(26kg):0.0037m — threshold <0.01 m
- PH2 chair_1 (5.5 kg) push > 0.03 m: PASS — mass 5.5 kg, robot 0.50 m away, hover=chair_1, displacement 0.0994 m
- PH3 trash bin / laundry basket push > 0.03 m: PASS — trash_bin(1.6kg):0.1709m, laundry_basket(1kg):0.9364m — threshold >0.03 m
- G8 laptop (1.6 kg) refused: payload is now 0.5 kg: PASS — laptop 1.6 kg vs arm 0.5 kg -> {"ok":false,"reason":"too_heavy","held":null}
- G9 arm lifts the mug >= 0.04 m when it grabs: PASS — grab={"ok":true,"reason":null,"held":"mug_white"}; mug y 0.515 -> 0.586 (rise 0.070 m)
- H7 target label shows mass + action (GRAB and PUSH): PASS — near mug: hover=mug_white canReach=true dist 0.28 m -> "MUG WHITE · 320 g · GRAB"; near chair_1: hover=chair_1 canReach=true dist 0.38 m -> "CHAIR 1 · 5.5 kg · PUSH"; far sofa (2.72 m) -> "SOFA · 85 kg · OUT OF REACH"
- H7b large-furniture PUSH label (sofa at closest reachable range): PASS — closest approach 0.64 m, canReach(centre)=false, label "SOFA · 85 kg · PUSH" (expected SOFA · 85 kg · PUSH)
- H14 trajectory trail renders only on the minimap camera: PASS — trail points 0 -> 14; mesh layer2=true, outline layer2=true; top cam layer2=true, front/back/left/right layer2=false/false/false/false
- H1 4 panels + minimap show live scene (not black): PASS — panels front lit 1.00/mean 125, right lit 1.00/mean 140, left lit 1.00/mean 110, back lit 1.00/mean 126; map lit 1.00/mean 131
- H4 night toggle changes main luminance > 15%: PASS — main mean day 108.3 -> night 74.6 (31.1% change), state.night=true

## Screenshots

- [shots/02-file-url.png](shots/02-file-url.png)
- [shots/08-real-click-grab.png](shots/08-real-click-grab.png)
- [shots/03-first-person.png](shots/03-first-person.png)
- [shots/06-mobile-390x844.png](shots/06-mobile-390x844.png)
- [shots/07-resize-back-1440.png](shots/07-resize-back-1440.png)
- [shots/01-overview-1440.png](shots/01-overview-1440.png)

## Verdict: SHIP

No failed P0/P1 gates. Build is shippable from a functional standpoint.
