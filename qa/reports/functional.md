# round 8 — functional QA — 2026-11-06 08:34:30Z

Build: `qa/frozen/index.html` sha256 `eef3be85f2ab494b`, 5.02 MB (5261883 bytes), mtime 2026-11-06T08:21:05.678Z
Environment: headless Chrome (Apple M2 Metal), 1440x900, Node v22.22.3, server http://127.0.0.1:4181/, machine load 3.1/4.5/4.5 on 8 cores
Suite: `node qa/functional/run.mjs` — 72 gates, 69 passed, 3 failed (P0 0, P1 2, P2 1)

## PASS/FAIL

| # | gate | result | evidence |
| --- | --- | --- | --- |
| | **LOAD** | | |
| L6 | shader warm-up: first seconds are not a fps dip | PASS | first 2 s after ready: rAF 60.1 fps (121 frames); ready in 1123 ms; machine load 3.4/8 cores |
| | **BUILD** | | |
| B1 | dist size 3-9 MB | PASS | 5.02 MB (5261883 bytes) |
| B2 | no external http(s) refs in HTML | PASS | 0 external src/href/url() refs |
| B3 | WASM + all assets inlined (no .wasm fetch) | PASS | inline data:application/wasm=true, .wasm requests=0 |
| B4 | page works from file:// (frozen artifact) | PASS | ready from file:///qa/frozen/index.html, drawCalls=306, consoleErrors=0, pageErrors=0, shots/02-file-url.png |
| | **LOAD** | | |
| L1 | ready and load <= 8 s | PASS | ready in 1123 ms |
| L2 | no console errors/warnings, no pageerrors | PASS | console errors/warnings=0, pageerrors=0, __APP__.errors=0 |
| L3 | no network beyond the single HTML | PASS | 1 request(s): / |
| L4 | no failed requests | PASS | 0 failed requests |
| | **PERF** | | |
| P1 | fps >= 50 over 2 s (1440x900) | PASS | rAF 56.3 fps (114 frames / 2.03 s), app counter 54 |
| P2 | draw calls < 500 | PASS | 306 draw calls |
| P3 | triangles < 250k | PASS | 63,622 triangles |
| P4 | 10 s soak: fps >= 50, draw calls stable, no errors | PASS | sustained 56.4 fps over 10 s, per-second buckets 56.6,52.1,60,56.1,54.1,55.1,57.1,57.1,57.1,59 (min 52.1); app fps 56,50,60,54,50,54,54,60,54,58; calls 306-306; errors 0; load 4.6/8 cores; 11.1 s |
| | **WORLD** | | |
| W1 | six rooms with plausible names | PASS | teleport probe: LIVING="LIVING ROOM", KITCHEN="KITCHEN / DINING", BEDROOM="BEDROOM", HALLWAY="HALLWAY", BATHROOM="BATHROOM", STUDY="STUDY"; world.rooms=6 |
| W2 | all six rooms reachable by real driving | PASS | living->hallway: OK \| hallway->bathroom: OK \| kitchen->study: OK \| living->kitchen: OK \| hallway->bedroom: OK |
| W3 | required objects exist | PASS | 16/16 present |
| W4 | realistic masses (kg) for required objects | PASS | sofa 85kg, fridge 95kg, bed 75kg, wardrobe 120kg, dining_table 34kg, chair_1 5.5kg, coffee_table 13kg, mug_white 0.32kg, laptop 1.6kg, needle 0.0012kg |
| W5 | >= 120 dynamic objects | PASS | 175 dynamic bodies, 197 objects, 368 colliders |
| W6 | no NaN positions (all bodies) | PASS | all positions finite |
| W7 | nothing below the floor (y < -0.1) | PASS | 0 objects below y=-0.1 |
| | **INPUT** | | |
| I1 | real W/S/A/D move the robot in 4 directions | PASS | {"KeyW":{"dx":-0.024,"dz":-0.746,"moved":0.746},"KeyS":{"dx":0,"dz":0.764,"moved":0.764},"KeyA":{"dx":-0.715,"dz":0.066,"moved":0.718},"KeyD":{"dx":0.671,"dz":0.094,"moved":0.678}} (robot v2: 0.40 m/s, 2.0 s holds) |
| I2 | Shift boost is faster than normal | PASS | normal 0.728 m / 2.0 s (0.36 m/s), boost 1.006 m (0.50 m/s), ratio 1.38 |
| I3 | mouse drag orbits the camera | PASS | camera moved 1.327 m, quat delta 0.425 |
| I4 | mouse wheel zooms the camera | PASS | camera distance 1.853 m -> 1.228 m (delta -0.624 m) |
| I5 | real mouse click grabs a liftable object, second click places it | PASS | target=mug_white @ (609,225); click1 held=mug_white; click2 held=null; settle drift 0.0000 m; shots/08-real-click-grab.png |
| I6 | wall collision keeps the robot inside the apartment | PASS | final (-3.67, -0.00, -3.56), min z -3.57, max \|x\| 3.67 (bounds x±5.6 z±3.8) |
| I7 | robot does not tunnel through the outer wall | PASS | max x reached 5.365 m (wall interior 5.6, body radius ~0.155), final x 5.365 |
| I8 | interior partition blocks the robot | PASS | stopped at z=0.465 (wall interior face z=0.7), room=LIVING ROOM |
| | **GRAB** | | |
| G1 | teleportNear(mug_white,0.33)+grabByName works | PASS | near=[-2.6725615233919706,0,-1.9897772372844664], robotY=0.012, mugY=0.247, objDist=0.43 m, grab={"ok":true,"reason":null,"held":"mug_white"}, held=mug_white |
| G2 | held HUD label shows name + mass + action | PASS | found=true, grab={"ok":true,"reason":null,"held":"mug_white"}, held=mug_white, held label: "HOLDING · MUG WHITE · 320 g · CLICK TO PLACE" |
| G3 | held object follows the robot while driving | PASS | held mug_white->mug_white; robot moved 0.591 m, mug moved 0.570 m, mug-robot distance 0.56 m |
| G4 | release drops the object and it settles | PASS | held before=mug_white, grab={"ok":true}; dropped 0.28 m to y=0.060; vertical rest \|dy\| 0.0000 m over 1 s; residual roll 0.000 m/s (rug roll allowed) |
| G5 | grab sofa -> {ok:false, reason:"too_heavy"} | PASS | {"g":{"ok":false,"reason":"too_heavy","held":null},"held":null} |
| G6 | static object is refused | PASS | static=true, grab={"ok":false,"reason":"static","held":null} |
| G7 | needle (1.2 g) is liftable | PASS | grab={"ok":true,"reason":null,"held":"needle"}, held=needle, needleFound=true |
| G8 | laptop (1.6 kg) refused: payload is now 0.5 kg | PASS | laptop 1.6 kg vs arm 0.5 kg -> {"ok":false,"reason":"too_heavy","held":null} |
| G9 | arm lifts the mug >= 0.04 m when it grabs | PASS | grab={"ok":true,"reason":null,"held":"mug_white"}; mug y 0.515 -> 0.590 (rise 0.075 m) |
| G10 | aim-responsive carry: held mug rises/lowers with aim | PASS | grab={"ok":true,"reason":null,"held":"mug_white"}; mug y aim-high 0.588 vs aim-low 0.568 -> carry delta 0.021 m |
| | **PHYS** | | |
| PH1 | heavy furniture push < 0.01 m (7 objects) | PASS | sofa(85kg):0.0001m, bed(75kg):0.0006m, wardrobe(120kg):0.0000m, fridge(95kg):0.0001m, bookshelf(42kg):0.0003m, dining_table(34kg):0.0033m, desk(26kg):0.0037m — threshold <0.01 m |
| PH2 | chair_1 (5.5 kg) push > 0.03 m | PASS | mass 5.5 kg, robot 0.50 m away, hover=chair_1, displacement 0.1135 m |
| PH3 | trash bin / laundry basket push > 0.03 m | FAIL | trash_bin(1.6kg):0.3190m, laundry_basket(undefinedkg):no-hoverm — threshold >0.03 m |
| PH4 | 10 untouched dynamic objects drift < 0.02 m over 3 s | PASS | 10 objects, max drift 0.0000 m over 3 s (shelf_book_1:0.000, shelf_book_7:0.000, shelf_book_12:0.000, shelf_book_16:0.000, shelf_book_19:0.000, cushion_1:0.000, cushion_2:0.000, cushion_3:0.000, mug_blue:0.000, book_2:0.000) |
| PH5 | stacked objects stay stacked | PASS | 8 supported items held position (max \|dy\| 0.0000 m) |
| PH6 | qa.reset() restores robot spawn and objects | PASS | spawn (-3.6,0,-1.2) restored delta 0.000 m; mug restored delta 0.000 m (had been moved 1.39 m); held=null |
| | **HUD360** | | |
| H1 | 4 panels + minimap show live scene (not black) | PASS | panels front lit 1.00/mean 127, right lit 1.00/mean 139, left lit 1.00/mean 108, back lit 1.00/mean 125; map lit 1.00/mean 130 |
| H2 | robot hidden from the HUD feeds | PASS | front panel mean: normal 126.92, robot forced visible 112.63 (delta +-14.29), restored 126.92; map delta 0.15 |
| H3 | C toggles 360 HUD off (clears) and back on | PASS | surround=false; .hud-cam is-hidden=[true,true,true,true]; panel mean 126.9 -> 0.0; toggled back=true |
| H4 | night toggle changes main luminance > 15% | PASS | main mean day 134.3 -> night 101.6 (24.3% change), state.night=true |
| H5 | first-person camera mode works | PASS | mode=first, camera 0.33 m from robot, main mean 117, back to third; shots/03-first-person.png |
| | **HUD** | | |
| H6 | room label follows the robot | PASS | LIVING:"LIVING ROOM", KITCHEN:"KITCHEN / DINING", BEDROOM:"BEDROOM", HALLWAY:"HALLWAY", BATHROOM:"BATHROOM", STUDY:"STUDY" |
| H7 | target label shows mass + action (GRAB and PUSH) | PASS | near mug: hover=mug_white canReach=true dist 0.28 m -> "MUG WHITE · 320 g · GRAB"; near chair_1: hover=chair_1 canReach=true dist 0.38 m -> "CHAIR 1 · 5.5 kg · PUSH"; far sofa (2.72 m) -> "SOFA · 85 kg · OUT OF REACH" |
| H7b | large-furniture PUSH label (sofa at closest reachable range) | FAIL | closest approach 0.64 m, canReach(centre)=false, label "SOFA · 85 kg · OUT OF REACH" (expected SOFA · 85 kg · PUSH) |
| H8 | UI text is lean (no paragraphs) | PASS | {"room":"LIVING ROOM","target":"SOFA · 85 kg · OUT OF REACH","held":null,"hint":"WASD DRIVE · DRAG LOOK · CLICK GRAB · V/C/L"} |
| H9 | no layout overflow at 390x844 (screenshot) | PASS | viewport 390x844; feed/map overflow=0; #hud element overflow=[]; scroll 390x844; shots/06-mobile-390x844.png |
| H9b | mobile DPR 2: viewport units + canvas sizes stay 1:1 | PASS | dpr=2 viewport 390x844; canvas [780,1688] vs css*dpr [780,1688]; hudCanvas [780,1688] (1x ok); feed overflow=0; #hud overflow=0; front feed lit=0.99/mean 121 |
| H10 | resize back to 1440x900 restores the layout | PASS | viewport 1440x900; map x=1244 y=16 180x180; panels bottom-left=true; rAF fps 58.6/58.6; app fps 56; drawCalls 290; shots/07-resize-back-1440.png |
| H11 | control panel exists with keycaps + arm badge | PASS | #hud-controls=true, 13 keycaps, missing=[], arm="ARM 500 g · 0.34 M", badges THIRD/ON/DAY |
| H12 | keycaps highlight on real keydown | PASS | W keycap: before=false held=true released=false; active keycaps while W held=["KeyW"]; Shift held=true released=false |
| H13 | badges follow real V/C/L toggles | PASS | initial THIRD/ON/DAY; V -> FIRST; C -> OFF; L -> NIGHT |
| | **HUD360** | | |
| H14 | trajectory trail renders only on the minimap camera | PASS | trail points 0 -> 14; mesh layer2=true, outline layer2=true; top cam layer2=true, front/back/left/right layer2=false/false/false/false |
| | **HUD** | | |
| H15 | touch controls: stick drives, drag looks, tap grabs | PASS | hud-touch on=true, hint "LEFT STICK DRIVE · DRAG LOOK · TAP GRAB"; stick moved robot 0.66 m (active=true, knob="translate(0px, 34px)"), stop drift 0.001 m; drag-look camera moved 0.95 m; tap grab held=mug_white, second tap held=null |
| H16 | control panel rows: H and R are separate rows | PASS | 9 rows; H row={"keys":["KeyH"],"act":"HINT"}; R row={"keys":["KeyR"],"act":"RESET"} |
| H17 | trail legend sits under the minimap and hides with 360 | PASS | #hud-map-trail box {"x":1244,"y":200,"w":180,"h":10} vs map {"x":1244,"y":16,"w":180,"h":180} (under=true); text="TRAIL"; hidden on=false off=true |
| H18 | third-person camera stays inside the apartment shell | FAIL | backed-south-wall: cam (-2.76,1.35,-4.73) OUTSIDE SHELL dist 1.92 m, centre ray windows, view mean 189 \| backed-west-wall-bedroom: cam (-6.49,1.35,2.62) OUTSIDE SHELL dist 1.92 m, centre ray walls, view mean 197 \| teleportNear-sofa: cam (-2.67,1.09,-4.41) OUTSIDE SHELL dist 1.44 m, centre ray windows, view mean 196 \| teleportNear-bed: cam (-6.17,1.09,2.40) OUTSIDE SHELL dist 1.44 m, centre ray walls, view mean 197 \| hallway-wall: cam (-0.58,0.82,-0.55) inside dist 1.85 m, centre ray walls, view mean 137 |
| | **ADV** | | |
| A1 | grab while driving, release while moving | PASS | grab={"ok":true,"reason":null,"held":"mug_white"}; after drive+release held=null, robot (-2.89, 0.01, -1.55), mug y=0.084, errors=0 |
| A2 | click empty space does nothing bad | PASS | target before click=null, held after=null, errors 0->0 |
| A3 | spam grab/place 12x does not break physics | PASS | held=null, mug (-2.63, 0.52, -1.75), NaN=0, errors=0, dynamic=175 |
| A4 | repeated heavy pushes keep the sofa in the apartment | PASS | sofa (-2.50, 0.43, -2.76) -> (-2.50, 0.43, -2.76), moved 0.000 m, errors=0 |
| A5 | driving into furniture does not launch it or the robot | PASS | robot (-2.58, 0.01, -2.11), sofa moved 0.000 m, errors=0 |
| A6 | rapid view/surround/night toggles do not break the app | PASS | ready=true, mode=first, night=true, surround=false, errors=0, rAF fps after 60.1/52.3, calls 167 |
| A7 | resize during play keeps the app alive | PASS | robot moved 0.630 m while resizing; mid-resize overflow=0, errors 0->0, fps 60, map x=1244 |
| | **LOAD** | | |
| L5 | console/pageerrors still clean after the full suite | PASS | console=0, pageerrors=0, __APP__.errors=0, failed requests=0 |

