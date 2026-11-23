/* ==========================================================================
   SoundEngine — %100 prosedürel Web Audio: foley, çello, bildirim, vakum,
   çelesta ve vokal-formant koro. Tüm partisyon OfflineAudioContext ile
   örnek-hassas bir AudioBuffer'a yazılır, sonra görüntü saatiyle oynatılır.
   (Bu sayede scrub/başa sarmada ses asla kaymaz ve üst üste binmez.)
   ========================================================================== */
'use strict';

const NOTE = {
  C2: 65.41, G1: 49.0, Ab1: 51.91, Eb2: 77.78, G2: 98.0, Ab2: 103.83, C3: 130.81, Eb3: 155.56, G3: 196.0,
  C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, G4: 392.0, Ab4: 415.3, Bb4: 466.16, B4: 493.88,
  C5: 523.25, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, G5: 783.99, Ab5: 830.61, Bb5: 932.33, B5: 987.77,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, Fs6: 1479.98, G6: 1567.98, B6: 1975.53, Cs7: 2217.46, D7: 2349.32,
};
const semi = (f, n) => f * Math.pow(2, n / 12);

class SoundEngine {
  constructor() {
    this.sr = 48000;
    this.duration = DURATION;
    this.buffer = null;
    this.live = null;
    this.src = null;
    this.liveGain = null;
  }

