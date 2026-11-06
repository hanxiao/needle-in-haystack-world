# Mass & physics audit — needle-in-haystack-world (round 2)

Audited: every dynamic object in `src/world/**` (175 after the round-3 bookshelf fill) plus the static architecture/built-ins (22).
Generated from the live world build (Rapier bodies read back after `physics.settle(120)`), so the
table reflects what the engine actually instantiates — not the source constants.

## Summary

| item | value |
| --- | --- |
| objects | 197 total — 175 dynamic, 22 static |
| required QA masses | sofa 85, fridge 95, bed 75, wardrobe 120, dining_table 34, chair_1 5.5, coffee_table 13, mug_white 0.32, book_stack_1 1.4, laptop 1.6, plant_monstera 8, needle 0.0012 kg — all exact |
| masses out of realistic range | 0 / 175 |
| dynamic objects tagged as architecture | 0 |
| heavy furniture (>= 20 kg) | 8: wardrobe 120, fridge 95, sofa 85, bed 75, bookshelf 42, dining_table 34, desk 26, armchair 21 |
| heavy friction / restitution | 1.0 / 0.0 (explicit per-object overrides; `physics.addObject` gained `friction`/`restitution`) |
| heavy damping | linear 0.25, angular 0.5 |
| settle after 120 steps | no object moves > 9 cm; no floating/interpenetrating stacks |
| verified with | robot v2 (350 mm, 7 kg, 0.40/0.55 m/s) on the built dist |

## Physics policy for heavy furniture (>= 20 kg)

`physics.addObject` now accepts explicit `friction` / `restitution`; `src/world/helpers.js` passes them through.
Every object with mass >= 20 kg is registered with `friction: 1.0`, `restitution: 0`,
`linearDamping: 0.25`, `angularDamping: 0.5` and a wide, low compound collider base. With Rapier's
average friction-combine rule this gives ~0.8 effective friction against the wood floor (0.6) and
~0.78 against tile (0.55).

## Dynamic objects (171) — sorted by mass

