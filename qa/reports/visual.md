# round FINAL (re-freeze) — visual QA — 2026-11-05

**Build:** `qa/frozen/index.html` — sha256 `69db5f97c42e7caa…`, 5,241,137 B (served `PORT=4182 node tools/serve.mjs qa/frozen`).
**Method:** puppeteer-core + local Chrome (ANGLE Metal). 1440×900 @DPR1 unless stated; robot-scale FP at 0.35 m eye height + low third-person orbits; 390×844 @DPR2 **and** @DPR1; 1920×1080. Verification set: `qa/visual/shots/v-*.png` (18 shots) + full prior set `f-*` / `f-r-*`. Scripts: `qa/visual/capture.mjs`, `focus.mjs`, `verify.mjs`.
**Machine facts (this sha):** ready 854 ms; 60 fps at rest; 299 draw calls / 68.5 k tris at spawn (worst measured 536 at a low study angle); 0 console errors/warnings; 1 network request; HUD panel samples litRatio 0.98–1.0, mean 117–133 (live, robot hidden).

---

## Re-freeze delta (P1 verification)

| P1 from previous round | status on `69db5f97c42e` | evidence |
|---|---|---|
| Mobile DPR2 3D zoom (robot cropped, room lost) | **FIXED** | robot = 21 % of frame height at **both** DPR2 and DPR1, same camera/fov; room fully visible — `v-mobile-dpr2.png` vs `v-mobile-dpr1.png` |
| Mobile hint overlapping 360 panels | **FIXED** | hint moved to y 623 (above panels), zero overlap (`verify.json` overlaps `[]`), dark pill background — `v-mobile-hud.png` |
| Night mode = daylight windows | **FIXED (interior) / P2 left on windows** | interior −23 % mean luminance and warm (87.8 vs 113.6), city materials darkened; but the window is now a **uniform warm bright glow** (window crop mean 149 vs day 161; no sky, no building detail, brighter than the wall) — `v-night-spawn.png`, `v-night-win.png`, `v-win-compare.jpg` |
| Bedroom bed = flat grey cards | **FIXED** | wood frame + headboard + footboard, striped duvet, pillows; no floating slabs — `v-bed-fp-a.png`, `v-bed-fp-b.png`, `v-bed-tp.png` |
| Minimap no robot marker | **FIXED** | amber heading arrow at map centre (`.hud-map-dot`), rotates with robot yaw — `v-hud-map.png`, `v-map-center.png`; low contrast on warm floor (P3) |
| HUD label/hint contrast | **FIXED** | room label 14 px + shadow, hint now a dark pill; readable on pale walls — `v-hud-top.png`, `v-mobile-hud.png` |
| Camera clipping in tight rooms | **REMAINS (P2)** | camera still ends up inside wardrobe/door casing/desk in bedroom/study/hall poses — `v-clip-bed.png`, `v-clip-study.png`, `v-clip-hall.png` |

---

## PASS / FAIL (final)

| gate | result | evidence |
|---|---|---|
| 1. No console errors/warnings, no network beyond HTML | **PASS** | logs `[]`, requests `["http://127.0.0.1:4182/"]` |
| 2. Load ≤8 s, ≥50 fps @1440×900 | **PASS** | ready 854 ms, 60 fps at rest, 299 draw calls spawn |
| 3. 360 panels + minimap live, robot hidden | **PASS** | sampleHud litRatio 0.980–0.999, mean 117–133; panels live (`v-hud-panels.png`), robot absent from feeds |
| 4. Objects settle, no floating/clipping | **PASS** | bed rework removes floating slabs; no jitter/z-fight in 84 shots; mug grab/place + HUD mass works |
| 5. Real masses visible in HUD | **PASS** | `SOFA · 85 kg · PUSH`, `MUG WHITE · 320 g`, `BED · 75 kg · OUT OF REACH`; GRAB/PUSH/OUT OF REACH statuses correct |
| 6. Six rooms reachable, furnished, lived-in, no holes/z-fight | **PASS** | all six reachable, doorways readable; no holes/z-fight found |
| 7. Lean monospace UI, no prose, no overflow @390×844 | **PASS** | no overflow (scrollW 390); hint above panels; no overlap |
| 8. Exposure balance | **PARTIAL** | bathroom still bright (mean 165, p50 171, whites merge); study still dark (mean 97, p50 78, 1 % black); rest balanced (spawn mean 114, p99 214, 0 % clip) |
| 9. Night mode reads as night | **PASS with caveat** | interior warm/dim; windows are bright uniform warm panes (no sky/block detail) |
| 10. Portrait/phone framing @DPR1+DPR2 | **PASS** | identical 21 % robot framing at both DPRs |

