# Physics & real-mass audit — baseline

Generated: 2026-11-06 07:31:21 UTC · runtime 94.8s

- Build: `qa/physics/build/index.html` — 5,241,665 B, sha256 `00b2f2ca50be6dcd…`
- Git: `385abaa` · dirty: `M src/core/camera.js`, `M src/core/config.js`, `M src/core/physics.js`, `M src/main.js`, `M src/robot/arm.js`, `M src/robot/cameras.js`, `M src/robot/model.js`, `M src/robot/robot.js`, `M src/styles.css`, `M src/ui/hud.js`, `M src/world/clutter.js`, `M src/world/furniture.js`, `M src/world/helpers.js`, `?? docs/MASS_TABLE.md`, `?? docs/ROBOT_SPEC.md`, `?? src/robot/_harness.html`, `?? src/robot/_harness.js`, `?? src/robot/_run-copy.mjs`, `?? src/robot/_shots.mjs`, `?? src/ui/trail.js`
- Served: http://127.0.0.1:4183/ · label: `baseline`

## Verdict: **FIX**

42 PASS · 8 FAIL · 4 INFO. Rule: FIX if any P0/P1 FAIL, or >5 P2 FAILs; otherwise SHIP (P2 notes allowed).

## PASS/FAIL table

| # | gate | result | evidence |
| --- | --- | --- | --- |
| 1 | A1 app boots, ready flag set | PASS | ready=true after 6.7s; room=LIVING ROOM |
| 2 | A2 no console errors / page errors | PASS | 0 errors |
| 3 | A3 no console warnings | PASS | 0 warnings |
| 4 | A4 no failed network requests | PASS | 0 failed |
| 5 | A5 runtime errors array empty | PASS | __APP__.errors = [] |
| 6 | A6 steady fps >= 50 @1440x900 | PASS | 60.5 fps over 2 s (reported 60.0); drawCalls=287 |
| 7 | A7 draw calls <= 450 | PASS | drawCalls=287 triangles=67296 |
| 8 | B1 gravity is -9.81 m/s2 on Y | PASS | gravity = [0, -9.81, 0] |
| 9 | B2 fixed timestep is 1/60 s | PASS | world.timestep = 0.016666668 s (1/60 = 0.016666667) |
| 10 | B3 simulation runs at fixed 60 Hz | PASS | 59.97 physics steps/s measured over 2001 ms (120 steps) |
| 11 | B4 solver iterations >= 8 | PASS | world.numSolverIterations = 8 |
| 12 | B5 empirical free-fall g ~= 9.81 m/s2 | PASS | measured g=9.810 m/s2 from dv/dt over 30 steps (v: 0.00 -> -4.91 m/s) |
| 13 | B6 max drive speed 0.40 m/s (boost 0.55) | PASS | normal=0.400 m/s, boost=0.550 m/s |
| 14 | B7 heavy furniture (>=20 kg) damping >= 0.25/0.5 | **FAIL** | 3/8 low: armchair 0.12/0.35, dining_table 0.12/0.35, desk 0.12/0.35 |
| 15 | B8 friction in (0,1.2] and restitution in [0,1] | PASS | 229 dynamic colliders; badFriction=0, badRestitution=0 |
| 16 | B9 heavy furniture colliders friction >= 0.8 | **FAIL** | 20/33 heavy colliders below 0.8: bookshelf 0.62, fridge 0.45, dining_table 0.62, wardrobe 0.62, desk 0.62 |
| 17 | B10 every dynamic body has damping > 0 | PASS | 171/171 bodies have lin+ang damping > 0 |
| 18 | B11 objects settle to sleep (>=90%) | PASS | 171/171 dynamic bodies asleep after settle (100%) |
| 19 | B12 all body transforms/velocities finite (no NaN) | PASS | 193/193 bodies finite |
| 20 | B13 positive finite principal inertia on all dynamic bodies | PASS | 171/171 dynamic bodies have positive finite inertia |
| 21 | B14 CCD coverage reported | INFO | 1/171 dynamic bodies have CCD enabled (tunneling checked in G4) |
| 22 | B15 joint count sane at rest | PASS | world.impulseJoints = 0 at rest (expected 0) |
| 23 | C1 every dynamic body has mass > 0 and finite | PASS | 171/171 dynamic bodies have positive finite mass |
| 24 | C2 declared mass == Rapier body mass (compound distribution) | PASS | 171/171 exact within 1% |
| 25 | C3 collider mass sum == body mass | PASS | 171/171 colliders sum to body mass |
| 26 | C4 every dynamic object classified against a realistic range | PASS | 171/171 objects classified |
| 27 | C5 masses realistic (no outliers) | **FAIL** | 1 outlier(s): toothpaste 0.35kg -> 0.15kg |
| 28 | C6 gravityScale == 1 for dynamic bodies | PASS | 171/171 at 1.0 |
| 29 | C7 grabbable == (mass <= 0.5 kg) | **FAIL** | 48 mismatch: trash_bin 1.6kg grabbable=true, bedside_lamp 1.3kg grabbable=true, laundry_basket 1kg grabbable=true, desk_lamp 1.1kg grabbable=true, study_box_1 1.8kg grabbable=true, study_box_2 1.2kg grabbable=true |
| 30 | C8 every dynamic body has >= 1 collider | PASS | 171/171 bodies have colliders |
| 31 | D1 all architecture objects are static (fixed) | PASS | 21 architecture objects static, bodyType=fixed |
| 32 | D2 doors are static (no dynamic door leaf) | PASS | no separate door objects; door leaves merged into static `walls` body (src/world/apartment.js addDoorLeaf -> walls batch) |
| 33 | D3 robot cannot drive through walls (4 sides, 2 s boost) | PASS | north (z-): end (-3.255, -3.56) moved 0.155 m; south (z+): end (-3, 3.11) moved 0.11 m; west (x-): end (-5.04, -1.002) moved 0.14 m; east (x+): end (5.36, -1) moved 0.46 m |
| 34 | D4 walls/static bodies do not move at all | PASS | 22 static bodies bit-identical after 4 wall impacts |
| 35 | D5 no dynamic object reads as wall/door | INFO | large dynamic slabs: bookshelf (42 kg, 0.32x1.86x1.00 m), wardrobe (120 kg, 1.14x2.03x0.60 m), study_shelves (18 kg, 0.30x1.80x0.90 m) — immovable per spec but visually architecture-scale |
| 36 | E1 heavy furniture displacement < 0.01 m (2 s boost) | **FAIL** | sofa 0.0258m, bed 0.0546m, wardrobe 0.0022m, fridge 0.0052m, bookshelf 0.0050m, dining_table 0.0000m, desk 0.0779m, armchair 0.4718m |
| 37 | E2 light objects pushable > 0.03 m (2 s boost) | PASS | chair_1 0.757m, study_box_1 0.110m, study_box_2 0.138m, trash_bin 0.302m, laundry_basket 0.737m |
| 38 | E3 push tests made real contact | PASS | 14/14 pushes validated by robot-object contact |
| 39 | F1 arm limits are 0.5 kg payload / 0.34 m reach | PASS | arm.maxLiftKg=0.5, arm.reach=0.34 |
| 40 | F2 laptop 1.6 kg refused (too_heavy) | PASS | laptop mass=1.6; grab={"ok":false,"reason":"too_heavy","held":null} |
| 41 | F3 kettle 1.0 kg / book stack 1.4 kg refused | PASS | kettle={"ok":false,"reason":"too_heavy","held":null}, book_stack_1={"ok":false,"reason":"too_heavy","held":null} |
| 42 | F4 mug 0.32 kg on coffee table accepted from floor | **FAIL** | mug y=0.5152744054794312, robot shoulder→mug=0.478 m, canReach=false, grab={"ok":false,"reason":"out_of_reach","held":null} |
| 43 | F5 reach boundary ~0.34 m (0.30 in, 0.45 out) | PASS | canReach(0.30m)=true, canReach(0.32m)=true, canReach(0.45m)=false |
| 44 | F6 dining table (0.76 m) out of reach | PASS | canReach(table top)=false; plate on table: mass=0.45, grab={"ok":false,"reason":"out_of_reach","held":null} |
| 45 | F7 grab creates fixed joint; release drops it | INFO | joints held=0, after release=0, lift=n/a |
| 46 | F9 robot total mass 7.0 kg (3.6 base + 3.4 arm) | PASS | runtime state lacks mass; built config contains mass:7/baseMass:3.6/armMass:3.4 = true |
| 47 | G1 no spawn interpenetration > 10 mm | **FAIL** | 17 pair(s) > 10 mm; worst: shoe_2↔shoe_4 -36mm, monitor↔bottle_desk -35mm, study_book_3↔study_book_7 -33mm, bed↔sock_floor -27mm, windows↔dish_rack -23mm, floor_tile↔bath_mat -20mm |
| 48 | G2 no dynamic body below floor (collider minY >= -5 mm) | **FAIL** | bath_mat minY=-12.3mm, sock_floor minY=-11.6mm |
| 49 | G2b static ground/exterior colliders below y=0 (expected) | INFO | 4 static bodies: floor_wood, floor_tile, exterior, city_view |
| 50 | G3 stacks stay put over 3 s (rel drift < 5 mm) | PASS | 66 dynamic-on-dynamic resting pairs; max relative drift 0.00 mm |
| 51 | G4 no passive drift / jitter (max drift < 2 mm, all asleep) | PASS | max drift 0.00 mm; 171/171 asleep; max \|v\| 0.0000 m/s |
| 52 | G5 nudged stacks re-settle (< 50 mm, < 5 deg, asleep) | PASS | 8 stacks nudged: max shift 0.1 mm (cushion_3), max tilt 0.03 deg, 8/8 asleep |
| 53 | G6 no tunneling (needle drop + 6 m/s 3 cm ball) | PASS | needle drop from 0.9 m -> y=0.0124; 3 cm ball @6 m/s -> y=0.0399 (no CCD) |
| 54 | G7 all bodies finite and inside the apartment after all tests | PASS | 171 dynamic bodies finite, inside shell, 171/171 asleep |

