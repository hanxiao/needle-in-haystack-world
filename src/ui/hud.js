import { CONFIG } from '../core/config.js';

const CAM_ORDER = ['front', 'right', 'left', 'back'];
const CAM_LABEL = { front: 'F', right: 'R', left: 'L', back: 'B' };

export function formatMass(kg) {
  if (!Number.isFinite(kg)) return '—';
  if (kg >= 10) return `${Math.round(kg)} kg`;
  if (kg >= 1) return `${kg.toFixed(1)} kg`;
  if (kg >= 0.01) return `${Math.round(kg * 1000)} g`;
  return `${(kg * 1000).toFixed(1)} g`;
}

export function prettyName(name = '') {
  return name.replace(/_/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
}

export function createHud(root) {
  root.innerHTML = `
    <div class="hud-room">
      <span class="hud-room-name" id="hud-room-name">LIVING ROOM</span>
      <span class="hud-sub">NEEDLE IN A HAYSTACK WORLD</span>
      <span class="hud-needle" id="hud-needle" hidden>NEEDLE FOUND</span>
    </div>
    <div class="hud-map" id="hud-map"><span class="hud-tag">SURROUND</span></div>
    <div class="hud-cam" data-cam="front"><span class="hud-cam-label">F</span></div>
    <div class="hud-cam" data-cam="right"><span class="hud-cam-label">R</span></div>
    <div class="hud-cam" data-cam="left"><span class="hud-cam-label">L</span></div>
    <div class="hud-cam" data-cam="back"><span class="hud-cam-label">B</span></div>
    <div class="hud-surround-tag" id="hud-surround-tag">360°</div>
    <div class="hud-cross" id="hud-cross"></div>
    <div class="hud-target" id="hud-target" hidden></div>
    <div class="hud-held" id="hud-held" hidden></div>
    <div class="hud-hint" id="hud-hint">WASD DRIVE · MOUSE ORBIT · CLICK GRAB · V VIEW · C 360 · L LIGHTS</div>
    <div class="hud-toast" id="hud-toast" hidden></div>
    <div class="hud-fps" id="hud-fps" hidden></div>
  `;

  const els = {
    room: root.querySelector('#hud-room-name'),
    needle: root.querySelector('#hud-needle'),
    map: root.querySelector('#hud-map'),
    surroundTag: root.querySelector('#hud-surround-tag'),
    cross: root.querySelector('#hud-cross'),
    target: root.querySelector('#hud-target'),
    held: root.querySelector('#hud-held'),
    hint: root.querySelector('#hud-hint'),
    toast: root.querySelector('#hud-toast'),
    fps: root.querySelector('#hud-fps'),
  };
  const cams = {};
  for (const key of CAM_ORDER) cams[key] = root.querySelector(`.hud-cam[data-cam="${key}"]`);

  let layoutCache = null;
  let toastTimer = 0;
  const cache = new Map();

  function setText(el, text) {
    if (cache.get(el) === text) return;
    cache.set(el, text);
    el.textContent = text;
  }

  function computeLayout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const mobile = w < CONFIG.hud.mobileBreakpoint;
    const margin = mobile ? 10 : CONFIG.hud.margin;
    const sw = mobile ? Math.min(258, Math.round(w * 0.42)) : CONFIG.hud.surroundWidth;
    const sh = Math.round(sw * 0.75);
    const gap = 2;
    const pw = (sw - gap) / 2;
    const ph = (sh - gap) / 2;
    const x0 = margin;
    const y0 = h - margin - sh;
    const panels = [
      { key: 'front', x: x0, y: y0, w: pw, h: ph },
      { key: 'right', x: x0 + pw + gap, y: y0, w: pw, h: ph },
      { key: 'left', x: x0, y: y0 + ph + gap, w: pw, h: ph },
      { key: 'back', x: x0 + pw + gap, y: y0 + ph + gap, w: pw, h: ph },
    ];
    const ms = mobile ? 118 : CONFIG.hud.mapSize;
    const map = { x: w - margin - ms, y: margin, w: ms, h: ms };
    return { panels, map, margin, mobile, surroundTag: { x: x0, y: Math.max(6, y0 - 15), w: sw, h: 12 } };
  }

  function applyLayout(layout) {
    for (const p of layout.panels) {
      const el = cams[p.key];
      if (!el) continue;
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
      el.style.width = `${p.w}px`;
      el.style.height = `${p.h}px`;
    }
    Object.assign(els.map.style, {
      left: `${layout.map.x}px`,
      top: `${layout.map.y}px`,
      width: `${layout.map.w}px`,
      height: `${layout.map.h}px`,
    });
    Object.assign(els.surroundTag.style, {
      left: `${layout.surroundTag.x}px`,
      top: `${layout.surroundTag.y}px`,
      width: `${layout.surroundTag.w}px`,
      height: `${layout.surroundTag.h}px`,
    });
  }

  function layout(force = false) {
    if (!layoutCache || force) {
      layoutCache = computeLayout();
      applyLayout(layoutCache);
    }
    return layoutCache;
  }

  function setSurround(on) {
    for (const key of CAM_ORDER) cams[key].classList.toggle('is-hidden', !on);
    els.map.classList.toggle('is-hidden', !on);
    els.surroundTag.classList.toggle('is-hidden', !on);
  }

  function showToast(text, tone = 'info') {
    setText(els.toast, text);
    els.toast.hidden = false;
    els.toast.dataset.tone = tone;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.hidden = true;
    }, 1900);
  }

  function update(s) {
    setText(els.room, s.roomLabel || '');
    setText(els.needle, 'NEEDLE FOUND');
    els.needle.hidden = !s.needleFound;

    if (s.target) {
      const status = !s.reachable ? 'OUT OF REACH' : s.heavy ? 'PUSH' : 'GRAB';
      setText(els.target, `${prettyName(s.target.name)} · ${formatMass(s.target.mass)} · ${status}`);
      els.target.hidden = false;
      els.target.dataset.status = !s.reachable ? 'far' : s.heavy ? 'heavy' : 'grab';
      els.cross.dataset.status = els.target.dataset.status;
    } else {
      els.target.hidden = true;
      els.cross.dataset.status = '';
    }

    if (s.held) {
      setText(els.held, `HOLDING · ${prettyName(s.held.name)} · ${formatMass(s.held.mass)} · CLICK TO PLACE`);
      els.held.hidden = false;
    } else {
      els.held.hidden = true;
    }

    els.hint.classList.toggle('is-faded', !s.hint);
    els.hint.textContent = s.hintText || 'WASD DRIVE · MOUSE ORBIT · CLICK GRAB · V VIEW · C 360 · L LIGHTS';
    els.fps.hidden = !s.debug;
    if (s.debug) setText(els.fps, `${s.fps} FPS · ${s.drawCalls} CALLS · ${s.dynamic} DYN`);
  }

  layout(true);

  return {
    layout,
    update,
    setSurround,
    showToast,
    els,
  };
}
