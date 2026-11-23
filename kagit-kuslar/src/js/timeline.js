/* ==========================================================================
   buildMasterTimeline() — 50.0 sn GSAP master timeline
   Kamera, oyunculuk (mimik/jest), ışık ve renk senaryosu.
   ========================================================================== */
'use strict';

function makeState() {
  return {
    cam: { cx: 540, cy: 1000, s: 1.0, r: -2.5, pulse: 1 },
    P: {
      inhale: 0, armR: 6, turn: 0, lean: 0, headTilt: 0, headDown: 0, browUp: 0, browSad: 0.25, browFrown: 0,
      lid: 0.08, lookX: 0, lookY: -0.55, mouthOpen: 0, smile: -0.08, cold: 0.12, warm: 0, slump: 0, sink: 0,
      sparkle: 0, tearT: 0, tearA: 0, flinch: 0,
    },
    L: { lean: 0, headDown: 0.3, lid: 0.55, smile: 0.12, armReach: 0, armUp: 0, shadow: 0.74, halo: 0.2, haloScale: 1, lookX: -0.6 },
    M: { opacity: 0, camS: 1.05, camY: -150, wingL: 0, wingR: 0, bodyC: 1, pinchL: 0, pinchR: 0, handsLift: 0, lips: 0, breathGlow: 0, veins: 0, ignite: 0, flap: 0, tremble: 0, lift: 0 },
    E: { warm: 0, beams: 1, ceiling: 1, sun: 0, melt: 0, off: { b1: 0, b3: 0, b4: 0, b5: 0, f4: 0 }, look: { b1: 0, b3: 0, b4: 0, b5: 0, f4: 0, b0: 0, b2: 0 } },
  };
}