## Engine laws & settings

| setting | value |
| --- | --- |
| gravity | [0, -9.81, 0] m/s² |
| fixed timestep | 0.016666668 s (1/60 = 0.016666667) |
| solver iterations | 8 |
| Rapier | 0.21.0 |
| bodies / colliders | 195 / 334 |
| dynamic / static objects | 171 / 22 |
| impulse joints at rest | 0 |
| fps @1440x900 | 60.5 |
| draw calls | 287 |
| heavy bodies (>=20 kg) damping | 0.40/0.70, 0.12/0.35, 0.35/0.70 |
| heavy collider friction | 0.90, 0.62, 0.45 |

Material presets (src/core/physics.js): wood 0.62/0.04, fabric 0.90/0.00, metal 0.45/0.12, ceramic 0.50/0.08, plastic 0.50/0.15, glass 0.30/0.05, rubber 1.00/0.35; default damping 0.12 lin / 0.35 ang.

## Mass table — all 171 dynamic objects

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
| study_box_1 | 1.8 | storage box | 0.5–3 | PASS |
| bathroom_scale | 1.8 | bathroom scale | 1.5–2.5 | PASS |
| backpack | 1.8 | bag | 0.2–2.5 | PASS |
| trash_bin | 1.6 | trash bin | 0.7–2 | PASS |
| laptop | 1.6 | laptop | 1.2–2 | PASS |
| study_box_3 | 1.4 | storage box | 0.5–3 | PASS |
| book_stack_1 | 1.4 | book stack | 0.8–3 | PASS |
| blanket_bed | 1.4 | blanket/throw | 0.5–2.5 | PASS |
| bedside_lamp | 1.3 | bedside lamp | 0.8–2.5 | PASS |
| study_box_2 | 1.2 | storage box | 0.5–3 | PASS |
| pan_stove | 1.2 | pan | 0.6–1.5 | PASS |
| desk_lamp | 1.1 | desk lamp | 0.8–3 | PASS |
| wine_bottle | 1.1 | bottle | 0.25–1.6 | PASS |
| laundry_basket | 1 | basket | 0.6–1.5 | PASS |
| kettle | 1 | kettle | 0.8–1.5 | PASS |
| sofa_throw | 0.9 | blanket/throw | 0.5–2.5 | PASS |
| book_stack_2 | 0.9 | book stack | 0.8–3 | PASS |
| cutting_board | 0.8 | cutting board | 0.3–1.2 | PASS |
| vase | 0.7 | vase | 0.3–2.5 | PASS |
| dish_rack | 0.7 | rack | 0.3–1.5 | PASS |
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
| pillow_1 | 0.45 | cushion/pillow | 0.2–1 | PASS |
| pillow_2 | 0.45 | cushion/pillow | 0.2–1 | PASS |
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
| toothpaste | 0.35 | toothpaste tube | 0.05–0.25 | OUTLIER → suggest 0.15 kg |
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

