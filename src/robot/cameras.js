// 360 camera rig: four outward-facing head cameras + one top-down map camera.
// All cameras are children of the robot group, so their world matrices follow the
// robot even while `group.visible === false` (HUD pass).
// The top camera enables layer 2 so the Lead's trajectory line (layer 2) is only
// drawn in the minimap; the four surround cameras stay on layer 0.
import * as THREE from 'three';
import { ROBOT_DIMS } from './model.js';

const FOV_SIDE = 120;
const ASPECT_SIDE = 4 / 3;
const FOV_TOP = 122; // 2.5 m height * tan(61 deg) = ~4.5 m half-width
const NEAR = 0.02;
const FAR = 40;
const DOWN_TILT = -0.13; // ~7.5 degrees
const RING_RADIUS = ROBOT_DIMS.cameraRing;

export const TRAIL_LAYER = 2;
export const TOP_CAM_MAX_WORLD_Y = 2.58; // below the 2.7 m ceiling

export function createCameras() {
  const make = (fov, aspect) => new THREE.PerspectiveCamera(fov, aspect, NEAR, FAR);
  const y = ROBOT_DIMS.cameraY;
  const z = ROBOT_DIMS.headZ;

  const front = make(FOV_SIDE, ASPECT_SIDE);
  front.name = 'robot_cam_front';
  front.rotation.order = 'YXZ';
  front.position.set(0, y, z - RING_RADIUS);
  front.rotation.set(DOWN_TILT, 0, 0);

  const back = make(FOV_SIDE, ASPECT_SIDE);
  back.name = 'robot_cam_back';
  back.rotation.order = 'YXZ';
  back.position.set(0, y, z + RING_RADIUS);
  back.rotation.set(DOWN_TILT, Math.PI, 0);

  const left = make(FOV_SIDE, ASPECT_SIDE);
  left.name = 'robot_cam_left';
  left.rotation.order = 'YXZ';
  left.position.set(-RING_RADIUS, y, z);
  left.rotation.set(DOWN_TILT, Math.PI / 2, 0);

  const right = make(FOV_SIDE, ASPECT_SIDE);
  right.name = 'robot_cam_right';
  right.rotation.order = 'YXZ';
  right.position.set(RING_RADIUS, y, z);
  right.rotation.set(DOWN_TILT, -Math.PI / 2, 0);

  const top = make(FOV_TOP, 1);
  top.name = 'robot_cam_top';
  top.position.set(0, 2.5, 0);
  top.rotation.set(-Math.PI / 2, 0, 0);
  // Trajectory line lives on layer 2: minimap only.
  top.layers.enable(TRAIL_LAYER);

  return { front, back, left, right, top };
}
