/* ==========================================================================
   Rig — prosedürel SVG üretimi (kalabalık, dişliler, şehir, eller, kuşlar)
   ve her karede parametrelerden sahneye uygulama.
   ========================================================================== */
'use strict';

const $ = (id) => document.getElementById(id);
const FRONT_FEET = 1625, BACK_FEET = 1432;
const WRAP_LO = -460, WRAP_HI = 1540;

/* ------------------------------ Dişli yolu ------------------------------ */
function gearPath(R, n, depth) {
  const r0 = R - depth;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, w = TAU / n;
    const pts = [
      [r0, a], [r0, a + w * 0.18], [R, a + w * 0.3], [R, a + w * 0.62], [r0, a + w * 0.76],
    ];
    for (let k = 0; k < pts.length; k++) {
      const [rr, aa] = pts[k];
      const x = rr * Math.cos(aa), y = rr * Math.sin(aa);
      d += (i === 0 && k === 0 ? 'M' : 'L') + f1(x) + ' ' + f1(y) + ' ';
    }
  }
  return d + 'Z';
}

function gearSVG(R, n, depth, ratio, spokes) {
  let s = `<g class="gear-spin" data-ratio="${ratio}">`;
  s += `<path d="${gearPath(R, n, depth)}" fill="url(#gear-metal)" stroke="#141A24" stroke-width="3"/>`;
  s += `<circle r="${f1(R * 0.62)}" fill="url(#gear-dark)"/>`;
  for (let k = 0; k < spokes; k++) {
    const a = (k / spokes) * 360;
    s += `<rect x="${f1(-R * 0.08)}" y="${f1(-R * 0.6)}" width="${f1(R * 0.16)}" height="${f1(R * 0.6)}" fill="#7F8DA3" transform="rotate(${a})"/>`;
  }
  s += `<circle r="${f1(R * 0.24)}" fill="#A9B6C8" stroke="#2A3442" stroke-width="2"/><circle r="${f1(R * 0.09)}" fill="#141A24"/>`;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    s += `<circle cx="${f1(Math.cos(a) * R * 0.44)}" cy="${f1(Math.sin(a) * R * 0.44)}" r="${f1(R * 0.035 + 1)}" fill="#1B222E"/>`;
  }
  s += `<path d="M${f1(-R * 0.75)} ${f1(-R * 0.3)} A${f1(R * 0.8)} ${f1(R * 0.8)} 0 0 1 ${f1(R * 0.2)} ${f1(-R * 0.78)}" stroke="#E6F4FF" stroke-width="3" fill="none" opacity="0.45" stroke-linecap="round"/>`;
  return s + '</g>';
}

/* ----------------------------- Kalabalık figürü ----------------------------- */
const CF_COAT = 'M-34 -918 C-96 -912 -138 -884 -144 -836 C-150 -760 -128 -690 -120 -620 C-112 -560 -116 -500 -124 -440 L-142 -236 C-60 -222 60 -222 132 -240 L104 -440 C96 -520 92 -580 102 -650 C114 -740 120 -820 100 -866 C84 -902 40 -920 -34 -918 Z';
const CF_SHADE = 'M-34 -918 C-96 -912 -138 -884 -144 -836 C-150 -760 -128 -690 -120 -620 C-112 -560 -116 -500 -124 -440 L-142 -236 C-110 -230 -80 -228 -50 -228 L-40 -440 C-36 -560 -50 -700 -60 -820 C-62 -880 -50 -910 -34 -918 Z';
const CF_RIM = 'M100 -866 C120 -820 114 -740 102 -650 C92 -580 96 -520 104 -440 L132 -240';
const CF_BACKRIM = 'M-144 -836 C-150 -760 -128 -690 -120 -620 C-112 -560 -116 -500 -124 -440 L-142 -236';

function screenHeadSVG(id, rng) {
  let bars = '';
  for (let set = 0; set < 2; set++) {
    for (let i = 0; i < 8; i++) {
      const w = 60 + Math.floor(rng() * 90), y = -140 + i * 22 + set * 176;
      const avatar = rng() < 0.3;
      if (avatar) bars += `<circle cx="-70" cy="${y + 5}" r="7" fill="#E8FDFF" opacity="0.8"/>`;
      bars += `<rect x="${avatar ? -56 : -76}" y="${y}" width="${w}" height="10" rx="5" fill="${rng() < 0.25 ? '#0A4E64' : '#E8FDFF'}" opacity="${(0.55 + rng() * 0.35).toFixed(2)}"/>`;
    }
  }
  return `<g class="cf-screen-head">
    <path d="M-16 8 L-12 -26 L16 -26 L20 8 Z" fill="#0B1019"/>
    <g class="cf-tilt">
      <rect class="cf-screen-cast" x="-210" y="-250" width="420" height="320" rx="160" fill="url(#screen-cast)"/>
      <rect x="-100" y="-162" width="200" height="142" rx="16" fill="#131A26" stroke="#2C3747" stroke-width="3"/>
      <rect class="cf-screen-face" x="-90" y="-152" width="180" height="122" rx="9" fill="url(#screen-grad)" filter="url(#glow-neon-cold)"/>
      <clipPath id="clip-${id}"><rect x="-88" y="-150" width="176" height="118" rx="8"/></clipPath>
      <g clip-path="url(#clip-${id})"><g class="cf-scroll">${bars}</g></g>
      <rect class="cf-screen-off" x="-90" y="-152" width="180" height="122" rx="9" fill="#04070C" opacity="0"/>
      <path d="M-86 -146 L60 -146" stroke="#FFFFFF" stroke-width="3" opacity="0.25" stroke-linecap="round"/>
      <circle class="notif-dot" cx="78" cy="-146" r="14" fill="#FF3B5C"/>
      <circle class="notif-hl" cx="74" cy="-150" r="4" fill="#FFD0D8" opacity="0.85"/>
    </g>
  </g>`;
}

function gearHeadSVG() {
  return `<g class="cf-gear-head">
    <path d="M-14 8 L-11 -26 L14 -26 L17 8 Z" fill="#0B1019"/>
    <g class="cf-tilt">
      <g transform="translate(-58 -52)">${gearSVG(40, 8, 11, -2.1, 4)}</g>
      <g transform="translate(78 -70)">${gearSVG(50, 9, 13, -1.6, 5)}</g>
      <g transform="translate(4 -132)">${gearSVG(88, 14, 17, 1, 6)}</g>
    </g>
  </g>`;
}