### Mass outliers

| object | current kg | realistic range | suggested kg |
| --- | ---: | --- | ---: |
| toothpaste | 0.35 | 0.05–0.25 (toothpaste tube) | 0.15 |

## Static architecture

- Architecture objects (tag `architecture` + built-ins): **all static / bodyType fixed** — see D1.
- Doors are door leaves merged into the static `walls` body (`src/world/apartment.js` addDoorLeaf), so no dynamic door can be pushed.
- Wall drive test (2 s boost into each outer wall):

| wall | robot start | robot end | moved | wall body moved |
| --- | --- | --- | ---: | --- |
| north (z-) | (-3.255, -3.405) | (-3.255, -3.56) | 0.155 m | no |
| south (z+) | (-3, 3) | (-3, 3.11) | 0.11 m | no |
| west (x-) | (-4.9, -1) | (-5.04, -1.002) | 0.14 m | no |
| east (x+) | (4.9, -1) | (5.36, -1) | 0.46 m | no |

Dynamic objects that read as wall/door scale: bookshelf (42 kg, 0.32x1.86x1.00 m); wardrobe (120 kg, 1.14x2.03x0.60 m); study_shelves (18 kg, 0.30x1.80x0.90 m).

## Push law — 7 kg robot, 0.40 m/s (0.55 boost), 2 s boost drive

