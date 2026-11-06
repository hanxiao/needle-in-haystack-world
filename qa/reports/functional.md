# round 18 — functional QA — 2026-11-06 09:27:30Z

Build: `qa/frozen/index.html` sha256 `c8d3c46c6181a9a3`, 5.02 MB (5266858 bytes), mtime 2026-11-06T09:09:06.544Z
Environment: headless Chrome (Apple M2 Metal), 1440x900, Node v22.22.3, server http://127.0.0.1:4181/, machine load 3.4/3.7/4.3 on 8 cores
Suite: `node qa/functional/run.mjs` — 75 gates, 75 passed, 0 failed (P0 0, P1 0, P2 0)

## PASS/FAIL

| # | gate | result | evidence |
| --- | --- | --- | --- |
| | **LOAD** | | |
| L6 | shader warm-up: first seconds are not a fps dip | PASS | first 2 s after ready: rAF 60.0 fps (121 frames); ready in 920 ms; machine load 3.5/8 cores |
| | **BUILD** | | |
| B1 | dist size 3-9 MB | PASS | 5.02 MB (5266858 bytes) |
| B2 | no external http(s) refs in HTML | PASS | 0 external src/href/url() refs |
| B3 | WASM + all assets inlined (no .wasm fetch) | PASS | inline data:application/wasm=true, .wasm requests=0 |
| B4 | page works from file:// (frozen artifact) | PASS | ready from file:///qa/frozen/index.html, drawCalls=313, consoleErrors=0, pageErrors=0, shots/02-file-url.png |
| | **LOAD** | | |
| L1 | ready and load <= 8 s | PASS | ready in 920 ms |
| L2 | no console errors/warnings, no pageerrors | PASS | console errors/warnings=0, pageerrors=0, __APP__.errors=0 |
| L3 | no network beyond the single HTML | PASS | 1 request(s): / |
| L4 | no failed requests | PASS | 0 failed requests |
| | **PERF** | | |
| P1 | fps >= 50 over 2 s (1440x900) | PASS | rAF 60.2 fps (121 frames / 2.01 s), app counter 60, load 3.5/8 cores |
| P2 | draw calls < 500 | PASS | 313 draw calls |
| P3 | triangles < 250k | PASS | 65,166 triangles |
| P4 | 10 s soak: fps >= 50, draw calls stable, no errors | PASS | sustained 60.1 fps over 10 s, per-second buckets 60.6,60,60,60,60,60,60,60,60,60 (min 60); app fps 60,60,60,60,60,60,60,60,60,60; calls 313-313; errors 0; load 3.4/8 cores; 10.9 s |
| | **WORLD** | | |
| W1 | six rooms with plausible names | PASS | teleport probe: LIVING="LIVING ROOM", KITCHEN="KITCHEN / DINING", BEDROOM="BEDROOM", HALLWAY="HALLWAY", BATHROOM="BATHROOM", STUDY="STUDY"; world.rooms=6 |
| W2 | all six rooms reachable by real driving | PASS | living->hallway: OK \| hallway->bathroom: OK \| kitchen->study: OK \| living->kitchen: OK \| hallway->bedroom: OK |
| W3 | required objects exist | PASS | 16/16 present |
| W4 | realistic masses (kg) for required objects | PASS | sofa 85kg, fridge 95kg, bed 75kg, wardrobe 120kg, dining_table 34kg, chair_1 5.5kg, coffee_table 13kg, mug_white 0.32kg, laptop 1.6kg, needle 0.0012kg |
| W5 | >= 120 dynamic objects | PASS | 177 dynamic bodies, 201 objects, 374 colliders |
| W6 | no NaN positions (all bodies) | PASS | all positions finite |
| W7 | nothing below the floor (y < -0.1) | PASS | 0 objects below y=-0.1 |
| W8 | new bath bottles + object counts (201 objects / 177 dynamic) | PASS | 201 objects / 177 dynamic / 24 static / 374 colliders; bath_bottle_1 0.35 kg @ 0.75,1.55,2.32, bath_bottle_2 0.3 kg @ 0.75,1.53,2.58 |
| | **INPUT** | | |
| I1 | real W/S/A/D move the robot in 4 directions | PASS | {"KeyW":{"dx":-0.018,"dz":-0.759,"moved":0.759},"KeyS":{"dx":0,"dz":0.77,"moved":0.77},"KeyA":{"dx":-0.722,"dz":0.066,"moved":0.725},"KeyD":{"dx":0.681,"dz":0.094,"moved":0.687}} (robot v2: 0.40 m/s, 2.0 s holds) |
| I2 | Shift boost is faster than normal | PASS | normal 0.769 m / 2.0 s (0.38 m/s), boost 1.007 m (0.50 m/s), ratio 1.31 |
| I3 | mouse drag orbits the camera | PASS | camera moved 1.327 m, quat delta 0.425 |
| I4 | mouse wheel zooms the camera | PASS | camera distance 1.853 m -> 1.228 m (delta -0.624 m) |
| I5 | real mouse click grabs a liftable object, second click places it | PASS | target=mug_white @ (880,157); click1 held=mug_white; click2 held=null; vertical rest \|dy\| 0.0000 m, residual roll 0.000 m; shots/08-real-click-grab.png |
| I6 | wall collision keeps the robot inside the apartment | PASS | final (-3.67, 0.00, -3.56), min z -3.56, max \|x\| 3.67 (bounds x±5.6 z±3.8) |
| I7 | robot does not tunnel through the outer wall | PASS | max x reached 5.365 m (wall interior 5.6, body radius ~0.155), final x 5.365 |
| I8 | interior partition blocks the robot | PASS | stopped at z=0.465 (wall interior face z=0.7), room=LIVING ROOM |
| | **GRAB** | | |
| G1 | teleportNear(mug_white,0.33)+grabByName works | PASS | near=[-2.6725615233919706,0,-1.9897772372844664], robotY=0.012, mugY=0.581, objDist=0.26 m, grab={"ok":true,"reason":null,"held":"mug_white"}, held=mug_white |
| G2 | held HUD label shows name + mass + action | PASS | found=true, grab={"ok":true,"reason":null,"held":"mug_white"}, held=mug_white, held label: "HOLDING · MUG WHITE · 320 g · CLICK TO PLACE" |
| G3 | held object follows the robot while driving | PASS | held mug_white->mug_white; robot moved 0.589 m, mug moved 0.587 m, mug-robot distance 0.64 m |
| G4 | release drops the object and it settles | PASS | held before=mug_white, grab={"ok":true}; carry y 0.616 -> floor y 0.073 (dropped 0.54 m); vertical rest \|dy\| 0.0045 m over 1 s; residual roll 0.032 m/s (rug roll allowed) |
| G5 | grab sofa -> {ok:false, reason:"too_heavy"} | PASS | {"g":{"ok":false,"reason":"too_heavy","held":null},"held":null} |
| G6 | static object is refused | PASS | static=true, grab={"ok":false,"reason":"static","held":null} |
| G7 | needle (1.2 g) is liftable | PASS | grab={"ok":true,"reason":null,"held":"needle"}, held=needle, pose=[-2.93254132270813,-2.062004566192627], needleFound=true |
| G8 | laptop (1.6 kg) refused: payload is now 0.5 kg | PASS | laptop 1.6 kg vs arm 0.5 kg -> {"ok":false,"reason":"too_heavy","held":null} |
| G9 | arm lifts the mug >= 0.04 m when it grabs | PASS | grab={"ok":true,"reason":null,"held":"mug_white"}; mug y 0.515 -> 0.571 (rise 0.055 m) |
| G10 | aim-responsive carry: held mug rises/lowers with aim | PASS | grab={"ok":true,"reason":null,"held":"mug_white"}; mug y aim-high 0.626 vs aim-low 0.568 -> carry delta 0.058 m |
| | **PHYS** | | |
| PH1 | heavy furniture push < 0.01 m (7 objects) | PASS | sofa(85kg):0.0004m, bed(75kg):0.0005m, wardrobe(120kg):0.0000m, fridge(95kg):0.0001m, bookshelf(42kg):0.0002m, dining_table(34kg):0.0033m, desk(26kg):0.0037m — threshold <0.01 m |
| PH2 | chair_1 (5.5 kg) push > 0.03 m | PASS | mass 5.5 kg, robot 0.50 m away, hover=chair_1, displacement 0.1243 m |
| PH3 | trash bin / laundry basket push > 0.03 m | PASS | trash_bin(1.6kg):0.0626m, laundry_basket(1kg):0.8609m — threshold >0.03 m |
| PH4 | 10 untouched dynamic objects drift < 0.02 m over 3 s | PASS | 10 objects, max drift 0.0000 m over 3 s (shelf_book_1:0.000, shelf_book_7:0.000, shelf_book_12:0.000, shelf_book_16:0.000, shelf_book_19:0.000, cushion_1:0.000, cushion_2:0.000, cushion_3:0.000, mug_blue:0.000, book_2:0.000) |
| PH5 | stacked objects stay stacked | PASS | 8 supported items held position (max \|dy\| 0.0000 m) |
| PH6 | qa.reset() restores robot spawn and objects | PASS | spawn (-3.6,0,-1.2) restored delta 0.000 m; mug restored delta 0.000 m (had been moved 1.41 m); held=null |
| | **HUD360** | | |
| H1 | 4 panels + minimap show live scene (not black) | PASS | panels front lit 1.00/mean 110, right lit 1.00/mean 125, left lit 1.00/mean 126, back lit 1.00/mean 139; map lit 1.00/mean 148 |
| H2 | robot hidden from the HUD feeds | PASS | front panel mean: normal 107.49, robot forced visible 93.78 (delta +-13.70), restored 107.49; map delta 0.09 |
| H3 | C toggles 360 HUD off (clears) and back on | PASS | surround=false; .hud-cam is-hidden=[true,true,true,true]; panel mean 107.5 -> 0.0; toggled back=true |
| H4 | night toggle changes main luminance > 15% | PASS | main mean day 131.2 -> night 91.3 (30.4% change), state.night=true |
| H5 | first-person camera mode works | PASS | mode=first, camera 0.33 m from robot, main mean 84, back to third; shots/03-first-person.png |
| | **HUD** | | |
| H6 | room label follows the robot | PASS | LIVING:"LIVING ROOM", KITCHEN:"KITCHEN / DINING", BEDROOM:"BEDROOM", HALLWAY:"HALLWAY", BATHROOM:"BATHROOM", STUDY:"STUDY" |
| H7 | target label shows mass + action (GRAB and PUSH) | PASS | near mug: hover=mug_white canReach=true dist 0.28 m -> "MUG WHITE · 320 g · GRAB"; near chair_1: hover=chair_1 canReach=true dist 0.38 m -> "CHAIR 1 · 5.5 kg · PUSH"; far sofa (2.72 m) -> "SOFA · 85 kg · OUT OF REACH" |
| H7b | large-furniture PUSH label (sofa at closest reachable range) | PASS | closest approach 0.64 m, canReach(centre)=false, nearest pointer hit 0.667 m from shoulder, label "SOFA · 85 kg · PUSH" (expected SOFA · 85 kg · PUSH) |
| H8 | UI text is lean (no paragraphs) | PASS | {"room":"LIVING ROOM","target":"SOFA · 85 kg · PUSH","held":null,"hint":"WASD DRIVE · DRAG LOOK · CLICK GRAB · V/C/L"} |
| H9 | no layout overflow at 390x844 (screenshot) | PASS | viewport 390x844; feed/map overflow=0; #hud element overflow=[]; scroll 390x844; shots/06-mobile-390x844.png |
| H9b | mobile DPR 2: viewport units + canvas sizes stay 1:1 | PASS | dpr=2 viewport 390x844; canvas [780,1688] vs css*dpr [780,1688]; hudCanvas [780,1688] (1x ok); feed overflow=0; #hud overflow=0; front feed lit=0.99/mean 129 |
| H10 | resize back to 1440x900 restores the layout | PASS | viewport 1440x900; map x=1244 y=16 180x180; panels bottom-left=true; rAF fps 60.4/60.5; app fps 60; drawCalls 280; shots/07-resize-back-1440.png |
| H11 | control panel exists with keycaps + arm badge | PASS | #hud-controls=true, 13 keycaps, missing=[], arm="ARM 500 g · 0.34 M", badges THIRD/ON/DAY |
| H12 | keycaps highlight on real keydown | PASS | W keycap: before=false held=true released=false; active keycaps while W held=["KeyW"]; Shift held=true released=false |
| H13 | badges follow real V/C/L toggles | PASS | initial THIRD/ON/DAY; V -> FIRST; C -> OFF; L -> NIGHT |
| | **HUD360** | | |
| H14 | trajectory trail renders only on the minimap camera | PASS | trail points 0 -> 13; mesh layer2=true, outline layer2=true; top cam layer2=true, front/back/left/right layer2=false/false/false/false |
| | **HUD** | | |
| H15 | touch controls: stick drives, drag looks, tap grabs | PASS | hud-touch on=true, hint "LEFT STICK DRIVE · DRAG LOOK · TAP GRAB"; stick moved robot 0.70 m (active=true, knob="translate(0px, 34px)"), stop drift 0.003 m; drag-look camera moved 0.95 m; tap grab held=mug_white, second tap held=null |
| H16 | control panel rows: H and R are separate rows | PASS | 9 rows; H row={"keys":["KeyH"],"act":"HINT"}; R row={"keys":["KeyR"],"act":"RESET"} |
| H17 | trail legend sits under the minimap and hides with 360 | PASS | #hud-map-trail box {"x":1244,"y":200,"w":180,"h":10} vs map {"x":1244,"y":16,"w":180,"h":180} (under=true); text="TRAIL"; hidden on=false off=true |
| H18 | third-person camera stays inside the apartment shell | PASS | backed-south-wall: cam (-3.62,1.11,-3.45) inside dist 1.52 m, centre ray sofa, view mean 90 \| backed-west-wall-bedroom: cam (-5.20,1.11,3.48) inside dist 1.52 m, centre ray bed, view mean 103 \| teleportNear-sofa: cam (-2.51,0.34,-3.61) inside dist 0.36 m, centre ray sofa, view mean 69 \| teleportNear-bed: cam (-5.21,0.90,1.99) inside dist 0.98 m, centre ray walls, view mean 102 \| hallway-wall: cam (-0.58,0.82,-0.55) inside dist 1.85 m, centre ray coat_rack, view mean 136 |
| | **HUD360** | | |
| H19 | minimap coverage: 4.5 m half-width (top cam fov 122) | PASS | top camera fov 122 at world y 2.5 m -> 4.51 m half-width (target 4.5 m); minimap lit 1.00/mean 137 |
| H20 | LED ring/bumper colours differ by state | PASS | idle 0xffa22a, move 0x53e08a, boost 0x39d7ff, held 0x3f6bff (held=mug_white), push 0xff5222 (found=true) — want 0xffa22a/0x53e08a/0x39d7ff/0x3f6bff/0xff5222 |
| | **ADV** | | |
| A1 | grab while driving, release while moving | PASS | grab={"ok":true,"reason":null,"held":"mug_white"}; after drive+release held=null, robot (-3.28, 0.01, -1.28), mug y=0.515, errors=0 |
| A2 | click empty space does nothing bad | PASS | target before click=null, held after=null, errors 0->0 |
| A3 | spam grab/place 12x does not break physics | PASS | held=candle, mug (-2.76, 0.52, -1.69), NaN=0, errors=0, dynamic=177 |
| A4 | repeated heavy pushes keep the sofa in the apartment | PASS | sofa (-2.50, 0.43, -2.76) -> (-2.50, 0.43, -2.75), moved 0.001 m, errors=0 |
| A5 | driving into furniture does not launch it or the robot | PASS | robot (-2.58, 0.01, -2.11), sofa moved 0.000 m, errors=0 |
| A6 | rapid view/surround/night toggles do not break the app | PASS | ready=true, mode=first, night=true, surround=false, errors=0, rAF fps after 60.4/60.1 (load 3.0/8), calls 233 |
| A7 | resize during play keeps the app alive | PASS | robot moved 0.626 m while resizing; mid-resize overflow=0, errors 0->0, fps 60, map x=1244 |
| | **LOAD** | | |
| L5 | console/pageerrors still clean after the full suite | PASS | console=0, pageerrors=0, __APP__.errors=0, failed requests=0 |