| object | kg | category | realistic range (kg) | verdict |
| --- | ---: | --- | --- | --- |
| wardrobe | 120 | wardrobe | 80–140 | OK |
| fridge | 95 | fridge | 60–110 | OK |
| sofa | 85 | sofa | 65–100 | OK |
| bed | 75 | bed (frame+mattress+bedding) | 60–90 | OK |
| bookshelf | 42 | bookshelf | 25–50 | OK |
| dining_table | 34 | dining table | 25–45 | OK |
| desk | 26 | desk | 20–35 | OK |
| armchair | 21 | armchair | 18–30 | OK |
| study_shelves | 18 | shelving unit | 15–30 | OK |
| coffee_table | 13 | coffee table | 10–20 | OK |
| tv | 11 | TV | 8–15 | OK |
| plant_monstera | 8 | large potted plant | 5–12 | OK |
| nightstand | 7 | nightstand | 5–10 | OK |
| desk_chair | 7 | task chair | 6–12 | OK |
| coat_rack | 6 | coat rack | 4–10 | OK |
| chair_1 | 5.5 | dining chair | 4–8 | OK |
| chair_2 | 5.5 | dining chair | 4–8 | OK |
| chair_3 | 5.5 | dining chair | 4–8 | OK |
| chair_4 | 5.5 | dining chair | 4–8 | OK |
| monitor | 4.5 | monitor | 3–6 | OK |
| floor_lamp | 4.2 | floor lamp | 3–6 | OK |
| bedside_lamp | 1.8 | table lamp | 1–2.5 | OK |
| study_box_1 | 1.8 | cardboard box (packed) | 0.5–2.5 | OK |
| bathroom_scale | 1.8 | bathroom scale | 1.5–2.5 | OK |
| backpack | 1.8 | backpack | 0.8–2.5 | OK |
| trash_bin | 1.6 | trash bin | 0.7–2 | OK |
| laptop | 1.6 | laptop | 1.2–2 | OK |
| desk_lamp | 1.5 | table lamp | 1–2.5 | OK |
| study_box_3 | 1.4 | cardboard box (packed) | 0.5–2.5 | OK |
| book_stack_1 | 1.4 | book stack | 0.8–2.5 | OK |
| blanket_bed | 1.4 | blanket | 0.8–2.5 | OK |
| study_box_2 | 1.2 | cardboard box (packed) | 0.5–2.5 | OK |
| pan_stove | 1.2 | frying pan | 1–2.5 | OK |
| wine_bottle | 1.1 | wine bottle | 0.9–1.4 | OK |
| laundry_basket | 1 | laundry basket | 0.6–1.5 | OK |
| kettle | 1 | kettle | 0.8–1.5 | OK |
| sofa_throw | 0.9 | throw blanket | 0.5–1.5 | OK |
| book_stack_2 | 0.9 | book stack | 0.8–2.5 | OK |
| cutting_board | 0.8 | cutting board | 0.4–1.2 | OK |
| vase | 0.7 | vase | 0.4–1.5 | OK |
| dish_rack | 0.7 | dish rack | 0.5–1.2 | OK |
| pillow_1 | 0.7 | cushion / pillow | 0.3–0.9 | OK |
| pillow_2 | 0.7 | cushion / pillow | 0.3–0.9 | OK |
| keyboard | 0.7 | keyboard | 0.5–1.2 | OK |
| shelf_book_12 | 0.6 | book | 0.3–1.5 | OK |
| shelf_book_13 | 0.6 | book | 0.3–1.5 | OK |
| shelf_book_14 | 0.6 | book | 0.3–1.5 | OK |
| shelf_book_15 | 0.6 | book | 0.3–1.5 | OK |
| shelf_book_16 | 0.6 | book | 0.3–1.5 | OK |
| shelf_book_17 | 0.6 | book | 0.3–1.5 | OK |
| shelf_book_18 | 0.6 | book | 0.3–1.5 | OK |
| plant_small | 0.6 | small potted plant | 0.3–1.5 | OK |
| herb_pot | 0.6 | small potted plant | 0.3–1.5 | OK |
| hoodie_chair_4 | 0.6 | shirt / hoodie | 0.15–0.9 | OK |
| jeans_floor | 0.6 | jeans | 0.4–0.9 | OK |
| basket_clothes | 0.6 | clothes bundle | 0.3–1.2 | OK |
| study_book_1 | 0.6 | book | 0.3–1.5 | OK |
| study_book_2 | 0.6 | book | 0.3–1.5 | OK |
| study_book_3 | 0.6 | book | 0.3–1.5 | OK |
| study_book_4 | 0.6 | book | 0.3–1.5 | OK |
| study_plant | 0.6 | small potted plant | 0.3–1.5 | OK |
| shelf_book_1 | 0.55 | book | 0.3–1.5 | OK |
| shelf_book_23 | 0.55 | book | 0.3–1.5 | OK |
| shelf_book_24 | 0.55 | book | 0.3–1.5 | OK |
| shelf_book_25 | 0.55 | book | 0.3–1.5 | OK |
| shelf_book_26 | 0.55 | book | 0.3–1.5 | OK |
| shelf_book_2 | 0.55 | book | 0.3–1.5 | OK |
| shelf_book_3 | 0.55 | book | 0.3–1.5 | OK |
| shelf_book_4 | 0.55 | book | 0.3–1.5 | OK |
| shelf_book_5 | 0.55 | book | 0.3–1.5 | OK |
| shelf_book_6 | 0.55 | book | 0.3–1.5 | OK |
| shelf_book_19 | 0.55 | book | 0.3–1.5 | OK |
| shelf_book_20 | 0.55 | book | 0.3–1.5 | OK |
| shelf_book_21 | 0.55 | book | 0.3–1.5 | OK |
| shelf_book_22 | 0.55 | book | 0.3–1.5 | OK |
| shelf_book_7 | 0.5 | book | 0.3–1.5 | OK |
| shelf_book_8 | 0.5 | book | 0.3–1.5 | OK |
| shelf_book_9 | 0.5 | book | 0.3–1.5 | OK |
| shelf_book_10 | 0.5 | book | 0.3–1.5 | OK |
| shelf_book_11 | 0.5 | book | 0.3–1.5 | OK |
| jar_1 | 0.5 | jar | 0.2–0.8 | OK |
| jar_2 | 0.5 | jar | 0.2–0.8 | OK |
| jar_3 | 0.5 | jar | 0.2–0.8 | OK |
| grocery_bag | 0.5 | grocery bag | 0.3–1.5 | OK |
| bottle_desk | 0.5 | water bottle | 0.3–0.8 | OK |
| study_book_5 | 0.5 | book | 0.3–1.5 | OK |
| study_book_6 | 0.5 | book | 0.3–1.5 | OK |
| study_book_7 | 0.5 | book | 0.3–1.5 | OK |
| study_book_8 | 0.5 | book | 0.3–1.5 | OK |
| cushion_1 | 0.45 | cushion / pillow | 0.3–0.9 | OK |
| cushion_2 | 0.45 | cushion / pillow | 0.3–0.9 | OK |
| cushion_3 | 0.45 | cushion / pillow | 0.3–0.9 | OK |
| plate_1 | 0.45 | plate | 0.4–0.8 | OK |
| plate_2 | 0.45 | plate | 0.4–0.8 | OK |
| fruit_bowl | 0.45 | bowl | 0.2–0.8 | OK |
| plate_dining | 0.45 | plate | 0.4–0.8 | OK |
| book_bed | 0.45 | book | 0.3–1.5 | OK |
| shoe_1 | 0.45 | shoe | 0.3–0.7 | OK |
| shoe_2 | 0.45 | shoe | 0.3–0.7 | OK |
| shoe_3 | 0.45 | shoe | 0.3–0.7 | OK |
| shoe_4 | 0.45 | shoe | 0.3–0.7 | OK |
| book_2 | 0.42 | book | 0.3–1.5 | OK |
| book_dining | 0.4 | book | 0.3–1.5 | OK |
| cereal_box | 0.4 | cereal box | 0.3–0.7 | OK |
| towel_floor | 0.4 | towel | 0.2–0.8 | OK |
| bath_mat | 0.35 | bath mat | 0.2–0.8 | OK |
| dish_soap | 0.35 | bottle (bath/soap) | 0.2–0.7 | OK |
| shampoo | 0.35 | bottle (bath/soap) | 0.2–0.7 | OK |
| conditioner | 0.35 | bottle (bath/soap) | 0.2–0.7 | OK |
| lotion | 0.35 | bottle (bath/soap) | 0.2–0.7 | OK |
| mug_white | 0.32 | mug | 0.25–0.45 | OK |
| mug_blue | 0.32 | mug | 0.25–0.45 | OK |
| mug_tipped | 0.32 | mug | 0.25–0.45 | OK |
| mug_kitchen | 0.32 | mug | 0.25–0.45 | OK |
| mug_sink | 0.32 | mug | 0.25–0.45 | OK |
| mug_dining | 0.32 | mug | 0.25–0.45 | OK |
| mug_bedside | 0.32 | mug | 0.25–0.45 | OK |
| mug_desk | 0.32 | mug | 0.25–0.45 | OK |
| magazine | 0.3 | book | 0.3–1.5 | OK |
| bowl_1 | 0.3 | bowl | 0.2–0.8 | OK |
| bowl_2 | 0.3 | bowl | 0.2–0.8 | OK |
| pen_holder | 0.3 | pen holder | 0.15–0.5 | OK |
| study_bowl | 0.3 | bowl | 0.2–0.8 | OK |
| notebook_shelf | 0.28 | notebook | 0.2–0.5 | OK |
| notebook | 0.28 | notebook | 0.2–0.5 | OK |
| candle | 0.25 | candle | 0.15–0.5 | OK |
| slipper_1 | 0.25 | slipper | 0.2–0.5 | OK |
| slipper_2 | 0.25 | slipper | 0.2–0.5 | OK |
| headphones | 0.25 | headphones | 0.15–0.4 | OK |
| tissue_box | 0.22 | tissue box | 0.15–0.4 | OK |
| phone | 0.2 | phone | 0.15–0.25 | OK |
| phone_bed | 0.2 | phone | 0.15–0.25 | OK |
| apple_1 | 0.18 | fruit | 0.1–0.25 | OK |
| apple_2 | 0.18 | fruit | 0.1–0.25 | OK |
| apple_3 | 0.18 | fruit | 0.1–0.25 | OK |
| shirt_chair_2 | 0.18 | shirt / hoodie | 0.15–0.9 | OK |
| shirt_floor | 0.18 | shirt / hoodie | 0.15–0.9 | OK |
| remote | 0.15 | remote | 0.1–0.25 | OK |
| onion | 0.15 | onion | 0.1–0.25 | OK |
| toilet_roll | 0.15 | toilet roll | 0.1–0.3 | OK |
| cable_tv | 0.14 | cable | 0.05–0.3 | OK |
| cable_kitchen | 0.14 | cable | 0.05–0.3 | OK |
| charger_cable | 0.14 | cable | 0.05–0.3 | OK |
| cable_floor_study | 0.14 | cable | 0.05–0.3 | OK |
| dish_towel | 0.12 | dish towel | 0.05–0.25 | OK |
| toothpaste | 0.12 | toothpaste tube | 0.05–0.2 | OK |
| soap | 0.1 | soap | 0.05–0.15 | OK |
| mouse | 0.1 | mouse | 0.06–0.15 | OK |
| hairbrush | 0.08 | hairbrush | 0.05–0.15 | OK |
| sock_1 | 0.06 | sock | 0.03–0.1 | OK |
| sock_2 | 0.06 | sock | 0.03–0.1 | OK |
| sock_floor | 0.06 | sock | 0.03–0.1 | OK |
| keys | 0.05 | keys | 0.03–0.1 | OK |
| keys_floor | 0.05 | keys | 0.03–0.1 | OK |
| sponge_sink | 0.04 | sponge | 0.01–0.06 | OK |
| sponge_bath | 0.04 | sponge | 0.01–0.06 | OK |
| glasses | 0.03 | glasses | 0.02–0.05 | OK |
| paper_ball | 0.02 | crumpled paper | 0.005–0.03 | OK |
| mail_counter | 0.02 | paper / mail | 0.004–0.05 | OK |
| toothbrush | 0.02 | toothbrush | 0.01–0.03 | OK |
| toothbrush_2 | 0.02 | toothbrush | 0.01–0.03 | OK |
| mail_1 | 0.02 | paper / mail | 0.004–0.05 | OK |
| mail_2 | 0.02 | paper / mail | 0.004–0.05 | OK |
| pen | 0.012 | pen | 0.008–0.02 | OK |
| paper_floor_1 | 0.012 | paper / mail | 0.004–0.05 | OK |
| paper_floor_2 | 0.012 | paper / mail | 0.004–0.05 | OK |
| paper_floor_3 | 0.012 | paper / mail | 0.004–0.05 | OK |
| paper_dining_1 | 0.012 | paper / mail | 0.004–0.05 | OK |
| paper_dining_2 | 0.012 | paper / mail | 0.004–0.05 | OK |
| paper_kitchen_1 | 0.012 | paper / mail | 0.004–0.05 | OK |
| paper_kitchen_2 | 0.012 | paper / mail | 0.004–0.05 | OK |
| paper_desk_1 | 0.012 | paper / mail | 0.004–0.05 | OK |
| paper_desk_2 | 0.012 | paper / mail | 0.004–0.05 | OK |
| sticky_notes | 0.01 | sticky notes | 0.005–0.02 | OK |
| needle | 0.0012 | sewing needle | 0.0005–0.01 | OK |

