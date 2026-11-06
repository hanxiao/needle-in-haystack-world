# round FINAL — visual QA — 2026-11-05

**Build:** `qa/frozen/index.html` — sha256 `b13f43dece949ba2…`, 5,237,156 B (served `PORT=4182 node tools/serve.mjs qa/frozen`).
**Method:** puppeteer-core + local Chrome (ANGLE Metal), 1440×900 @DPR1 unless stated; robot-scale first-person at 0.35 m eye height + low third-person orbits (pitch 0.12–0.22, dist 0.85–1.5); 390×844 @DPR2 + DPR1 control; 1920×1080. 66 screenshots in `qa/visual/shots/` (`f-*` = capture set, `f-r-*` = focus set). No `src/**` edits.
**Machine facts:** ready in 1.4 s; 60 fps at rest (1440×900); 296 draw calls / 66 k tris at spawn (worst measured 536 at a low study angle); 0 console errors/warnings; 1 network request (the HTML itself).

---

## PASS / FAIL

| gate | result | evidence |
|---|---|---|
| 1. No console errors/warnings, no network beyond HTML | **PASS** | logs `[]`, requests `["http://127.0.0.1:4182/"]` |
| 2. Load ≤8 s, ≥50 fps @1440×900 | **PASS** | ready 1406 ms, 60 fps at rest, 296 draw calls spawn |
| 3. 360 panels + minimap live, robot hidden | **PASS** | `sampleHud` litRatio 0.985–0.999, mean 121–137; panels show live scene; robot absent from feeds (`f-hud-panels.png`) |
| 4. Objects settle, no floating/clipping | **PARTIAL** | no jitter/z-fight seen; but bed blanket + "hanging drape" read as floating flat cards (`f-r-bedroom-fp-a.png`, `f-bed-fp.png`); mug grab/place works (`f-held-front.png`) |
| 5. Real masses shown in HUD | **PASS** | `SOFA · 85 kg · PUSH`, `MUG WHITE · 320 g`, `COFFEE TABLE · 13 kg · OUT OF REACH`; statuses GRAB/PUSH/OUT OF REACH correct |
| 6. Six rooms reachable, furnished, lived-in, no holes/z-fight | **PASS with caveats** | all six reachable + doorways readable; no holes/z-fight; bedroom/bath/study sparse (below) |
| 7. Lean monospace UI, no prose, no overflow @390×844 | **FAIL** | no overflow (`scrollW 390`), text is lean; but the hint line **overlaps the bottom 360 panels** by 9 px (left 13.3 px, back 81 px overlap) — `f-mobile-hud.png` |
| 8. Exposure balance (visual) | **FAIL (localised)** | bathroom blown: mean 183, p50 192, wall/tub merge (`f-bath-fp.png`, `f-bath-a-tub.png`); study crushed: mean 84, p50 72, 6.7 % pixels ≤6 (`f-stu-fp.png`); rest OK (spawn mean 117, p99 217, 0 % clip) |
| 9. Night mode reads as night | **FAIL** | interior dims/warms but **windows + exterior stay daylit** (pale sky, bright green trees) — `f-night-spawn.png` vs `f-spawn-default.png` |
| 10. Portrait/phone framing (390×844) | **FAIL** | at DPR2 the 3D view is ~1.55× zoomed vs DPR1: robot cropped at top, room lost — `f-mobile-spawn.png` vs `f-mobile-dpr1-spawn.png` |

---

## Room ratings (1–5)

**Living — 4.0 / 5.** Best room. Soft ellipsoid sofa cushions + pillows now read as a real sofa; armchair, bookshelf, coffee-table clutter (mugs, laptop, books, tissue box, remote), papers on floor, rug, curtains. Sun direction is visible on the wall. Docks: large blank wall areas; coffee-table book stack is 3 identical blue slabs; window exterior is big green blobs. `f-spawn-default.png`, `f-r-living-fp-a.png`, `f-liv-b-window.png`.

**Kitchen / dining — 3.5 / 5.** Cabinet run now has recessed door/drawer panels, dishwasher front, oven, toe kick, sink, bottles, plant — reads as a kitchen. Docks: huge blank white walls above the counter (no backsplash above 1.2 m, no wall clock in view), floor tiles very large/white, dining table's black underside/legs dominate the low view, counter still sparse. `f-r-kitchen-fp-b.png`, `f-kit-a-counter.png`, `f-kit-b-dining.png`.

