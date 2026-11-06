# Robot spec — round 2 (sweeper base + K12-class 3-DOF arm)

Research anchors (fetched 2026-11-06):
- DOBOT Magician (K12/education class): 4 axes, **500 g payload**, **320 mm reach**, **3.4 kg** arm weight,
  joint ranges base ±120°, rear arm −5…+90°, forearm −15…+90°, joint speed **320°/s**, repeatability ±0.2 mm.
  Source: https://www.dobot-robots.com/products/education/magician.html
- DOBOT Magician Lite (K12): 4 DOF, 250 g payload, 340 mm reach, 2.4 kg, J1–J3 300°/s, joint ranges
  base ±135°, rear −5…80°, fore −10…85°. Source: https://www.dobot-robots.com/products/education/magician-lite.html
- Robot vacuum class: ~350 mm diameter, 90–105 mm body height, ~3.5–5 kg, ~0.3 m/s travel,
  LiDAR turret ~10 cm, 2 driven wheels + caster. Sources: Xiaomi/Roborock/MOVA spec pages and
  https://courses.grainger.illinois.edu/ece445zjui/getfile.asp?id=21326 (vacuum robots <5 kg, <100 mm).
- Wheel size class: 65–80 mm diameter drive wheels (typical robot-vacuum drive module), 2 driven + 1 caster.

## Target robot (our machine)

| property | value | basis |
| --- | --- | --- |
| base | 350 mm dia, 120 mm tall, 2 driven wheels 70 mm + 1 caster | sweeper class |
| total height | ~380 mm with camera mast / folded arm | sweepers are low; mast needed for vision |
| mass | 7.0 kg total (3.6 kg base + 3.4 kg arm) | vacuum base + Magician arm |
| drive | differential, 2× 70 mm wheels, wheelbase 280 mm | sweeper |
| max speed | 0.40 m/s (boost 0.55), accel 0.8 m/s² | ~0.3 m/s sweeper class |
| turn rate | 120°/s | differential drive |
| step/snap | autostep 0.035 m, snap 0.05 m | low chassis, no stair climbing |
| arm | 3 DOF: base yaw ±120°, shoulder −5…90°, elbow −15…90° + 2-finger gripper | K12 arm, 3 DOF |
| arm links | 150 mm upper + 150 mm forearm + 45 mm gripper | Magician geometry |
| payload | 0.5 kg max | Dobot Magician |
| reach | 0.34 m from shoulder | Magician Lite/Magician |
| joint speed | ≤ 320°/s (rate-limited) | Dobot spec |
| gripper | 2-finger, 50–90 mm opening, 8 N grip | Magician gripper class |
| sensors | 4× 120° cameras at 0.30 m, 360° LiDAR turret, cliff/bumper | sweeper + 360 vision |
| cameras | front/right/left/back 120° fov 4:3 at ~0.30 m; top map camera 112° at 2.30 m | existing HUD |
| limits | no jumping, no climbing furniture, 0.5 kg lift, 0.34 m reach, 0.4 m/s, 7 kg push mass | real machine |

## Physics consequences (must hold)

- Robot mass 7 kg, max speed 0.4 m/s. Driving into heavy furniture must not slide it:
  sofa 85 kg, bed 75 kg, wardrobe 120 kg, fridge 95 kg, bookshelf 42 kg, dining table 34 kg,
  desk 26 kg, armchair 21 kg → displacement < 0.01 m from a 2 s boost push.
- Light objects (chair 5.5 kg, box 1.4 kg, trash bin 1.6 kg, paper, mug on floor) may be nudged/slid by the base.
- Arm lifts only ≤ 0.5 kg: mug 0.32, plate 0.45, book 0.5, small clutter; laptop 1.6 / kettle 1.0 / pan 1.2 refused.
- Arm reach 0.34 m: coffee table / sofa / bed / nightstand reachable from the floor; dining table (0.76 m) and
  kitchen counter (0.9 m) are intentionally out of reach.
- Walls, floors, ceiling, built-ins are static and never move.