## Static objects (22) — never move

| object | role | colliders |
| --- | --- | ---: |
| floor_wood | wood floor slab (living/bedroom/hallway/study) | 1 |
| floor_tile | tile floor slab (kitchen/bathroom) | 2 |
| thresholds | door thresholds | 4 |
| ceiling | ceiling slab | 1 |
| walls | all walls, baseboards, door casings, door leaves | 50 |
| windows | window frames, glass, sills, curtain rods + curtains | 18 |
| ceiling_lamps | ceiling light fixtures + dining pendant | 1 |
| wall_art | framed prints + kitchen wall clock | 2 |
| exterior | front-door landing (floor, walls, neighbour door) | 4 |
| city_view | exterior city/garden backdrop | 1 |
| rug | living-room rug | 1 |
| tv_stand | TV stand (built-in) | 1 |
| kitchen_counter | kitchen counter, sink, faucet, upper cabinet (built-in) | 6 |
| stove | range/oven (built-in) | 1 |
| bedroom_rug | bedroom rug | 1 |
| bathtub | bathtub + shower (built-in) | 1 |
| toilet | toilet (built-in) | 1 |
| bathroom_vanity | vanity + vessel sink + mirror (built-in) | 1 |
| towel_rail | towel rail + towel | 1 |
| entry_mat | hallway entry mat | 1 |
| umbrella | umbrella leaning by the door | 1 |
| drapes | draped cloth over chair backs / sofa arm / desk chair | 3 |

