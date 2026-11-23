/* ==========================================================================
   Hikâye verisi: kalabalık yerleşimi, ağızdan fırlayan kuşlar, kahraman
   kuşun saniye saniye yolu, göz kırpmaları ve sesle paylaşılan olay listesi.
   ========================================================================== */
'use strict';

const MOUTH = [540, 1281];

function buildStory(fx) {
  const S = {};
  const R = mulberry32(8080);

  /* ---- kalabalık (6 ön + 6 arka, yarısı çark, yarısı ekran kafalı) ---- */
  const F = (type, facing, x0, coat, phase) => ({ type, facing, x0, coat, phase, s: 1, feet: FRONT_FEET, speed: 105, stepRate: 0.933 });
  const B = (type, facing, x0, coat, phase) => ({ type, facing, x0, coat, phase, s: 0.6, feet: BACK_FEET, speed: 64, stepRate: 0.933 });
  S.crowdFront = [
    F('screen', 1, 470 - 105 * 9.2, 'crowd-coat-a', 0.0),
    F('gear', -1, 1180, 'crowd-coat-b', 1.3),
    F('screen', -1, 150, 'crowd-coat-c', 2.1),
    F('gear', 1, 780, 'crowd-coat-a', 0.7),
    F('screen', 1, 1500, 'crowd-coat-b', 2.9),
    F('gear', -1, -260, 'crowd-coat-c', 1.9),
  ];
  S.crowdBack = [
    B('gear', 1, 40, 'crowd-coat-b', 0.4),
    B('screen', -1, 420, 'crowd-coat-a', 1.6),
    B('gear', -1, 980, 'crowd-coat-c', 2.4),
    B('screen', 1, 760, 'crowd-coat-b', 0.9),
    B('screen', -1, 1320, 'crowd-coat-c', 2.2),
    B('screen', 1, -300, 'crowd-coat-a', 1.2),
  ];

  /* ---- ağızdan fırlayan kuşlar: 14., 15.2., 16.3., 17.2., 18.0., 18.7., 19.3., 19.9. ---- */
  const launches = [14.0, 15.2, 16.3, 17.2, 18.0, 18.7, 19.3, 19.9];
  const durs = [0.95, 0.9, 0.85, 0.8, 0.72, 0.66, 0.6, 0.55];
  S.launches = launches.map((t, k) => ({ t, dir: k % 2 === 0 ? 1 : -1, dur: durs[k] }));
  S.mouthBirds = [];
  S.launches.forEach((L, k) => {
    const tHit = L.t + L.dur;
    let best = null, bestD = 1e9;
    const consider = (o) => {
      const x = crowdX(o, tHit);
      if ((x - 540) * L.dir < 140 || Math.abs(x - 540) > 520) return;
      const d = Math.abs(x - (540 + L.dir * 300)) + (o.s < 1 ? 120 : 0);
      if (d < bestD) { bestD = d; best = { o, x }; }
    };
    S.crowdFront.forEach(consider);
    if (!best) S.crowdBack.forEach(consider);
    let tx, ty;
    if (best) {
      tx = best.x - Math.sign(best.x - 540) * 96 * best.o.s;
      ty = best.o.feet - (690 + R() * 140) * best.o.s;
    } else {
      tx = 540 + L.dir * 330; ty = 900;
    }
    const mx = MOUTH[0] + L.dir * 11;
    const b = fx.at(L.t).spawnMouthBird(mx, MOUTH[1], L.dir * 380, -700, tx, { targetY: ty, dur: L.dur, size: 0.95 });
    S.mouthBirds.push(b);
  });

  /* ---- 13.4: kül yağmuru — 176 gri kuş (toplam 184 ölü kuş) ---- */
  fx.at(13.4).populateFloorGraveyard(176);
  fx.finalize();
  /* ---- 33.6: sıcak nefes (makro uzay: dudaklar) ---- */
  fx.at(33.6).emitWarmBreath(540, -150, 3.3);
  fx.at(34.6).macroBurst(540, 1020, 70);
  /* ---- 37.5: zincirleme alevlenme ---- */
  fx.at(37.5).igniteFloorWave(540, 1520);

  S.rainBirds = fx.birds.filter((b) => b.kind === 'rain');
  S.flock = fx.birds.filter((b) => b.tLift !== undefined).map((b) => ({ t: b.tLift, x: b.xLand })).sort((a, b) => a.t - b.t);

  /* ---- göz kırpmaları ---- */
  S.blinksP = [1.3, 3.6, 7.6, 11.2, 12.15, 15.9, 21.9, 23.6, 40.2, 42.4, 46.9];
  S.blinksL = [2.7, 8.4, 14.6, 19.8, 24.2, 26.05, 39.3, 41.9, 47.4];

  /* ---- kayan kuşun yuvarlanma tıkırtıları ---- */
  S.slideTicks = [];
  for (let tt = 23.55; tt < 26.75; tt += 0.42) S.slideTicks.push([tt, heroSlideX(tt)]);
  return S;
}

/* ---------------- kahraman kuşun saniye saniye yolu ---------------- */
const HERO_REST = [470, 1682];
const HERO_BOOT = [772, 1662];
const SLIDE_KEYS = [[23.0, 0, 0], [23.6, 0.05, 0], [24.4, 0.3, 0], [25.3, 0.63, 0], [26.1, 0.89, 0], [26.8, 1.0, 0]];
function heroSlideX(t) {
  const p = clamp(pathAt(SLIDE_KEYS, t)[0], 0, 1);
  return lerp(HERO_REST[0], HERO_BOOT[0], p);
}
const REVIVE_KEYS = [
  [36.95, 872, 1290], [37.22, 760, 1438], [37.5, 560, 1500], [37.85, 345, 1468],
  [38.3, 248, 1262], [38.9, 372, 980], [39.6, 596, 700], [40.3, 520, 380], [41.0, 410, 40],
];
const FRONTPASS_KEYS = [[47.0, -280, 1660], [47.6, 290, 1260], [48.2, 820, 830], [48.8, 1420, 420]];