| object | mass kg | class | start (x,z) | end (x,z) | Δ (m) | robot Δ (m) | min contact | verdict |
| --- | ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| sofa | 85 | heavy | (-2.5, -2.756) | (-2.497, -2.73) | **0.0258** | 0.117 | 0.13 | FAIL (< 0.01) |
| bed | 75 | heavy | (-4.171, 2.571) | (-4.225, 2.573) | **0.0546** | 0.509 | 0.038 | FAIL (< 0.01) |
| wardrobe | 120 | heavy | (-2.031, 1.083) | (-2.033, 1.081) | **0.0022** | 0.204 | 0.178 | PASS (< 0.01) |
| fridge | 95 | heavy | (5.141, -3.197) | (5.145, -3.2) | **0.0052** | 0.002 | 0.174 | PASS (< 0.01) |
| bookshelf | 42 | heavy | (-5.375, -0.6) | (-5.38, -0.599) | **0.0050** | 0.661 | 0.175 | PASS (< 0.01) |
| dining_table | 34 | heavy | (2.2, -0.795) | (2.2, -0.795) | **0.0000** | 1.129 | 0 | PASS (< 0.01) |
| desk | 26 | heavy | (4.15, 3.317) | (4.072, 3.322) | **0.0779** | 0.888 | 0 | FAIL (< 0.01) |
| armchair | 21 | heavy | (-4.55, -1.75) | (-4.079, -1.752) | **0.4718** | 0.485 | 0 | FAIL (< 0.01) |
| chair_1 | 5.5 | light | (1.72, -1.549) | (0.963, -1.56) | **0.7567** | 0.857 | 0 | PASS (> 0.03) |
| study_box_1 | 1.8 | light | (5.1, 1.05) | (5.087, 0.941) | **0.1101** | 0.420 | 0.032 | PASS (> 0.03) |
| study_box_2 | 1.2 | light | (5.1, 1.05) | (5.148, 0.92) | **0.1384** | 0.419 | 0.07 | PASS (> 0.03) |
| trash_bin | 1.6 | light | (1.546, -3.299) | (1.68, -3.57) | **0.3020** | 0.529 | 0 | PASS (> 0.03) |
| laundry_basket | 1 | light | (-2.2, 1.85) | (-2.937, 1.831) | **0.7374** | 0.880 | 0 | PASS (> 0.03) |
| coffee_table | 13 | medium | (-2.5, -1.55) | (-2.496, -1.563) | **0.0140** | 0.086 | 0.097 | PASS (info) |

## Arm payload & reach

- limits: maxLiftKg **0.5**, reach **0.34** m; robot state mass: not exposed kg
- refused (too_heavy): laptop 1.6 kg → {"ok":false,"reason":"too_heavy","held":null}; kettle 1 kg → {"ok":false,"reason":"too_heavy","held":null}; book_stack_1 1.4 kg → {"ok":false,"reason":"too_heavy","held":null}
- mug on coffee table: y=0.5152744054794312 m, shoulder→mug 0.478 m, canReach=false, grab={"ok":false,"reason":"out_of_reach","held":null}
- reach boundary: 0.30 m → true, 0.32 m → true, 0.45 m → false
- dining table (0.76 m): canReach top=false; plate on table → {"ok":false,"reason":"out_of_reach","held":null}