All 22 are registered through `physics.addStaticObject` / `addStaticBox` (Rapier fixed bodies, mass = Infinity).
Nothing tagged `architecture`, `wall`, `floor`, `ceiling`, `fixture` or `window` is dynamic, so the
"wall that moves" the user saw cannot be architecture: the only wall-like dynamics are the wardrobe
(120 kg, 2.02 m tall), bookshelf (42 kg, 1.86 m tall) and fridge (95 kg). They are now pinned by
friction 1.0 + damping and measured at <= 5 mm from a 2 s boost push (see below).

## Changes made this round

1. **Heavy furniture pinned**: friction 1.0, restitution 0, damping 0.25/0.5 for all 8 objects >= 20 kg
   (sofa, fridge, bed, wardrobe, bookshelf, dining_table, desk, armchair).
2. **Mass corrections**: bedside lamp 1.3 -> 1.8 kg, desk lamp 1.1 -> 1.5 kg (table lamps were under the
   realistic lamp range), toothpaste 0.35 -> 0.12 kg (tube), bed pillows 0.45 -> 0.7 kg each.
3. **Metadata**: `blanket_bed`, `pillow_1`, `pillow_2` now report `room: bedroom` (were `living`), so HUD
   room labels and QA room queries are correct.
4. **Coffee table lower shelf removed** (mesh + collider). Its 0.16 m shelf made the 0.38 m robot unable
   to drive under the table; the notebook that sat on it moved to the sofa seat. Table top height,
   colliders and every other mass are unchanged.
