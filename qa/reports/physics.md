# Physics & real-mass audit — round 2 (final-led)

Generated: 2026-11-06 09:12:28 UTC · runtime 137.8s

- Build: `qa/frozen/index.html` — 5,266,858 B, sha256 `c8d3c46c6181a9a3…`
- Git: `f48ba98` · 8 uncommitted change(s) in src/docs: `M docs/MASS_TABLE.md`, `M src/core/camera.js`, `M src/robot/cameras.js`, `M src/robot/model.js`, `M src/robot/robot.js`, `M src/world/clutter.js` …
- Served: http://127.0.0.1:4183/ · label: `final-led`

## Verdict: **SHIP**

58 PASS · 0 FAIL · 3 INFO. Rule: FIX if any P0/P1 FAIL, or >5 P2 FAILs; otherwise SHIP (P2 notes allowed).

## PASS/FAIL table

| # | gate | result | evidence |
| --- | --- | --- | --- |
| 1 | A1 app boots, ready flag set | PASS | ready=true after 7.2s; room=LIVING ROOM |
| 2 | A2 no console errors / page errors | PASS | 0 errors |
| 3 | A3 no console warnings | PASS | 0 warnings |
| 4 | A4 no failed network requests | PASS | 0 failed |
| 5 | A5 runtime errors array empty | PASS | __APP__.errors = [] |
| 6 | A6 steady fps >= 50 @1440x900 | PASS | 60.0 fps measured (engine 60.0); drawCalls=313 |
| 7 | A7 draw calls <= 450 | PASS | drawCalls=313 triangles=65166 |
| 8 | B1 gravity is -9.81 m/s2 on Y | PASS | gravity = [0, -9.81, 0] |
| 9 | B2 fixed timestep is 1/60 s | PASS | world.timestep = 0.016666668 s (1/60 = 0.016666667) |
| 10 | B3 simulation runs at fixed 60 Hz | PASS | 60.42 physics steps/s over 2003 ms (121 steps, 60.4 fps) |
| 11 | B4 solver iterations >= 8 | PASS | world.numSolverIterations = 8 |
| 12 | B5 empirical free-fall g ~= 9.81 m/s2 | PASS | measured g=9.810 m/s2 from dv/dt over 30 steps (v: 0.00 -> -4.91 m/s) |
| 13 | B6 max drive speed 0.40 m/s (boost 0.55) | PASS | normal=0.400 m/s, boost=0.550 m/s |
| 14 | B7 heavy furniture (>=20 kg) damping >= 0.25/0.5 | PASS | all 8 heavy bodies >= 0.25/0.5 |
| 15 | B8 friction in (0,1.2] and restitution in [0,1] | PASS | 234 dynamic colliders; badFriction=0, badRestitution=0 |
| 16 | B9 heavy furniture colliders friction >= 0.8 | PASS | all 33 heavy colliders >= 0.8 |
| 17 | B10 every dynamic body has damping > 0 | PASS | 177/177 bodies have lin+ang damping > 0 |
| 18 | B11 objects settle to sleep (>=90%) | PASS | 177/177 dynamic bodies asleep after settle (100%) |
| 19 | B12 all body transforms/velocities finite (no NaN) | PASS | 201/201 bodies finite |
| 20 | B13 positive finite principal inertia on all dynamic bodies | PASS | 177/177 dynamic bodies have positive finite inertia |
| 21 | B14 CCD coverage reported | INFO | 1/177 dynamic bodies have CCD enabled (tunneling checked in G4) |
| 22 | B15 joint count sane at rest | PASS | world.impulseJoints = 0 at rest (expected 0) |
| 23 | C1 every dynamic body has mass > 0 and finite | PASS | 177/177 dynamic bodies have positive finite mass |
| 24 | C2 declared mass == Rapier body mass (compound distribution) | PASS | 177/177 exact within 1% |
| 25 | C3 collider mass sum == body mass | PASS | 177/177 colliders sum to body mass |
| 26 | C4 every dynamic object classified against a realistic range | PASS | 177/177 objects classified |
| 27 | C5 masses realistic (no outliers) | PASS | all 177 dynamic masses within realistic ranges |
| 28 | C6 gravityScale == 1 for dynamic bodies | PASS | 177/177 at 1.0 |
| 29 | C7 grabbable == (mass <= 0.5 kg) | PASS | 177/177 consistent with 0.5 kg payload |
| 30 | C8 every dynamic body has >= 1 collider | PASS | 177/177 bodies have colliders |
| 31 | D1 all architecture objects are static (fixed) | PASS | 21 architecture objects static, bodyType=fixed |
| 32 | D2 doors are static (no dynamic door leaf) | PASS | no separate door objects; door leaves merged into static `walls` body (src/world/apartment.js addDoorLeaf -> walls batch) |
| 33 | D3 robot cannot drive through walls (4 sides, 2 s boost) | PASS | north (z-): end (-3, -3.565) moved 0.125 m; south (z+): end (-3, 3.093) moved 0.093 m; west (x-): end (-5.04, -1) moved 0.14 m; east (x+): end (5.365, -1) moved 0.465 m |
| 34 | D4 walls/static bodies do not move at all | PASS | 24 static bodies bit-identical after 4 wall impacts |
| 35 | D5 no dynamic object reads as wall/door | INFO | large dynamic slabs: bookshelf (42 kg, 0.32x1.86x1.00 m), wardrobe (120 kg, 1.12x2.02x0.60 m), study_shelves (18 kg, 0.30x1.80x0.90 m) — immovable per spec but visually architecture-scale |
| 36 | E1 heavy furniture displacement < 0.01 m (2 s boost) | PASS | sofa 0.0000m, bed 0.0000m, wardrobe 0.0000m, fridge 0.0001m, bookshelf 0.0002m, dining_table 0.0003m, desk 0.0004m |
| 37 | E1b armchair 21 kg (ROBOT_SPEC lists < 0.01 m) | PASS | armchair 0.0013m — mission push list excludes armchair; ROBOT_SPEC line 39 includes it |
| 38 | E2 light objects pushable > 0.03 m (2 s boost) | PASS | chair_1 0.954m, study_box_1 0.090m, study_box_2 0.108m, trash_bin 0.291m, laundry_basket 0.740m |
| 39 | E3 push tests made real contact | PASS | 14/14 pushes validated by robot-object contact |
| 40 | F1 arm limits are 0.5 kg payload / 0.34 m reach | PASS | arm.maxLiftKg=0.5, arm.reach=0.34 |
| 41 | F2 laptop 1.6 kg refused (too_heavy) | PASS | laptop mass=1.6; grab={"ok":false,"reason":"too_heavy","held":null} |
| 42 | F3 kettle 1.0 kg / book stack 1.4 kg refused | PASS | kettle={"ok":false,"reason":"too_heavy","held":null}, book_stack_1={"ok":false,"reason":"too_heavy","held":null} |
| 43 | F4 mug 0.32 kg on coffee table accepted from floor | PASS | mug y=0.5153811573982239, robot drove 0.457 m to table, shoulder→mug=0.269 m, canReach=true, grab={"ok":true,"reason":null,"held":"mug_white"} |
| 44 | F5 reach boundary ~0.34 m (0.30 in, 0.45 out) | PASS | canReach(0.30m)=true, canReach(0.32m)=true, canReach(0.45m)=false |
| 45 | F6 dining table (0.76 m) out of reach | PASS | canReach(table top)=false; plate on table: mass=0.45, grab={"ok":false,"reason":"out_of_reach","held":null} |
| 46 | F7 grab creates fixed joint; held object follows the robot | PASS | joints held=1, after release=0; carried: robot moved 0.648 m, mug moved 0.679 m, still held=mug_white |
| 47 | F7b aim up raises the held mug (aim-responsive carry) | PASS | mug on table 0.515 m -> carried to open floor 0.499 m (carry lift -0.016 m) -> 0.585 m with aim held up (aim-up lift 0.086 m, total 0.07 m) |
| 48 | F8 released mug lands on surface, no fall-through | PASS | released from y=0.585 m, final y=0.058 m, held cleared=true |
| 49 | B16 robot collision footprint (collider inset vs 350 mm visual base) | PASS | collider cylinder Ø310 mm x 340 mm tall, 2 robot colliders (base + gripper); collider is inset from the 350 mm visual base by design |
| 50 | B16b robot visual base/height ~350 x 380 mm | PASS | visual bbox 375 mm wide x 404 mm tall (spec base Ø350 / total 380); bbox includes arm + mast |
| 51 | F9 robot total mass 7.0 kg (3.6 base + 3.4 arm) | PASS | getState: mass=7 kg (base 3.6, arm 3.4), payload=0.5 kg, reach=0.34 m, DOF=3 |
| 52 | G1 spawn interpenetration <= 2 mm (QA gate 5) | PASS | deepest contact -1.0 mm (desk_lamp↔mug_desk) across 245 contact pairs |
| 53 | G2 no dynamic body below floor (collider minY >= -5 mm) | PASS | lowest dynamic collider minY=-0.0001 m |
| 54 | G2b static ground/exterior colliders below y=0 (expected) | INFO | 4 static bodies: floor_wood, floor_tile, exterior, city_view |
| 55 | G3 stacks stay put over 3 s (rel drift < 5 mm) | PASS | 12 dynamic-on-dynamic resting pairs; max relative drift 0.00 mm |
| 56 | G4 no passive drift / jitter (max drift < 2 mm, all asleep) | PASS | max drift 0.00 mm; 177/177 asleep; max \|v\| 0.0000 m/s |
| 57 | G5 nudged stacks re-settle (< 50 mm, < 5 deg, asleep) | PASS | 8 stacks nudged: max shift 0.0 mm (cereal_box), max tilt 0.01 deg, 8/8 asleep |
| 58 | G6 no tunneling (needle drop + 6 m/s 3 cm ball) | PASS | needle drop from 0.9 m -> y=0.0124; 3 cm ball @6 m/s -> y=0.03 (no CCD) |
| 59 | G7 all bodies finite and inside the apartment after all tests | PASS | 177 dynamic bodies finite, inside shell, 177/177 asleep |
| 60 | H1 forward room transitions drivable (5 doorways / open plan) | PASS | 5/5 ok — living->hallway (cased opening z=0.7, x -0.9..0.15): LIVING ROOM -> HALLWAY (1.604 m); hallway->bedroom (door x=-1.4, z 2.7..3.58): HALLWAY -> BEDROOM (1.438 m); hallway->bathroom (door x=0.6, z 1.0..1.88): HALLWAY -> BATHROOM (1.372 m); kitchen->study (door z=0.7, x 3.62..4.5): KITCHEN / DINING -> STUDY (1.602 m); living->kitchen (open plan, z=0): LIVING ROOM -> KITCHEN / DINING (1.611 m) |
| 61 | H2 reverse room transitions drivable (3) | PASS | 3/3 ok — hallway->living (cased opening): HALLWAY -> LIVING ROOM (1.581 m); bathroom->hallway (door x=0.6): BATHROOM -> HALLWAY (1.605 m); study->kitchen (door z=0.7): STUDY -> KITCHEN / DINING (1.603 m) |

