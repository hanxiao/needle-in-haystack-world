// buildWorld(ctx) — assembles the apartment shell, furniture and clutter.
import { ContactShadows, ROOMS } from './helpers.js';
import { buildApartment } from './apartment.js';
import { buildFurniture } from './furniture.js';
import { buildClutter } from './clutter.js';
import { CONFIG } from '../core/config.js';

export function buildWorld(ctx) {
  const shadows = new ContactShadows(ctx);

  const apartment = buildApartment(ctx);
  const furniture = buildFurniture(ctx, shadows);
  const clutter = buildClutter(ctx);
  shadows.build();

  const objects = [...apartment.objects, ...furniture, ...clutter];
  const rooms = ROOMS.map((r) => ({
    id: r.id,
    label: r.label,
    bounds: { ...r.bounds },
    center: [...r.center],
  }));

  return {
    rooms,
    objects,
    spawn: { pos: [...CONFIG.spawn.pos], yaw: CONFIG.spawn.yaw },
    windows: apartment.windows,
    doors: apartment.doors,
  };
}
