# round FINAL (polish) — visual QA — 2026-11-05

**Build:** `qa/frozen/index.html` — sha256 `42401d87a7047d92…`, 5,241,529 B (served `PORT=4182 node tools/serve.mjs qa/frozen`).
**Method:** puppeteer-core + local Chrome (ANGLE Metal); 1440×900 @DPR1, robot-scale FP 0.35 m + low third-person orbits; 390×844 @DPR1/DPR2; 1920×1080. Spot-check set: `qa/visual/shots/s-*.png` (12); full sets `v-*`, `f-*`, `f-r-*`. Scripts: `qa/visual/{capture,focus,verify,spot}.mjs`.
**Machine facts (this sha):** ready 861 ms; 60 fps at rest; **236** draw calls / 68.5 k tris at spawn; 0 console errors/warnings; 1 network request; HUD samples litRatio 0.98–1.0, mean 117–133.

---

## Polish delta (spot-check on `42401d87a704`)

| item | status | evidence |
|---|---|---|
| Night windows: uniform glowing pane | **FIXED** | window crop mean **112.8** vs day **160.3** (−30 %), dark facade with subtle emissive bands, sky/ground read as night — `s-night-spawn.png`, `s-night-living.png`, `s-night-win.png`, `s-win-compare.jpg` |
| Study too dark | **FIXED** | study FP mean **119.7** (was 84); desk/chair/drawers readable — `s-study-fp.png` |
| Bathroom lamp down | **PARTIAL** | bathroom mean **171.6** (was 183) — still the brightest room, tub/toilet merge into wall — `s-bath-fp.png` |
| Camera sphere push-out (wardrobe/bed/desk) | **MOSTLY FIXED** | no more full-screen blurry planes; camera still sits very close to the laundry basket (bed pose) and the door leaf/casing (hall pose) — `s-clip-bed.png`, `s-clip-hall.png` |
| Minimap dot dark halo | **FIXED** | amber heading arrow with dark halo at map centre — `s-hud-map.png`, `s-map-zoom.png` |

---

## PASS / FAIL (final)

| gate | result | evidence |
|---|---|---|
| 1. No console errors/warnings, no network beyond HTML | **PASS** | logs `[]`, single request |
| 2. Load ≤8 s, ≥50 fps @1440×900 | **PASS** | ready 861 ms, 60 fps, 236 draw calls spawn |
| 3. 360 panels + minimap live, robot hidden | **PASS** | sampleHud litRatio 0.980–0.999, mean 117–133 |
| 4. Objects settle, no floating/clipping | **PASS** | no jitter/z-fight in 96 shots; bed/mug states correct |
| 5. Real masses visible in HUD | **PASS** | `SOFA · 85 kg · PUSH`, `MUG WHITE · 320 g`, `BED · 75 kg · OUT OF REACH` |
| 6. Six rooms reachable, furnished, lived-in, no holes/z-fight | **PASS** | all six reachable, doorways readable |
| 7. Lean monospace UI, no overflow @390×844 | **PASS** | no overflow, hint above panels, no overlap |
| 8. Exposure balance | **PARTIAL** | bathroom still bright (mean 171.6, p50 184); everything else balanced (spawn 113.5, p99 214, 0 % clip) |
| 9. Night mode reads as night | **PASS** | interior −27 % vs day (83.0 vs 113.5); windows dark (−30 % vs day crop) |
| 10. Portrait/phone framing @DPR1+DPR2 | **PASS** | identical 21 % robot framing at both DPRs (`v-mobile-dpr1/dpr2.png`) |

---

## Room ratings (1–5)

**Living — 4.0.** Soft sofa/armchair cushions + pillows, lived-in clutter, papers, rug, curtains, exterior visible. Docks: blank wall areas.
**Kitchen / dining — 3.5.** Cabinets/oven/dishwasher/toe kick/sink read as a kitchen; clutter on counter. Docks: large blank walls, oversized white floor tiles, dark table legs dominate low views.
**Bedroom — 3.0.** Bed reads as a bed (wood frame/headboard/footboard, striped duvet, pillows). Docks: sparse, wardrobe grain stretched, drape barely readable.
**Hallway — 3.0.** Door frames, front door, shoes, backpack, runner read; flow readable. Docks: shoe cabinet near-black cube, dark thresholds, bare walls, camera clips into door leaf in the back-of-hall pose.
**Bathroom — 2.5.** Sterile and still overexposed; tub = white box, toilet = white cylinder, mirror blank white panel.
**Study — 3.0** (up from 2.5). Now properly lit: wood desk with drawers, black chair, monitor, cable on floor. Docks: black chair/monitor still read as slabs, sparse shelving.
**Overall — 3.8 / 5.** Coherent, plausible lived-in apartment; lean live 360 HUD; correct robot scale.

---

## Remaining issues (P2/P3 only, non-blocking)

1. **[P2] Bathroom exposure** — mean 171.6, p50 184; tub/toilet/tiles merge. `s-bath-fp.png`. Fix: `src/core/renderer.js` bathroom lamp intensity −20 %, slightly darker `tileWall`/`ceramicWhite` roughness.
2. **[P2] Third-person camera still hugs dynamic furniture in tight poses** — laundry basket fills ~35 % of frame in the bedroom back pose, door leaf/casing fills ~45 % in the hallway back pose. `s-clip-bed.png`, `s-clip-hall.png`. Fix: extend `camera.js` push-out to dynamic colliders too (or fade meshes within 0.35 m of the camera).
3. **[P3] Minimap dot contrast** — arrow visible with halo but small on warm wood; `s-map-zoom.png`. Optional: white core + 1 px black ring.
4. **[P3] Bedroom dressing** — half-off blanket/drape barely readable; add a wall art + bedside clutter in the door view.
5. **[P3] Kitchen/dining blank walls + oversized floor tiles**; `s-win-day`-adjacent kitchen views.

---

## Verdict

**SHIP.** Final polish resolves the night-window and study-lighting items; camera push-out removes the full-screen clipping planes; minimap dot + night facade verified. Only P2/P3 polish remains (bathroom exposure, camera hugging dynamic furniture in extreme poses). No P1 found on `42401d87a704`.
