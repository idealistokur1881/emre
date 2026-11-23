/* ==========================================================================
   Yerdeki Kağıt Kuşlar — yardımcılar (PRNG, easing, renk, kamera matrisi)
   ========================================================================== */
'use strict';

const DURATION = 50.0;
const W = 1080, H = 1920;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
const smooth = (t) => t * t * (3 - 2 * t);
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const fract = (v) => v - Math.floor(v);
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

const Ease = {
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  out: (t) => 1 - (1 - t) * (1 - t),
  in: (t) => t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outSine: (t) => Math.sin((t * Math.PI) / 2),
  inSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
};

function wrap(v, lo, hi) {
  const span = hi - lo;
  return lo + ((((v - lo) % span) + span) % span);
}

function gauss(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(TAU * v);
}

/* ---- renkler ---- */
function hexRgb(h) {
  h = h.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function mixRgb(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
function rgbStr(c, a) {
  const r = Math.round(c[0]), g = Math.round(c[1]), b = Math.round(c[2]);
  return a === undefined ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
}
function mixHex(a, b, t) {
  return rgbStr(mixRgb(hexRgb(a), hexRgb(b), t));
}

/* ---- dünya saati: 27. saniyedeki vakumda dünya yavaşlayıp durur ---- */
function worldClock(t) {
  const a = 27.0, b = 28.4, D = b - a;
  if (t <= a) return t;
  if (t >= b) return a + D / 2;
  const u = t - a;
  return a + u - (u * u) / (2 * D);
}

/* ---- kamera: bakış noktası (cx,cy), ölçek s, Dutch açı r(°) ---- */
function camMatrix(c) {
  const s = c.s * (c.pulse || 1);
  const r = c.r * DEG;
  const a = Math.cos(r) * s, b = Math.sin(r) * s;
  const cx = c.cx + (c.jx || 0), cy = c.cy + (c.jy || 0);
  return [a, b, -b, a, 540 - (a * cx - b * cy), 960 - (b * cx + a * cy)];
}
function invMatrix(m) {
  const [a, b, c, d, e, f] = m;
  const det = a * d - b * c;
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
}
function applyMatrix(m, x, y) {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/* ---- Catmull-Rom yardımcıları ---- */
function crPoint(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [
    0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
  ];
}
/* keys: [[t, x, y], ...] — zamana göre Catmull-Rom yol */
function pathAt(keys, t) {
  if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
  const n = keys.length;
  if (t >= keys[n - 1][0]) return [keys[n - 1][1], keys[n - 1][2]];
  let i = 0;
  while (i < n - 2 && t > keys[i + 1][0]) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(n - 1, i + 2)];
  const u = (t - k1[0]) / (k2[0] - k1[0]);
  return crPoint([k0[1], k0[2]], [k1[1], k1[2]], [k2[1], k2[2]], [k3[1], k3[2]], u);
}

function bez2(p0, p1, p2, t) {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}
function bez3(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

const f1 = (v) => (Math.round(v * 10) / 10).toString();
function ptsStr(pts) {
  let s = '';
  for (let i = 0; i < pts.length; i++) s += (i ? ' ' : '') + f1(pts[i][0]) + ',' + f1(pts[i][1]);
  return s;
}

/* Omurga + kalınlıklardan yumuşak uzuv yolu (parmak, kol, kanat kenarı) */
function crSegs(P) {
  let d = '';
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d;
}
function limbPath(pts, ws, capStart) {
  const n = pts.length, Lp = [], Rp = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const nx = -dy, ny = dx, w = ws[i] / 2;
    Lp.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    Rp.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  const we = ws[n - 1] / 2, w0 = ws[0] / 2;
  let d = `M${f1(Lp[0][0])} ${f1(Lp[0][1])}` + crSegs(Lp);
  d += ` A${f1(we)} ${f1(we)} 0 0 0 ${f1(Rp[n - 1][0])} ${f1(Rp[n - 1][1])}`;
  d += crSegs(Rp.slice().reverse());
  if (capStart) d += ` A${f1(w0)} ${f1(w0)} 0 0 0 ${f1(Lp[0][0])} ${f1(Lp[0][1])}`;
  return d + 'Z';
}
