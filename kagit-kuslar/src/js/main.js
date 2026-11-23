/* ==========================================================================
   Uygulama: perde, kontrol çubuğu, scrubber, H tuşu, A/V senkron döngüsü
   ve temiz kayıt için ?capture modu.
   ========================================================================== */
'use strict';

(function () {
  const CAPTURE = /[?&]capture\b/.test(location.search);
  if (CAPTURE) document.body.classList.add('capture');

  const fx = new OrigamiFXEngine(document.getElementById('fx-canvas'));
  let story = buildStory(fx);
  Rig.build(story);
  let state = makeState();
  let masterTimeline = buildMasterTimeline(story, state);
  const sound = new SoundEngine();

  /* ---------------------------- tek kare ---------------------------- */
  function renderFrame(t) {
    t = clamp(t, 0, DURATION);
    masterTimeline.time(t, false);
    const { cam, P, L, M, E } = state;
    const camM = Rig.applyCamera(cam, t);
    Rig.applyCrowd(t, E);
    Rig.applyEnv(t, E, fx.pileFraction(t));
    Rig.applyProtagonist(t, P);
    Rig.applyListener(t, L);
    Rig.applyHero(heroPose(t, camM));
    const macroM = Rig.applyMacro(t, M);
    fx.render(t, {
      cam: camM,
      worldAlpha: 1 - M.opacity,
      macro: macroM,
      macroAlpha: M.opacity,
      warm: E.warm,
      hero: (tt) => {
        const h = heroPose(tt, camM);
        return h.vis ? { x: h.x, y: h.y, s: h.s, alive: h.alive, gold: h.gold } : null;
      },
    });
    grain(t);
  }

  const grainEl = document.getElementById('grain-overlay');
  function grain(t) {
    const f = Math.floor(t * 24);
    const r = mulberry32(f * 7919 + 13);
    grainEl.style.transform = `translate(${((r() - 0.5) * 3).toFixed(2)}%, ${((r() - 0.5) * 3).toFixed(2)}%)`;
  }

  /* ---------------------- ses: çevrimdışı partisyon ---------------------- */
  const audioReady = sound.renderScore(story).catch((e) => { console.warn('Ses üretilemedi:', e); return null; });

  if (CAPTURE) {
    window.KK = {
      ready: audioReady.then(() => true),
      renderFrame: (t) => { renderFrame(t); return true; },
      preroll: (t) => { for (let x = 0; x <= t; x += 0.05) masterTimeline.time(x, false); renderFrame(t); return true; },
      duration: () => masterTimeline.duration(),
      wav: () => sound.wavBase64(),
    };
    renderFrame(0);
    return;
  }

  /* ============================ ARAYÜZ ============================ */
  const curtain = document.getElementById('curtain');
  const playBtn = document.getElementById('btn-play');
  const replayBtn = document.getElementById('btn-replay');
  const timeEl = document.getElementById('time');
  const scrub = document.getElementById('scrubber');
  const startBtn = document.getElementById('curtain-play');
  let playing = false, t = 0, perfStart = 0, perfOffset = 0, scrubbing = false;

  const fmt = (x) => {
    const s = Math.floor(x + 1e-6);
    return `00:${String(Math.min(50, s)).padStart(2, '0')}`;
  };
  function ui() {
    timeEl.textContent = `${fmt(t)} / 00:50`;
    if (!scrubbing) scrub.value = t.toFixed(2);
    scrub.style.setProperty('--p', `${(t / DURATION) * 100}%`);
    playBtn.dataset.state = playing ? 'pause' : 'play';
    playBtn.setAttribute('aria-label', playing ? 'Duraklat' : 'Oynat');
  }

  function clock() {
    const a = sound.currentTime();
    if (a !== null) return a;
    return perfOffset + (performance.now() - perfStart) / 1000;
  }

  function play(from) {
    t = clamp(from, 0, DURATION);
    if (t >= DURATION - 0.01) t = 0;
    sound.ensureLive();
    sound.play(t);
    perfStart = performance.now();
    perfOffset = t;
    playing = true;
    ui();
  }
  function pause() {
    t = clock();
    sound.stopAll();
    playing = false;
    ui();
  }
  function replay() {
    sound.stopAll();
    fx.reset();
    story = buildStory(fx);
    Rig.story = story;
    state = makeState();
    masterTimeline.kill();
    gsap.set(['#bg-stop-1', '#bg-stop-2', '#bg-stop-3', '#warm-god-rays', '#fade-black'], { clearProps: 'all' });
    masterTimeline = buildMasterTimeline(story, state);
    renderFrame(0);
    play(0);
  }

  function loop() {
    if (playing) {
      t = clock();
      if (t >= DURATION) { t = DURATION; renderFrame(t); sound.stopAll(); playing = false; ui(); }
      else renderFrame(t);
      ui();
    }
    requestAnimationFrame(loop);
  }

  startBtn.disabled = true;
  audioReady.then(() => { startBtn.disabled = false; curtain.classList.add('ready'); });
  startBtn.addEventListener('click', () => {
    curtain.classList.add('gone');
    setTimeout(() => { curtain.style.display = 'none'; }, 420);
    play(0);
  });
  playBtn.addEventListener('click', () => (playing ? pause() : play(t)));
  replayBtn.addEventListener('click', replay);
  scrub.addEventListener('input', () => {
    scrubbing = true;
    t = parseFloat(scrub.value);
    if (playing) { sound.stopAll(); }
    renderFrame(t);
    ui();
  });
  scrub.addEventListener('change', () => {
    scrubbing = false;
    if (playing) play(t);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('clean');
    else if (e.code === 'Space' && curtain.style.display === 'none') { e.preventDefault(); playing ? pause() : play(t); }
  });

  renderFrame(0);
  ui();
  requestAnimationFrame(loop);
})();