function buildMasterTimeline(S, st) {
  const { cam, P, L, M, E } = st;
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'sine.inOut', lazy: false, overwrite: false } });
  const to = (obj, vars, at) => tl.to(obj, vars, at);

  /* ======================= KAMERA (#camera-rig) ======================= */
  to(cam, { cx: 545, cy: 1150, s: 1.12, duration: 4.5 }, 0);                          // Push-In, Dutch -2.5°
  to(cam, { cx: 520, cy: 1110, s: 1.18, duration: 4.7 }, 4.5);
  to(cam, { cx: 500, cy: 1230, s: 1.2, duration: 1.5, ease: 'power2.inOut' }, 9.2);  // düşüşü izleyen mikro dikey takip
  to(cam, { cy: 1210, s: 1.21, duration: 2.3 }, 10.7);
  to(cam, { cx: 540, cy: 1060, s: 0.96, r: -4, duration: 7.5 }, 13.0);                // Dolly-Out + Dutch -4°
  to(cam, { cy: 1180, s: 1.02, r: -4.2, duration: 4.5 }, 20.5);                       // yere Crane Down
  to(cam, { cx: 790, cy: 1420, s: 1.42, r: -2.0, duration: 2.0, ease: 'power2.inOut' }, 25.0); // Match-Cut Glide Pan
  to(cam, { cx: 816, cy: 1440, s: 1.62, r: 0, duration: 1.8 }, 27.0);                 // Dutch → 0°
  tl.set(cam, { cx: 800, cy: 1330, s: 1.22, r: 0 }, 36.7);
  to(cam, { cx: 470, cy: 1360, s: 1.2, duration: 0.95, ease: 'power2.inOut' }, 37.0);  // Swoop Pan
  to(cam, { pulse: 1.03, duration: 0.22, ease: 'power2.out' }, 37.5);                  // Screen Pulse
  to(cam, { pulse: 0.98, duration: 0.45, ease: 'sine.inOut' }, 37.72);
  to(cam, { pulse: 1.0, duration: 0.6, ease: 'sine.out' }, 38.17);
  to(cam, { cx: 540, cy: 940, s: 0.92, duration: 3.6 }, 37.95);
  to(cam, { cy: 900, s: 0.9, duration: 1.45 }, 41.55);
  to(cam, { cx: 722, cy: 1292, s: 1.62, duration: 0.95, ease: 'power2.inOut' }, 43.0); // iki kişilik plan
  to(cam, { s: 1.68, duration: 0.65 }, 43.95);
  to(cam, { cx: 548, cy: 1262, s: 2.75, duration: 0.85, ease: 'power2.inOut' }, 44.6); // yüze sıcak orta-yakın
  to(cam, { s: 2.95, cy: 1268, duration: 1.55 }, 45.45);
  to(cam, { cx: 540, cy: -420, s: 1.0, duration: 1.8, ease: 'power2.inOut' }, 47.0);   // Epik Crane Up
  to(cam, { cy: -520, duration: 1.2, ease: 'sine.out' }, 48.8);

  /* ====================== KAHRAMAN: OYUNCULUK ====================== */
  /* 0–4.5: kalabalığa bakan, tedirgin küçük göz */
  to(P, { lookX: -0.55, duration: 0.5 }, 1.2);
  to(P, { lookX: 0.45, duration: 0.6 }, 2.7);
  to(P, { headDown: 0.08, duration: 0.35 }, 1.7);
  to(P, { headDown: 0, duration: 0.5 }, 2.1);
  to(P, { lookX: -0.1, lookY: -0.45, duration: 0.6 }, 3.8);
  /* 4.5–5.8: derin nefes, umut, el uzanır, ağız açılır */
  to(P, { inhale: 1, browUp: 1, browSad: 0, lid: -0.08, duration: 1.0, ease: 'power2.out' }, 4.5);
  to(P, { armR: 128, duration: 1.15, ease: 'back.out(1.4)' }, 4.75);
  to(P, { lookX: -0.35, lookY: -0.85, turn: -0.2, duration: 0.8 }, 4.8);
  to(P, { mouthOpen: 0.9, duration: 0.3, ease: 'power2.out' }, 5.45);
  to(P, { mouthOpen: 0.2, smile: 0.35, inhale: 0.35, duration: 0.8 }, 5.85);
  /* 5.8–9.2: umutla kuşu izler */
  to(P, { lookX: -0.75, lookY: -0.7, turn: -0.3, smile: 0.5, duration: 2.6 }, 6.6);
  /* 9.2: çarpma — kaşlar içten kırılır, el havada 0.65 sn donar */
  to(P, { flinch: 1, duration: 0.08, ease: 'power3.out' }, 9.2);
  to(P, { flinch: 0, duration: 0.45, ease: 'power2.out' }, 9.28);
  to(P, { smile: -0.25, mouthOpen: 0.12, browSad: 1, browUp: 0.35, lid: 0.15, duration: 0.35, ease: 'power2.out' }, 9.25);
  to(P, { armR: 128, duration: 0.65, ease: 'none' }, 9.2);                              // key-pose hold
  to(P, { armR: 4, duration: 0.62, ease: 'power3.in' }, 9.85);                          // ağırlaşarak düşer
  to(P, { armR: 11, duration: 0.14, ease: 'power1.out' }, 10.47);
  to(P, { armR: 6, duration: 0.25, ease: 'sine.inOut' }, 10.61);
  to(P, { lookY: 0.95, lookX: -0.3, duration: 1.2, ease: 'power2.in' }, 9.35);
  to(P, { headDown: 0.3, lid: 0.32, smile: -0.4, mouthOpen: 0, inhale: 0, turn: 0, duration: 1.4 }, 10.6);
  /* 12.3–13: cesaret toplar */
  to(P, { headDown: 0, browFrown: 0.45, inhale: 0.75, lookY: -0.4, lid: 0.0, duration: 0.7 }, 12.3);
  /* 13–20.5: sağa sola panikle konuşur */
  S.launches.forEach((Ln, k) => {
    const d = Ln.dir, t = Ln.t;
    const pre = Math.min(0.4, k === 0 ? 0.4 : (t - S.launches[k - 1].t) * 0.45);
    to(P, { turn: d * 0.8, lean: d * 3.2, lookX: d * 0.95, lookY: -0.55, duration: pre * 0.8, ease: 'power2.out' }, t - pre);
    to(P, { mouthOpen: 0.95, armR: d < 0 ? 96 : 52, inhale: 0.4, duration: 0.17, ease: 'power2.out' }, t - 0.17);
    to(P, { mouthOpen: 0.28, duration: 0.25 }, t + 0.06);
    to(P, { flinch: 0.55, duration: 0.06 }, t + Ln.dur);
    to(P, { flinch: 0, duration: 0.3 }, t + Ln.dur + 0.06);
  });
  to(P, { browSad: 0.85, browFrown: 0.65, browUp: 0.2, duration: 6.5 }, 13.5);
  to(P, { cold: 0.38, duration: 7.5 }, 13.0);
  /* 20.5–25: pes ediş */
  to(P, { mouthOpen: 0, smile: -0.5, duration: 0.45 }, 20.6);
  to(P, { headDown: 1, turn: 0, lean: 0, lookX: 0.1, lookY: 0.95, duration: 1.4, ease: 'power2.inOut' }, 20.8);
  to(P, { slump: 1, sink: 1, armR: 2, duration: 2.0, ease: 'power2.inOut' }, 21.0);
  to(P, { lid: 0.62, browSad: 1, browFrown: 0, browUp: 0, duration: 1.5 }, 21.0);
  to(P, { cold: 0.8, duration: 4.0 }, 20.5);
  /* 37.5–43.5: sıcak ışık ve hayranlık */
  to(P, { warm: 0.75, duration: 2.0 }, 37.5);
  to(P, { cold: 0.45, duration: 2.4 }, 37.6);
  to(P, { headDown: 0.55, lid: 0.25, lookY: -0.75, browUp: 0.5, browSad: 0.4, mouthOpen: 0.15, sparkle: 0.35, duration: 2.5 }, 39.0);
  /* 43.5–47: göz göze, gözyaşı, gülümseme */
  to(P, { headDown: 0, slump: 0.25, sink: 0.3, cold: 0, turn: 0.55, lookX: 0.95, lookY: -0.05, lid: 0.04, browUp: 0.6, browSad: 0.55, mouthOpen: 0.05, duration: 1.1, ease: 'power2.inOut' }, 43.5);
  to(P, { sparkle: 1, duration: 0.6 }, 44.0);
  to(P, { tearA: 1, duration: 0.2 }, 44.8);
  to(P, { tearT: 1, duration: 1.8, ease: 'power1.in' }, 44.8);
  to(P, { smile: 1, mouthOpen: 0.14, lid: 0.1, browSad: 0.5, browUp: 0.45, lookX: 0.6, duration: 1.0, ease: 'power2.inOut' }, 45.2);
  to(P, { tearA: 0.65, duration: 0.6 }, 46.6);

  /* ====================== DİNLEYEN YABANCI ====================== */
  to(L, { lid: 0.42, headDown: 0.18, duration: 1.2 }, 6.2);
  to(L, { lid: 0.5, headDown: 0.3, duration: 1.5 }, 10.5);
  to(L, { headDown: 0.22, lid: 0.4, duration: 2 }, 21.5);
  to(L, { shadow: 0.22, halo: 0.38, headDown: 0.48, lid: 0.32, duration: 1.8 }, 25.0);
  to(L, { halo: 0.56, haloScale: 1.14, duration: 0.9 }, 27.0);                         // nefes gibi genişleyen hale
  to(L, { halo: 0.46, haloScale: 1.06, duration: 0.9 }, 27.9);
  to(L, { lean: 14, headDown: 0.78, duration: 1.6 }, 27.2);                             // acele etmeden eğilir
  to(L, { armReach: 1, duration: 1.2 }, 27.6);
  tl.set(L, { lean: 6, armReach: 0, armUp: 0.9, headDown: 0.3 }, 31.0);
  to(L, { armUp: 1, duration: 0.4 }, 36.6);
  to(L, { shadow: 0, halo: 0.62, headDown: -0.15, lid: 0.22, smile: 0.4, lookX: -0.2, lean: 2, duration: 2.2 }, 37.2);
  to(L, { armUp: 0.15, duration: 1.0 }, 43.0);
  to(L, { headDown: 0.06, lookX: -0.9, duration: 0.6 }, 43.5);
  to(L, { smile: 1, lid: 0.5, duration: 0.8 }, 44.0);

  /* ====================== MAKRO EL SAHNESİ ====================== */
  to(M, { opacity: 1, duration: 0.5, ease: 'power1.inOut' }, 28.8);
  to(M, { camS: 1.15, duration: 4.7, ease: 'none' }, 28.8);                              // hipnotik yaklaşma
  /* 29.4 sol kanat */
  to(M, { pinchL: 1, duration: 0.45 }, 29.0);
  to(M, { wingL: 1, bodyC: 0.55, duration: 0.95, ease: 'power2.inOut' }, 29.4);
  to(M, { pinchL: 0, duration: 0.55 }, 30.4);
  /* 31.2 sağ kanat */
  to(M, { pinchR: 1, duration: 0.45 }, 30.8);
  to(M, { wingR: 1, bodyC: 0, duration: 0.95, ease: 'power2.inOut' }, 31.2);
  to(M, { pinchR: 0, duration: 0.55 }, 32.2);
  /* 33.5 sıcak nefes */
  to(M, { handsLift: 1, camY: 360, camS: 1.12, duration: 0.9, ease: 'sine.inOut' }, 33.5);
  to(M, { lips: 1, duration: 0.3 }, 33.55);
  to(M, { breathGlow: 1, duration: 0.7 }, 33.7);
  to(M, { veins: 1, duration: 1.0, ease: 'power2.out' }, 34.6);                         // Kintsugi
  to(M, { ignite: 1, duration: 0.85 }, 34.6);
  to(M, { lips: 0.25, breathGlow: 0.55, duration: 0.7 }, 35.1);
  to(M, { tremble: 1, duration: 0.25 }, 35.8);
  to(M, { flap: 1, duration: 0.5 }, 35.95);
  to(M, { lift: 1, duration: 1.0, ease: 'power2.in' }, 36.0);
  to(M, { opacity: 0, duration: 0.55, ease: 'power1.inOut' }, 36.5);

  /* ====================== IŞIK & RENK SENARYOSU ====================== */
  to(E, { beams: 0.55, duration: 0.35 }, 27.0);
  to(E, { warm: 1, duration: 3.2 }, 37.6);
  to(E, { beams: 0, duration: 2.2 }, 37.6);
  to(E, { ceiling: 0, duration: 3.0 }, 38.0);
  to(E, { sun: 1, duration: 3.5 }, 38.2);
  to(E, { melt: 1, duration: 2.6, ease: 'power1.in' }, 37.7);
  tl.to('#bg-stop-1', { stopColor: '#1E1B32', duration: 3.6 }, 37.6);
  tl.to('#bg-stop-2', { stopColor: '#D97742', duration: 3.6 }, 37.6);
  tl.to('#bg-stop-3', { stopColor: '#FFF0C9', duration: 3.6 }, 37.6);
  tl.to('#warm-god-rays', { opacity: 0.72, duration: 2.8 }, 37.7);
  /* arka plandaki ekran kafalılar: ışıkları sönüp başlarını kaldırırlar */
  [['b1', 43.75], ['b4', 44.05], ['f4', 44.3], ['b5', 44.55], ['b3', 44.8]].forEach(([k, at]) => {
    to(E.off, { [k]: 1, duration: 0.5, ease: 'none' }, at);
    to(E.look, { [k]: 1, duration: 1.3, ease: 'power2.inOut' }, at + 0.35);
  });
  to(E.look, { b0: 1, b2: 1, duration: 1.4 }, 44.6);

  /* ====================== FİNAL KARARMA ====================== */
  tl.to('#fade-black', { opacity: 1, duration: 1.2, ease: 'sine.inOut' }, 48.8);
  tl.set({}, {}, DURATION);
  return tl;
}