## Engine laws & settings

| setting | value |
| --- | --- |
| gravity | [0, -9.81, 0] m/s² |
| fixed timestep | 0.016666668 s (1/60 = 0.016666667) |
| solver iterations | 8 |
| Rapier | 0.21.0 |
| bodies / colliders | 203 / 374 |
| dynamic / static objects | 177 / 24 |
| impulse joints at rest | 0 |
| fps @1440x900 | 60.0 |
| draw calls | 313 |
| heavy bodies (>=20 kg) damping | 0.25/0.50 |
| heavy collider friction | 1.00 |

Material presets (src/core/physics.js): wood 0.62/0.04, fabric 0.90/0.00, metal 0.45/0.12, ceramic 0.50/0.08, plastic 0.50/0.15, glass 0.30/0.05, rubber 1.00/0.35; default damping 0.12 lin / 0.35 ang.

## Robot under test (ROBOT_SPEC target: 7 kg, Ø350×380 mm, 0.40/0.55 m/s, 0.5 kg payload, 0.34 m reach, 3 DOF)

| property | measured | spec | verdict |
| --- | --- | --- | --- |
| mass | 7 kg (base 3.6, arm 3.4) | 7.0 (3.6+3.4) | PASS |
| collision footprint | Ø310 × 340 mm (collider) | inset from Ø350 visual | ok |
| visual bbox | 375 × 404 mm (incl. arm/mast) | Ø350 × 380 | PASS |
| drive speed | 0.400 / 0.550 m/s | 0.40 / 0.55 | PASS |
| arm | payload 0.5 kg, reach 0.34 m, DOF 3 | 0.5 / 0.34 / 3 | PASS |
| colliders | 2 (base + gripper) | ≥2 | PASS |

