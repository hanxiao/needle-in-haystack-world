# round 3 FINAL — visual QA — 2026-11-06

**Build:** `qa/frozen/index.html` — sha256 `eef3be85f2ab494b…`, 5,261,883 B (served `PORT=4182 node tools/serve.mjs qa/frozen`).
**Method:** puppeteer-core + local Chrome (ANGLE Metal); 1440×900 @DPR1; 390×844 @DPR2 **with touch emulation** (`hasTouch`/`isMobile`); 1920×1080. Round-3 set: `qa/visual/shots/r3-*.png`; scripts `qa/visual/round3.mjs`, `mobile3.mjs`, `robot3.mjs`.
**Machine facts (this sha):** ready 997 ms; 60 fps at rest; 312 draw calls / 64 k tris at spawn; 0 console errors/warnings; 1 network request; HUD samples litRatio 0.98–1.0, mean 116–131.

---

## Round-3 checks

| # | item | result | evidence |
|---|---|---|---|
| 1 | Camera tight-space fix (sofa / bed / wardrobe / under coffee table) | **PASS** | camera stays outside all four furniture bboxes: sofa cam y 1.11 (sofa top 0.87), bed cam y 1.40 (bed top 1.18), wardrobe cam outside, under-table cam y 0.70 above table top 0.47 — `r3-cam-sofa.png`, `r3-cam-bed.png`, `r3-cam-wardrobe.png`, `r3-cam-under-table.png`; measured in `round3.json → cam.*.inside = false` |
| 2 | Bathroom rebalance + kitchen rail + bookshelf books | **PASS** | bathroom mean **133** (FP tub) / **145** (TP) vs 172 before, cooler green-grey tiles, shower curtain + towels visible; kitchen utensil rail under the upper cabinets; bookshelf now has a full colourful row — `r3-bath-fp-tub.png`, `r3-bath-fp-vanity.png`, `r3-bath-tp.png`, `r3-kitchen-rail.png`, `r3-bookshelf.png` |
| 3 | HUD polish: H/R split, trail legend under map, wider trail, touch controls | **PASS** | control panel now `H HINT` / `R RESET` on separate rows (194 px tall); TRAIL legend sits directly under the minimap on desktop (y 200) and mobile (y 132); trail drawn ~3 px with dark outline; touch: left stick 92×92 + knob, touch hint `LEFT STICK DRIVE · DRAG LOOK · TAP GRAB`, stick drag drives the robot (moved 0.25 m), no overflow (`scrollW 390`) — `r3-panel.png`, `r3-map-legend.png`, `r3-map-trail.png`, `r3-mobile-touch.png`, `r3-mobile-drive.png` |
| 4 | Robot detail: LiDAR, LEDs, aim-responsive carry, shadow/vignette | **PASS (spin not provable from stills)** | LiDAR puck (silver disc on black mast) + orange antenna + camera rings + orange LED strip visible in close-up; carry is aim-responsive — arm/mug rise and lower across `carry-aim-low/high/floor`; contact shadow under the robot visible; vignette subtle — `r3-robot-closeup.png`, `r3-carry-*.png`, `r3-shadow-vignette.png` |
| 5 | Regressions | **PASS** | spawn framing unchanged, 360 feeds live (litRatio 0.98–1.0), control panel intact, trail only in minimap, mobile layout clean, 1920×1080 panel/legend/map aligned — `r3-spawn-default.png`, `r3-wide-spawn.png` |

---

## PASS / FAIL

| gate | result | evidence |
|---|---|---|
| 1. No console errors/warnings, no network beyond HTML | **PASS** | logs `[]`, single request |
| 2. Load ≤8 s, ≥50 fps @1440×900 | **PASS** | ready 997 ms, 60 fps at rest, 312 draw calls spawn |
| 3. 360 panels + minimap live, robot hidden | **PASS** | sampleHud litRatio 0.98–1.0, mean 116–131 |
| 4. Objects settle, no floating/clipping | **PASS** | no z-fight/holes in round-3 shots; camera no longer inside furniture |
| 5. Real masses visible in HUD | **PASS** | `SOFA · 85 kg`, `COFFEE TABLE · 13 kg · PUSH`, `HOLDING · MUG WHITE · 320 g`, `ARM 500 g · 0.34 M` |
| 6. Six rooms reachable, furnished, lived-in | **PASS** | bathroom now matches the other rooms |
| 7. Lean UI, no overflow @390×844 | **PASS** | mobile: touch stick + hint + 360 panels + map + trail legend, no overlaps, scrollW 390 |
| 8. Exposure balance | **PASS** | bathroom 133/145 now in range (spawn 101, kitchen 135) |
| 9. Night mode | **PASS (carried)** | interior dark/warm, dark night windows |
| 10. Portrait framing @DPR1+DPR2 | **PASS** | unchanged 21 % robot framing both DPRs |

---

## Ratings

**Camera tight-space — 4.0 / 5.** No more collapsing inside the sofa/bed/wardrobe/table; the fallback lifts the orbit above the obstacle. Dock: the fallback is a hard jump to a high angle, so in tight spots the robot can sit behind the furniture top (partly occluded in `r3-cam-sofa.png`) — smooth/limit the height and bias toward the open side.
**Bathroom — 3.5 / 5** (up from 2.5). Cooler green-grey tiles, shower curtain, towels, exposure now in line with the rest; still a simple tub/toilet (boxes/cylinders) and a blank mirror.
**HUD polish — 4.5 / 5.** H/R split, trail legend under the map, wider trail, touch stick + touch hint all correct and lean. Dock: trail still short/faint in a 2 m map; touch stick has no "look" pad (drag anywhere = look, which is fine).
**Robot detail — 4.0 / 5.** LiDAR puck, antenna, camera rings, LED strip, aim-responsive carry, contact shadow read well. Dock: LED states are not distinguishable in stills (strip looks constant orange); LiDAR spin is rotationally symmetric so it can't be judged from screenshots.
**Overall — 4.0 / 5.**

---

## Remaining issues (no P1)

1. **[P2] Camera fallback is a hard high-angle jump in tight spots** — when the robot is against the sofa/bed, the camera jumps above the furniture and the robot can be partly hidden behind the top (e.g., sofa top edge). `r3-cam-sofa.png`, `r3-cam-bed.png`. Fix: `src/core/camera.js` — clamp the fallback height to ~0.9 m above the obstacle, lerp the fallback, and bias the orbit toward the room-centre side so the robot stays visible.
2. **[P3] LED states not visually distinguishable** — the orange strip on the base reads constant across idle/moving/holding; if LEDs encode state, make colour/brightness changes obvious (or drop the claim). `r3-robot-closeup.png`, `r3-robot-moving.png`.
3. **[P3] Minimap trail still small** — ~3 px wide on a 2 m-radius map; the trail is short in normal play. Optional: fade older segments and keep the newest 3–4 s brighter.
4. **[P3] Bathroom props** — tub/toilet are still simple boxes/cylinders and the mirror is a blank panel; could reuse the rebalance pass to add a folded towel on the rail and a real mirror reflection.
5. **[P3] Touch stick has no visual dead-zone/return animation** — knob snaps back instantly; cosmetic only.

---

## Verdict

**SHIP.** Camera tight-space, bathroom rebalance, HUD polish (H/R split, trail legend, wider trail), touch controls and robot detail all check out on `eef3be85f2ab`; no P1 found. Remaining items are P2/P3 polish.