## Spawn, stacks & stability

- interpenetration: deepest contact -36.0 mm; pairs > 10 mm: **17**

| pair | penetration |
| --- | ---: |
| shoe_2 ↔ shoe_4 | -36.0 mm |
| monitor ↔ bottle_desk | -35.0 mm |
| study_book_3 ↔ study_book_7 | -32.5 mm |
| bed ↔ sock_floor | -26.6 mm |
| windows ↔ dish_rack | -22.5 mm |
| floor_tile ↔ bath_mat | -20.3 mm |
| toilet ↔ bath_mat | -20.0 mm |
| kitchen_counter ↔ dish_rack | -16.6 mm |
| stove ↔ pan_stove | -15.0 mm |
| sofa ↔ cushion_1 | -14.4 mm |
| study_book_4 ↔ study_book_8 | -12.5 mm |
| paper_dining_2 ↔ book_dining | -12.0 mm |
| notebook ↔ paper_desk_2 | -12.0 mm |
| floor_wood ↔ sock_floor | -11.9 mm |
| floor_wood ↔ bath_mat | -11.4 mm |

- below floor (collider minY < -5 mm): bath_mat -12.3mm, sock_floor -11.6mm
- 3 s passive: 66 stacked pairs, max relative drift 0.00 mm, max body drift 0.00 mm, 171/171 asleep
- nudge test: 8 stacks, max shift 0.1 mm, max tilt 0.03°, 8/8 re-asleep
- tunneling: needle drop → y=0.0124 m; 3 cm ball @6 m/s (no CCD) → y=0.0399 m

## Findings

### P1

- **E1 heavy furniture displacement < 0.01 m (2 s boost)** — sofa 0.0258m, bed 0.0546m, wardrobe 0.0022m, fridge 0.0052m, bookshelf 0.0050m, dining_table 0.0000m, desk 0.0779m, armchair 0.4718m
- **F4 mug 0.32 kg on coffee table accepted from floor** — mug y=0.5152744054794312, robot shoulder→mug=0.478 m, canReach=false, grab={"ok":false,"reason":"out_of_reach","held":null}

### P2

- **B7 heavy furniture (>=20 kg) damping >= 0.25/0.5** — 3/8 low: armchair 0.12/0.35, dining_table 0.12/0.35, desk 0.12/0.35
- **B9 heavy furniture colliders friction >= 0.8** — 20/33 heavy colliders below 0.8: bookshelf 0.62, fridge 0.45, dining_table 0.62, wardrobe 0.62, desk 0.62
- **C5 masses realistic (no outliers)** — 1 outlier(s): toothpaste 0.35kg -> 0.15kg
- **C7 grabbable == (mass <= 0.5 kg)** — 48 mismatch: trash_bin 1.6kg grabbable=true, bedside_lamp 1.3kg grabbable=true, laundry_basket 1kg grabbable=true, desk_lamp 1.1kg grabbable=true, study_box_1 1.8kg grabbable=true, study_box_2 1.2kg grabbable=true
- **G1 no spawn interpenetration > 10 mm** — 17 pair(s) > 10 mm; worst: shoe_2↔shoe_4 -36mm, monitor↔bottle_desk -35mm, study_book_3↔study_book_7 -33mm, bed↔sock_floor -27mm, windows↔dish_rack -23mm, floor_tile↔bath_mat -20mm
- **G2 no dynamic body below floor (collider minY >= -5 mm)** — bath_mat minY=-12.3mm, sock_floor minY=-11.6mm

## Notes

- Push method: robot is placed just outside the object collider footprint facing its centre, then `KeyW`+`ShiftLeft` are held for 2 s (boost). Tests are only counted when robot↔object contact actually happened (min surface distance ≤ 0.27 m); invalid attempts are retried once from another side.
- Collider AABBs (physics truth) are used for below-floor / wall-scale checks; contact manifolds are used for interpenetration and stack detection.
- Determinism: headless Chrome on Metal GPU, fixed 1/60 s Rapier world stepped by the app loop; numbers are reproducible run-to-run within a few mm.