  /* -------------------------- partisyonu çiz -------------------------- */
  async renderScore(story) {
    const ctx = new OfflineAudioContext(2, Math.ceil(this.sr * this.duration), this.sr);
    this.ctx = ctx;
    this.rng = mulberry32(4242);
    this._buildGraph();
    this._makeSamples();
    this._compose(story);
    const buf = await ctx.startRendering();
    /* zirve normalizasyonu (-0.8 dBFS) */
    let peak = 0;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; }
    }
    const g = peak > 0 ? 0.91 / peak : 1;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) d[i] *= g;
    }
    this.buffer = buf;
    this.ctx = null;
    return buf;
  }

  _buildGraph() {
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = 0.85;
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.knee.value = 14;
    this.comp.ratio.value = 3.2;
    this.comp.attack.value = 0.006;
    this.comp.release.value = 0.28;
    this.master.connect(this.comp);
    this.comp.connect(c.destination);

    this.dry = c.createGain();
    this.dry.connect(this.master);

    /* Ana salon yankısı: 3.2 sn sıcak konser salonu */
    this.revSend = c.createGain();
    this.conv = c.createConvolver();
    this.conv.normalize = true;
    this.conv.buffer = this._makeIR(3.2, 0.62, 11);
    this.revReturn = c.createGain();
    this.revReturn.gain.value = 0.85;
    this.revSend.connect(this.conv);
    this.conv.connect(this.revReturn);
    this.revReturn.connect(this.master);

    /* Kalabalık otobüsü — 27. sn'de vakumla kesilecek tek #crowdFilter */
    this.crowdIn = c.createGain();
    this.crowdIn.gain.value = 0.7;
    this.crowdFilter = c.createBiquadFilter();
    this.crowdFilter.type = 'lowpass';
    this.crowdFilter.frequency.value = 18000;
    this.crowdFilter.Q.value = 0.7;
    this.crowdGain = c.createGain();
    this.crowdIn.connect(this.crowdFilter);
    this.crowdFilter.connect(this.crowdGain);
    this.crowdGain.connect(this.dry);
    /* kalabalığın ayrı, soğuk yankısı (vakumda kuyruğuyla birlikte kesilir) */
    this.crowdRevSend = c.createGain();
    this.crowdRevSend.gain.value = 0.3;
    this.crowdConv = c.createConvolver();
    this.crowdConv.buffer = this._makeIR(1.6, 0.35, 23);
    this.crowdRevGain = c.createGain();
    this.crowdGain.connect(this.crowdRevSend);
    this.crowdRevSend.connect(this.crowdConv);
    this.crowdConv.connect(this.crowdRevGain);
    this.crowdRevGain.connect(this.master);
  }

  /* Prosedürel yankı tepkisi: üstel sönüm + erken yansımalar + ısınan kuyruk */
  _makeIR(seconds, damp, seed) {
    const c = this.ctx, sr = this.sr, len = Math.floor(seconds * sr);
    const ir = c.createBuffer(2, len, sr);
    const r = mulberry32(seed);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const env = Math.exp((-6.9 * t) / seconds);
        const k = 0.15 + 0.8 * Math.exp(-t * (1.5 / damp));
        lp = lp + k * ((r() * 2 - 1) - lp);
        d[i] = lp * env * (t < 0.012 ? t / 0.012 : 1);
      }
      for (let e = 0; e < 14; e++) {
        const pos = Math.floor((0.008 + r() * 0.085) * sr);
        d[pos] += (r() * 2 - 1) * 0.9 * Math.exp(-e * 0.18);
      }
    }
    return ir;
  }

  /* --------------------- prosedürel örnekler (kağıt) ------------------- */
  _buf(seconds, fill) {
    const c = this.ctx, n = Math.floor(seconds * this.sr);
    const b = c.createBuffer(1, n, this.sr);
    fill(b.getChannelData(0), this.sr, n);
    let pk = 0;
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(d[i]));
    if (pk > 0) for (let i = 0; i < n; i++) d[i] /= pk;
    return b;
  }

  _grains(d, sr, n, r, count, opts) {
    for (let g = 0; g < count; g++) {
      const pos = opts.when(r()) * n;
      const len = Math.floor(sr * (opts.minLen + r() * opts.varLen));
      const amp = opts.amp(pos / n) * (0.25 + r() * 0.75);
      let hp = 0, prev = 0;
      const bright = opts.bright + r() * 0.1;
      for (let i = 0; i < len && pos + i < n; i++) {
        const w = r() * 2 - 1;
        hp = bright * (hp + w - prev);
        prev = w;
        const env = Math.exp((-5 * i) / len) * (i < 24 ? i / 24 : 1);
        d[Math.floor(pos) + i] += hp * env * amp;
      }
    }
  }

  _makeSamples() {
    const r = this.rng;
    this.noise = this._buf(2.0, (d) => { for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; });
    this.pink = this._buf(3.0, (d) => {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < d.length; i++) {
        const w = r() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926;
      }
    });
    this.brown = this._buf(3.0, (d) => { let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (r() * 2 - 1)) / 1.02; d[i] = l; } });
    /* kuru kağıt buruşması (0.3 sn) */
    this.crumples = [0, 1, 2].map(() => this._buf(0.34, (d, sr, n) => {
      this._grains(d, sr, n, r, 70, { when: (u) => Math.pow(u, 1.7), minLen: 0.0015, varLen: 0.006, bright: 0.86, amp: (p) => Math.pow(1 - p, 0.6) });
      this._grains(d, sr, n, r, 12, { when: (u) => u * 0.4, minLen: 0.006, varLen: 0.012, bright: 0.55, amp: (p) => 0.6 * (1 - p) });
    }));
    /* yumuşak kağıt düşüşü */
    this.ticks = [0, 1, 2, 3].map(() => this._buf(0.09, (d, sr, n) => {
      this._grains(d, sr, n, r, 7, { when: (u) => u * 0.6, minLen: 0.002, varLen: 0.008, bright: 0.6, amp: (p) => 1 - p });
      let lp = 0; for (let i = 0; i < n; i++) { lp += 0.25 * (d[i] - lp); d[i] = lp * 0.6 + d[i] * 0.4; }
    }));
    /* sıcak, organik kağıt açılma hışırtısı (1.1 sn) */
    this.unfold = this._buf(1.15, (d, sr, n) => {
      this._grains(d, sr, n, r, 150, { when: (u) => u, minLen: 0.002, varLen: 0.01, bright: 0.72, amp: (p) => Math.sin(Math.PI * Math.min(1, p * 1.2)) });
      this._grains(d, sr, n, r, 18, { when: (u) => 0.15 + u * 0.7, minLen: 0.01, varLen: 0.03, bright: 0.4, amp: (p) => 0.5 * Math.sin(Math.PI * p) });
      let lp = 0; for (let i = 0; i < n; i++) { lp += 0.35 * (d[i] - lp); d[i] = lp; }
    });
    /* tek kağıt kanat çırpışı */
    this.flaps = [0, 1, 2].map(() => this._buf(0.14, (d, sr, n) => {
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        const env = t < 0.012 ? t / 0.012 : Math.exp(-(t - 0.012) * 32);
        lp += 0.08 * ((r() * 2 - 1) - lp);
        d[i] = lp * env;
      }
      this._grains(d, sr, n, r, 6, { when: (u) => u * 0.5, minLen: 0.002, varLen: 0.004, bright: 0.7, amp: () => 0.08 });
    }));
  }

  /* ------------- örnek seviyesinde karıştırma katmanları (hızlı) ------------- */
  _layer() { const n = Math.ceil(this.sr * this.duration); return [new Float32Array(n), new Float32Array(n)]; }
  _mix(layer, sample, at, gain, pan, rate) {
    const L = layer[0], R = layer[1];
    rate = rate || 1;
    const a = ((clamp(pan || 0, -1, 1) + 1) * Math.PI) / 4;
    const gl = gain * Math.cos(a), gr = gain * Math.sin(a);
    const i0 = Math.floor(at * this.sr), n = Math.floor((sample.length - 1) / rate);
    for (let i = 0; i < n; i++) {
      const idx = i0 + i;
      if (idx < 0) continue;
      if (idx >= L.length) break;
      const sp = i * rate, j = sp | 0, fr = sp - j;
      const v = sample[j] * (1 - fr) + sample[j + 1] * fr;
      L[idx] += v * gl; R[idx] += v * gr;
    }
  }
  _layerOut(layer, dest, dryAmt, revAmt) {
    const c = this.ctx;
    const b = c.createBuffer(2, layer[0].length, this.sr);
    b.copyToChannel(layer[0], 0); b.copyToChannel(layer[1], 1);
    const src = c.createBufferSource(); src.buffer = b;
    if (dest) { src.connect(dest); }
    else {
      const g1 = c.createGain(); g1.gain.value = dryAmt; src.connect(g1); g1.connect(this.dry);
      if (revAmt) { const g2 = c.createGain(); g2.gain.value = revAmt; src.connect(g2); g2.connect(this.revSend); }
    }
    src.start(0);
  }
  /* RBJ biquad (JS) */
  _biquad(x, type, f, Q) {
    const w = (TAU * f) / this.sr, cs = Math.cos(w), al = Math.sin(w) / (2 * Q);
    let b0, b1, b2, a0, a1, a2;
    if (type === 'bandpass') { b0 = al; b1 = 0; b2 = -al; }
    else if (type === 'highpass') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2; }
    else { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = (1 - cs) / 2; }
    a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al;
    const y = new Float32Array(x.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
    }
    return y;
  }
  _norm(x, peak) { let m = 0; for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i])); if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= (peak || 1) / m; return x; }
  _noiseBurst(sec, attack, decay, r) {
    const n = Math.floor(sec * this.sr), x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / this.sr; x[i] = (r() * 2 - 1) * (t < attack ? t / attack : Math.exp(-(t - attack) / decay)); }
    return x;
  }
  _tone(sec, partials, f0, f1, decay, attack) {
    const n = Math.floor(sec * this.sr), x = new Float32Array(n);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / this.sr, f = f1 ? f0 * Math.pow(f1 / f0, Math.min(1, t / sec)) : f0;
      ph += (TAU * f) / this.sr;
      let v = 0;
      for (const [h, a] of partials) v += Math.sin(ph * h) * a;
      x[i] = v * (t < attack ? t / attack : Math.exp(-(t - attack) / decay));
    }
    return x;
  }
  _makeCrowdSamples() {
    const r = this.rng;
    this.sClickA = this._norm(this._biquad(this._noiseBurst(0.035, 0.0015, 0.007, r), 'bandpass', 3300, 7));
    this.sClickB = this._norm(this._biquad(this._noiseBurst(0.035, 0.0015, 0.007, r), 'bandpass', 4200, 7));
    this.sTock = this._norm(this._tone(0.08, [[1, 1], [2, 0.25]], 190, 120, 0.018, 0.003));
    this.sKlank = this._norm(this._biquad(this._noiseBurst(0.14, 0.002, 0.03, r), 'bandpass', 1750, 14));
    this.sPingE = this._norm(this._pingPair(NOTE.E6, NOTE.B6));
    this.sPingF = this._norm(this._pingPair(NOTE.Fs6, NOTE.Cs7));
    this.sTicks = this.ticks.map((b) => this._norm(this._biquad(b.getChannelData(0), 'highpass', 500, 0.7)));
    this.sFlaps = this.flaps.map((b) => this._norm(this._biquad(b.getChannelData(0), 'bandpass', 900, 0.7)));
  }
  _pingPair(f1, f2) {
    const a = this._tone(0.34, [[1, 1], [2.01, 0.18]], f1, 0, 0.055, 0.004);
    const b = this._tone(0.34, [[1, 1], [2.01, 0.18]], f2, 0, 0.055, 0.004);
    const off = Math.floor(0.075 * this.sr), x = new Float32Array(a.length + off);
    for (let i = 0; i < a.length; i++) { x[i] += a[i]; x[i + off] += b[i]; }
    return x;
  }

  /* ----------------------------- yardımcılar --------------------------- */
  _out(pan, dryAmt, revAmt, dest) {
    const c = this.ctx;
    const p = c.createStereoPanner();
    p.pan.value = clamp(pan || 0, -1, 1);
    if (dest) { p.connect(dest); return p; }
    const g1 = c.createGain(); g1.gain.value = dryAmt === undefined ? 1 : dryAmt;
    p.connect(g1); g1.connect(this.dry);
    if (revAmt) { const g2 = c.createGain(); g2.gain.value = revAmt; p.connect(g2); g2.connect(this.revSend); }
    return p;
  }

  _play(buffer, at, vol, rate, out, offset, dur) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = buffer;
    s.playbackRate.value = rate || 1;
    const g = c.createGain();
    g.gain.value = vol;
    s.connect(g); g.connect(out);
    s.start(Math.max(0, at), offset || 0, dur);
    return { s, g };
  }

  _env(param, at, a, peak, hold, rel) {
    param.setValueAtTime(0, at);
    param.linearRampToValueAtTime(peak, at + a);
    param.setValueAtTime(peak, at + a + hold);
    param.linearRampToValueAtTime(0, at + a + hold + rel);
  }

  /* ========================= SÜREKLİ ATMOSFERLER ======================== */
  /* 112 BPM mekanik çark tıkırtısı + steril bildirim ping'leri + soğuk uğultu */
  startCrowdAmbience(at, until) {
    const c = this.ctx, r = this.rng;
    const L = this._layer();
    const eighth = 60 / 112 / 2;
    let i = 0;
    for (let t = at + 0.05; t < until; t += eighth, i++) {
      const beat = i % 2 === 0, bar = i % 8 === 0;
      const swell = 0.75 + 0.45 * inv(12.5, 24.5, t);
      this._mix(L, beat ? this.sClickA : this.sClickB, t, (beat ? 0.34 : 0.2) * swell, beat ? -0.38 : 0.38, 0.97 + r() * 0.06);
      if (beat) this._mix(L, this.sTock, t, 0.16 * swell, 0);
      if (bar) this._mix(L, this.sKlank, t, 0.22 * swell, (r() - 0.5) * 0.6, 0.96 + r() * 0.08);
    }
    /* steril neon bildirim ping'leri (E6→B6, F#6→C#7), rastgele sağ-sol */
    let t = at + 0.35;
    while (t < until - 0.15) {
      const smp = r() < 0.5 ? this.sPingE : this.sPingF;
      const pan = (r() < 0.5 ? -1 : 1) * (0.45 + r() * 0.5);
      const vol = 0.05 + r() * 0.045 + 0.03 * inv(12, 25, t);
      this._mix(L, smp, t, vol * 1.4, pan);
      t += t < 12.5 ? 0.9 + r() * 1.1 : 0.32 + r() * 0.6;
    }
    this._layerOut(L, this.crowdIn);
    /* soğuk floresan uğultusu */
    const hum = c.createGain(); hum.gain.setValueAtTime(0, at); hum.gain.linearRampToValueAtTime(0.035, at + 1.5);
    hum.connect(this._out(0, 1, 0, this.crowdIn));
    [60, 120, 180].forEach((f, k) => { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = c.createGain(); g.gain.value = [0.6, 0.35, 0.12][k]; o.connect(g); g.connect(hum); o.start(at); o.stop(until + 0.5); });
    const hiss = c.createBiquadFilter(); hiss.type = 'bandpass'; hiss.frequency.value = 7000; hiss.Q.value = 0.6;
    const hn = this._play(this.noise, at, 0.012, 1, hiss, 0);
    hn.s.loop = true; hn.s.stop(until + 0.5);
    hiss.connect(this._out(0.1, 1, 0, this.crowdIn));
  }

  /* Hüzünlü solo çello bası: C2 = 65.4 Hz, detune sawtooth + LFO vibrato + 240 Hz LPF */
  startCelloDrone(at, until, swells) {
    const c = this.ctx;
    const voice = (freq, t0, t1, lpf, levels, pan) => {
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = lpf; lp.Q.value = 1.1;
      const body = c.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = freq * 3; body.gain.value = 5; body.Q.value = 1.2;
      const g = c.createGain();
      g.gain.setValueAtTime(0, t0);
      for (const [tt, v] of levels) g.gain.linearRampToValueAtTime(v, tt);
      g.gain.linearRampToValueAtTime(0, t1);
      const lfo = c.createOscillator(); lfo.frequency.value = 4.8;
      const lfoG = c.createGain(); lfoG.gain.value = freq * 0.006;
      lfo.connect(lfoG);
      [-5, 5, 0].forEach((cents, k) => {
        const o = c.createOscillator(); o.type = k === 2 ? 'triangle' : 'sawtooth';
        o.frequency.value = freq; o.detune.value = cents;
        lfoG.connect(o.frequency);
        const og = c.createGain(); og.gain.value = k === 2 ? 0.5 : 0.36;
        o.connect(og); og.connect(lp);
        o.start(t0); o.stop(t1 + 0.1);
      });
      lfo.start(t0); lfo.stop(t1 + 0.1);
      lp.connect(body); body.connect(g);
      g.connect(this._out(pan, 1, 0, this.crowdIn));
      /* yay hışırtısı */
      const bn = c.createBiquadFilter(); bn.type = 'bandpass'; bn.frequency.value = 420; bn.Q.value = 1.4;
      const nb = this._play(this.noise, t0, 0.015, 1, bn, 0.3);
      nb.s.loop = true; nb.s.stop(t1);
      bn.connect(g);
    };
    voice(NOTE.C2, at, until, 240, swells || [[at + 2.6, 0.26], [9.0, 0.24], [10.4, 0.34], [13, 0.28], [19.5, 0.4], [24, 0.32], [26.8, 0.3]], 0);
    voice(NOTE.G2, 12.2, until, 300, [[14.5, 0.12], [20, 0.16], [26.8, 0.14]], -0.2);
    voice(NOTE.Eb3, 20.4, until, 560, [[22.5, 0.1], [26.8, 0.1]], 0.25);
  }

  /* ========================== FOLEY & DUYGU =========================== */
  /* Narin ahşap flüt / arp armoniği */
  playBirdLaunch(at, pitchOffset, pan, big) {
    const c = this.ctx;
    const notes = big ? [NOTE.C5, NOTE.Eb5, NOTE.G5, NOTE.C6] : [NOTE.G4, NOTE.C5];
    /* arp çekişi */
    const pluck = (f, t, v) => {
      [1, 2, 3, 4.02].forEach((h, k) => {
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = semi(f, pitchOffset) * h;
        const g = c.createGain();
        const vv = v * [1, 0.32, 0.12, 0.05][k];
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vv, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0003, t + 1.6 - k * 0.3);
        o.connect(g); g.connect(this._out(pan, 0.7, 0.5)); o.start(t); o.stop(t + 1.7);
      });
    };
    /* ahşap flüt */
    const flute = (f, t, d, v) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = semi(f, pitchOffset);
      const o3 = c.createOscillator(); o3.type = 'sine'; o3.frequency.value = semi(f, pitchOffset) * 3;
      const vib = c.createOscillator(); vib.frequency.value = 5.4;
      const vg = c.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(semi(f, pitchOffset) * 0.008, t + d * 0.6);
      vib.connect(vg); vg.connect(o.frequency);
      const g = c.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.06); g.gain.setValueAtTime(v * 0.85, t + d * 0.7); g.gain.linearRampToValueAtTime(0, t + d);
      const g3 = c.createGain(); g3.gain.value = 0.06;
      o.connect(g); o3.connect(g3); g3.connect(g);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = semi(f, pitchOffset); bp.Q.value = 18;
      const br = this._play(this.noise, t, 0, 1, bp, this.rng());
      br.g.gain.setValueAtTime(0, t); br.g.gain.linearRampToValueAtTime(v * 1.6, t + 0.04); br.g.gain.linearRampToValueAtTime(0, t + d);
      bp.connect(g);
      g.connect(this._out(pan, 0.8, 0.45));
      o.start(t); o3.start(t); vib.start(t); o.stop(t + d + 0.05); o3.stop(t + d + 0.05); vib.stop(t + d + 0.05);
    };
    if (big) {
      pluck(NOTE.G4, at - 0.04, 0.14);
      notes.forEach((f, k) => flute(f, at + k * 0.17, k === notes.length - 1 ? 1.1 : 0.3, 0.07));
      /* sıcak kuş fısıltısı */
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 1.2;
      const w = this._play(this.pink, at - 0.15, 0, 1, bp, 0.5);
      w.g.gain.setValueAtTime(0, at - 0.15); w.g.gain.linearRampToValueAtTime(0.06, at + 0.15); w.g.gain.linearRampToValueAtTime(0, at + 0.9);
      bp.connect(this._out(pan, 1, 0.3));
    } else {
      pluck(notes[0], at - 0.02, 0.1);
      flute(notes[0], at, 0.16, 0.06);
      flute(notes[1], at + 0.12, 0.36, 0.055);
    }
  }

  /* 95 Hz tok darbe + 0.25 sn kuru kağıt buruşması */
  playBirdImpactAndCrumple(at, pan, vol) {
    const c = this.ctx, v = vol === undefined ? 1 : vol;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(150, at); o.frequency.exponentialRampToValueAtTime(95, at + 0.03); o.frequency.exponentialRampToValueAtTime(55, at + 0.2);
    const g = c.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.55 * v, at + 0.004); g.gain.exponentialRampToValueAtTime(0.0005, at + 0.28);
    o.connect(g); g.connect(this._out(pan * 0.5, 1, 0.12)); o.start(at); o.stop(at + 0.3);
    const crumple = this.crumples[Math.floor(this.rng() * 3)];
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    hp.connect(this._out(pan, 1, 0.15));
    this._play(crumple, at + 0.005, 0.5 * v, 0.92 + this.rng() * 0.16, hp);
  }

  playPaperTick(at, pan, vol) {
    this._mix(this.foley, this.sTicks[Math.floor(this.rng() * 4)], at, vol, pan, 0.8 + this.rng() * 0.5);
  }

  playWindSlide(at, dur) {
    const c = this.ctx;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(320, at); bp.frequency.linearRampToValueAtTime(760, at + dur * 0.55); bp.frequency.linearRampToValueAtTime(380, at + dur);
    const p = c.createStereoPanner(); p.pan.setValueAtTime(-0.3, at); p.pan.linearRampToValueAtTime(0.55, at + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.22, at + dur * 0.4); g.gain.linearRampToValueAtTime(0, at + dur);
    const n = this._play(this.pink, at, 1, 1, bp, 0.2);
    n.s.stop(at + dur + 0.1);
    bp.connect(g); g.connect(p); p.connect(this.crowdIn);
  }

  /* 27. saniye: tüm kalabalık ve çello 0.35 sn'de derin vakumla susar */
  cutToVacuumSilence(at, duration) {
    const fq = this.crowdFilter.frequency, cg = this.crowdGain.gain, rg = this.crowdRevGain.gain;
    fq.setValueAtTime(18000, at); fq.exponentialRampToValueAtTime(70, at + 0.35);
    cg.setValueAtTime(1, at); cg.linearRampToValueAtTime(0, at + 0.35);
    rg.setValueAtTime(1, at); rg.linearRampToValueAtTime(0, at + 0.3);
    const rr = this.revReturn.gain;
    rr.setValueAtTime(0.85, at); rr.linearRampToValueAtTime(0.0, at + 0.4);
    rr.setValueAtTime(0.0, at + duration - 0.05); rr.linearRampToValueAtTime(0.85, at + duration + 0.25);
    /* tek bir derin nefes */
    this.playDeepBreath(at + 0.55, 1.15);
  }

  playDeepBreath(at, dur) {
    const c = this.ctx;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(480, at); bp.frequency.linearRampToValueAtTime(950, at + dur * 0.45); bp.frequency.linearRampToValueAtTime(420, at + dur);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    const g = c.createGain();
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.42, at + dur * 0.45); g.gain.linearRampToValueAtTime(0.12, at + dur * 0.55); g.gain.linearRampToValueAtTime(0.3, at + dur * 0.7); g.gain.linearRampToValueAtTime(0, at + dur);
    const n = this._play(this.pink, at, 1, 1, bp, 0.9);
    n.s.stop(at + dur + 0.05);
    bp.connect(lp); lp.connect(g); g.connect(this._out(0, 1, 0));
  }

  /* 29–33. sn: ince, sıcak, organik kağıt açılma hışırtısı */
  playPaperUnfold(at, pan) {
    const c = this.ctx;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 350;
    const shelf = c.createBiquadFilter(); shelf.type = 'highshelf'; shelf.frequency.value = 6000; shelf.gain.value = -6;
    hp.connect(shelf); shelf.connect(this._out(pan || 0, 1, 0.25));
    this._play(this.unfold, at, 0.42, 0.9, hp);
    this._play(this.unfold, at + 0.18, 0.18, 1.15, hp);
  }

  /* Pembe gürültü, 420→850 Hz süzülen yumuşak nefes filtresi */
  playWarmBreath(at, dur) {
    const c = this.ctx; dur = dur || 2.1;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.85;
    bp.frequency.setValueAtTime(420, at); bp.frequency.exponentialRampToValueAtTime(850, at + dur * 0.6); bp.frequency.exponentialRampToValueAtTime(520, at + dur);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    const g = c.createGain();
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.32, at + 0.35); g.gain.linearRampToValueAtTime(0.24, at + dur * 0.7); g.gain.linearRampToValueAtTime(0, at + dur);
    const n = this._play(this.pink, at, 1, 0.95, bp, 0.2);
    n.s.stop(at + dur + 0.05);
    bp.connect(lp); lp.connect(g); g.connect(this._out(0, 1, 0.3));
    /* nefesin içindeki sıcak gövde */
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 110;
    const og = c.createGain(); og.gain.setValueAtTime(0, at); og.gain.linearRampToValueAtTime(0.03, at + 0.5); og.gain.linearRampToValueAtTime(0, at + dur);
    o.connect(og); og.connect(this._out(0, 1, 0.2)); o.start(at); o.stop(at + dur);
  }

  /* Katedral yankılı cam gibi temiz piyano / çelesta notası */
  playCelestaNote(at, freq, vol, pan) {
    const c = this.ctx;
    const out = this._out(pan || 0, 0.55, 1.15);
    [[1, 1, 3.2], [2.0, 0.22, 1.8], [3.0, 0.07, 1.2], [4.16, 0.09, 0.9], [5.43, 0.035, 0.6], [0.5, 0.06, 2.6]].forEach(([h, v, dec]) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq * h;
      const g = c.createGain();
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol * v, at + 0.003); g.gain.exponentialRampToValueAtTime(0.00025, at + dec);
      o.connect(g); g.connect(out); o.start(at); o.stop(at + dec + 0.05);
    });
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3500;
    hp.connect(out);
    const n = this._play(this.noise, at, 0, 1, hp, this.rng(), 0.02);
    n.g.gain.setValueAtTime(0, at); n.g.gain.linearRampToValueAtTime(vol * 0.08, at + 0.001); n.g.gain.exponentialRampToValueAtTime(0.0002, at + 0.018);
  }

  playRoomTone(at, until) {
    const c = this.ctx;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
    const g = c.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.05, at + 1.5); g.gain.setValueAtTime(0.05, until - 1); g.gain.linearRampToValueAtTime(0, until);
    const n = this._play(this.brown, at, 1, 1, lp, 0);
    n.s.loop = true; n.s.stop(until + 0.1);
    lp.connect(g); g.connect(this._out(0, 1, 0.2));
  }

  playGlassShimmer(at, dur) {
    const c = this.ctx;
    [NOTE.E6, NOTE.G6, NOTE.B6, NOTE.D7].forEach((f, k) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const trem = c.createOscillator(); trem.frequency.value = 6 + k * 1.3;
      const tg = c.createGain(); tg.gain.value = 0.4;
      const g = c.createGain();
      const t0 = at + k * 0.12;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.018, t0 + 0.25); g.gain.linearRampToValueAtTime(0, t0 + dur);
      trem.connect(tg); tg.connect(g.gain);
      o.connect(g); g.connect(this._out((k - 1.5) * 0.4, 0.4, 1.0));
      o.start(t0); trem.start(t0); o.stop(t0 + dur + 0.1); trem.stop(t0 + dur + 0.1);
    });
  }

  playRiser(at, dur) {
    const c = this.ctx;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.2;
    bp.frequency.setValueAtTime(220, at); bp.frequency.exponentialRampToValueAtTime(3800, at + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.22, at + dur * 0.92); g.gain.linearRampToValueAtTime(0, at + dur + 0.04);
    const n = this._play(this.pink, at, 1, 1, bp, 1.1);
    n.s.stop(at + dur + 0.1);
    bp.connect(g); g.connect(this._out(0, 0.8, 0.6));
  }

  playFlap(at, pan, vol, rate) {
    this._mix(this.flock, this.sFlaps[Math.floor(this.rng() * 3)], at, vol, pan, rate || 1);
  }

  /* ========= EN ÖNEMLİ KISIM: alevlenme + vokal formant koro ========= */
  playFlockIgnitionAndChoir(at, flock) {
    const c = this.ctx, r = this.rng;
    const END = 49.3;

    /* alevlenme "vuum"u */
    const sub = c.createOscillator(); sub.type = 'sine';
    sub.frequency.setValueAtTime(62, at); sub.frequency.exponentialRampToValueAtTime(38, at + 1.4);
    const sg = c.createGain(); sg.gain.setValueAtTime(0, at); sg.gain.linearRampToValueAtTime(0.5, at + 0.04); sg.gain.exponentialRampToValueAtTime(0.0005, at + 1.8);
    sub.connect(sg); sg.connect(this._out(0, 1, 0.2)); sub.start(at); sub.stop(at + 1.9);
    const wb = c.createBiquadFilter(); wb.type = 'bandpass'; wb.Q.value = 0.8;
    wb.frequency.setValueAtTime(600, at); wb.frequency.exponentialRampToValueAtTime(2600, at + 1.2);
    const wn = this._play(this.pink, at, 0, 1, wb, 0.4);
    wn.g.gain.setValueAtTime(0, at); wn.g.gain.linearRampToValueAtTime(0.32, at + 0.05); wn.g.gain.exponentialRampToValueAtTime(0.001, at + 2.4);
    wn.s.stop(at + 2.5);
    wb.connect(this._out(0, 0.7, 0.9));

    /* ---- vokal formant koro: Cm9 → Abmaj7 → Ebmaj9 → Cmaj9 (Pikardi) ---- */
    const chords = [
      { t: at - 0.35, n: [NOTE.Eb4, NOTE.G4, NOTE.Bb4, NOTE.D5] },
      { t: 39.6, n: [NOTE.Eb4, NOTE.G4, NOTE.C5, NOTE.Eb5] },
      { t: 41.75, n: [NOTE.F4, NOTE.G4, NOTE.Bb4, NOTE.D5] },
      { t: 44.0, n: [NOTE.E4, NOTE.G4, NOTE.B4, NOTE.D5] },
    ];
    const bass = [[at - 0.35, NOTE.C2], [39.6, semi(NOTE.Ab2, -12)], [41.75, NOTE.Eb2], [44.0, NOTE.C2]];
    const AH = [700, 1150, 2650], OOH = [380, 900, 2450];
    const formants = [[1.0, 6], [0.5, 9], [0.22, 12]];
    const voicePans = [-0.55, -0.18, 0.2, 0.55];

    const choirBus = c.createGain();
    choirBus.gain.setValueAtTime(0, at - 0.6);
    choirBus.gain.linearRampToValueAtTime(0.05, at - 0.05);
    choirBus.gain.linearRampToValueAtTime(0.34, at + 0.9);
    choirBus.gain.setValueAtTime(0.34, 43.6);
    choirBus.gain.linearRampToValueAtTime(0.42, 44.6);
    choirBus.gain.setValueAtTime(0.42, END - 1.2);
    choirBus.gain.linearRampToValueAtTime(0, END + 0.35);
    const choirDry = c.createGain(); choirDry.gain.value = 0.55;
    const choirWet = c.createGain(); choirWet.gain.value = 1.1;
    choirBus.connect(choirDry); choirDry.connect(this.dry);
    choirBus.connect(choirWet); choirWet.connect(this.revSend);

    for (let v = 0; v < 4; v++) {
      const vg = c.createGain(); vg.gain.value = 1;
      const pan = c.createStereoPanner(); pan.pan.value = voicePans[v];
      vg.connect(pan); pan.connect(choirBus);
      const fbank = formants.map(([gain, Q], fi) => {
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = Q;
        const f0 = OOH[fi] * (1 + v * 0.03), f1 = AH[fi] * (1 + v * 0.03);
        bp.frequency.setValueAtTime(f0, at - 0.6);
        bp.frequency.linearRampToValueAtTime(f1, at + 1.0);
        bp.frequency.setValueAtTime(f1, 46.4);
        bp.frequency.linearRampToValueAtTime(f0, END + 0.3);
        const g = c.createGain(); g.gain.value = gain;
        bp.connect(g); g.connect(vg);
        return bp;
      });
      const src = c.createGain(); src.gain.value = 0.5;
      fbank.forEach((bp) => src.connect(bp));
      const vib = c.createOscillator(); vib.frequency.value = 5.0 + v * 0.23;
      const vibG = c.createGain();
      vibG.gain.setValueAtTime(0, at); vibG.gain.linearRampToValueAtTime(1, at + 1.2);
      vib.connect(vibG);
      [-8, 0, 7].forEach((cents) => {
        const o = c.createOscillator(); o.type = 'sawtooth';
        o.detune.value = cents + (r() - 0.5) * 4;
        o.frequency.setValueAtTime(chords[0].n[v], at - 0.6);
        for (let k = 1; k < chords.length; k++) {
          o.frequency.setValueAtTime(chords[k - 1].n[v], chords[k].t - 0.12);
          o.frequency.linearRampToValueAtTime(chords[k].n[v], chords[k].t + 0.16);
        }
        const dg = c.createGain(); dg.gain.value = 16; /* vibrato derinliği (cent) */
        vibG.connect(dg); dg.connect(o.detune);
        o.connect(src);
        o.start(at - 0.6); o.stop(END + 0.6);
      });
      vib.start(at - 0.6); vib.stop(END + 0.6);
      /* nefesli soluk */
      const bn = this._play(this.pink, at - 0.6, 0.06, 1, src, r());
      bn.s.loop = true; bn.s.stop(END + 0.5);
    }

    /* sıcak üflemeli pad + bas */
    const pad = c.createGain();
    pad.gain.setValueAtTime(0, at - 0.3); pad.gain.linearRampToValueAtTime(0.16, at + 1.6);
    pad.gain.setValueAtTime(0.16, END - 1.0); pad.gain.linearRampToValueAtTime(0, END + 0.4);
    const padLP = c.createBiquadFilter(); padLP.type = 'lowpass'; padLP.frequency.value = 1500;
    pad.connect(padLP); padLP.connect(this._out(0, 0.7, 0.8));
    for (let v = 0; v < 4; v++) {
      const o = c.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(chords[0].n[v] / 2, at - 0.3);
      for (let k = 1; k < chords.length; k++) {
        o.frequency.setValueAtTime(chords[k - 1].n[v] / 2, chords[k].t - 0.1);
        o.frequency.linearRampToValueAtTime(chords[k].n[v] / 2, chords[k].t + 0.2);
      }
      o.detune.value = (v - 1.5) * 4;
      const g = c.createGain(); g.gain.value = 0.25;
      o.connect(g); g.connect(pad); o.start(at - 0.3); o.stop(END + 0.5);
    }
    const bassG = c.createGain();
    bassG.gain.setValueAtTime(0, at - 0.3); bassG.gain.linearRampToValueAtTime(0.3, at + 0.6);
    bassG.gain.setValueAtTime(0.3, END - 1.0); bassG.gain.linearRampToValueAtTime(0, END + 0.5);
    const bassLP = c.createBiquadFilter(); bassLP.type = 'lowpass'; bassLP.frequency.value = 420;
    bassG.connect(bassLP); bassLP.connect(this._out(0, 1, 0.25));
    [0, 12].forEach((oct, k) => {
      const o = c.createOscillator(); o.type = k ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(semi(bass[0][1], oct), at - 0.3);
      for (let i = 1; i < bass.length; i++) {
        o.frequency.setValueAtTime(semi(bass[i - 1][1], oct), bass[i][0] - 0.1);
        o.frequency.linearRampToValueAtTime(semi(bass[i][1], oct), bass[i][0] + 0.15);
      }
      const g = c.createGain(); g.gain.value = k ? 0.5 : 0.7;
      o.connect(g); g.connect(bassG); o.start(at - 0.3); o.stop(END + 0.6);
    });

    /* final: sıcak çello C majör'e döner */
    const cel = c.createGain();
    cel.gain.setValueAtTime(0, 43.8); cel.gain.linearRampToValueAtTime(0.16, 45.2); cel.gain.setValueAtTime(0.16, END - 0.8); cel.gain.linearRampToValueAtTime(0, END + 0.4);
    const celLP = c.createBiquadFilter(); celLP.type = 'lowpass'; celLP.frequency.value = 520;
    cel.connect(celLP); celLP.connect(this._out(-0.15, 0.8, 0.6));
    [NOTE.C3, NOTE.G3, NOTE.E4 / 2].forEach((f) => {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const lf = c.createOscillator(); lf.frequency.value = 4.7; const lg = c.createGain(); lg.gain.value = f * 0.005;
      lf.connect(lg); lg.connect(o.frequency);
      const g = c.createGain(); g.gain.value = 0.3;
      o.connect(g); g.connect(cel); o.start(43.8); lf.start(43.8); o.stop(END + 0.5); lf.stop(END + 0.5);
    });

    /* yüzlerce kağıt kanadın pırpır stereo uğultusu (sağdan sola) */
    const whoosh = c.createBiquadFilter(); whoosh.type = 'bandpass'; whoosh.frequency.value = 950; whoosh.Q.value = 0.6;
    const wp = c.createStereoPanner(); wp.pan.setValueAtTime(0.85, at); wp.pan.linearRampToValueAtTime(-0.85, at + 6.5);
    const wg = c.createGain(); wg.gain.setValueAtTime(0, at); wg.gain.linearRampToValueAtTime(0.2, at + 1.2); wg.gain.linearRampToValueAtTime(0.11, 43); wg.gain.linearRampToValueAtTime(0, 47.5);
    const am = c.createOscillator(); am.frequency.value = 11; const amg = c.createGain(); amg.gain.value = 0.07;
    am.connect(amg); amg.connect(wg.gain); am.start(at); am.stop(47.6);
    const wn2 = this._play(this.pink, at, 1, 1, whoosh, 0.7);
    wn2.s.loop = true; wn2.s.stop(47.6);
    whoosh.connect(wg); wg.connect(wp); wp.connect(this.dry);
    for (const b of flock) {
      const rate = 2.2 + r() * 0.8;
      const n = 3 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const tt = b.t + k / rate + r() * 0.02;
        if (tt > 47.4) break;
        this.playFlap(tt, clamp((b.x - 540) / 520, -1, 1) * (1 - k * 0.12), 0.05 * (1 - k * 0.14), 0.85 + r() * 0.5);
      }
    }

    /* kristal kıvılcımlar: Cmaj9 arpejleri */
    const sparkle = [NOTE.E5, NOTE.G5, NOTE.B5, NOTE.D6, NOTE.G5, NOTE.E6, NOTE.B5, NOTE.D6];
    sparkle.forEach((f, k) => this.playCelestaNote(44.05 + k * 0.42 + r() * 0.06, f, 0.12 - k * 0.008, (r() - 0.5) * 0.9));
    [NOTE.Eb5, NOTE.G5, NOTE.D6].forEach((f, k) => this.playCelestaNote(at + 0.25 + k * 0.6, f, 0.07, (r() - 0.5) * 0.8));
  }

  /* ============================ KOMPOZİSYON ============================ */
  _compose(S) {
    const r = this.rng;
    this._makeCrowdSamples();
    this.foley = this._layer();
    this.flock = this._layer();
    this.startCrowdAmbience(0, 27.4);
    this.startCelloDrone(0, 27.6);

    /* kahraman kuş: 5.8 */
    this.playBirdLaunch(5.8, 0, -0.1, true);
    /* süzülürken umut: yumuşak flüt nefesi */
    this.playBirdLaunch(7.35, -5, -0.35, false);
    this.playBirdImpactAndCrumple(9.2, -0.55, 1.25);
    this.playPaperTick(10.5, -0.15, 0.4);

    /* ağızdan fırlayan kuşlar */
    const offs = [0, -2, 1, -3, -1, -5, -4, -7];
    S.mouthBirds.forEach((b, k) => {
      this.playBirdLaunch(b.tLaunch, offs[k % offs.length], clamp((b.p0[0] - 540) / 400, -1, 1) * 0.4, false);
      this.playBirdImpactAndCrumple(b.tHit, clamp((b.pHit[0] - 540) / 420, -1, 1), 0.85 - k * 0.03);
      this.playPaperTick(b.tLand, clamp((b.xLand - 540) / 450, -1, 1), 0.28);
    });
    /* kül yağmuru: her iniş yumuşak bir kağıt sesi */
    S.rainBirds.forEach((b) => {
      if (b.tLand < 27) this.playPaperTick(b.tLand, clamp((b.xLand - 540) / 450, -1, 1), 0.06 + r() * 0.08);
    });

    /* 23.0 rüzgâr; kuş yerde yuvarlanır */
    this.playWindSlide(22.9, 4.0);
    S.slideTicks.forEach(([tt, x]) => this.playPaperTick(tt, clamp((x - 540) / 400, -1, 1), 0.16));
    this.playPaperTick(26.8, 0.45, 0.26);

    /* 27.0: ateşleyici sebep — vakum sessizliği */
    this.cutToVacuumSilence(27.0, 1.8);

    /* 28.8 – 37.0: makro şefkat */
    this.playRoomTone(28.8, 37.4);
    this.playPaperUnfold(29.4, -0.3);
    this.playCelestaNote(30.25, 392.0, 0.25, -0.15);
    this.playPaperUnfold(31.2, 0.3);
    this.playCelestaNote(32.05, 493.88, 0.25, 0.15);
    this.playWarmBreath(33.5, 2.2);
    this.playCelestaNote(34.6, 587.33, 0.35, 0);
    this.playGlassShimmer(34.7, 1.8);
    this.playFlap(35.85, 0, 0.12, 0.9);
    this.playFlap(36.18, 0.05, 0.14, 1.0);
    this.playFlap(36.45, -0.05, 0.16, 1.05);
    this.playFlap(36.68, 0, 0.18, 1.1);
    this.playRiser(35.9, 1.58);

    /* 37.5: zincirleme alevlenme + koro */
    this.playFlockIgnitionAndChoir(37.5, S.flock);

    this._layerOut(this.foley, null, 1, 0.1);
    this._layerOut(this.flock, null, 1, 0.25);

    /* final kararma */
    const mg = this.master.gain;
    mg.setValueAtTime(0.85, 48.9);
    mg.linearRampToValueAtTime(0.0, 50.0);
  }

  /* ======================= CANLI OYNATMA (UI) ======================= */
  ensureLive() {
    if (!this.live) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.live = new AC({ latencyHint: 'interactive' });
      this.liveGain = this.live.createGain();
      this.liveGain.connect(this.live.destination);
    }
    if (this.live.state === 'suspended') this.live.resume();
    return this.live;
  }

  play(offset) {
    this.stopAll();
    if (!this.buffer || !this.live) return;
    const s = this.live.createBufferSource();
    s.buffer = this.buffer;
    s.connect(this.liveGain);
    s.start(this.live.currentTime + 0.01, clamp(offset, 0, this.duration));
    this.src = s;
    this.startCtxTime = this.live.currentTime + 0.01;
    this.startOffset = offset;
  }

  currentTime() {
    if (!this.live || !this.src) return null;
    return this.startOffset + Math.max(0, this.live.currentTime - this.startCtxTime);
  }

  stopAll() {
    if (this.src) {
      try { this.src.stop(); } catch (e) { /* zaten durmuş */ }
      try { this.src.disconnect(); } catch (e) { /* */ }
      this.src = null;
    }
  }

  /* kayıt için 16-bit WAV (base64) */
  wavBase64() {
    const b = this.buffer, n = b.length, ch = b.numberOfChannels;
    const bytes = 44 + n * ch * 2;
    const ab = new ArrayBuffer(bytes), v = new DataView(ab);
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); v.setUint32(4, bytes - 8, true); ws(8, 'WAVE'); ws(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
    v.setUint32(24, this.sr, true); v.setUint32(28, this.sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
    ws(36, 'data'); v.setUint32(40, n * ch * 2, true);
    const chans = []; for (let c = 0; c < ch; c++) chans.push(b.getChannelData(c));
    let o = 44;
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { v.setInt16(o, clamp(chans[c][i], -1, 1) * 32767, true); o += 2; }
    const u8 = new Uint8Array(ab);
    let s = '';
    const CH = 0x8000;
    for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
    return btoa(s);
  }
}