Screenshot: [`qa/physics/shots/final-led-scene.png`](qa/physics/shots/final-led-scene.png)

## Mass table — all 177 dynamic objects

| object | kg | category | realistic range | verdict |
| --- | ---: | --- | --- | --- |
| wardrobe | 120 | wardrobe | 80–140 | PASS |
| fridge | 95 | fridge | 60–110 | PASS |
| sofa | 85 | sofa | 65–100 | PASS |
| bed | 75 | bed | 60–90 | PASS |
| bookshelf | 42 | bookshelf | 25–50 | PASS |
| dining_table | 34 | dining table | 25–45 | PASS |
| desk | 26 | desk | 20–35 | PASS |
| armchair | 21 | armchair | 18–30 | PASS |
| study_shelves | 18 | open shelving | 15–40 | PASS |
| coffee_table | 13 | coffee table | 10–20 | PASS |
| tv | 11 | TV | 8–15 | PASS |
| plant_monstera | 8 | large plant | 5–12 | PASS |
| nightstand | 7 | nightstand | 5–15 | PASS |
| desk_chair | 7 | chair | 4–8 | PASS |
| coat_rack | 6 | coat rack | 2–8 | PASS |
| chair_1 | 5.5 | chair | 4–8 | PASS |
| chair_2 | 5.5 | chair | 4–8 | PASS |
| chair_3 | 5.5 | chair | 4–8 | PASS |
| chair_4 | 5.5 | chair | 4–8 | PASS |
| monitor | 4.5 | monitor | 3–6 | PASS |
| floor_lamp | 4.2 | floor lamp | 3–6 | PASS |
| bedside_lamp | 1.8 | bedside lamp | 0.8–2.5 | PASS |
| study_box_1 | 1.8 | storage box | 0.5–3 | PASS |
| bathroom_scale | 1.8 | bathroom scale | 1.5–2.5 | PASS |
| backpack | 1.8 | bag | 0.2–2.5 | PASS |
| trash_bin | 1.6 | trash bin | 0.7–2 | PASS |
| laptop | 1.6 | laptop | 1.2–2 | PASS |
| desk_lamp | 1.5 | desk lamp | 0.8–3 | PASS |
| study_box_3 | 1.4 | storage box | 0.5–3 | PASS |
| book_stack_1 | 1.4 | book stack | 0.8–3 | PASS |
| blanket_bed | 1.4 | blanket/throw | 0.5–2.5 | PASS |
| study_box_2 | 1.2 | storage box | 0.5–3 | PASS |
| pan_stove | 1.2 | pan | 0.6–1.5 | PASS |
| wine_bottle | 1.1 | bottle | 0.25–1.6 | PASS |
| laundry_basket | 1 | basket | 0.6–1.5 | PASS |
| kettle | 1 | kettle | 0.8–1.5 | PASS |
| sofa_throw | 0.9 | blanket/throw | 0.5–2.5 | PASS |
| book_stack_2 | 0.9 | book stack | 0.8–3 | PASS |
| cutting_board | 0.8 | cutting board | 0.3–1.2 | PASS |
| vase | 0.7 | vase | 0.3–2.5 | PASS |
| dish_rack | 0.7 | rack | 0.3–1.5 | PASS |
| pillow_1 | 0.7 | cushion/pillow | 0.2–1 | PASS |
| pillow_2 | 0.7 | cushion/pillow | 0.2–1 | PASS |
| keyboard | 0.7 | keyboard | 0.4–1.2 | PASS |
| shelf_book_12 | 0.6 | book | 0.3–1.5 | PASS |
| shelf_book_13 | 0.6 | book | 0.3–1.5 | PASS |
| shelf_book_14 | 0.6 | book | 0.3–1.5 | PASS |
| shelf_book_15 | 0.6 | book | 0.3–1.5 | PASS |
| shelf_book_16 | 0.6 | book | 0.3–1.5 | PASS |
| shelf_book_17 | 0.6 | book | 0.3–1.5 | PASS |
| shelf_book_18 | 0.6 | book | 0.3–1.5 | PASS |
| plant_small | 0.6 | small plant | 0.5–3 | PASS |
| herb_pot | 0.6 | small plant | 0.5–3 | PASS |
| hoodie_chair_4 | 0.6 | clothing | 0.15–1 | PASS |
| jeans_floor | 0.6 | clothing | 0.15–1 | PASS |
| basket_clothes | 0.6 | clothing | 0.15–1 | PASS |
| study_book_1 | 0.6 | book | 0.3–1.5 | PASS |
| study_book_2 | 0.6 | book | 0.3–1.5 | PASS |
| study_book_3 | 0.6 | book | 0.3–1.5 | PASS |
| study_book_4 | 0.6 | book | 0.3–1.5 | PASS |
| study_plant | 0.6 | small plant | 0.5–3 | PASS |
| shelf_book_1 | 0.55 | book | 0.3–1.5 | PASS |
| shelf_book_2 | 0.55 | book | 0.3–1.5 | PASS |
| shelf_book_3 | 0.55 | book | 0.3–1.5 | PASS |
| shelf_book_4 | 0.55 | book | 0.3–1.5 | PASS |
| shelf_book_5 | 0.55 | book | 0.3–1.5 | PASS |
| shelf_book_6 | 0.55 | book | 0.3–1.5 | PASS |
| shelf_book_19 | 0.55 | book | 0.3–1.5 | PASS |
| shelf_book_20 | 0.55 | book | 0.3–1.5 | PASS |
| shelf_book_21 | 0.55 | book | 0.3–1.5 | PASS |
| shelf_book_22 | 0.55 | book | 0.3–1.5 | PASS |
| shelf_book_23 | 0.55 | book | 0.3–1.5 | PASS |
| shelf_book_24 | 0.55 | book | 0.3–1.5 | PASS |
| shelf_book_25 | 0.55 | book | 0.3–1.5 | PASS |
| shelf_book_26 | 0.55 | book | 0.3–1.5 | PASS |
| shelf_book_7 | 0.5 | book | 0.3–1.5 | PASS |
| shelf_book_8 | 0.5 | book | 0.3–1.5 | PASS |
| shelf_book_9 | 0.5 | book | 0.3–1.5 | PASS |
| shelf_book_10 | 0.5 | book | 0.3–1.5 | PASS |
| shelf_book_11 | 0.5 | book | 0.3–1.5 | PASS |
| jar_1 | 0.5 | jar | 0.2–1 | PASS |
| jar_2 | 0.5 | jar | 0.2–1 | PASS |
| jar_3 | 0.5 | jar | 0.2–1 | PASS |
| grocery_bag | 0.5 | bag | 0.2–2.5 | PASS |
| bottle_desk | 0.5 | bottle | 0.25–1.6 | PASS |
| study_book_5 | 0.5 | book | 0.3–1.5 | PASS |
| study_book_6 | 0.5 | book | 0.3–1.5 | PASS |
| study_book_7 | 0.5 | book | 0.3–1.5 | PASS |
| study_book_8 | 0.5 | book | 0.3–1.5 | PASS |
| cushion_1 | 0.45 | cushion/pillow | 0.2–1 | PASS |
| cushion_2 | 0.45 | cushion/pillow | 0.2–1 | PASS |
| cushion_3 | 0.45 | cushion/pillow | 0.2–1 | PASS |
| plate_1 | 0.45 | plate | 0.4–0.8 | PASS |
| plate_2 | 0.45 | plate | 0.4–0.8 | PASS |
| fruit_bowl | 0.45 | plate | 0.4–0.8 | PASS |
| plate_dining | 0.45 | plate | 0.4–0.8 | PASS |
| book_bed | 0.45 | book | 0.3–1.5 | PASS |
| shoe_1 | 0.45 | shoe | 0.25–1.2 | PASS |
| shoe_2 | 0.45 | shoe | 0.25–1.2 | PASS |
| shoe_3 | 0.45 | shoe | 0.25–1.2 | PASS |
| shoe_4 | 0.45 | shoe | 0.25–1.2 | PASS |
| book_2 | 0.42 | book | 0.3–1.5 | PASS |
| book_dining | 0.4 | book | 0.3–1.5 | PASS |
| cereal_box | 0.4 | box | 0.1–1 | PASS |
| towel_floor | 0.4 | bath towel | 0.3–0.9 | PASS |
| bath_mat | 0.35 | bath mat | 0.2–1.2 | PASS |
| dish_soap | 0.35 | bottle | 0.25–1.6 | PASS |
| shampoo | 0.35 | bottle | 0.25–1.6 | PASS |
| conditioner | 0.35 | bottle | 0.25–1.6 | PASS |
| lotion | 0.35 | bottle | 0.25–1.6 | PASS |
| bath_bottle_1 | 0.35 | bottle | 0.25–1.6 | PASS |
| mug_white | 0.32 | mug | 0.25–0.45 | PASS |
| mug_blue | 0.32 | mug | 0.25–0.45 | PASS |
| mug_tipped | 0.32 | mug | 0.25–0.45 | PASS |
| mug_kitchen | 0.32 | mug | 0.25–0.45 | PASS |
| mug_sink | 0.32 | mug | 0.25–0.45 | PASS |
| mug_dining | 0.32 | mug | 0.25–0.45 | PASS |
| mug_bedside | 0.32 | mug | 0.25–0.45 | PASS |
| mug_desk | 0.32 | mug | 0.25–0.45 | PASS |
| magazine | 0.3 | magazine | 0.15–0.6 | PASS |
| bowl_1 | 0.3 | bowl | 0.2–0.8 | PASS |
| bowl_2 | 0.3 | bowl | 0.2–0.8 | PASS |
| bath_bottle_2 | 0.3 | bottle | 0.25–1.6 | PASS |
| pen_holder | 0.3 | pen holder | 0.1–0.5 | PASS |
| study_bowl | 0.3 | bowl | 0.2–0.8 | PASS |
| notebook_shelf | 0.28 | notebook | 0.15–0.6 | PASS |
| notebook | 0.28 | notebook | 0.15–0.6 | PASS |
| candle | 0.25 | candle | 0.1–0.6 | PASS |
| slipper_1 | 0.25 | slipper | 0.1–0.5 | PASS |
| slipper_2 | 0.25 | slipper | 0.1–0.5 | PASS |
| headphones | 0.25 | headphones | 0.1–0.45 | PASS |
| tissue_box | 0.22 | box | 0.1–1 | PASS |
| phone | 0.2 | phone | 0.12–0.25 | PASS |
| phone_bed | 0.2 | phone | 0.12–0.25 | PASS |
| apple_1 | 0.18 | fruit | 0.12–0.25 | PASS |
| apple_2 | 0.18 | fruit | 0.12–0.25 | PASS |
| apple_3 | 0.18 | fruit | 0.12–0.25 | PASS |
| shirt_chair_2 | 0.18 | clothing | 0.15–1 | PASS |
| shirt_floor | 0.18 | clothing | 0.15–1 | PASS |
| remote | 0.15 | remote | 0.08–0.3 | PASS |
| onion | 0.15 | onion | 0.1–0.3 | PASS |
| toilet_roll | 0.15 | toilet roll | 0.1–0.3 | PASS |
| cable_tv | 0.14 | cable | 0.02–0.3 | PASS |
| cable_kitchen | 0.14 | cable | 0.02–0.3 | PASS |
| charger_cable | 0.14 | cable | 0.02–0.3 | PASS |
| cable_floor_study | 0.14 | cable | 0.02–0.3 | PASS |
| dish_towel | 0.12 | towel | 0.05–0.6 | PASS |
| toothpaste | 0.12 | toothpaste tube | 0.05–0.25 | PASS |
| soap | 0.1 | soap | 0.05–0.2 | PASS |
| mouse | 0.1 | mouse | 0.06–0.15 | PASS |
| hairbrush | 0.08 | hairbrush | 0.05–0.2 | PASS |
| sock_1 | 0.06 | sock | 0.03–0.15 | PASS |
| sock_2 | 0.06 | sock | 0.03–0.15 | PASS |
| sock_floor | 0.06 | sock | 0.03–0.15 | PASS |
| keys | 0.05 | keys | 0.02–0.15 | PASS |
| keys_floor | 0.05 | keys | 0.02–0.15 | PASS |
| sponge_sink | 0.04 | sponge | 0.005–0.1 | PASS |
| sponge_bath | 0.04 | sponge | 0.005–0.1 | PASS |
| glasses | 0.03 | glasses | 0.02–0.06 | PASS |
| paper_ball | 0.02 | paper ball | 0.005–0.05 | PASS |
| mail_counter | 0.02 | mail | 0.005–0.1 | PASS |
| toothbrush | 0.02 | toothbrush | 0.01–0.05 | PASS |
| toothbrush_2 | 0.02 | toothbrush | 0.01–0.05 | PASS |
| mail_1 | 0.02 | mail | 0.005–0.1 | PASS |
| mail_2 | 0.02 | mail | 0.005–0.1 | PASS |
| pen | 0.012 | pen | 0.005–0.03 | PASS |
| paper_floor_1 | 0.012 | paper sheet | 0.002–0.03 | PASS |
| paper_floor_2 | 0.012 | paper sheet | 0.002–0.03 | PASS |
| paper_floor_3 | 0.012 | paper sheet | 0.002–0.03 | PASS |
| paper_dining_1 | 0.012 | paper sheet | 0.002–0.03 | PASS |
| paper_dining_2 | 0.012 | paper sheet | 0.002–0.03 | PASS |
| paper_kitchen_1 | 0.012 | paper sheet | 0.002–0.03 | PASS |
| paper_kitchen_2 | 0.012 | paper sheet | 0.002–0.03 | PASS |
| paper_desk_1 | 0.012 | paper sheet | 0.002–0.03 | PASS |
| paper_desk_2 | 0.012 | paper sheet | 0.002–0.03 | PASS |
| sticky_notes | 0.01 | paper sheet | 0.002–0.03 | PASS |
| needle | 0.0012 | needle | 0.0005–0.01 | PASS |