function heroPose(t, camM) {
  const H = { vis: false, x: 0, y: 0, s: 0.7, rot: 0, flip: 1, c: 0, g: 0, au: 0, glow: 0, phase: 0, amp: 1, cracks: 0, alive: 0, gold: false };
  if (t < 5.8) return H;
  H.vis = true;
  if (t < 9.2) {
    const u = (t - 5.8) / 3.4;
    const e = Math.pow(u, 1.12);
    const P0 = [MOUTH[0] - 4, MOUTH[1]], P1 = [700, 1090], P2 = [600, 690], P3 = [342, 805];
    const p = bez3(P0, P1, P2, P3, e), q = bez3(P0, P1, P2, P3, Math.min(1, e + 0.015));
    H.x = p[0]; H.y = p[1];
    H.flip = q[0] >= p[0] ? 1 : -1;
    H.rot = clamp(Math.atan2(q[1] - p[1], Math.abs(q[0] - p[0]) + 1e-3), -0.8, 0.8);
    H.s = 0.2 + 0.72 * smooth(Math.min(1, (t - 5.8) / 0.55));
    H.glow = 1; H.alive = 1; H.amp = 1;
    H.phase = (t - 5.8) * (u < 0.2 ? 22 : 15);
    return H;
  }
  if (t < 9.32) {
    const k = smooth((t - 9.2) / 0.12);
    H.x = 342 + 16 * k; H.y = 805 - 6 * k; H.flip = -1; H.rot = 0.3 * k;
    H.s = 0.92 + 0.3 * k; H.c = k; H.g = k; H.glow = 1 - k; H.alive = 1 - k; H.amp = 1 - k; H.phase = 52 + (t - 9.2) * 40;
    return H;
  }
  if (t < 10.55) {
    const v = (t - 9.32) / 1.23;
    H.x = lerp(358, HERO_REST[0], Ease.out(v)) + Math.sin(v * 9) * 16 * (1 - v);
    H.y = 799 + (HERO_REST[1] - 799) * (0.2 * v + 0.8 * v * v) - 30 * Math.sin(Math.min(1, v * 3) * Math.PI) * (1 - v);
    H.rot = 0.3 + v * 2.6 + Math.sin(v * 7) * 0.3; H.flip = -1;
    H.s = 1.22; H.c = 1; H.g = 1; H.amp = 0;
    return H;
  }
  if (t < 23.0) {
    const d = t - 10.55;
    H.x = HERO_REST[0]; H.y = HERO_REST[1] - 6 * Math.sin(Math.PI * Math.min(1, d / 0.18)) * (d < 0.18 ? 1 : 0);
    H.rot = 2.9 + 0.02 * Math.sin(t * 2.7); H.flip = -1;
    H.s = 1.22; H.c = 1; H.g = 1; H.amp = 0;
    return H;
  }
  if (t < 26.8) {
    H.x = heroSlideX(t);
    const dist = H.x - HERO_REST[0];
    H.rot = 2.9 + dist / 26;
    H.y = HERO_REST[1] - Math.abs(Math.sin(dist / 26 * 2)) * 6 - (HERO_REST[1] - HERO_BOOT[1]) * clamp(dist / (HERO_BOOT[0] - HERO_REST[0]), 0, 1);
    H.flip = -1; H.s = 1.22; H.c = 1; H.g = 1; H.amp = 0;
    return H;
  }
  if (t < 28.85) {
    H.x = HERO_BOOT[0]; H.y = HERO_BOOT[1]; H.rot = 2.9 + (HERO_BOOT[0] - HERO_REST[0]) / 26; H.flip = -1;
    H.s = 1.22; H.c = 1; H.g = 1; H.amp = 0;
    return H;
  }
  if (t < 36.95) { H.vis = false; return H; }
  if (t < 41.0) {
    const p = pathAt(REVIVE_KEYS, t), q = pathAt(REVIVE_KEYS, t + 0.02);
    H.x = p[0]; H.y = p[1];
    H.flip = q[0] >= p[0] ? 1 : -1;
    H.rot = clamp(Math.atan2(q[1] - p[1], Math.abs(q[0] - p[0]) + 1e-3), -0.9, 0.9) * 0.8;
    H.s = 0.8 + 0.16 * smooth(inv(36.95, 37.4, t));
    H.au = 0.5; H.glow = 1; H.alive = 1; H.gold = true; H.cracks = 1; H.amp = 1;
    H.phase = (t - 36.95) * 17;
    H.alpha = 1 - inv(40.7, 41.0, t);
    return H;
  }
  if (t < 47.0) { H.vis = false; return H; }
  if (t < 48.8 && camM) {
    const p = pathAt(FRONTPASS_KEYS, t), q = pathAt(FRONTPASS_KEYS, t + 0.02);
    const IM = invMatrix(camM);
    const w = applyMatrix(IM, p[0], p[1]);
    const camS = Math.hypot(camM[0], camM[1]);
    const rotCam = Math.atan2(camM[1], camM[0]);
    H.x = w[0]; H.y = w[1];
    H.s = (3.4 + 1.2 * inv(47, 48.8, t)) / camS;
    H.flip = 1;
    H.rot = Math.atan2(q[1] - p[1], q[0] - p[0]) * 0.7 - rotCam;
    H.au = 0.55; H.glow = 1; H.alive = 1; H.gold = true; H.cracks = 1; H.amp = 1;
    H.phase = (t - 47) * 9;
    return H;
  }
  H.vis = false;
  return H;
}