## Bugs

No failures in this round.
## Numbers

- L1 ready and load <= 8 s: PASS — ready in 920 ms
- L6 shader warm-up: first seconds are not a fps dip: PASS — first 2 s after ready: rAF 60.0 fps (121 frames); ready in 920 ms; machine load 3.5/8 cores
- P1 fps >= 50 over 2 s (1440x900): PASS — rAF 60.2 fps (121 frames / 2.01 s), app counter 60, load 3.5/8 cores
- P2 draw calls < 500: PASS — 313 draw calls
- P3 triangles < 250k: PASS — 65,166 triangles
- P4 10 s soak: fps >= 50, draw calls stable, no errors: PASS — sustained 60.1 fps over 10 s, per-second buckets 60.6,60,60,60,60,60,60,60,60,60 (min 60); app fps 60,60,60,60,60,60,60,60,60,60; calls 313-313; errors 0; load 3.4/8 cores; 10.9 s
- W5 >= 120 dynamic objects: PASS — 177 dynamic bodies, 201 objects, 374 colliders
- PH1 heavy furniture push < 0.01 m (7 objects): PASS — sofa(85kg):0.0004m, bed(75kg):0.0005m, wardrobe(120kg):0.0000m, fridge(95kg):0.0001m, bookshelf(42kg):0.0002m, dining_table(34kg):0.0033m, desk(26kg):0.0037m — threshold <0.01 m
- PH2 chair_1 (5.5 kg) push > 0.03 m: PASS — mass 5.5 kg, robot 0.50 m away, hover=chair_1, displacement 0.1243 m
- PH3 trash bin / laundry basket push > 0.03 m: PASS — trash_bin(1.6kg):0.0626m, laundry_basket(1kg):0.8609m — threshold >0.03 m
- G8 laptop (1.6 kg) refused: payload is now 0.5 kg: PASS — laptop 1.6 kg vs arm 0.5 kg -> {"ok":false,"reason":"too_heavy","held":null}
- G9 arm lifts the mug >= 0.04 m when it grabs: PASS — grab={"ok":true,"reason":null,"held":"mug_white"}; mug y 0.515 -> 0.571 (rise 0.055 m)
- G10 aim-responsive carry: held mug rises/lowers with aim: PASS — grab={"ok":true,"reason":null,"held":"mug_white"}; mug y aim-high 0.626 vs aim-low 0.568 -> carry delta 0.058 m
- H7 target label shows mass + action (GRAB and PUSH): PASS — near mug: hover=mug_white canReach=true dist 0.28 m -> "MUG WHITE · 320 g · GRAB"; near chair_1: hover=chair_1 canReach=true dist 0.38 m -> "CHAIR 1 · 5.5 kg · PUSH"; far sofa (2.72 m) -> "SOFA · 85 kg · OUT OF REACH"
- H7b large-furniture PUSH label (sofa at closest reachable range): PASS — closest approach 0.64 m, canReach(centre)=false, nearest pointer hit 0.667 m from shoulder, label "SOFA · 85 kg · PUSH" (expected SOFA · 85 kg · PUSH)
- H14 trajectory trail renders only on the minimap camera: PASS — trail points 0 -> 13; mesh layer2=true, outline layer2=true; top cam layer2=true, front/back/left/right layer2=false/false/false/false
- H15 touch controls: stick drives, drag looks, tap grabs: PASS — hud-touch on=true, hint "LEFT STICK DRIVE · DRAG LOOK · TAP GRAB"; stick moved robot 0.70 m (active=true, knob="translate(0px, 34px)"), stop drift 0.003 m; drag-look camera moved 0.95 m; tap grab held=mug_white, second tap held=null
- H16 control panel rows: H and R are separate rows: PASS — 9 rows; H row={"keys":["KeyH"],"act":"HINT"}; R row={"keys":["KeyR"],"act":"RESET"}
- H17 trail legend sits under the minimap and hides with 360: PASS — #hud-map-trail box {"x":1244,"y":200,"w":180,"h":10} vs map {"x":1244,"y":16,"w":180,"h":180} (under=true); text="TRAIL"; hidden on=false off=true
- H18 third-person camera stays inside the apartment shell: PASS — backed-south-wall: cam (-3.62,1.11,-3.45) inside dist 1.52 m, centre ray sofa, view mean 90 | backed-west-wall-bedroom: cam (-5.20,1.11,3.48) inside dist 1.52 m, centre ray bed, view mean 103 | teleportNear-sofa: cam (-2.51,0.34,-3.61) inside dist 0.36 m, centre ray sofa, view mean 69 | teleportNear-bed: cam (-5.21,0.90,1.99) inside dist 0.98 m, centre ray walls, view mean 102 | hallway-wall: cam (-0.58,0.82,-0.55) inside dist 1.85 m, centre ray coat_rack, view mean 136
- H1 4 panels + minimap show live scene (not black): PASS — panels front lit 1.00/mean 110, right lit 1.00/mean 125, left lit 1.00/mean 126, back lit 1.00/mean 139; map lit 1.00/mean 148
- H4 night toggle changes main luminance > 15%: PASS — main mean day 131.2 -> night 91.3 (30.4% change), state.night=true

## Screenshots

- [shots/02-file-url.png](shots/02-file-url.png)
- [shots/08-real-click-grab.png](shots/08-real-click-grab.png)
- [shots/03-first-person.png](shots/03-first-person.png)
- [shots/06-mobile-390x844.png](shots/06-mobile-390x844.png)
- [shots/07-resize-back-1440.png](shots/07-resize-back-1440.png)
- [shots/01-overview-1440.png](shots/01-overview-1440.png)

## Verdict: SHIP

No failed P0/P1 gates. Build is shippable from a functional standpoint.