No mass outliers: every dynamic object falls inside its realistic range.

## Static architecture

- Architecture objects (tag `architecture` + built-ins): **all static / bodyType fixed** — see D1.
- Static bodies (24): `floor_wood`, `floor_tile`, `thresholds`, `ceiling`, `walls`, `windows`, `ceiling_lamps`, `wall_art`, `exterior`, `city_view`, `rug`, `tv_stand`, `kitchen_counter`, `stove`, `bedroom_rug`, `bathtub`, `toilet`, `bathroom_vanity`, `towel_rail`, `bathroom_shelf`, `hand_towel`, `entry_mat`, `umbrella`, `drapes`.
- Doors are door leaves merged into the static `walls` body (`src/world/apartment.js` addDoorLeaf), so no dynamic door can be pushed.
- Wall drive test (2 s boost into each outer wall):

| wall | robot start | robot end | moved | wall body moved |
| --- | --- | --- | ---: | --- |
| north (z-) | (-3, -3.44) | (-3, -3.565) | 0.125 m | no |
| south (z+) | (-3, 3) | (-3, 3.093) | 0.093 m | no |
| west (x-) | (-4.9, -1) | (-5.04, -1) | 0.14 m | no |
| east (x+) | (4.9, -1) | (5.365, -1) | 0.465 m | no |