function crowdFigureSVG(id, o, rng) {
  const head = o.type === 'screen' ? screenHeadSVG(id, rng) : gearHeadSVG();
  return `<g class="crowd-figure" id="${id}" data-type="${o.type}">
   <g class="cf-pos">
    <ellipse cx="0" cy="6" rx="${f1(170 * o.s)}" ry="${f1(22 * o.s)}" fill="#01030A" opacity="0.55"/>
    <g class="cf-scale" transform="scale(${f1(o.facing * o.s * 100) / 100} ${o.s})">
     <g class="cf-bob">
      <g class="cf-leg-b"><path d="M-30 -470 L24 -470 L18 -42 L-16 -42 Z" fill="#080C14"/><path d="M-24 -48 L22 -48 C52 -44 72 -32 76 -14 L76 0 L-26 0 Z" fill="#03060B"/></g>
      <g class="cf-arm-b"><path d="M-40 -880 C-6 -884 22 -866 26 -820 L30 -520 C26 -500 -14 -500 -16 -520 L-34 -830 Z" fill="#0F141E"/><ellipse cx="6" cy="-492" rx="24" ry="30" fill="#080B11"/></g>
      <g class="cf-leg-f"><path d="M-28 -470 L26 -470 L20 -42 L-14 -42 Z" fill="#0D121C"/><path d="M-22 -48 L24 -48 C54 -44 74 -32 78 -14 L78 0 L-24 0 Z" fill="#05080E"/><path d="M-20 -3 L76 -3" stroke="#2C3E56" stroke-width="3" opacity="0.6"/></g>
      <path class="cf-coat" d="${CF_COAT}" fill="url(#${o.coat})"/>
      <path d="${CF_SHADE}" fill="#000" opacity="0.32"/>
      <path d="M-46 -920 C-34 -966 24 -972 50 -930 L64 -876 C30 -896 -14 -900 -50 -878 Z" fill="#0F151F"/>
      <path d="M-122 -566 L100 -590 L102 -560 L-118 -536 Z" fill="#141B27"/>
      <rect x="40" y="-590" width="26" height="30" rx="4" fill="none" stroke="#56677F" stroke-width="3"/>
      <path d="M72 -860 C80 -700 82 -500 90 -250" stroke="#0B1018" stroke-width="3" fill="none"/>
      <path d="M18 -470 L92 -478 L94 -458 L20 -450 Z" fill="#141B27"/>
      <path class="cf-rim" d="${CF_RIM}" stroke="#7FE6F7" stroke-width="5" fill="none" opacity="0.35" stroke-linecap="round"/>
      <path class="cf-warm-rim" d="${CF_BACKRIM}" stroke="#FFC27A" stroke-width="7" fill="none" opacity="0" stroke-linecap="round"/>
      <g class="cf-arm-f"><path d="M-40 -880 C-6 -884 22 -866 26 -820 L30 -520 C26 -500 -14 -500 -16 -520 L-34 -830 Z" fill="url(#${o.coat})"/><path d="M-16 -520 C-14 -500 26 -500 30 -520 L31 -540 C20 -530 -6 -530 -17 -540 Z" fill="#0A0E15"/><ellipse cx="7" cy="-492" rx="25" ry="31" fill="#0B1018"/><path d="M26 -820 L30 -540" stroke="#7FE6F7" stroke-width="3" opacity="0.22"/></g>
      <g class="cf-head" transform="translate(6 -914)">${head}</g>
     </g>
    </g>
   </g>
  </g>`;
}

/* ------------------------------ Kahraman kuş ------------------------------ */
const HERO_NEAT = {
  wingF: [[-12, -6], [2, -6], [16, -6]],
  body: [
    [[-18, -4], [-72, -38], [-38, 8]],
    [[-38, 0], [42, 0], [0, 18]],
    [[-38, 0], [0, -15], [42, 0]],
    [[20, -4], [62, -48], [34, 6]],
    [[62, -48], [80, -42], [55, -32]],
  ],
  wingN: [[-16, -4], [1, -4], [18, -4]],
};
const HERO_TONES_BODY = [1, 2, 0, 1, 0];

/* --------------------------- Makro kuş geometrisi --------------------------- */
const MB = {
  body: { top: [0, -75], right: [40, 0], bottom: [0, 105], left: [-40, 0], center: [0, 10] },
  neck: [[-14, -58], [14, -58], [12, -170]],
  head: [[12, -170], [54, -186], [0, -148]],
  tail: [[[-24, 64], [0, 96], [-8, 196]], [[24, 64], [0, 96], [-8, 196]]],
  wingStraight: { B1: [-26, -44], B2: [-38, 26], T1: [-272, -150], T2: [-240, -66], M: [-145, -70] },
  wingCrumpleL: { B1: [-30, -36], B2: [-34, 24], T1: [-74, 70], T2: [-40, 100], M: [-86, 18] },
  wingCrumpleR: { B1: [-28, -34], B2: [-38, 22], T1: [-82, 56], T2: [-46, 94], M: [-92, 6] },
  bodyCrumple: { top: [-6, -34], right: [38, 16], bottom: [12, 72], left: [-42, 12], center: [2, 18], neckTip: [56, -56], headA: [56, -56], headB: [76, -40], headC: [38, -36] },
};
const MPAL = {
  gray: ['#8A93A0', '#6B7280', '#4B5563', '#374151'],
  ember: ['#FFC062', '#FF9A45', '#FF7B29', '#D9542A'],
  gold: ['#FFF4D6', '#FFE08A', '#FFC24A', '#F4A261'],
};
function macroCol(tone, ig) {
  if (ig <= 0.5) return mixHex(MPAL.gray[tone], MPAL.ember[tone], ig / 0.5);
  return mixHex(MPAL.ember[tone], MPAL.gold[tone], (ig - 0.5) / 0.5);
}

