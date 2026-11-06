# round 3c — camera shell clamp + push HUD — 2026-11-06

**Build:** `qa/frozen/index.html` — sha256 `5e2c72c6e1c9f818…`, 5,263,156 B. Spot-check of the camera shell clamp and heavy-push HUD reach on top of `6f8adfa23859`.
**Method:** `qa/visual/camera7.mjs`; shots `qa/visual/shots/c7-*.png`.

| check | result | evidence |
|---|---|---|
| Camera stays inside shell (x ±5.42, z ±3.62, y 0.12–2.58) | **PASS** | 8 poses, 0 violations; wall-backed poses clamp at x −5.22 / +5.41, z −3.62 / +3.62 (`camera7.json → shellViolations = []`) |
| No regression: sofa / bed / under-table | **PASS** | cameras outside furniture bboxes (sofa y 1.06, bed y 1.03, table y 0.70 above top 0.47), robot visible — `c7-sofa.png`, `c7-bed.png`, `c7-under-table.png` |
| Heavy-push HUD reach at closest range | **PASS** | at 0.30 m from the sofa the target label reads `SOFA · 85 kg · PUSH` (no longer OUT OF REACH) — `c7-push-hud.png` |
| HUD/360/robot unchanged | **PASS** | samples litRatio 0.98–1.0, mean 116–131; 326 draw calls; 0 console errors |

Note: backed against an outer wall the clamped camera necessarily sits close to the robot (tight close-up, robot partly out of frame on the west/north poses) — expected consequence of the clamp, not a regression; the previous behaviour put the camera outside the shell.

# round 3b FINAL — visual QA — 2026-11-06

**Build:** `qa/frozen/index.html` — sha256 `6f8adfa238593c7c…`, 5,262,758 B (served `PORT=4182 node tools/serve.mjs qa/frozen`). Camera P2 re-check on top of `eef3be85f2ab` (same physics/HUD/robot).
**Method:** puppeteer-core + local Chrome (ANGLE Metal); 1440×900 @DPR1; 390×844 @DPR2 with touch emulation; 1920×1080. Camera set: `qa/visual/shots/c6-*.png`; script `qa/visual/camera6.mjs` (bbox containment + camera→robot raycast + NDC projection).
**Machine facts (this sha):** ready 1652 ms; 60 fps at rest; 297–306 draw calls at spawn; 0 console errors/warnings; 1 request; HUD samples litRatio 0.98–1.0, mean 116–131.

---

## Camera P2 re-check (this sha)

| pose | camera outside furniture | robot on screen (NDC) | occluder between camera and robot | evidence |
|---|---|---|---|---|
| drive into sofa | yes (`inside=false`), cam y 1.06 | yes (−0.16, −0.09) | coffee table @0.95 m of 1.40 m (robot partly behind table edge, still visible) | `c6-cam-sofa.png` |
| drive into bed | yes, cam y **1.03** (was 1.40) | yes (−0.15, −0.04) | none | `c6-cam-bed.png` |
| drive into wardrobe | yes, cam y 0.70 | yes (−0.16, −0.11) | none | `c6-cam-wardrobe.png` |
| under coffee table | yes, cam y 0.70 above table top 0.47 | yes (−0.16, −0.11) | none | `c6-cam-under-table.png` |
| approach table from the side | yes, cam y 0.69 | yes (−0.16, −0.11) | none | `c6-cam-approach-table.png` |

Result: **P2 fixed** — the fallback now takes the low perch (bed cam 1.40 → 1.03) and keeps the robot on screen at ~−0.16 NDC in every pose; no hard collapse to the head. Trail widened to 0.13 m (visible ~3–4 px at the 180 px map, `c6-map-trail.png`). No regressions: spawn framing, 360 feeds (litRatio 0.98–1.0), control panel, touch UI, draw calls all unchanged.
Remaining nit (P3): in the sofa pose the robot sits behind the coffee-table edge and the frame is dominated by the tabletop; a small lateral bias would keep it clear.

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

1. **[P3] Sofa-pose framing** — camera is outside the sofa and the robot is on screen, but the coffee table edge partly covers it and the tabletop dominates the frame. `c6-cam-sofa.png`. Fix: bias the fallback laterally toward the open floor when the line of sight passes a low object.
2. **[P3] LED states not visually distinguishable** — the orange strip on the base reads constant across idle/moving/holding; if LEDs encode state, make colour/brightness changes obvious (or drop the claim). `r3-robot-closeup.png`, `r3-robot-moving.png`.
3. **[P3] Minimap trail still small** — ~3 px wide on a 2 m-radius map; the trail is short in normal play. Optional: fade older segments and keep the newest 3–4 s brighter.
4. **[P3] Bathroom props** — tub/toilet are still simple boxes/cylinders and the mirror is a blank panel; could reuse the rebalance pass to add a folded towel on the rail and a real mirror reflection.
5. **[P3] Touch stick has no visual dead-zone/return animation** — knob snaps back instantly; cosmetic only.

---

## Verdict

**SHIP** on `6f8adfa23859`. The camera P2 is fixed (outside furniture + robot visible in all five poses, low perch instead of a high collapse), trail widened, and round-3 features (bathroom rebalance, HUD/touch polish, robot detail) carry over unchanged. No P1; only P3 nits remain (sofa-pose framing, LED state legibility, trail length on the 2 m map).