Dynamic objects that read as wall/door scale: bookshelf (42 kg, 0.32x1.86x1.00 m); wardrobe (120 kg, 1.12x2.02x0.60 m); study_shelves (18 kg, 0.30x1.80x0.90 m).

## Push law — 7 kg robot, 0.40 m/s (0.55 boost), 2 s boost drive

| object | mass kg | class | start (x,z) | end (x,z) | Δ (m) | Δrot | robot Δ (m) | min contact | max speed | robot max y | verdict |
| --- | ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| sofa | 85 | heavy | (-2.5, -2.755) | (-2.5, -2.755) | **0.0000** | 0° | 0.096 | 0.149 | 0.55 | 0 | PASS (< 0.01) |
| bed | 75 | heavy | (-4.15, 2.571) | (-4.15, 2.571) | **0.0000** | 0° | 0.213 | 0.095 | 0.55 | 0 | PASS (< 0.01) |
| wardrobe | 120 | heavy | (-2.04, 1.081) | (-2.04, 1.081) | **0.0000** | 0° | 0.131 | 0.175 | 0.55 | 0 | PASS (< 0.01) |
| fridge | 95 | heavy | (5.145, -3.2) | (5.145, -3.2) | **0.0001** | 0° | 0.189 | 0.175 | 0.55 | 0 | PASS (< 0.01) |
| bookshelf | 42 | heavy | (-5.375, -0.6) | (-5.375, -0.6) | **0.0002** | 0° | 0.666 | 0.175 | 0.55 | 0 | PASS (< 0.01) |
| dining_table | 34 | heavy | (2.2, -0.8) | (2.2, -0.8) | **0.0003** | 0° | 1.109 | 0 | 0.55 | 0 | PASS (< 0.01) |
| desk | 26 | heavy | (4.15, 3.317) | (4.15, 3.318) | **0.0004** | 0° | 0.710 | 0 | 0.55 | 0 | PASS (< 0.01) |
| armchair | 21 | heavy-spec | (-4.55, -1.75) | (-4.551, -1.75) | **0.0013** | 0° | 0.360 | 0.175 | 0.55 | 0 | PASS (< 0.01 (spec)) |
| chair_1 | 5.5 | light | (1.72, -1.55) | (0.766, -1.521) | **0.9542** | 77.65° | 0.807 | 0 | 0.55 | 0 | PASS (> 0.03) |
| study_box_1 | 1.8 | light | (5.1, 1.05) | (5.15, 0.975) | **0.0901** | 0.9° | 0.478 | 0.032 | 0.55 | 0 | PASS (> 0.03) |
| study_box_2 | 1.2 | light | (5.1, 1.05) | (5.148, 0.953) | **0.1083** | 5.02° | 0.478 | 0.07 | 0.55 | 0 | PASS (> 0.03) |
| trash_bin | 1.6 | light | (1.55, -3.3) | (1.441, -3.57) | **0.2910** | 5.29° | 0.454 | 0 | 0.55 | 0 | PASS (> 0.03) |
| laundry_basket | 1 | light | (-2.2, 1.85) | (-2.939, 1.834) | **0.7396** | 0.17° | 0.875 | 0 | 0.55 | 0 | PASS (> 0.03) |
| coffee_table | 13 | medium | (-2.5, -1.55) | (-2.5, -1.55) | **0.0000** | 0° | 1.128 | 0 | 0.55 | 0.012 | PASS (info) |