const Rig = {
  build(story) {
    this.story = story;
    const rng = mulberry32(31337);
    this._buildCity(rng);
    this._buildCeiling();
    this._buildPillars();
    this._buildBeamsAndRays();
    this._buildFloor();
    this._buildFarCrowd(rng);
    this._buildCrowd(rng);
    this._buildHero();
    this._buildMacro(rng);
    this._cache();
  },

  _buildCity(rng) {
    let s = '';
    for (let i = 0; i < 26; i++) {
      const x = -1000 + i * 125 + rng() * 60, w = 90 + rng() * 140;
      const top = 260 + rng() * 820;
      const near = rng();
      const fill = near > 0.5 ? '#0B1526' : '#0A1220';
      s += `<rect x="${f1(x)}" y="${f1(top)}" width="${f1(w)}" height="${f1(1420 - top)}" fill="${fill}"/>`;
      if (rng() < 0.4) s += `<rect x="${f1(x + w * 0.4)}" y="${f1(top - 60 - rng() * 80)}" width="${f1(w * 0.2)}" height="90" fill="${fill}"/>`;
      const cols = Math.floor(w / 22), rows = Math.floor((1400 - top) / 34);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const v = rng();
        if (v < 0.16) s += `<rect x="${f1(x + 8 + c * 22)}" y="${f1(top + 14 + r * 34)}" width="8" height="12" fill="${v < 0.12 ? '#5FD7F0' : '#FFD9A0'}" opacity="${v < 0.12 ? 0.28 : 0.18}"/>`;
      }
    }
    $('bg-city').innerHTML = s;
  },

  _buildCeiling() {
    let s = `<rect x="-1500" y="-420" width="4080" height="462" fill="#05080F"/>`;
    s += `<rect x="-1500" y="30" width="4080" height="16" fill="#111A2A"/>`;
    for (let x = -1500; x < 2600; x += 120) {
      s += `<path d="M${x} -40 L${x + 60} 30 L${x + 120} -40" stroke="#1A2638" stroke-width="5" fill="none"/>`;
    }
    s += `<rect x="-1500" y="-48" width="4080" height="10" fill="#141F31"/>`;
    [-380, 20, 360, 700, 1040, 1420].forEach((x) => {
      s += `<ellipse cx="${x + 100}" cy="62" rx="210" ry="46" fill="url(#screen-cast)" opacity="0.9"/>`;
      s += `<rect class="tube" x="${x}" y="46" width="200" height="11" rx="5" fill="#E4FBFF"/>`;
    });
    $('cold-ceiling').innerHTML = s;
  },

  _buildPillars() {
    let s = '';
    [[-280, 150], [20, 118], [236, 92], [842, 92], [1046, 118], [1330, 150]].forEach(([x, w]) => {
      s += `<g><rect x="${x}" y="-60" width="${w}" height="1470" fill="url(#pillar-grad)"/>`;
      s += `<rect x="${x - 10}" y="44" width="${w + 20}" height="26" fill="#0D1524"/>`;
      s += `<rect x="${x - 12}" y="1370" width="${w + 24}" height="30" fill="#0A111D"/>`;
      s += `<rect x="${x + w * 0.62}" y="70" width="3" height="1300" fill="#2E4A6A" opacity="0.5"/>`;
      s += `<rect class="pillar-warm" x="${x}" y="-60" width="${w}" height="1470" fill="url(#pillar-warm)" opacity="0"/></g>`;
    });
    $('bg-pillars').innerHTML = s;
  },

  _buildBeamsAndRays() {
    let s = '';
    [[120, 210], [460, 220], [800, 210]].forEach(([x, bw]) => {
      const cx = x + 100;
      s += `<path d="M${cx - 70} 58 L${cx + 70} 58 L${cx + bw + 40} 1460 L${cx - bw - 40} 1460 Z" fill="url(#beam-grad)" opacity="0.85"/>`;
      s += `<ellipse cx="${cx}" cy="1470" rx="${bw + 80}" ry="40" fill="#6FD3EA" opacity="0.07"/>`;
    });
    $('cold-beams').innerHTML = s;
    let r = '';
    const rays = [[-560, 220], [-260, 260], [60, 300], [380, 340], [720, 300], [1060, 260], [1360, 230], [1660, 210]];
    rays.forEach(([bx, bw], i) => {
      const tx = 540 + (bx - 540) * 0.08;
      r += `<path class="god-ray" data-i="${i}" d="M${tx - 22} -1500 L${tx + 22} -1500 L${bx + bw / 2} 1650 L${bx - bw / 2} 1650 Z" fill="url(#ray-grad)"/>`;
    });
    $('warm-god-rays').innerHTML = r;
  },

  _buildFloor() {
    let s = '';
    for (let k = -14; k <= 14; k++) s += `<path d="M${540 + k * 46} 1398 L${540 + k * 520} 2900"/>`;
    let y = 1410, gap = 12;
    while (y < 2600) { s += `<path d="M-1500 ${f1(y)} L2580 ${f1(y)}"/>`; y += gap; gap *= 1.32; }
    $('floor-lines').innerHTML = s;
    let rf = '';
    [220, 560, 900].forEach((x) => { rf += `<rect x="${x - 60}" y="1400" width="120" height="420" fill="#38E8FF" opacity="0.05"/>`; });
    $('floor-reflections').innerHTML = rf;
  },

  _buildFarCrowd(rng) {
    let s = '';
    for (let row = 0; row < 2; row++) {
      s += `<g class="far-row" data-dir="${row ? -1 : 1}">`;
      for (let i = 0; i < 40; i++) {
        const x = -1300 + i * 100 + rng() * 40;
        const h = 150 + rng() * 50, y = 1404 + row * 10;
        const w = 34 + rng() * 10;
        s += `<path d="M${f1(x - w / 2)} ${y} L${f1(x - w / 2 + 4)} ${f1(y - h * 0.78)} Q${f1(x)} ${f1(y - h * 0.86)} ${f1(x + w / 2 - 4)} ${f1(y - h * 0.78)} L${f1(x + w / 2)} ${y} Z" fill="${row ? '#0A111E' : '#0C1524'}"/>`;
        if (rng() < 0.55) s += `<rect x="${f1(x - 12)}" y="${f1(y - h)}" width="24" height="17" rx="3" fill="#38E8FF" opacity="${(0.35 + rng() * 0.4).toFixed(2)}"/>`;
        else s += `<circle cx="${f1(x)}" cy="${f1(y - h + 8)}" r="12" fill="#3A4558" stroke="#56647A" stroke-width="2" stroke-dasharray="4 3"/>`;
      }
      s += '</g>';
    }
    $('far-crowd').innerHTML = s;
  },

  _buildCrowd(rng) {
    const S = this.story;
    let back = '', front = '';
    S.crowdBack.forEach((o, i) => { back += crowdFigureSVG(`crowd-b${i}`, o, rng); });
    S.crowdFront.forEach((o, i) => { front += crowdFigureSVG(`crowd-f${i}`, o, rng); });
    $('layer-crowd-back').innerHTML = back;
    $('layer-crowd-front').innerHTML = front;
  },

  _buildHero() {
    /* buruşuk kağıt topu: her yüzey merkeze yakın, dolgun bir üçgen */
    const r = mulberry32(555);
    const cr = [];
    for (let f = 0; f < 9; f++) {
      const ca = r() * TAU, cr0 = 4 + r() * 12;
      const cx = Math.cos(ca) * cr0 * 1.25, cy = Math.sin(ca) * cr0 * 0.8 - 8;
      const a0 = r() * TAU;
      for (let k = 0; k < 3; k++) {
        const a = a0 + k * (TAU / 3) + (r() - 0.5) * 0.9, rad = 12 + r() * 13;
        cr.push([cx + Math.cos(a) * rad * 1.15, cy + Math.sin(a) * rad * 0.85]);
      }
    }
    this.heroCrumple = cr;
  },

  _buildMacro(rng) {
    /* bokeh */
    let b = '';
    this.bokeh = [];
    for (let i = 0; i < 18; i++) {
      const o = { x: -100 + rng() * 1280, y: -300 + rng() * 2000, r: 26 + rng() * 120, a: 0.12 + rng() * 0.3, p: rng() * TAU };
      this.bokeh.push(o);
      b += `<circle cx="${f1(o.x)}" cy="${f1(o.y)}" r="${f1(o.r)}" fill="url(#bokeh-grad)" opacity="${o.a.toFixed(2)}"/>`;
    }
    $('macro-bokeh').innerHTML = b;

    /* parmak çizimi: omurga + kalınlık, eklem kırışıkları, tırnak ya da parmak yastığı */
    const fingerSVG = (f) => {
      let s = `<path d="${limbPath(f.sp, f.w.map((w) => w + 5))}" fill="#5E3424"/>`;
      s += `<path d="${limbPath(f.sp, f.w)}" fill="url(#mskin-grad)"/>`;
      const n = f.sp.length, a = f.sp[n - 2], b = f.sp[n - 1];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) / DEG;
      const nx = lerp(a[0], b[0], 0.7), ny = lerp(a[1], b[1], 0.7);
      if (f.nail) s += `<ellipse cx="${f1(nx)}" cy="${f1(ny)}" rx="${f1(f.w[n - 1] * 0.34)}" ry="${f1(f.w[n - 1] * 0.27)}" fill="#EBC6AA" stroke="#B98468" stroke-width="1.5" transform="rotate(${f1(ang)} ${f1(nx)} ${f1(ny)})"/>`;
      else s += `<ellipse cx="${f1(nx)}" cy="${f1(ny)}" rx="${f1(f.w[n - 1] * 0.3)}" ry="${f1(f.w[n - 1] * 0.36)}" fill="#F0BE98" opacity="0.55" transform="rotate(${f1(ang)} ${f1(nx)} ${f1(ny)})"/>`;
      for (let k = 1; k < n - 1; k++) {
        const p = f.sp[k], q = f.sp[k + 1], o = f.sp[k - 1];
        const dx = q[0] - o[0], dy = q[1] - o[1], L = Math.hypot(dx, dy) || 1;
        const px = -dy / L, py = dx / L, hw = f.w[k] * 0.36;
        for (let j = 0; j < 2; j++) {
          const off = (j - 0.5) * 6;
          s += `<path d="M${f1(p[0] - px * hw + dx / L * off)} ${f1(p[1] - py * hw + dy / L * off)} Q${f1(p[0] + dx / L * (off + 4))} ${f1(p[1] + dy / L * (off + 4))} ${f1(p[0] + px * hw + dx / L * off)} ${f1(p[1] + py * hw + dy / L * off)}" stroke="#8E5A40" stroke-width="1.8" fill="none" opacity="0.55"/>`;
        }
      }
      const hl = f.sp.map((p) => [p[0] - (f.hl || 7), p[1]]);
      s += `<path d="M${f1(hl[0][0])} ${f1(hl[0][1])}${crSegs(hl)}" stroke="#F6CBA6" stroke-width="3" fill="none" opacity="0.4" stroke-linecap="round"/>`;
      return s;
    };
    this.fingerSVG = fingerSVG;

    /* avuç içi + arka parmaklar (kuşun arkasında kalan kısım) */
    const backFingers = [
      { sp: [[334, 1336], [330, 1270], [328, 1205], [332, 1150]], w: [50, 46, 42, 36] },
      { sp: [[386, 1340], [388, 1280], [390, 1222], [394, 1174]], w: [47, 43, 39, 33] },
      { sp: [[434, 1352], [440, 1302], [446, 1255], [452, 1218]], w: [40, 36, 32, 27] },
    ];
    let palm = backFingers.slice().reverse().map(fingerSVG).join('');
    palm += `<path d="M206 1640 C196 1520 222 1392 262 1338 C300 1322 400 1318 452 1336 C500 1356 534 1404 540 1470 L542 1560 C520 1640 460 1690 400 1700 C320 1712 230 1700 206 1640 Z" fill="url(#mskin-grad)"/>`;
    palm += `<ellipse cx="400" cy="1470" rx="170" ry="120" fill="url(#palm-hollow)" opacity="0.5"/>`;
    palm += `<path d="M268 1398 C330 1376 420 1382 500 1420 M262 1430 C320 1416 400 1424 470 1454 M252 1474 C300 1524 360 1562 432 1580" stroke="#7A4A36" stroke-width="2.6" fill="none" opacity="0.5" stroke-linecap="round"/>`;
    $('macro-palm-l').innerHTML = palm;
    $('macro-palm-r').innerHTML = palm;
    $('macro-palm-r').setAttribute('transform', 'translate(1080 0) scale(-1 1)');

    /* el önü: önkol, örgü kol ağzı, avuç topuğu; işaret parmağı ve başparmak canlı */
    let front = '';
    front += `<path d="${limbPath([[120, 2080], [190, 1840], [250, 1660]], [190, 175, 165])}" fill="url(#mskin-grad)"/>`;
    front += `<path d="M206 1588 C240 1650 350 1660 440 1630 C500 1606 532 1560 540 1500 L542 1548 C530 1610 480 1660 420 1684 C320 1716 230 1700 196 1640 Z" fill="url(#mskin-grad)"/>`;
    front += `<path d="M210 1596 C250 1648 350 1656 440 1626 C496 1604 528 1560 538 1505" stroke="#F6CBA6" stroke-width="4" fill="none" opacity="0.6" stroke-linecap="round"/>`;
    front += `<path d="M236 1690 C300 1712 380 1704 440 1680" stroke="#8E5A40" stroke-width="2.4" fill="none" opacity="0.45"/>`;
    front += `<ellipse cx="330" cy="1672" rx="6" ry="4" fill="#7A4630" opacity="0.35"/><ellipse cx="372" cy="1666" rx="4" ry="3" fill="#7A4630" opacity="0.35"/>`;
    front += `<path d="${limbPath([[50, 2250], [150, 1960], [222, 1790]], [290, 270, 250])}" fill="url(#knit-grad)"/>`;
    for (let k = 0; k < 9; k++) {
      const u = k / 8;
      const x0 = lerp(-60, 110, u), y0 = lerp(2190, 1890, u);
      front += `<path d="M${f1(x0)} ${f1(y0)} L${f1(x0 + 110)} ${f1(y0 - 200)}" stroke="#1E140F" stroke-width="5" opacity="0.5"/>`;
    }
    front += `<path d="M96 1858 C150 1806 220 1780 330 1792" stroke="#5A4232" stroke-width="18" fill="none" stroke-linecap="round" opacity="0.9"/>`;
    front += `<g class="m-thumb"></g><g class="m-index"></g>`;
    $('macro-hand-l').innerHTML = front;
    $('macro-hand-r').innerHTML = front;
    $('macro-hand-r').setAttribute('transform', 'translate(1080 0) scale(-1 1)');

    /* makro kuş yüzeyleri */
    const poly = (n, cls) => Array.from({ length: n }, () => `<polygon class="${cls}"/>`).join('');
    $('macro-wing-l').innerHTML = poly(4, 'mw');
    $('macro-wing-r').innerHTML = poly(4, 'mw');
    $('macro-body').innerHTML = poly(9, 'mb');
    let veins = '';
    for (let i = 0; i < 10; i++) veins += `<path pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/>`;
    $('macro-gold-veins').innerHTML = veins;
    let creases = '';
    for (let i = 0; i < 10; i++) creases += '<path/>';
    $('macro-creases').innerHTML = creases;
    this.macroJit = Array.from({ length: 40 }, () => [(rng() - 0.5) * 26, (rng() - 0.5) * 26]);
  },

  _cache() {
    this.el = {
      camera: $('camera-rig'),
      crowd: [...document.querySelectorAll('.crowd-figure')].map((g) => ({
        g, pos: g.querySelector('.cf-pos'), bob: g.querySelector('.cf-bob'),
        legF: g.querySelector('.cf-leg-f'), legB: g.querySelector('.cf-leg-b'),
        armF: g.querySelector('.cf-arm-f'), armB: g.querySelector('.cf-arm-b'),
        gears: [...g.querySelectorAll('.gear-spin')].map((e) => ({ e, ratio: parseFloat(e.dataset.ratio) })),
        scroll: g.querySelector('.cf-scroll'), dot: g.querySelector('.notif-dot'), dotHl: g.querySelector('.notif-hl'),
        off: g.querySelector('.cf-screen-off'), cast: g.querySelector('.cf-screen-cast'), face: g.querySelector('.cf-screen-face'),
        tilt: g.querySelector('.cf-tilt'), rim: g.querySelector('.cf-rim'), warmRim: g.querySelector('.cf-warm-rim'),
      })),
      farRows: [...document.querySelectorAll('.far-row')],
      beams: $('cold-beams'), ceiling: $('cold-ceiling'), tubes: [...document.querySelectorAll('#cold-ceiling .tube')],
      pillarWarm: [...document.querySelectorAll('.pillar-warm')], floorWarm: $('floor-warm'), sun: $('sky-sun'),
      rays: [...document.querySelectorAll('.god-ray')],
      gradeCold: $('grade-cold'), gradeWarm: $('grade-warm'), mound: $('dead-birds-mound'), haze: $('crowd-haze'),
      p: {
        body: $('protag-body'), head: $('protag-head'), features: $('protag-features'), hairF: $('protag-hair-front'), ears: $('protag-ears'),
        armR: $('protag-arm-r'), armL: $('protag-arm-l'), fingers: $('protag-fingers-r'), pupils: $('protag-pupils'),
        lidL: $('protag-lid-l'), lidR: $('protag-lid-r'), lowL: $('protag-lowlid-l'), lowR: $('protag-lowlid-r'), lashL: $('protag-lash-l'), lashR: $('protag-lash-r'),
        browL: $('protag-brows-l'), browR: $('protag-brows-r'), mouth: $('protag-mouth'), nose: $('protag-nose'),
        tear: $('protag-tear'), tearDrop: $('protag-tear-drop'), tearTrail: $('protag-tear-trail'),
        sparkle: $('protag-eye-sparkle'), sparkleL: $('sparkle-l'), sparkleR: $('sparkle-r'),
        cold: $('protag-cold-tint'), warm: $('protag-warm-light'), tints: [...document.querySelectorAll('#char-protagonist .tint-part')],
        warms: [...document.querySelectorAll('#char-protagonist .warm-part')], whole: $('char-protagonist'),
      },
      l: {
        upper: $('listener-upper'), head: $('listener-head'), lid: $('listener-eye-lid'), iris: $('listener-iris'), smile: $('listener-smile'),
        brow: $('listener-brow'), arm: $('listener-arm'), handsUp: $('listener-hands-up'), shadow: $('listener-shadow'), halo: $('listener-warm-halo'),
      },
      hero: {
        g: $('hero-origami-bird'), glow: $('hero-bird-glow'), shape: $('hero-bird-shape'),
        wingF: [...$('hero-bird-wing-l').children], body: [...$('hero-bird-body').children], wingN: [...$('hero-bird-wing-r').children],
        cracks: $('hero-bird-cracks-gold'), crackLines: [...$('hero-bird-cracks-gold').children],
      },
      m: {
        scene: $('macro-hands-scene'), cam: $('macro-cam'), lift: $('macro-lift'), birdWrap: $('macro-bird-wrap'), bird: $('macro-bird'),
        wingL: [...$('macro-wing-l').children], wingR: [...$('macro-wing-r').children], body: [...$('macro-body').children],
        veins: [...$('macro-gold-veins').children], creases: [...$('macro-creases').children], veinsG: $('macro-gold-veins'),
        lips: $('macro-lips'), breath: $('macro-breath-glow'), breathCore: $('macro-breath-core'), shadow: $('macro-bird-shadow'),
        bokeh: [...$('macro-bokeh').children],
        idxL: document.querySelector('#macro-hand-l .m-index'), thL: document.querySelector('#macro-hand-l .m-thumb'),
        idxR: document.querySelector('#macro-hand-r .m-index'), thR: document.querySelector('#macro-hand-r .m-thumb'),
        handL: $('macro-hand-l'), handR: $('macro-hand-r'),
      },
    };
    this._last = {};
  },

  /* DOM yazımını azaltan küçük önbellek */
  _set(el, attr, val) {
    const k = el.__k || (el.__k = {});
    if (k[attr] === val) return;
    k[attr] = val;
    el.setAttribute(attr, val);
  },

  /* ============================== KAMERA ============================== */
  applyCamera(cam, t) {
    const c = Object.assign({}, cam);
    c.jx = Math.sin(t * 0.37) * 3 + Math.sin(t * 1.13) * 1.2;
    c.jy = Math.sin(t * 0.29 + 1) * 2.6 + Math.sin(t * 0.91) * 1.1;
    c.r = cam.r + Math.sin(t * 0.21) * 0.12;
    const M = camMatrix(c);
    /* #camera-rig 540/960 transform-origin'i ile birleşir: X = O^-1 · M · O */
    const X = [M[0], M[1], M[2], M[3], M[0] * 540 + M[2] * 960 + M[4] - 540, M[1] * 540 + M[3] * 960 + M[5] - 960];
    this.el.camera.style.transform = `matrix(${X.map((v) => v.toFixed(5)).join(',')})`;
    return M;
  },

  /* ============================= KALABALIK ============================= */
  applyCrowd(t, E) {
    const Wt = worldClock(t);
    const S = this.story;
    const all = S.crowdFront.concat(S.crowdBack);
    const ids = S.crowdFront.map((_, i) => `f${i}`).concat(S.crowdBack.map((_, i) => `b${i}`));
    this.el.crowd.forEach((c) => {
      const key = c.g.id.replace('crowd-', '');
      const o = all[ids.indexOf(key)];
      const x = crowdX(o, t);
      const ph = Wt * o.stepRate * Math.PI + o.phase;
      const leg = Math.sin(ph) * 8.5;
      const bob = -Math.abs(Math.cos(ph)) * 7;
      this._set(c.pos, 'transform', `translate(${f1(x)} ${o.feet})`);
      this._set(c.bob, 'transform', `translate(0 ${f1(bob)}) rotate(${f1(Math.sin(ph * 2) * 0.6)} 0 -400)`);
      this._set(c.legF, 'transform', `rotate(${f1(leg)} 0 -470)`);
      this._set(c.legB, 'transform', `rotate(${f1(-leg)} 0 -470)`);
      this._set(c.armF, 'transform', `rotate(${f1(-leg * 0.9)} -6 -860)`);
      this._set(c.armB, 'transform', `rotate(${f1(leg * 0.9)} -6 -860)`);
      for (const gr of c.gears) this._set(gr.e, 'transform', `rotate(${f1((Wt * 46 * gr.ratio + o.phase * 40) % 360)})`);
      const warm = E.warm;
      this._set(c.rim, 'opacity', (0.35 * (1 - warm)).toFixed(3));
      this._set(c.warmRim, 'opacity', (0.75 * warm).toFixed(3));
      if (c.scroll) {
        const sc = (Wt * 34 + o.phase * 50) % 176;
        this._set(c.scroll, 'transform', `translate(0 ${f1(-sc)})`);
        const blink = fract(Wt * 0.9 + o.phase) < 0.55 ? 1 : 0.25;
        const off = E.off[key] || 0;
        const flick = off > 0 && off < 1 ? (Math.sin(t * 61 + o.phase * 9) > 0 ? 1 : 0.3) : 1;
        const on = (1 - off) * flick;
        this._set(c.dot, 'opacity', (blink * on).toFixed(2));
        this._set(c.dotHl, 'opacity', (0.85 * blink * on).toFixed(2));
        this._set(c.off, 'opacity', (1 - on * (1 - 0.25 * warm)).toFixed(3));
        this._set(c.cast, 'opacity', (on * (1 - 0.4 * warm)).toFixed(3));
        const up = E.look[key] || 0;
        this._set(c.tilt, 'transform', `rotate(${f1(-5 - up * 24)} 0 -20)`);
      } else {
        const up = E.look[key] || 0;
        this._set(c.tilt, 'transform', `rotate(${f1(-up * 18)} 0 -20)`);
      }
    });
    this.el.farRows.forEach((g, i) => {
      const dir = i ? -1 : 1;
      this._set(g, 'transform', `translate(${f1(((Wt * 16 * dir) % 100))} 0)`);
    });
  },

  /* ============================== ORTAM ============================== */
  applyEnv(t, E, pileFrac) {
    const el = this.el;
    const flick = 0.92 + 0.08 * Math.sin(t * 2.3) - (fract(t * 0.37) > 0.965 && t < 27 ? 0.35 : 0);
    this._set(el.beams, 'opacity', (E.beams * flick).toFixed(3));
    this._set(el.ceiling, 'opacity', E.ceiling.toFixed(3));
    el.tubes.forEach((tb, i) => this._set(tb, 'opacity', (0.55 + 0.45 * E.beams * (fract(t * 0.53 + i * 0.31) > 0.97 && t < 27 ? 0.3 : 1)).toFixed(2)));
    el.pillarWarm.forEach((p) => this._set(p, 'opacity', (E.warm * 0.85).toFixed(3)));
    this._set(el.floorWarm, 'opacity', (E.warm * 0.5).toFixed(3));
    this._set(el.sun, 'opacity', E.sun.toFixed(3));
    this._set(el.gradeCold, 'opacity', (0.2 * (1 - E.warm)).toFixed(3));
    this._set(el.gradeWarm, 'opacity', (0.32 * E.warm).toFixed(3));
    this._set(el.haze, 'opacity', (1 - 0.6 * E.warm).toFixed(3));
    el.rays.forEach((r, i) => this._set(r, 'transform', `rotate(${f1(Math.sin(t * 0.35 + i) * 1.6)} 540 -1500)`));
    const k = clamp(pileFrac, 0, 1) * (1 - E.melt);
    this._set(el.mound, 'transform', `translate(0 1706) scale(1 ${Math.max(0.001, k * 0.96 + (k > 0 ? 0.04 : 0)).toFixed(4)}) translate(0 -1706)`);
    this._set(el.mound, 'opacity', (0.95 * (1 - E.melt)).toFixed(3));
  },

  /* ============================== KAHRAMAN ============================== */
  applyProtagonist(t, P) {
    const e = this.el.p;
    const slow = 3.3 + P.slump * 1.2;
    const br = Math.sin((t / slow) * TAU);
    const shiver = P.slump * Math.sin(t * 52) * 0.35 * inv(21, 22.5, t) * (t < 37.5 ? 1 : 0);
    const sx = 1 - 0.006 * br - 0.03 * P.slump + 0.01 * P.inhale;
    const sy = 1 + 0.012 * br + 0.035 * P.inhale - 0.045 * P.slump;
    const sink = P.sink * 18;
    this._set(e.body, 'transform', `translate(${f1(shiver)} ${f1(sink + P.flinch * 3)}) rotate(${f1(P.lean)} 0 -110) translate(0 -110) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(0 110)`);
    const headRot = P.headTilt + P.headDown * 16 + P.turn * 4 - P.flinch * 7;
    const headY = P.headDown * 10 + P.slump * 12 - P.inhale * 3;
    this._set(e.head, 'transform', `translate(${f1(P.turn * 3)} ${f1(headY)}) rotate(${f1(headRot)} 0 -290)`);
    const fx = P.turn * 9, fy = P.headDown * 7;
    this._set(e.features, 'transform', `translate(${f1(fx)} ${f1(fy)})`);
    this._set(e.hairF, 'transform', `translate(${f1(P.turn * 5)} 0)`);
    this._set(e.ears, 'transform', `translate(${f1(-P.turn * 4)} 0)`);
    this._set(e.armR, 'transform', `rotate(${f1(P.armR - P.slump * 4)} -50 -256)`);
    this._set(e.armL, 'transform', `rotate(${f1(-P.slump * 6 - P.inhale * 2)} 50 -256)`);
    const open = clamp((P.armR - 20) / 90, 0, 1);
    this._set(e.fingers, 'transform', `translate(-70 -139) scale(1 ${(0.35 + 0.65 * open).toFixed(3)}) translate(70 139)`);

    /* gözler */
    const blink = blinkAt(t, this.story.blinksP);
    const lid = clamp(P.lid + blink * (1 - P.lid), -0.15, 1);
    const ty = -16 + lid * 30;
    const sq = Math.max(0, P.smile) * 5;
    this._set(e.lidL, 'transform', `translate(-21 ${f1(-337 + ty)})`);
    this._set(e.lidR, 'transform', `translate(21 ${f1(-337 + ty)})`);
    this._set(e.lowL, 'transform', `translate(-21 ${f1(-337 + 15 - sq)})`);
    this._set(e.lowR, 'transform', `translate(21 ${f1(-337 + 15 - sq)})`);
    const lashY = Math.max(ty, -15) - 337;
    this._set(e.lashL, 'transform', `translate(-21 ${f1(lashY)})`);
    this._set(e.lashR, 'transform', `translate(21 ${f1(lashY)})`);
    this._set(e.pupils, 'transform', `translate(${f1(P.lookX * 5.5 + P.turn * 1.5)} ${f1(P.lookY * 4.6)})`);

    /* kaşlar */
    const iy = -364 - 5 * P.browUp - 8 * P.browSad + 4 * P.browFrown;
    const oy = -361 - 5 * P.browUp + 3 * P.browSad + 1 * P.browFrown;
    const cy = (iy + oy) / 2 - 4 + P.browSad * 1.5;
    const ix = 9 - 2 * P.browFrown;
    this._set(e.browL, 'd', `M-34 ${f1(oy)} Q-22 ${f1(cy)} ${f1(-ix)} ${f1(iy)}`);
    this._set(e.browR, 'd', `M34 ${f1(oy)} Q22 ${f1(cy)} ${f1(ix)} ${f1(iy)}`);

    /* ağız */
    const open2 = P.mouthOpen;
    const sm = P.smile;
    const w = 13 + 6 * Math.max(0, sm) + 1.5 * open2 - 2 * Math.max(0, -sm);
    const cyM = -297 - 6 * sm;
    const uy = -300 - open2 * 9 + sm * 5;
    const ly = uy + 2.5 + open2 * 24 + Math.max(0, sm) * 7;
    this._set(e.mouth, 'd', `M${f1(-w)} ${f1(cyM)} Q0 ${f1(uy)} ${f1(w)} ${f1(cyM)} Q0 ${f1(ly)} ${f1(-w)} ${f1(cyM)}Z`);

    /* gözyaşı */
    this._set(e.tear, 'opacity', P.tearA.toFixed(3));
    if (P.tearA > 0.001) {
      const keys = [[0, -25, -322], [0.35, -31, -308], [0.7, -35, -292], [1, -32, -276]];
      const p = pathAt(keys, P.tearT);
      this._set(e.tearDrop, 'transform', `translate(${f1(p[0])} ${f1(p[1])}) scale(${(0.85 + 0.25 * P.tearT).toFixed(3)})`);
      let d = 'M-25 -322';
      const steps = Math.max(1, Math.floor(P.tearT * 12));
      for (let i = 1; i <= steps; i++) { const q = pathAt(keys, (i / steps) * P.tearT); d += ` L${f1(q[0])} ${f1(q[1])}`; }
      this._set(e.tearTrail, 'd', d);
    }
    /* göz bebeklerinde dans eden altın ışık */
    const sp = P.sparkle * (0.78 + 0.22 * Math.sin(t * 7.3));
    this._set(e.sparkle, 'opacity', sp.toFixed(3));
    if (sp > 0.01) {
      const rot = (t * 70) % 360, s2 = 0.8 + 0.3 * Math.sin(t * 5.1);
      this._set(e.sparkleL, 'transform', `rotate(${f1(rot)} -19 -336) translate(-19 -336) scale(${s2.toFixed(3)}) translate(19 336)`);
      this._set(e.sparkleR, 'transform', `rotate(${f1(-rot)} 23 -336) translate(23 -336) scale(${s2.toFixed(3)}) translate(-23 336)`);
    }
    /* soğuk / sıcak ışık */
    this._set(e.cold, 'opacity', (P.cold * 0.62).toFixed(3));
    e.tints.forEach((x) => this._set(x, 'opacity', ((x.classList.contains('tint-face') ? 0.5 : 0.62) * P.cold).toFixed(3)));
    this._set(e.warm, 'opacity', (P.warm * 0.85).toFixed(3));
    e.warms.forEach((x) => this._set(x, 'opacity', (P.warm * 0.55).toFixed(3)));
  },

  /* ============================== DİNLEYEN ============================== */
  applyListener(t, L) {
    const e = this.el.l;
    const br = Math.sin((t / 4.6) * TAU);
    this._set(e.upper, 'transform', `rotate(${f1(-L.lean)} 20 -140) translate(0 -140) scale(1 ${(1 + 0.008 * br).toFixed(4)}) translate(0 140)`);
    this._set(e.head, 'transform', `rotate(${f1(L.headDown * 14 - 4 + Math.sin(t * 0.6) * 0.6)} -20 -345)`);
    const blink = blinkAt(t, this.story.blinksL);
    const lid = clamp(L.lid + blink * (1 - L.lid), 0, 1);
    this._set(e.lid, 'd', `M-62 ${f1(-390 + lid * 3)} Q-52 ${f1(-395 + lid * 7)} -42 ${f1(-390 + lid * 3)}`);
    this._set(e.iris, 'opacity', (1 - lid * 0.95).toFixed(3));
    this._set(e.iris, 'transform', `translate(${f1(L.lookX * 2.5)} ${f1(lid * 2)})`);
    const s = L.smile;
    this._set(e.smile, 'd', `M-71 ${f1(-333 - s * 4)} Q${f1(-60)} ${f1(-331 + s * 6)} -49 ${f1(-333 - s * 3)}`);
    this._set(e.brow, 'd', `M-66 ${f1(-400 + L.headDown * 1)} Q-54 ${f1(-408 - s * 1.5)} -40 ${f1(-402 - s * 1)}`);
    this._set(e.arm, 'transform', `rotate(${f1(-L.armReach * 26)} -50 -300) translate(${f1(-L.armReach * 14)} ${f1(L.armReach * 30)})`);
    this._set(e.arm, 'opacity', (1 - L.armUp).toFixed(3));
    this._set(e.handsUp, 'opacity', L.armUp.toFixed(3));
    this._set(e.shadow, 'opacity', L.shadow.toFixed(3));
    this._set(e.halo, 'opacity', L.halo.toFixed(3));
    this._set(e.halo, 'transform', `translate(-40 -250) scale(${L.haloScale.toFixed(4)}) translate(40 250)`);
  },

  /* ============================ KAHRAMAN KUŞ ============================ */
  applyHero(h) {
    const e = this.el.hero;
    if (!h || !h.vis) { this._set(e.g, 'opacity', '0'); return; }
    this._set(e.g, 'opacity', (h.alpha === undefined ? 1 : h.alpha).toFixed(3));
    const rf = (h.rot * h.flip) / DEG;
    this._set(e.g, 'transform', `translate(${f1(h.x)} ${f1(h.y)}) rotate(${f1(rf)}) scale(${(h.s * h.flip).toFixed(4)} ${h.s.toFixed(4)})`);
    this._set(e.glow, 'opacity', (h.glow * 0.85).toFixed(3));
    this._set(e.shape, 'filter', h.glow > 0.25 ? 'url(#glow-ember)' : 'none');
    const cr = this.heroCrumple;
    const c = h.c, amp = h.amp, ph = h.phase;
    const tipF = [-8 + 6 * Math.sin(ph + 0.45), -90 * Math.cos(ph + 0.45) * amp - (1 - amp) * 36];
    const tipN = [-2 + 6 * Math.sin(ph), -100 * Math.cos(ph) * amp - (1 - amp) * 40];
    let vi = 0;
    const P = (q) => { const cv = cr[vi % cr.length]; vi++; return [lerp(q[0], cv[0], c), lerp(q[1], cv[1], c)]; };
    const col = (tone, fi) => {
      const g = h.g, au = h.au;
      const base = mixRgb(PAL_EMBER[tone], PAL_GRAY[(tone + fi) % 4], g);
      const lit = 1 + 0.16 * g;
      return rgbStr(mixRgb([Math.min(255, base[0] * lit), Math.min(255, base[1] * lit), Math.min(255, base[2] * lit)], PAL_GOLD[tone], au));
    };
    const wf = HERO_NEAT.wingF, wn = HERO_NEAT.wingN;
    const fUnder = tipF[1] > 0, nUnder = tipN[1] > 0;
    const pts = {};
    pts.wf0 = [P(wf[0]), P(wf[1]), P(tipF)];
    pts.wf1 = [P(wf[1]), P(wf[2]), P(tipF)];
    this._set(e.wingF[0], 'points', ptsStr(pts.wf0)); this._set(e.wingF[0], 'fill', col(fUnder ? 3 : 2, 0));
    this._set(e.wingF[1], 'points', ptsStr(pts.wf1)); this._set(e.wingF[1], 'fill', col(3, 1));
    HERO_NEAT.body.forEach((tri, i) => {
      const p = tri.map(P);
      pts['b' + i] = p;
      this._set(e.body[i], 'points', ptsStr(p));
      this._set(e.body[i], 'fill', col(HERO_TONES_BODY[i], i + 2));
    });
    pts.wn0 = [P(wn[0]), P(wn[1]), P(tipN)];
    pts.wn1 = [P(wn[1]), P(wn[2]), P(tipN)];
    this._set(e.wingN[0], 'points', ptsStr(pts.wn0)); this._set(e.wingN[0], 'fill', col(nUnder ? 2 : 0, 7));
    this._set(e.wingN[1], 'points', ptsStr(pts.wn1)); this._set(e.wingN[1], 'fill', col(nUnder ? 3 : 1, 8));
    this._set(e.cracks, 'opacity', (h.cracks || 0).toFixed(3));
    if (h.cracks > 0.01) {
      const mid = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
      const L1 = [pts.b1[0], mid(pts.b1[0], pts.b1[1], 0.45), [mid(pts.b1[0], pts.b1[1], 0.55)[0], -4], pts.b1[1]];
      const L2 = [pts.wn0[1], mid(pts.wn0[1], pts.wn0[2], 0.4), [mid(pts.wn0[1], pts.wn0[2], 0.6)[0] + 5, mid(pts.wn0[1], pts.wn0[2], 0.6)[1]], pts.wn0[2]];
      const L3 = [pts.b3[0], mid(pts.b3[0], pts.b3[1], 0.5), pts.b3[1]];
      const L4 = [pts.b0[0], mid(pts.b0[0], pts.b0[1], 0.5), pts.b0[1]];
      [L1, L2, L3, L4].forEach((L, i) => this._set(e.crackLines[i], 'points', ptsStr(L)));
    }
  },

  /* ============================== MAKRO ============================== */
  applyMacro(t, M) {
    const e = this.el.m;
    this._set(e.scene, 'opacity', M.opacity.toFixed(3));
    if (M.opacity < 0.002) return null;
    const s = M.camS, cy = M.camY;
    this._set(e.cam, 'transform', `translate(540 960) scale(${s.toFixed(4)}) translate(-540 ${f1(-960 + cy)})`);
    const lift = M.handsLift * -280;
    this._set(e.lift, 'transform', `translate(0 ${f1(lift)})`);
    e.bokeh.forEach((b, i) => {
      const o = this.bokeh[i];
      this._set(b, 'transform', `translate(${f1(Math.sin(t * 0.3 + o.p) * 22)} ${f1(Math.cos(t * 0.23 + o.p) * 16 - (t - 29) * 6)})`);
    });

    /* kanat geometrisi */
    const wingPts = (pL, crumple, side, flap) => {
      const S = MB.wingStraight, Cc = crumple;
      const out = {};
      const k = Ease.inOutCubic(clamp(pL, 0, 1));
      for (const key of ['B1', 'B2', 'T1', 'T2', 'M']) {
        let p = [lerp(Cc[key][0], S[key][0], k), lerp(Cc[key][1], S[key][1], k)];
        if (key === 'T1' || key === 'T2' || key === 'M') {
          const amt = key === 'M' ? 0.45 : 1;
          p = [p[0] + flap[0] * amt, p[1] + flap[1] * amt];
        }
        out[key] = [p[0] * side, p[1]];
      }
      return out;
    };
    const ph = t * 15;
    const fl = M.flap;
    const flapV = [0, -Math.sin(ph) * 110 * fl - fl * 30];
    const trem = M.tremble;
    const tj = [Math.sin(t * 47) * 2.2 * trem, Math.cos(t * 53) * 2.2 * trem];
    const wl = wingPts(M.wingL, MB.wingCrumpleL, 1, flapV);
    const wr = wingPts(M.wingR, MB.wingCrumpleR, -1, flapV);
    const bc = M.bodyC;
    const B = MB.body, BC = MB.bodyCrumple;
    const bp = (key) => [lerp(B[key][0], BC[key][0], bc), lerp(B[key][1], BC[key][1], bc)];
    const top = bp('top'), right = bp('right'), bottom = bp('bottom'), left = bp('left'), center = bp('center');
    const neckTip = [lerp(MB.neck[2][0], BC.neckTip[0], bc), lerp(MB.neck[2][1], BC.neckTip[1], bc)];
    const hd = [
      neckTip,
      [lerp(MB.head[1][0], BC.headB[0], bc), lerp(MB.head[1][1], BC.headB[1], bc)],
      [lerp(MB.head[2][0], BC.headC[0], bc), lerp(MB.head[2][1], BC.headC[1], bc)],
    ];
    const neck = [[MB.neck[0][0] * (1 - bc * 0.3), MB.neck[0][1] * (1 - bc * 0.3)], [MB.neck[1][0] * (1 - bc * 0.3), MB.neck[1][1] * (1 - bc * 0.3)], neckTip];
    const tl = MB.tail[0].map((p) => [p[0], lerp(p[1], p[1] * 0.75, bc)]);
    const tr = MB.tail[1].map((p) => [p[0], lerp(p[1], p[1] * 0.75, bc)]);
    const J = this.macroJit;
    const jit = (p, i, amt) => [p[0] + J[i][0] * amt + tj[0], p[1] + J[i][1] * amt + tj[1]];
    const ig = M.ignite;

    const wingFacets = (w) => [
      [[w.B1, w.T1, w.M], 0], [[w.M, w.T1, w.T2], 1], [[w.B1, w.M, w.B2], 2], [[w.M, w.T2, w.B2], 3],
    ];
    const lift2 = M.lift;
    const bx = 540 + Math.sin(t * 2.1) * 6 * lift2, byy = 1300 - lift2 * 1450;
    const bs = 1 + lift2 * 0.35;
    this._set(e.birdWrap, 'transform', `translate(${f1(bx)} ${f1(byy)}) rotate(${f1(-lift2 * 8 + Math.sin(t * 6) * 2 * fl)}) scale(${bs.toFixed(4)})`);
    this._set(e.shadow, 'opacity', (0.45 * (1 - lift2)).toFixed(3));
    wingFacets(wl).forEach(([pp, tone], i) => {
      this._set(e.wingL[i], 'points', ptsStr(pp.map((p, k) => jit(p, i * 3 + k, 1 - M.wingL))));
      this._set(e.wingL[i], 'fill', macroCol(tone, ig));
    });
    wingFacets(wr).forEach(([pp, tone], i) => {
      this._set(e.wingR[i], 'points', ptsStr(pp.map((p, k) => jit(p, 12 + i * 3 + k, 1 - M.wingR))));
      this._set(e.wingR[i], 'fill', macroCol(tone === 0 ? 1 : tone === 1 ? 0 : tone, ig));
    });
    const bodyF = [
      [[top, left, center], 1], [[top, center, right], 0], [[left, bottom, center], 2], [[center, bottom, right], 1],
      [neck, 1], [hd, 0], [tl, 2], [tr, 3],
      [[[-10, -70 + bc * 20], [10, -70 + bc * 20], [0, -60]], 3],
    ];
    bodyF.forEach(([pp, tone], i) => {
      this._set(e.body[i], 'points', ptsStr(pp.map((p, k) => jit(p, 24 + ((i * 3 + k) % 16), bc))));
      this._set(e.body[i], 'fill', macroCol(tone, ig));
    });
    /* kırışık ve damar çizgileri */
    const lines = [
      [top, center, bottom],
      [left, center, right],
      [wl.B1, wl.M, wl.T2],
      [wl.M, [lerp(wl.T1[0], wl.T2[0], 0.5), lerp(wl.T1[1], wl.T2[1], 0.5)]],
      [wl.B2, wl.M],
      [wr.B1, wr.M, wr.T2],
      [wr.M, [lerp(wr.T1[0], wr.T2[0], 0.5), lerp(wr.T1[1], wr.T2[1], 0.5)]],
      [wr.B2, wr.M],
      [[0, -58], neckTip],
      [[0, 96], [-8, 196]],
    ];
    lines.forEach((L, i) => {
      const d = 'M' + L.map((p) => `${f1(p[0])} ${f1(p[1])}`).join(' L');
      this._set(e.creases[i], 'd', d);
      this._set(e.veins[i], 'd', d);
      const v = clamp(M.veins * 1.4 - i * 0.04, 0, 1);
      this._set(e.veins[i], 'stroke-dashoffset', (1 - v).toFixed(3));
    });
    this._set(e.veinsG, 'opacity', (M.veins > 0.001 ? 1 : 0).toString());

    /* çimdikleyen parmaklar */
    const wingTipWorld = (w, key) => [540 + w[key][0] * bs, 1300 + w[key][1] * bs];
    const tL = wingTipWorld(wl, 'T1'), sL = wingTipWorld(wl, 'T2');
    const tR = wingTipWorld(wr, 'T1'), sR = wingTipWorld(wr, 'T2');
    this._drawPinch(e.idxL, e.thL, M.pinchL, tL, sL);
    this._drawPinch(e.idxR, e.thR, M.pinchR, [1080 - tR[0], tR[1]], [1080 - sR[0], sR[1]]);

    /* dudaklar ve nefes */
    const pu = M.lips;
    const lw = lerp(62, 28, pu), lh = lerp(10, 24, pu);
    this._set(e.lips, 'd', `M${f1(540 - lw)} -170 Q540 ${f1(-170 - lh * 1.1)} ${f1(540 + lw)} -170 Q540 ${f1(-170 + lh * 1.5)} ${f1(540 - lw)} -170 Z`);
    this._set(e.breath, 'opacity', M.breathGlow.toFixed(3));
    this._set(e.breathCore, 'cy', f1(1300 - 280 * M.handsLift));
    return [s, 0, 0, s, 540 - 540 * s, 960 + s * (-960 + cy)];
  },

  _drawPinch(idxEl, thEl, amt, target, target2) {
    const restIdx = { sp: [[284, 1340], [276, 1272], [270, 1205], [268, 1150]], w: [50, 46, 42, 36] };
    const restTh = { sp: [[234, 1600], [212, 1530], [214, 1466], [234, 1418]], w: [72, 62, 52, 44], nail: true, hl: -8, reach: 0.3 };
    const k = Ease.inOutSine(clamp(amt, 0, 1));
    const tk = `${(k * 1000) | 0}|${f1(target[0])}|${f1(target[1])}`;
    if (idxEl.__tk === tk) return;
    idxEl.__tk = tk;
    /* parmak hedefe doğru kıvrılır; hedef yakınsa kanca gibi yukarı kavis yapar */
    const bend = (rest, tgt) => {
      const sp = rest.sp, b = sp[0];
      const dx = tgt[0] - b[0], dy = tgt[1] - b[1], L = Math.hypot(dx, dy) || 1;
      let px = -dy / L, py = dx / L;
      if (py > 0) { px = -px; py = -py; }
      const bulge = clamp(260 / L, 0.4, 2.2) * 34;
      const out = [b];
      for (let i = 1; i < sp.length; i++) {
        const u = i / (sp.length - 1);
        const q = [lerp(b[0], tgt[0], u) + px * Math.sin(u * Math.PI) * bulge, lerp(b[1], tgt[1], u) + py * Math.sin(u * Math.PI) * bulge];
        const kk = k * (rest.reach === undefined ? 1 : rest.reach);
        out.push([lerp(sp[i][0], q[0], kk), lerp(sp[i][1], q[1], kk)]);
      }
      return { sp: out, w: rest.w, nail: rest.nail, hl: rest.hl };
    };
    idxEl.innerHTML = this.fingerSVG(bend(restIdx, [target[0] + 4, target[1] + 6]));
    thEl.innerHTML = this.fingerSVG(bend(restTh, [target2[0] - 18, target2[1] + 22]));
  },
};

/* göz kırpma zarfı */
function blinkAt(t, list) {
  let v = 0;
  for (const b of list) {
    const d = t - b;
    if (d < 0 || d > 0.17) continue;
    v = Math.max(v, d < 0.07 ? d / 0.07 : 1 - (d - 0.07) / 0.1);
  }
  return v;
}

function crowdX(o, t) {
  return wrap(o.x0 + o.facing * o.speed * worldClock(t), WRAP_LO, WRAP_HI);
}