5. **TV + monitor** use `fabric` friction preset (0.9, e=0) instead of glass (0.3) so they cannot slide
   off their stands when bumped.
6. `helpers.js` `Batch.finish()` now forwards `friction` / `restitution` to `physics.addObject`.

## Verification (robot v2: 350 mm base, 7 kg, 0.40 m/s / 0.55 boost, collider 0.34 m tall)

2 s boost push (`hold W + Shift`) from a clean 0.5–0.7 m approach, displacement of the object:

| object | mass | displacement | target | verdict |
| --- | ---: | ---: | --- | --- |
| sofa | 85 | 0.0000 m | < 0.01 m | PASS |
| bed | 75 | 0.0000 m | < 0.01 m | PASS |
| wardrobe | 120 | 0.0001 m | < 0.01 m | PASS |
| fridge | 95 | 0.0000 m | < 0.01 m | PASS |
| bookshelf | 42 | 0.0002 m | < 0.01 m | PASS |
| dining_table | 34 | 0.0000 m | < 0.01 m | PASS |
| armchair | 21 | 0.0011 m | < 0.01 m | PASS |
| desk | 26 | 0.0000 m | < 0.01 m | PASS |
| coffee_table | 13 | 0.0000 m | free | PASS |
| chair_1 | 5.5 | 0.1537 m | > 0.03 m | PASS |
| trash_bin | 1.6 | 0.2708 m | free | PASS |

Room transitions (drive, 0.40 m/s, robot v2): living→kitchen, living→hallway, hallway→bedroom,
hallway→bathroom, kitchen→study, bedroom→hallway, study→kitchen — **7/7 pass** (verified on the live app
with `qa.teleport` + `hold('KeyW')`, room label changes).

Under the coffee table: robot drives from the living room, under the 0.4555 m table top and out the far
side (0.34 m collider vs 0.40 m clearance) — **pass** after removing the lower shelf.

Verified on the built single-file dist served at :4173 with robot v2: no console errors, 193 objects
(171 dynamic / 22 static), 296 draw calls at spawn, 61.8k triangles, 60 fps headless, all required names present.

## Spawn-geometry audit (reviewer P2 fixes, round 2)

Reviewer found 18 contact pairs > 10 mm at spawn plus two colliders sitting below the floor.
After the fixes the reviewer suite (`node qa/physics/run.mjs --dir=dist`) reports:

| check | before | after |
| --- | --- | --- |
| G1 spawn interpenetration > 10 mm | 18 pairs (worst shoe_2↔shoe_4 36 mm, monitor↔bottle 35 mm, study_book_3↔study_book_7 33 mm, bed↔sock_floor 27 mm, windows↔dish_rack 23 mm, walls↔wardrobe 20 mm, toilet↔bath_mat 20 mm, kitchen_counter↔dish_rack 17 mm, stove↔pan 15 mm) | **0 pairs**; deepest contact **-2.0 mm** across 239 pairs |
| G2 dynamic collider below floor | bath_mat -12.3 mm, sock_floor -11.6 mm | **lowest -0.0001 m** |

Fixes (all placement/collider height, no layout or mass changes):
- Tile floors (kitchen/bathroom) were 10 mm above the wood floor: mesh + collider top lowered to y=0 so items rest on one level.
- Coffee-table items raised 11.5 mm to the real collider top (0.4675 m); nightstand items raised to its 0.57 m top; bed-side lamp raised 6 mm.
- Wardrobe moved 4 cm off the bedroom east wall (its collider was 2 cm inside the wall).
- Stove collider top lowered 5 mm to the burner deck; pan now rests on it.
- Dish rack moved off the window sill; cutting board / wine bottle / mug reshuffled on the right counter; herb pot moved off the window glass.
- Bath mat moved clear of the toilet and rests flat on the floor; sock/jeans moved off the bed frame and rug edge (both were tilted half-on/half-off, which also caused the below-floor AABBs).
- Sofa cushions/throw moved forward of the backrest; notebook moved to the rug; clothes on chairs moved off the backrests; study books de-duplicated (two books shared one spot); papers/mail/toothbrushes/shoes/soap spread out.
- TV raised 7 mm onto its stand; drapes collider lifted 25 mm over the chair back.

Suite verdict after fixes: **55 PASS / 0 FAIL / 4 INFO — SHIP**.

## Round 3 polish (bathroom lighting, contact gate, detail)

Bathroom was the brightest room (reviewer `bath-fp` mean ~171 vs living ~108). It now measures:

| shot | before | after |
| --- | ---: | ---: |
| bath-fp (first person) | 172.4 | **141.0** |
| bath-a-tub | 140.0 | 133.8 |
| bath-b-vanity | 148.9 | 92.7 (camera close to tiled wall + robot arm in frame) |
| living-fp (reference) | 115.5 | 115.6 |
| kitchen-fp (reference) | 139.9 | 133.2 |

Changes (no global exposure / renderer edits):
- Bathroom-specific wall paint (cooler, darker), darker tile wainscot (0x8b9793), darker tile floor shared with the kitchen, frosted window made more opaque/cooler, and a roller blind over the bathroom window.
- Bathroom fixtures: muted ceramic (0xc4bfb3 tub/vanity, 0xb9b4a8 toilet), darker stone vanity top, toned-down mirror.
- Added a **tiled tub skirt** on the room side, a **shower rail + partly drawn curtain**, a **folded towel on the tub rim** and a **folded towel on the toilet tank** (bathroom detail wins).
- Added a subtle cool bathroom fill light (`PointLight 0xd7e5f2`, 0.3, 3.6 m) so the room reads evenly lit; the day/night toggle still owns the global lights.
- Kitchen: metal utensil rail with two hanging utensils on the backsplash.
- Living room: 4 extra books on the bookshelf (0.55 kg each, `shelf_book_23…26`).
- Bedside lamp raised 4 mm so the deepest resting contact drops below the 2 mm gate.

Verification after round 3 (`node qa/physics/run.mjs --dir=dist`): **56 PASS / 0 FAIL / 3 INFO — SHIP**.
- G1 spawn interpenetration ≤ 2 mm: **PASS — deepest contact -1.0 mm** (desk_lamp↔mug_desk) across 243 pairs; 0 pairs > 2.5 mm (the 2.2 mm pen contact is gone; pen rests at ~0.1 mm).
- G2 no dynamic body below floor: PASS (-0.0001 m).
- All 6 room transitions drive + under-coffee-table drive pass with robot v2; 197 objects, 306 draw calls at spawn, 63.6k tris, 0 console errors.