## Arm payload & reach

- limits: maxLiftKg **0.5**, reach **0.34** m; robot state mass: 7 kg
- refused (too_heavy): laptop 1.6 kg → {"ok":false,"reason":"too_heavy","held":null}; kettle 1 kg → {"ok":false,"reason":"too_heavy","held":null}; book_stack_1 1.4 kg → {"ok":false,"reason":"too_heavy","held":null}
- mug on coffee table: y=0.5153811573982239 m, robot drove 0.457 m toward the table, shoulder→mug 0.269 m, canReach=true, grab={"ok":true,"reason":null,"held":"mug_white"}
- carry/lift: mug 0.515 m on table -> 0.499 m carried (robot 0.648 m / mug 0.679 m) -> 0.585 m with aim held up (aim-up lift 0.086 m); released, final y=0.058 m, joint released=true
- reach boundary: 0.30 m → true, 0.32 m → true, 0.45 m → false
- dining table (0.76 m): canReach top=false; plate on table → {"ok":false,"reason":"out_of_reach","held":null}

## Spawn, stacks & stability

- interpenetration (QA gate 5: <= 2 mm): deepest contact -1.0 mm; pairs > 2.5 mm: **0**

- below floor (collider minY < -5 mm): none
- 3 s passive: 12 stacked pairs, max relative drift 0.00 mm, max body drift 0.00 mm, 177/177 asleep
- nudge test: 8 stacks, max shift 0.0 mm, max tilt 0.01°, 8/8 re-asleep
- tunneling: needle drop → y=0.0124 m; 3 cm ball @6 m/s (no CCD) → y=0.03 m

