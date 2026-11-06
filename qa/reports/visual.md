# round 2 FINAL — visual QA — 2026-11-06

**Build:** `qa/frozen/index.html` — sha256 `5cf1537d1779991e…`, 5,253,349 B (served `PORT=4182 node tools/serve.mjs qa/frozen`).
**Method:** puppeteer-core + local Chrome (ANGLE Metal); 1440×900 @DPR1; 390×844 @DPR2; 1920×1080. Round-2 set: `qa/visual/shots/r2-*.png` (18) + `r2-under-reach2.png`; script `qa/visual/round2.mjs`, `under.mjs`. Previous rounds (`f-*`, `v-*`, `s-*`) retained for history.
**Machine facts (this sha):** ready 1492 ms; 60 fps at rest; 298 draw calls / 69 k tris at spawn; 0 console errors/warnings; 1 network request; HUD samples litRatio 0.98–1.0, mean 116–132; FP camera height 0.312 m (spec 0.30 m).

---

## Round-2 checks

| # | item | result | evidence |
|---|---|---|---|
| 1 | Robot v2 reads as a serious sweeper with real limits | **PASS** | round 350 mm disc base + black bumper band, 2 driven wheels + caster, LiDAR mast + status antenna, camera rings, K12 3-DOF arm w/ gripper; total height 0.402 m, fits under the coffee table (underside 0.437 m). Reads as a service robot, not the old toy rover — `r2-spawn-default.png`, `r2-robot-front.png`, `r2-robot-side.png`, `r2-robot-3q.png` |
| 2 | Control panel bottom-right: all controls, key highlights, mode badges, lean | **PASS** | W/A/S/D MOVE, SHIFT BOOST, MOUSE LOOK, CLICK/SPACE GRAB, V VIEW, C 360, L LIGHT, H/R HINT·RESET, TRAIL legend, ARM 500 g · 0.34 M; keycaps light amber on press (verified W+A, SHIFT, MOUSE+CLICK); badges switch VIEW FIRST/THIRD, 360 ON/OFF, LIGHT DAY/NIGHT — `r2-panels-states.jpg`, `r2-panel.png` |
| 3 | Minimap trajectory: colour-coded, dark outline, minimap-only, + heading dot | **PASS (thin)** | cyan→amber→pink path with dark outline drawn only in the minimap after driving; heading arrow intact; trail is ~2 px at 180 px map and its legend lives in the bottom-right panel (far from the map) — `r2-map-trail.png`, `r2-map.png` |
| 4 | Physics realism visible: heavy furniture, 0.5 kg payload, under-table reach | **PASS** | sofa Δ = **0.000 m** after 1.8 s boost-drive into it; laptop 1.6 kg refused (`too_heavy`), mug 0.32 kg + needle grabbed; robot drives under the coffee table and grabs a tabletop mug when positioned near it (`HOLDING · MUG WHITE · 320 g`) — `r2-under-reach2.png`, `r2-push-sofa.png` |
| 5 | Nothing broken by the new robot size | **PASS** | 0.35 m robot passes the 0.8 m doorways (drove living→hall); 360 feeds live with robot hidden; under-table FP/TP views work; third-person framing intact — `r2-doorway-fp.png`, `r2-doorway-after.png`, `r2-under-table-tp.png`, `r2-under-table-fp.png` |

---

## PASS / FAIL

| gate | result | evidence |
|---|---|---|
| 1. No console errors/warnings, no network beyond HTML | **PASS** | logs `[]`, single request |
| 2. Load ≤8 s, ≥50 fps @1440×900 | **PASS** | ready 1492 ms, 60 fps at rest, 298 draw calls spawn |
| 3. 360 panels + minimap live, robot hidden | **PASS** | sampleHud litRatio 0.98–1.0, mean 116–132 |
| 4. Objects settle, no floating/clipping | **PASS** | no jitter/z-fight in 100+ shots; robot clears the coffee-table underside by ~3.5 cm |
| 5. Real masses visible in HUD | **PASS** | `SOFA · 85 kg · OUT OF REACH`, `ARMCHAIR · 21 kg`, `HOLDING · MUG WHITE · 320 g`; arm header `ARM 500 g · 0.34 M` |
| 6. Six rooms reachable, furnished, lived-in, no holes/z-fight | **PASS** | unchanged from round-1 final |
| 7. Lean UI, no prose, no overflow @390×844 | **PASS** | mobile: control panel auto-hidden, hint pill above 360 panels, no overlap, scrollW 390 |
| 8. Exposure balance | **PARTIAL (carried)** | bathroom still the brightest room (round-1 final mean 171.6); everything else balanced |
| 9. Night mode | **PASS (carried)** | interior −27 % vs day, dark night windows |
| 10. Portrait framing @DPR1+DPR2 | **PASS** | unchanged 21 % robot framing both DPRs |

---

## Ratings

**Robot v2 — 4.0 / 5.** Real hardware cues (round bumper base, LiDAR mast + antenna, camera rings, 2 driven wheels + caster, 3-DOF arm with gripper), correct 0.30 m camera height, real payload/reach limits visible in play. Docks: body proportions still a bit "cute" (wide disc + small top cylinder), the mast partially occludes the arm from the front, and the 4 cameras read as 2 visible orange rings.
**Control panel — 4.0 / 5.** Complete, lean, keycaps highlight correctly, mode badges are accurate and update live. Docks: `H R → HINT · RESET` maps two keys to one label; panel is hidden on mobile (fine) but the mobile hint still says `WASD DRIVE · … V/C/L` (desktop wording on touch).
**Minimap trajectory — 3.5 / 5.** Colour-coded path + dark outline is legible and stays out of the main view; heading dot kept. Docks: trail is thin at 180 px, legend is in the bottom-right panel rather than beside the map.
**Physics feel — 4.5 / 5.** Sofa immovable by driving, 1.6 kg laptop refused, mug/needle lift, under-table reach — all consistent with the stated 7 kg / 0.5 kg / 0.34 m specs.
**Overall — 3.9 / 5.**

---

## Remaining issues (no P1)

1. **[P2] Third-person camera still hugs geometry in tight spots** — driving into the sofa or under the coffee table pushes the camera against the sofa/floor (arm fills the foreground, camera y 0.28 under the table). `r2-trail-main.png`, `r2-under-table-tp.png`. Fix: `src/core/camera.js` — extend push-out to dynamic colliders and raise the minimum camera height under low obstacles.
2. **[P2] Control panel label ambiguity** — `H R` → `HINT · RESET` (which key does what?). `r2-panel.png`. Fix: split into two rows or label `H HINT` / `R RESET`.
3. **[P3] Minimap trail legibility** — ~2 px wide at 180 px map; legend in the bottom-right panel. `r2-map-trail.png`. Fix: draw 3–4 px with stronger outline, and/or move the TRAIL legend under the map.
4. **[P3] Mobile hint wording** — says `WASD DRIVE · … V/C/L` on touch. `r2-mobile-spawn.png`. Fix: swap to `DRAG LOOK · TAP GRAB · V/C/L` on mobile.
5. **[P3] Bathroom exposure (carried)** — still the brightest room; tub/toilet/tiles merge.

---

## Verdict

**SHIP.** Robot v2, control panel, minimap trajectory, physics limits and size regressions all check out; no P1 found on `5cf1537d1779`. Remaining items are P2/P3 polish.