**Bedroom — 2.5 / 5.** Weakest. Mattress/duvet/blanket/headboard/drape are a stack of flat grey/white slabs; the "half-off blanket" and "hanging drape" look like floating cards; room is dark and empty (no rug/art/wall interest in view). Wardrobe wood grain is stretched. `f-r-bedroom-fp-a.png`, `f-r-bedroom-fp-b.png`, `f-bed-a-bed.png`.

**Hallway — 3.0 / 5.** Door frames, front door, shoes, backpack, runner, coat rack read correctly; doorway flow (living↔hall↔bed/bath, kitchen↔study) is now readable. Docks: shoe cabinet renders as a near-black cube, thresholds are wide dark grey metal strips, walls bare. `f-r-hall-fp-a.png`, `f-door-living-hall.png`, `f-door-front.png`.

**Bathroom — 2.5 / 5.** Clean but sterile and overexposed; tub = white box with rounded rim, toilet = white cylinder+box, mirror is a blank white panel (no reflection), walls/tiles merge at the top. `f-bath-fp.png`, `f-bath-b-vanity.png`, `f-door-hall-bath.png`.

**Study — 2.5 / 5.** Dark, sparse; desk top, monitor and chair all read as black slabs; shelf has a few coloured boxes; cable on floor is a nice touch but the room has no light source visible. `f-stu-fp.png`, `f-r-study-tp.png`, `f-door-kit-study.png`.

**Overall experience — 3.5 / 5.** Coherent, plausible lived-in apartment at 1440×900; 360 HUD works and is lean; the robot scale vs furniture reads correctly. Loses points on the flat bed, sterile bathroom, night exterior and mobile framing.

---

## Top issues (ranked by impact)

**1. [P1] Phone/portrait 3D framing is broken (DPR-dependent).** At 390×844 @DPR2 the robot fills/crops the top half and the room is gone; at the same viewport @DPR1 the framing is correct (robot = 22 % of frame height, room visible). Camera pos/quat/fov are identical in both cases (fov 55), so this is the pixel-ratio/projection path, not gameplay. Evidence: `f-mobile-spawn.png` (DPR2) vs `f-mobile-dpr1-spawn.png` (DPR1). Fix: `src/core/renderer.js resize()` — after `setPixelRatio()`/`setSize()` re-assert `camera.aspect = w/h; camera.updateProjectionMatrix()` (and check the canvas CSS box vs buffer); add a portrait rule in `src/core/camera.js` (e.g. `dist *= 1.5`, `pitch = min(pitch, 0.24)`, or widen fov when aspect < 0.75).

**2. [P1] Night mode: interior goes warm/dim, exterior stays daylight.** Windows show pale-blue sky and bright green tree canopies at night; the room still reads bright. Evidence: `f-night-spawn.png` vs `f-spawn-default.png` (mean 89 vs 117, but window pixels unchanged). Fix: `src/core/renderer.js setNight()` — also darken the `city_view` batch (multiply its material colour / add a night light), tint the window glass, and lower `hemi`/`fill` a bit more; ideally add a faint warm pool under each ceiling lamp.

**3. [P1] Bedroom bed reads as flat cards.** Duvet, blanket and "hanging drape" are untextured flat slabs; the drape floats mid-air; no pillows visible from the door. Evidence: `f-r-bedroom-fp-a.png`, `f-r-bedroom-fp-b.png`, `f-bed-fp.png`. Fix: `src/world/furniture.js` bed — give the duvet a box with rounded edges + slight sag (2–3 segments), model the drape as a curved cloth strip attached at the bed edge, add 2 rounded pillows with a seam, and use `fabricLinen`/`fabricWool` roughness variation so the slabs read as cloth.

**4. [P2] Third-person camera clips into furniture/walls in tight rooms.** Giant blurry wood/beige planes from inside the wardrobe, door leaves and desk (bedroom, bathroom, study, hallway). Evidence: `f-bed-a-bed.png`, `f-bed-b-corner.png`, `f-stu-a-desk.png`, `f-bath-a-tub.png`, `f-hall-b-back.png`. Fix: `src/core/camera.js update()` — cast the camera ray against **dynamic** furniture too (drop `staticOnly`, exclude only the robot), and if the hit is closer than `dist*0.5` also raise the camera slightly; or fade/hide meshes between camera and robot.