## Bugs

### [P1] PH3 trash bin / laundry basket push > 0.03 m

- expected: pass (P1 gate)
- actual: trash_bin(1.6kg):0.3190m, laundry_basket(undefinedkg):no-hoverm — threshold >0.03 m
- repro: hover + qa.action() the trash bin and laundry basket from ~0.45 m, measure displacement
- automated repro: `node qa/functional/run.mjs` (gate PH3)

### [P2] H7b large-furniture PUSH label (sofa at closest reachable range)

- expected: pass (P2 gate)
- actual: closest approach 0.64 m, canReach(centre)=false, label "SOFA · 85 kg · OUT OF REACH" (expected SOFA · 85 kg · PUSH)
- repro: drive against the sofa, hover it and read the target label
- automated repro: `node qa/functional/run.mjs` (gate H7b)

### [P1] H18 third-person camera stays inside the apartment shell

- expected: pass (P1 gate)
- actual: backed-south-wall: cam (-2.76,1.35,-4.73) OUTSIDE SHELL dist 1.92 m, centre ray windows, view mean 189 | backed-west-wall-bedroom: cam (-6.49,1.35,2.62) OUTSIDE SHELL dist 1.92 m, centre ray walls, view mean 197 | teleportNear-sofa: cam (-2.67,1.09,-4.41) OUTSIDE SHELL dist 1.44 m, centre ray windows, view mean 196 | teleportNear-bed: cam (-6.17,1.09,2.40) OUTSIDE SHELL dist 1.44 m, centre ray walls, view mean 197 | hallway-wall: cam (-0.58,0.82,-0.55) inside dist 1.85 m, centre ray walls, view mean 137
- repro: back the robot against outer walls / furniture, then check the camera stays inside the shell and the view is not a flat wall
- automated repro: `node qa/functional/run.mjs` (gate H18)

