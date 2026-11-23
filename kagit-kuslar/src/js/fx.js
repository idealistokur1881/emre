/* ==========================================================================
   OrigamiFXEngine — 60 FPS Canvas kuş sürüsü ve parçacık motoru
   Her şey zamanın saf fonksiyonudur: render(t) aynı t için aynı kareyi
   üretir. Böylece scrubber, başa sarma ve kare kare kayıt birebir tutarlı.
   Fizik modları: (1) ağızdan fırlayan canlı kuş + çarpma/buruşma,
   (2) yerçekimli kül yağmuru + yığın birikimi, (3) sıcak nefes buharı,
   (4) zincirleme alevlenme + sarmal (vortex) yükseliş.
   ========================================================================== */
'use strict';

/* Birim kuş geometrisi (sağa bakan, ~34 px * size) */
const BIRD_FACETS = {
  tail: [[-0.55, -0.04], [-1.1, -0.48], [-0.6, 0.14]],
  bodyT: [[-0.62, 0.0], [0.0, -0.2], [0.64, 0.0]],
  bodyB: [[-0.62, 0.0], [0.64, 0.0], [0.0, 0.25]],
  neck: [[0.34, -0.06], [0.98, -0.66], [0.56, 0.08]],
  head: [[0.98, -0.66], [1.26, -0.58], [0.88, -0.48]],
};
/* Ton paletleri: [açık, orta, koyu, en koyu] */
const PAL_GRAY = [[140, 149, 162], [107, 114, 128], [75, 85, 99], [52, 61, 76]];
const PAL_EMBER = [[255, 196, 104], [255, 154, 69], [255, 112, 43], [214, 78, 40]];
const PAL_GOLD = [[255, 246, 220], [255, 226, 140], [255, 196, 80], [244, 158, 92]];

class OrigamiFXEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sprites = {
      ember: this._sprite([255, 132, 52]),
      gold: this._sprite([255, 222, 140]),
      white: this._sprite([255, 246, 228]),
      cold: this._sprite([140, 214, 245]),
    };
    this.vignette = null;
    this.reset();
  }

  _sprite(rgb) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, `rgba(${rgb},1)`);
    gr.addColorStop(0.22, `rgba(${rgb},0.55)`);
    gr.addColorStop(0.55, `rgba(${rgb},0.14)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return c;
  }

  /* Başa sarmada tüm diziler tertemiz */
  reset() {
    this.cursor = 0;
    this.rng = mulberry32(20261123);
    this.birds = [];
    this.hitBursts = [];
    this.sparks = [];
    this.breath = [];
    this.vapor = [];
    this.macroSparks = [];
    this.ignition = null;
    this.heightmap = new Float32Array(120);
    this.landedTimes = [];
    this.dust = this._makeDust();
    this.heroTrail = null;
    this.finalized = false;
  }

  at(t) { this.cursor = t; return this; }

  _newBird(kind, size) {
    const r = this.rng;
    const b = {
      id: this.birds.length, kind, size,
      seed: r() * 1000,
      tone: 0.9 + r() * 0.2,
      rotRest: (r() - 0.5) * 1.4,
      spin: (r() < 0.5 ? -1 : 1) * (3 + r() * 6),
      flutterF: 5 + r() * 4, flutterA: 14 + r() * 26, flutterP: r() * TAU,
      depth: r(),
      rr: r(),
    };
    /* buruşuk form: her köşe için sabit sapma */
    const crumple = [];
    const ang = r() * TAU;
    for (let i = 0; i < 27; i++) {
      const a = ang + r() * TAU, rad = 0.18 + r() * 0.34;
      crumple.push([Math.cos(a) * rad * 1.15, Math.sin(a) * rad * 0.72]);
    }
    b.crumple = crumple;
    return b;
  }

  /* (1) Ağızdan fırlayan canlı turuncu kuş: targetX hizasında soğuk sırta çarpar */
  spawnMouthBird(x, y, vx, vy, targetX, opts) {
    opts = opts || {};
    const r = this.rng;
    const b = this._newBird('mouth', opts.size || 1.0);
    const dur = opts.dur || 0.8;
    b.tLaunch = this.cursor;
    b.tHit = this.cursor + dur;
    b.p0 = [x, y];
    b.c1 = [x + vx * dur * 0.5, y + vy * dur * 0.5];
    b.pHit = [targetX, opts.targetY !== undefined ? opts.targetY : 960];
    b.dir = Math.sign(targetX - x) || 1;
    b.xLand = clamp(b.pHit[0] - b.dir * (30 + r() * 70), 150, 700);
    b.fallDur = 0.95 + r() * 0.35;
    b.tLand = b.tHit + b.fallDur;
    b.depth = 0.05 + r() * 0.45;
    this.birds.push(b);
    this.hitBursts.push({ t: b.tHit, x: b.pHit[0], y: b.pHit[1], dir: b.dir, seed: r() * 1000 });
    return b;
  }

  /* (2) 13–25. saniye: zeminde 150+ buruşuk gri kuş birikir */
  populateFloorGraveyard(count) {
    const r = this.rng, t0 = this.cursor;
    for (let i = 0; i < count; i++) {
      const b = this._newBird('rain', 0.72 + r() * 0.5);
      const u = (i + r()) / count;
      const v = 2 * u - 1;
      b.tLand = t0 + 0.45 + 10.7 * (0.5 + 0.5 * Math.sign(v) * Math.pow(Math.abs(v), 1.45));
      let x = 540 + gauss(r) * 205;
      while (x < 95 || x > 715) x = 470 + gauss(r) * 170;
      b.depth = r();
      /* kahramanın yattığı ve kayacağı ön koridoru boş bırak */
      if (b.depth > 0.5 && x > 380) b.depth = r() * 0.5;
      if (x > 640) b.depth = r() * 0.3;
      b.xLand = x;
      b.fallDur = 1.35 + r() * 0.8;
      b.tStart = b.tLand - b.fallDur;
      b.xStart = x + (r() - 0.5) * 260;
      b.yStart = -260 + r() * 140;
      this.birds.push(b);
    }
  }

  /* (3) 33–37. saniye: yükselen altın buhar ve mikro ışık tanecikleri (makro uzay) */
  emitWarmBreath(x, y, duration) {
    const r = this.rng, t0 = this.cursor, dur = duration || 3.4;
    const N = 170;
    for (let i = 0; i < N; i++) {
      const tb = t0 + (i / N) * (dur - 0.7) + r() * 0.08;
      const life = 1.3 + r() * 1.2;
      this.breath.push({
        tb, life,
        x: x + (r() - 0.5) * 30, y: y + (r() - 0.5) * 16,
        vx: (r() - 0.5) * 520, vy: 1500 + r() * 900,
        k: 1.5 + r() * 0.8, g: -60 - r() * 80,
        s: 1.2 + r() * 3.2, tw: r() * TAU, gold: r() < 0.75,
      });
    }
    for (let i = 0; i < 26; i++) {
      const tb = t0 + (i / 26) * (dur - 0.9);
      this.vapor.push({
        tb, life: 1.6 + r() * 1.0,
        x: x + (r() - 0.5) * 40, y: y + 20,
        vx: (r() - 0.5) * 200, vy: 1100 + r() * 500, k: 1.3,
        s0: 50 + r() * 40, s1: 220 + r() * 160, a: 0.1 + r() * 0.08,
      });
    }
  }

  /* Altın damar anında makro kuşun etrafına kıvılcım */
  macroBurst(x, y, n) {
    const r = this.rng, t0 = this.cursor;
    for (let i = 0; i < (n || 60); i++) {
      const a = r() * TAU, sp = 120 + r() * 520;
      this.macroSparks.push({
        tb: t0 + r() * 0.35, life: 0.7 + r() * 1.1,
        x: x + (r() - 0.5) * 120, y: y + (r() - 0.5) * 160,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, k: 2.2, g: -60,
        s: 1.5 + r() * 3,
      });
    }
  }

  /* (4) 37.5: origin noktasından mesafeye bağlı gecikmeyle zincirleme alevlenme */
  igniteFloorWave(originX, originY) {
    const r = this.rng, t0 = this.cursor;
    this.ignition = { t: t0, x: originX, y: originY };
    for (const b of this.birds) {
      if (b.tLand === undefined) continue;
      const d = Math.hypot(b.xLand - originX, (b.yRest || 1620) - originY);
      b.tIgn = t0 + d / 360 + r() * 0.18;
      b.tLift = Math.min(41.2, b.tIgn + 0.45 + r() * r() * 2.8);
      b.v0 = 140 + r() * 110 + (b.tLift > 40 ? 80 : 0);
      b.acc = 8 + r() * 30;
      b.omega = 0.75 + r() * 0.45;
      b.Rmid = 120 + r() * 300;
      b.theta0 = b.xLand >= 540 ? 0 : Math.PI;
      for (let k = 0; k < 4; k++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 2.2;
        const sp = 140 + r() * 360;
        this.sparks.push({
          tb: b.tIgn + r() * 0.3, life: 0.8 + r() * 1.1,
          x: b.xLand, y: 0, bird: b,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, k: 1.8, g: -70,
          s: 1.4 + r() * 2.6, gold: r() < 0.55,
        });
      }
    }
  }

  /* Yığın: iniş sırasına göre yükseklik haritası */
  finalize() {
    const landers = this.birds.filter((b) => b.tLand !== undefined).sort((a, b) => a.tLand - b.tLand);
    this.heightmap.fill(0);
    const AMT = 2.55;
    for (const b of landers) {
      const bin = clamp(Math.round(b.xLand / 10), 0, this.heightmap.length - 1);
      const h = this.heightmap[bin];
      const base = 1600 + b.depth * 72;
      b.yRest = base - h * (1 - 0.5 * b.depth) - b.size * 7;
      for (let k = -7; k <= 7; k++) {
        const j = bin + k;
        if (j < 0 || j >= this.heightmap.length) continue;
        this.heightmap[j] = Math.min(132, this.heightmap[j] + AMT * Math.exp(-(k * k) / (2 * 3.4 * 3.4)));
      }
      this.landedTimes.push(b.tLand);
    }
    for (const s of this.sparks) if (s.bird) s.y = s.bird.yRest;
    this.finalized = true;
  }

  /* 0..1: zemindeki yığının doluluk oranı (SVG höyüğü bununla yükselir) */
  pileFraction(t) {
    const L = this.landedTimes;
    if (!L.length) return 0;
    let lo = 0, hi = L.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (L[m] <= t) lo = m + 1; else hi = m; }
    return lo / L.length;
  }

  _makeDust() {
    const r = mulberry32(99);
    const arr = [];
    for (let i = 0; i < 90; i++) {
      arr.push({
        x0: -300 + r() * 1700, y0: -500 + r() * 2500,
        vx: 6 + r() * 16, vy: 4 + r() * 10,
        f: 0.2 + r() * 0.5, p: r() * TAU, A: 8 + r() * 26,
        s: 0.8 + r() * 2.6, a: 0.12 + r() * 0.35, par: 0.7 + r() * 0.5,
      });
    }
    return arr;
  }

  /* ------------------------------------------------------------------ */
  /* Bir kuşun t anındaki pozu                                           */
  /* ------------------------------------------------------------------ */
  _pose(b, t) {
    const P = { x: 0, y: 0, s: b.size, rot: 0, flip: 1, c: 1, g: 1, au: 0, glow: 0, phase: 0, amp: 0, z: 0, alpha: 1, mode: 0 };
    if (b.kind === 'mouth') {
      if (t < b.tLaunch) return null;
      if (t < b.tHit) {
        const u = (t - b.tLaunch) / (b.tHit - b.tLaunch);
        const e = Math.pow(u, 1.12);
        const p = bez2(b.p0, b.c1, b.pHit, e);
        const p2 = bez2(b.p0, b.c1, b.pHit, Math.min(1, e + 0.02));
        P.x = p[0]; P.y = p[1];
        P.flip = p2[0] >= p[0] ? 1 : -1;
        P.rot = clamp(Math.atan2(p2[1] - p[1], Math.abs(p2[0] - p[0]) + 1e-3), -0.9, 0.9);
        P.s = b.size * (0.3 + 0.7 * smooth(Math.min(1, u * 3.5)));
        P.c = 0; P.g = 0; P.glow = 1; P.amp = 1; P.phase = (t - b.tLaunch) * 24 + b.seed; P.mode = 1;
        return P;
      }
      if (t < b.tLand) {
        const tau = t - b.tHit;
        const k = Math.min(1, tau / 0.12);
        const v = tau / b.fallDur;
        const xh = b.pHit[0] - b.dir * 14;
        P.x = lerp(xh, b.xLand, Ease.out(v)) + Math.sin(tau * b.flutterF + b.flutterP) * 12 * (1 - v);
        P.y = b.pHit[1] + (b.yRest - b.pHit[1]) * (0.25 * v + 0.75 * v * v) - 34 * Math.sin(Math.min(1, v * 3.2) * Math.PI) * (1 - v);
        P.rot = b.rotRest * v + b.spin * tau * 0.35;
        P.c = smooth(k); P.g = smooth(k); P.glow = 1 - k; P.amp = 1 - k; P.phase = b.seed + tau * 10; P.mode = 2;
        P.flip = -b.dir;
        return P;
      }
    } else {
      if (t < b.tStart) return null;
      if (t < b.tLand) {
        const tau = t - b.tStart, v = tau / b.fallDur;
        P.x = lerp(b.xStart, b.xLand, Ease.inOutSine(v)) + Math.sin(tau * b.flutterF + b.flutterP) * b.flutterA * (1 - v * 0.7);
        P.y = lerp(b.yStart, b.yRest, Math.pow(v, 1.3));
        P.rot = b.rotRest + b.spin * (tau - b.fallDur) * 0.3;
        P.mode = 2;
        return P;
      }
    }
    /* yerde */
    const sinceLand = t - b.tLand;
    P.x = b.xLand; P.y = b.yRest - 5 * Math.sin(Math.PI * Math.min(1, sinceLand / 0.16)) * (sinceLand < 0.16 ? 1 : 0);
    P.rot = b.rotRest; P.mode = 3;
    if (b.tIgn === undefined || t < b.tIgn) return P;

    /* alevlenme */
    const ti = t - b.tIgn;
    const e = smooth(Math.min(1, ti / 0.32));
    P.g = 1 - e; P.au = 0.15 * e; P.glow = e;
    P.c = 1 - smooth(clamp((ti - 0.08) / 0.5, 0, 1));
    P.amp = smooth(clamp((ti - 0.25) / 0.4, 0, 1));
    P.phase = b.seed + ti * 15;
    P.rot = lerp(b.rotRest, 0, smooth(Math.min(1, ti / 0.5)));
    P.y = b.yRest - 10 * Math.sin(Math.min(1, ti / 0.5) * Math.PI) * e;
    P.mode = 4;
    if (t < b.tLift) return P;

    /* sarmal yükseliş */
    const tau = t - b.tLift;
    const rise = b.v0 * tau + 0.5 * b.acc * tau * tau;
    const axis = 540 + 70 * Math.sin(0.5 * tau + b.seed);
    const R0 = Math.abs(b.xLand - 540);
    const R = R0 + (b.Rmid - R0) * smooth(Math.min(1, tau / 1.7)) + 20 * tau;
    const th = b.theta0 - b.omega * tau;
    const vx = axis + R * Math.cos(th);
    const z = Math.sin(th);
    const blend = smooth(Math.min(1, tau / 0.55));
    P.x = lerp(b.xLand, vx, blend);
    P.y = b.yRest - rise + z * 34 * blend;
    P.z = z * blend;
    /* yön: türevden */
    const th2 = th - b.omega * 0.03;
    const dx = (axis + (R + 0.6) * Math.cos(th2)) - vx;
    P.flip = dx >= 0 ? 1 : -1;
    P.rot = -0.25 - 0.25 * blend;
    const far = clamp(rise / 3400, 0, 1);
    P.s = b.size * (1 + 0.24 * P.z) * (1 - 0.3 * far) * (1 + 0.6 * blend);
    P.au = 0.42 + 0.45 * clamp(rise / 1400, 0, 1);
    P.c = 0; P.g = 0; P.glow = 1 - 0.5 * blend; P.amp = 1; P.phase = b.seed + tau * 16 + ti * 15;
    P.mode = 5;
    return P;
  }

  /* ------------------------------------------------------------------ */
  /* Origami kuş çizimi: iki tonlu yüzeyler, sinüsle çırpan kanatlar      */
  /* ------------------------------------------------------------------ */
  _drawBird(ctx, b, P) {
    const S = 34 * P.s;
    const ca = Math.cos(P.rot), sa = Math.sin(P.rot);
    const amp = P.amp, ph = P.phase;
    const fN = Math.cos(ph), fF = Math.cos(ph + 0.45);
    const tipN = [-0.04 + 0.1 * Math.sin(ph), -1.32 * fN * amp - (1 - amp) * 0.5];
    const tipF = [-0.14 + 0.1 * Math.sin(ph + 0.45), -1.12 * fF * amp - (1 - amp) * 0.42];
    const wingF = [[-0.28, -0.08], [-0.02, -0.08], tipF, [0.24, -0.08]];
    const wingN = [[-0.32, -0.05], [-0.03, -0.05], tipN, [0.27, -0.05]];
    const underN = tipN[1] > 0, underF = tipF[1] > 0;

    const facets = [
      { p: [wingF[0], wingF[1], wingF[2]], tone: underF ? 3 : 2 },
      { p: [wingF[1], wingF[3], wingF[2]], tone: 3 },
      { p: BIRD_FACETS.tail, tone: 1 },
      { p: BIRD_FACETS.bodyB, tone: 2 },
      { p: BIRD_FACETS.bodyT, tone: 0 },
      { p: BIRD_FACETS.neck, tone: 1 },
      { p: BIRD_FACETS.head, tone: 0 },
      { p: [wingN[0], wingN[1], wingN[2]], tone: underN ? 2 : 0 },
      { p: [wingN[1], wingN[3], wingN[2]], tone: underN ? 3 : 1 },
    ];
    const g = P.g, au = P.au, c = P.c, tone = b.tone;
    const cr = b.crumple;
    let vi = 0;
    for (let fi = 0; fi < facets.length; fi++) {
      const f = facets[fi];
      const col0 = mixRgb(mixRgb(PAL_EMBER[f.tone], PAL_GRAY[(f.tone + fi) % 4], g), PAL_GOLD[f.tone], au);
      const col = g > 0.5 ? [col0[0] * tone, col0[1] * tone, col0[2] * tone] : col0;
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const q = f.p[k];
        const cv = cr[vi % cr.length]; vi++;
        const lx = lerp(q[0], cv[0], c) * P.flip;
        const ly = lerp(q[1], cv[1], c);
        const X = P.x + (lx * ca - ly * sa * P.flip) * S;
        const Y = P.y + (lx * sa * P.flip + ly * ca) * S;
        if (k === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      }
      ctx.closePath();
      ctx.fillStyle = rgbStr(col);
      ctx.fill();
    }
    /* katlama çizgisi (kağıt sırtı) */
    if (c < 0.6 && S > 10) {
      ctx.strokeStyle = g > 0.5 ? 'rgba(200,210,225,0.25)' : 'rgba(255,240,200,0.45)';
      ctx.lineWidth = Math.max(0.6, S * 0.03);
      ctx.beginPath();
      const a0 = [-0.6, 0], a1 = [0.62, 0];
      for (let k = 0; k < 2; k++) {
        const q = k ? a1 : a0;
        const lx = q[0] * P.flip, ly = q[1];
        const X = P.x + (lx * ca - ly * sa * P.flip) * S, Y = P.y + (lx * sa * P.flip + ly * ca) * S;
        if (k === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      }
      ctx.stroke();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Ana çizim                                                            */
  /* opts: { cam:[matrix], worldAlpha, macro:[matrix], macroAlpha,        */
  /*         warm, cold, hero: fn(t)->{x,y,alive} , vignette }            */
  /* ------------------------------------------------------------------ */
  render(t, o) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const wa = o.worldAlpha;

    if (wa > 0.002) {
      const m = o.cam;
      ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
      ctx.globalAlpha = wa;
      this._drawDust(ctx, t, o);
      this._drawBirds(ctx, t, o);
      this._drawSparks(ctx, t, o);
      ctx.globalAlpha = 1;
    }
    if (o.macroAlpha > 0.002 && o.macro) {
      const m = o.macro;
      ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
      ctx.globalAlpha = o.macroAlpha;
      this._drawBreath(ctx, t);
      ctx.globalAlpha = 1;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this._drawVignette(ctx, o.vignette === undefined ? 1 : o.vignette);
  }

  _drawDust(ctx, t, o) {
    const warm = o.warm || 0;
    ctx.globalCompositeOperation = 'lighter';
    const base = ctx.globalAlpha;
    for (const d of this.dust) {
      const lift = warm * 60 * Math.max(0, t - 37.5);
      const x = wrap(d.x0 + d.vx * t * d.par, -350, 1430);
      const y = wrap(d.y0 - d.vy * t - lift + Math.sin(t * d.f + d.p) * d.A, -700, 2300);
      const tw = 0.6 + 0.4 * Math.sin(t * 1.7 + d.p * 3);
      const a = d.a * tw * (0.55 + 0.45 * warm);
      const spr = warm > 0.5 ? this.sprites.gold : this.sprites.cold;
      const sz = d.s * 9 * (1 + warm * 0.4);
      ctx.globalAlpha = base * a;
      ctx.drawImage(spr, x - sz / 2, y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = base;
    ctx.globalCompositeOperation = 'source-over';
  }

  _drawBirds(ctx, t, o) {
    const list = [];
    for (const b of this.birds) {
      const P = this._pose(b, t);
      if (!P) continue;
      let key;
      if (P.mode === 3 || P.mode === 4) key = P.y;
      else if (P.mode === 5) key = 3000 + P.z * 10 + b.id * 0.001;
      else key = 2500 + b.id * 0.001;
      list.push([key, b, P]);
    }
    list.sort((a, b) => a[0] - b[0]);
    const base = ctx.globalAlpha;

    /* parıltılar (altta, 'lighter') */
    ctx.globalCompositeOperation = 'lighter';
    for (const [, b, P] of list) {
      if (P.glow <= 0.02) continue;
      const S = 34 * P.s;
      const spr = P.au > 0.45 ? this.sprites.gold : this.sprites.ember;
      const sz = S * 4.6;
      ctx.globalAlpha = base * (P.mode === 5 ? 0.3 : 0.5) * P.glow;
      ctx.drawImage(spr, P.x - sz / 2, P.y - sz / 2, sz, sz);
      /* ışık izi */
      if (P.mode === 1 || P.mode === 5) {
        for (let k = 1; k <= 6; k++) {
          const Q = this._pose(b, t - k * 0.028);
          if (!Q || (Q.mode !== 1 && Q.mode !== 5)) break;
          const s2 = S * (1.5 - k * 0.16);
          ctx.globalAlpha = base * 0.34 * P.glow * (1 - k / 7);
          ctx.drawImage(spr, Q.x - s2 / 2, Q.y - s2 / 2, s2, s2);
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = base;
    for (const [, b, P] of list) this._drawBird(ctx, b, P);

    /* kahraman kuşun ışık izi */
    if (o.hero) {
      const h0 = o.hero(t);
      if (h0 && h0.alive > 0.05) {
        ctx.globalCompositeOperation = 'lighter';
        for (let k = 1; k <= 9; k++) {
          const h = o.hero(t - k * 0.03);
          if (!h || h.alive < 0.05) break;
          const s2 = 46 * h.s * (1.3 - k * 0.11);
          ctx.globalAlpha = base * 0.3 * h0.alive * (1 - k / 10);
          ctx.drawImage(h.gold ? this.sprites.gold : this.sprites.ember, h.x - s2 / 2, h.y - s2 / 2, s2, s2);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = base;
      }
    }
  }

  _sparkPos(s, tau) {
    const e = (1 - Math.exp(-s.k * tau)) / s.k;
    return [s.x + s.vx * e, s.y + s.vy * e + 0.5 * s.g * tau * tau];
  }

  _drawSparks(ctx, t, o) {
    const base = ctx.globalAlpha;
    ctx.globalCompositeOperation = 'lighter';
    /* çarpma anında sönen kıvılcımlar */
    for (const h of this.hitBursts) {
      const tau = t - h.t;
      if (tau < 0 || tau > 0.9) continue;
      const r = mulberry32(Math.floor(h.seed));
      for (let i = 0; i < 18; i++) {
        const a = Math.PI + (h.dir > 0 ? 0 : Math.PI) + (r() - 0.5) * 2.6 - 0.5;
        const sp = 120 + r() * 380, life = 0.25 + r() * 0.45;
        if (tau > life) { r(); continue; }
        const k = 3.2, e = (1 - Math.exp(-k * tau)) / k;
        const x = h.x + Math.cos(a) * sp * e;
        const y = h.y + Math.sin(a) * sp * e + 260 * tau * tau;
        const q = 1 - tau / life;
        const sz = (5 + r() * 9) * q;
        ctx.globalAlpha = base * q * 0.9;
        ctx.drawImage(q > 0.45 ? this.sprites.ember : this.sprites.cold, x - sz, y - sz, sz * 2, sz * 2);
      }
    }
    /* alevlenme kıvılcımları */
    for (const s of this.sparks) {
      const tau = t - s.tb;
      if (tau < 0 || tau > s.life) continue;
      const [x, y] = this._sparkPos(s, tau);
      const q = 1 - tau / s.life;
      const sz = s.s * 6 * (0.5 + q);
      ctx.globalAlpha = base * Math.min(1, q * 1.6) * 0.85;
      ctx.drawImage(s.gold ? this.sprites.gold : this.sprites.ember, x - sz / 2, y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = base;
    ctx.globalCompositeOperation = 'source-over';
    /* çarpmada kopan gri kağıt kırıntıları */
    for (const h of this.hitBursts) {
      const tau = t - h.t;
      if (tau < 0 || tau > 1.2) continue;
      const r = mulberry32(Math.floor(h.seed) + 7);
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 2.4;
        const sp = 60 + r() * 160;
        const x = h.x + Math.cos(a) * sp * tau - h.dir * 20 * tau;
        const y = h.y + Math.sin(a) * sp * tau + 380 * tau * tau;
        const q = 1 - tau / 1.2;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tau * (6 + i));
        ctx.fillStyle = `rgba(120,128,142,${q * 0.9})`;
        const s = 3 + r() * 4;
        ctx.fillRect(-s / 2, -s / 3, s, s * 0.66);
        ctx.restore();
      }
    }
  }

  _drawBreath(ctx, t) {
    const base = ctx.globalAlpha;
    ctx.globalCompositeOperation = 'lighter';
    for (const v of this.vapor) {
      const tau = t - v.tb;
      if (tau < 0 || tau > v.life) continue;
      const q = tau / v.life;
      const e = (1 - Math.exp(-v.k * tau)) / v.k;
      const x = v.x + v.vx * e, y = v.y + v.vy * e;
      const sz = lerp(v.s0, v.s1, Ease.out(q));
      ctx.globalAlpha = base * v.a * Math.sin(Math.PI * q);
      ctx.drawImage(this.sprites.white, x - sz / 2, y - sz / 2, sz, sz);
    }
    for (const p of this.breath) {
      const tau = t - p.tb;
      if (tau < 0 || tau > p.life) continue;
      const q = tau / p.life;
      const e = (1 - Math.exp(-p.k * tau)) / p.k;
      const x = p.x + p.vx * e + Math.sin(tau * 3 + p.tw) * 10;
      const y = p.y + p.vy * e + 0.5 * p.g * tau * tau;
      const tw = 0.6 + 0.4 * Math.sin(tau * 9 + p.tw);
      const sz = p.s * 7 * (0.6 + 0.6 * Math.sin(Math.PI * q));
      ctx.globalAlpha = base * Math.sin(Math.PI * q) * tw * 0.9;
      ctx.drawImage(p.gold ? this.sprites.gold : this.sprites.white, x - sz / 2, y - sz / 2, sz, sz);
    }
    for (const s of this.macroSparks) {
      const tau = t - s.tb;
      if (tau < 0 || tau > s.life) continue;
      const [x, y] = this._sparkPos(s, tau);
      const q = 1 - tau / s.life;
      const sz = s.s * 7 * (0.4 + q);
      ctx.globalAlpha = base * Math.min(1, q * 1.5);
      ctx.drawImage(this.sprites.gold, x - sz / 2, y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = base;
    ctx.globalCompositeOperation = 'source-over';
  }

  _drawVignette(ctx, k) {
    if (!this.vignette) {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(540, 980, 380, 540, 980, 1250);
      gr.addColorStop(0, 'rgba(2,3,8,0)');
      gr.addColorStop(0.6, 'rgba(2,3,8,0.22)');
      gr.addColorStop(1, 'rgba(2,3,8,0.72)');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
      this.vignette = c;
    }
    ctx.globalAlpha = k;
    ctx.drawImage(this.vignette, 0, 0);
    ctx.globalAlpha = 1;
  }
}
