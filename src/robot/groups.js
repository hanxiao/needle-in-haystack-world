// Collision-group layout shared by the robot body, its gripper and held objects.
// Rapier InteractionGroups: high 16 bits = membership, low 16 bits = filter.
export const GROUP = {
  ROBOT: 0x0002,
  HELD: 0x0004,
  GRIPPER: 0x0008,
};

const ALL = 0xffff;

export const bits = (membership, filter) => ((membership & 0xffff) << 16) | (filter & 0xffff);

export const GROUPS = {
  // Robot body: collides with everything except the object it is holding.
  robot: bits(GROUP.ROBOT, ALL & ~GROUP.HELD),
  // Filter passed to the character controller queries: ignore own gripper + held object.
  robotCharacter: bits(GROUP.ROBOT, ALL & ~GROUP.HELD & ~GROUP.GRIPPER),
  // Gripper: sensor body used as the joint anchor; ignores robot body + held object.
  gripper: bits(GROUP.GRIPPER, ALL & ~GROUP.HELD & ~GROUP.ROBOT),
  // Held object: keep colliding with the world, stop colliding with the robot.
  held: bits(GROUP.HELD, ALL & ~GROUP.ROBOT & ~GROUP.GRIPPER),
};