## Numbers

- L1 ready and load <= 8 s: PASS — ready in 1123 ms
- L6 shader warm-up: first seconds are not a fps dip: PASS — first 2 s after ready: rAF 60.1 fps (121 frames); ready in 1123 ms; machine load 3.4/8 cores
- P1 fps >= 50 over 2 s (1440x900): PASS — rAF 56.3 fps (114 frames / 2.03 s), app counter 54
- P2 draw calls < 500: PASS — 306 draw calls
- P3 triangles < 250k: PASS — 63,622 triangles
- P4 10 s soak: fps >= 50, draw calls stable, no errors: PASS — sustained 56.4 fps over 10 s, per-second buckets 56.6,52.1,60,56.1,54.1,55.1,57.1,57.1,57.1,59 (min 52.1); app fps 56,50,60,54,50,54,54,60,54,58; calls 306-306; errors 0; load 4.6/8 cores; 11.1 s
- W5 >= 120 dynamic objects: PASS — 175 dynamic bodies, 197 objects, 368 colliders
- PH1 heavy furniture push < 0.01 m (7 objects): PASS — sofa(85kg):0.0001m, bed(75kg):0.0006m, wardrobe(120kg):0.0000m, fridge(95kg):0.0001m, bookshelf(42kg):0.0003m, dining_table(34kg):0.0033m, desk(26kg):0.0037m — threshold <0.01 m
- PH2 chair_1 (5.5 kg) push > 0.03 m: PASS — mass 5.5 kg, robot 0.50 m away, hover=chair_1, displacement 0.1135 m
- PH3 trash bin / laundry basket push > 0.03 m: FAIL — trash_bin(1.6kg):0.3190m, laundry_basket(undefinedkg):no-hoverm — threshold >0.03 m
- G8 laptop (1.6 kg) refused: payload is now 0.5 kg: PASS — laptop 1.6 kg vs arm 0.5 kg -> {"ok":false,"reason":"too_heavy","held":null}
- G9 arm lifts the mug >= 0.04 m when it grabs: PASS — grab={"ok":true,"reason":null,"held":"mug_white"}; mug y 0.515 -> 0.590 (rise 0.075 m)
- G10 aim-responsive carry: held mug rises/lowers with aim: PASS — grab={"ok":true,"reason":null,"held":"mug_white"}; mug y aim-high 0.588 vs aim-low 0.568 -> carry delta 0.021 m
- H7 target label shows mass + action (GRAB and PUSH): PASS — near mug: hover=mug_white canReach=true dist 0.28 m -> "MUG WHITE · 320 g · GRAB"; near chair_1: hover=chair_1 canReach=true dist 0.38 m -> "CHAIR 1 · 5.5 kg · PUSH"; far sofa (2.72 m) -> "SOFA · 85 kg · OUT OF REACH"
- H7b large-furniture PUSH label (sofa at closest reachable range): FAIL — closest approach 0.64 m, canReach(centre)=false, label "SOFA · 85 kg · OUT OF REACH" (expected SOFA · 85 kg · PUSH)
- H14 trajectory trail renders only on the minimap camera: PASS — trail points 0 -> 14; mesh layer2=true, outline layer2=true; top cam layer2=true, front/back/left/right layer2=false/false/false/false
- H15 touch controls: stick drives, drag looks, tap grabs: PASS — hud-touch on=true, hint "LEFT STICK DRIVE · DRAG LOOK · TAP GRAB"; stick moved robot 0.66 m (active=true, knob="translate(0px, 34px)"), stop drift 0.001 m; drag-look camera moved 0.95 m; tap grab held=mug_white, second tap held=null
- H16 control panel rows: H and R are separate rows: PASS — 9 rows; H row={"keys":["KeyH"],"act":"HINT"}; R row={"keys":["KeyR"],"act":"RESET"}
- H17 trail legend sits under the minimap and hides with 360: PASS — #hud-map-trail box {"x":1244,"y":200,"w":180,"h":10} vs map {"x":1244,"y":16,"w":180,"h":180} (under=true); text="TRAIL"; hidden on=false off=true
- H18 third-person camera stays inside the apartment shell: FAIL — backed-south-wall: cam (-2.76,1.35,-4.73) OUTSIDE SHELL dist 1.92 m, centre ray windows, view mean 189 | backed-west-wall-bedroom: cam (-6.49,1.35,2.62) OUTSIDE SHELL dist 1.92 m, centre ray walls, view mean 197 | teleportNear-sofa: cam (-2.67,1.09,-4.41) OUTSIDE SHELL dist 1.44 m, centre ray windows, view mean 196 | teleportNear-bed: cam (-6.17,1.09,2.40) OUTSIDE SHELL dist 1.44 m, centre ray walls, view mean 197 | hallway-wall: cam (-0.58,0.82,-0.55) inside dist 1.85 m, centre ray walls, view mean 137
- H1 4 panels + minimap show live scene (not black): PASS — panels front lit 1.00/mean 127, right lit 1.00/mean 139, left lit 1.00/mean 108, back lit 1.00/mean 125; map lit 1.00/mean 130
- H4 night toggle changes main luminance > 15%: PASS — main mean day 134.3 -> night 101.6 (24.3% change), state.night=true

## Screenshots

- [shots/02-file-url.png](shots/02-file-url.png)
- [shots/08-real-click-grab.png](shots/08-real-click-grab.png)
- [shots/03-first-person.png](shots/03-first-person.png)
- [shots/06-mobile-390x844.png](shots/06-mobile-390x844.png)
- [shots/07-resize-back-1440.png](shots/07-resize-back-1440.png)
- [shots/01-overview-1440.png](shots/01-overview-1440.png)

## Verdict: FIX

P0/P1 gates failed — fix the bugs above and re-run `node qa/functional/run.mjs`.