**5. [P2] Minimap has no robot marker/heading and is mislabelled.** It is a raw top-down render (~2 m radius) with a "SURROUND" tag inside it; you cannot tell where you are or which way you face. Evidence: `f-hud-map.png`. Fix: `src/ui/hud.js` / `src/core/renderer.js renderHud` — draw a robot dot + heading wedge as a DOM/SVG overlay on the map, move the `SURROUND` tag to the 4-panel block, and widen the map camera (~4 m) or draw a room-outline backdrop.

**6. [P2] Exposure is uneven per room.** Bathroom blows out (mean 183, p50 192, whites merge), study crushes (mean 84, p50 72, 6.7 % black). Evidence: `f-bath-fp.png`, `f-bath-a-tub.png`, `f-stu-fp.png`. Fix: bathroom — drop `fill`/`hemi` contribution and give tub/tiles a slightly darker roughness; study — raise the desk-lamp intensity and lighten the desk/monitor materials (`plasticDark` → `metalDark`).

**7. [P2] HUD text contrast on light surfaces.** Room label + hint are `rgba(233,230,223,0.55)` over pale walls/wood floor; readable but weak; mobile hint overlaps the panels. Evidence: `f-hud-top.png`, `f-mobile-hud.png`. Fix: `src/styles.css` — put a subtle dark pill/scrim behind `.hud-room`/`.hud-hint` (or raise opacity to 0.8) and on mobile move `.hud-hint` above the panel block (`bottom: calc(panel height + 12px)`).

**8. [P2] Exterior reads as flat bands.** Through windows: pale sky + oversized green tree blobs; distant blocks are not visible at 0.35 m eye height, no hedge/ground detail, no horizon. Evidence: `f-spawn-default.png`, `f-w-win-*.png`. Fix: `src/world/apartment.js buildExteriorView` — shrink/densify tree canopies (2–3 m), add a low hedge/shrub line at 1–1.5 m and a distant skyline band visible through the upper third of windows; tint at night.

**9. [P3] Small material/detail misses.** Bathroom mirror is a blank white panel (`f-door-hall-bath.png`); doorway thresholds are wide dark-grey metal strips; sofa's wooden armrest/shelf reads as a floating plank from the front (`f-held-front.png`); wardrobe grain stretched vertically (`f-bed-b-corner.png`). Fix: `src/core/materials.js` mirror → envMap reflection or fake gradient; `src/world/apartment.js` thresholds → wood/brass; furniture sofa shelf → attach with visible brackets.

---

## What works (keep)

- 360 HUD: 2×2 F/R/B/L + minimap, live feeds, robot hidden, labels + thin borders; lean monospace, no prose.
- Sofa/armchair soft cushions and pillows (this build) finally read as furniture; kitchen cabinetry detail (recessed panels, dishwasher, oven, toe kick) is convincing.
- Lived-in density: papers on floor, mugs/books/remote/laptop on the coffee table, cables, shoes, backpack, laundry basket, tipped objects — plausible, not a showroom.
- Robot scale vs furniture is correct (0.42 m robot; table top just above its head; sofa seat at chest height).
- Contact shadows/grounding under furniture read well; no obvious z-fighting or holes found in 66 shots.
- Holding/placing works and is visible in third person (`f-held-front.png`, `f-placed-front.png`, `HOLDING · MUG WHITE · 320 g`).

## Harness note (not an app bug)

Chrome `page.screenshot({clip})` freezes the WebGL layer on subsequent captures (main canvas shows only `scene.background`). Use full-frame screenshots + PIL crops, as this report does. `qa/visual/capture.mjs` and `qa/visual/focus.mjs` are the reusable scripts.

## Verdict

**SHIP** for the v1 desktop target (1440×900/1920×1080): coherent, playable, lived-in, gates 1–6 pass. **FIX before promoting mobile or night mode**: issues 1 (DPR2 portrait framing), 2 (night exterior) and 3 (bed) are the three that a player will notice immediately; 4–9 are polish.