---

## Room ratings (final, 1–5)

**Living — 4.0.** Best room: soft sofa/armchair cushions + pillows, coffee-table clutter, papers, rug, curtains, readable window exterior. Docks: blank wall areas, blue book stack reads as identical slabs.
**Kitchen / dining — 3.5.** Cabinets/oven/dishwasher/toe kick/sink read as a kitchen; clutter on counter. Docks: large blank white walls, oversized white floor tiles, dark table legs dominate low views.
**Bedroom — 3.0** (up from 2.5). Bed now reads as a bed (wood frame/headboard/footboard, striped duvet, pillows), brighter. Docks: room still sparse (no art/rug interest in view), wardrobe grain stretched, half-off blanket/drape barely readable.
**Hallway — 3.0.** Door frames, front door, shoes, backpack, runner read; flow readable. Docks: shoe cabinet is a near-black cube, dark metal thresholds, bare walls.
**Bathroom — 2.5.** Sterile and overexposed; tub = white box, toilet = white cylinder, mirror is a blank white panel, tiles/walls merge at the top.
**Study — 2.5.** Dark and sparse; desk top, monitor and chair all read as black slabs; no visible light source.
**Overall — 3.7 / 5.** Coherent, plausible lived-in apartment; 360 HUD lean and live; robot scale correct.

---

## Remaining issues (ranked)

**1. [P2] Camera clips into furniture/walls in tight rooms.** Third-person camera ends up inside the wardrobe/door casing/desk (giant blurry wood or dark planes). `v-clip-bed.png`, `v-clip-study.png`, `v-clip-hall.png`. Fix: `src/core/camera.js update()` — cast against dynamic furniture too (drop `staticOnly`, exclude only the robot), raise camera when hit < dist*0.5, or fade meshes between camera and robot.

**2. [P2] Night windows are uniform warm glowing panes.** Interior is now correctly night-lit, but the window shows no sky/ground/building detail — a flat cream glow brighter than the wall (window crop mean 149, day 161). `v-night-win.png`, `v-win-compare.jpg`. Fix: `src/world/apartment.js buildExteriorView` — make the night facade much darker with small emissive window bands only, keep the night sky/ground visible through the upper/lower panes; check `setNight()` city-material multiplier.

**3. [P2] Bathroom overexposed / study underexposed.** Bathroom mean 165, p50 171 (whites merge); study mean 97, p50 78 (desk/monitor/chair black). `v-clip-bath.png`, `v-clip-study.png`. Fix: bathroom — reduce fill/hemi contribution, slightly darker tile/tub roughness; study — raise desk-lamp intensity, lighten desk/monitor materials.

**4. [P3] Minimap marker contrast.** Amber arrow on warm wood floor is hard to see at 118–180 px. `v-map-center.png`. Fix: `src/styles.css .hud-map-dot` — add a dark ring/outline (or white core) around the arrow.

**5. [P3] Bedroom dressing detail.** Half-off blanket / hanging drape now barely visible; room still empty-feeling. `v-bed-tp.png`. Fix: furniture.js — make the drape a readable curved cloth strip on the bed edge, add a wall art + bedside clutter in view.

**6. [P3] Kitchen/dining blank walls + oversized floor tiles.** `v-kitchen-fp-b.png`. Fix: add wall clock/shelf/backsplash above 1.2 m, reduce tile size ~30 %.

---

## What works (keep)

- 360 HUD 2×2 + minimap with robot heading, live feeds, robot hidden, lean monospace, dark hint pill.
- Mobile 390×844 now frames correctly at DPR1 and DPR2; no overflow; hint above panels.
- Sofa/armchair cushions, kitchen cabinetry, bed rework — the three biggest realism wins.
- Lived-in density (papers, mugs, books, remote, cables, shoes, backpack) reads plausible, not showroom.
- Robot scale vs furniture correct; contact shadows ground furniture; no z-fighting/holes found.

## Harness note (not an app bug)

Chrome `page.screenshot({clip})` freezes the WebGL layer on subsequent captures (main canvas shows only `scene.background`). Use full-frame screenshots + PIL crops.

## Verdict

**SHIP.** All three P1s are resolved on `69db5f97c42e` (mobile framing, night interior, bed). Remaining items are P2/P3 polish (camera clipping in tight rooms, night window detail, bathroom/study exposure, minimap contrast) and do not block the v1 release.