## Room transitions (driven, no teleport through doorways)

| transition | from | to | moved | verdict |
| --- | --- | --- | ---: | --- |
| living->hallway (cased opening z=0.7, x -0.9..0.15) | LIVING ROOM | HALLWAY | 1.604 m | PASS |
| hallway->bedroom (door x=-1.4, z 2.7..3.58) | HALLWAY | BEDROOM | 1.438 m | PASS |
| hallway->bathroom (door x=0.6, z 1.0..1.88) | HALLWAY | BATHROOM | 1.372 m | PASS |
| kitchen->study (door z=0.7, x 3.62..4.5) | KITCHEN / DINING | STUDY | 1.602 m | PASS |
| living->kitchen (open plan, z=0) | LIVING ROOM | KITCHEN / DINING | 1.611 m | PASS |
| hallway->living (cased opening) | HALLWAY | LIVING ROOM | 1.581 m | PASS |
| bathroom->hallway (door x=0.6) | BATHROOM | HALLWAY | 1.605 m | PASS |
| study->kitchen (door z=0.7) | STUDY | KITCHEN / DINING | 1.603 m | PASS |

## Findings

No FAIL rows.
## Notes

- Push method: robot is placed just outside the object collider footprint facing its centre, then `KeyW`+`ShiftLeft` are held for 2 s (boost). Tests are only counted when robot↔object contact actually happened (min surface distance ≤ 0.27 m); invalid attempts are retried once from another side.
- Collider AABBs (physics truth) are used for below-floor / wall-scale checks; contact manifolds are used for interpenetration and stack detection.
- Determinism: headless Chrome on Metal GPU, fixed 1/60 s Rapier world stepped by the app loop; numbers are reproducible run-to-run within a few mm.
