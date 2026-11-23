#!/usr/bin/env node
/*
  Yerdeki Kağıt Kuşlar — kare kare render aracı (Playwright + ffmpeg)

  Anahtar kareler:  node render.mjs frames 0,5.8,9.2 [--out dir]
  Tam video:        node render.mjs video [--fps 30] [--workers 4] [--out video.mp4]

  GSAP CDN isteği yerel bir kopyaya yönlendirilir (GSAP_PATH ortam değişkeni
  veya node_modules/gsap/dist/gsap.min.js).
*/
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HTML = path.join(__dirname, 'yerdeki-kagit-kuslar.html');
const args = process.argv.slice(2);
const mode = args[0];
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };

function gsapPath() {
  if (process.env.GSAP_PATH) return process.env.GSAP_PATH;
  try { return require.resolve('gsap/dist/gsap.min.js'); } catch { /* */ }
  throw new Error('GSAP bulunamadı: GSAP_PATH ayarlayın');
}

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await page.route('https://cdnjs.cloudflare.com/**', (route) => route.fulfill({ path: gsapPath(), contentType: 'application/javascript' }));
  await page.goto(pathToFileURL(HTML).href + '?capture');
  await page.waitForFunction(() => window.KK && window.KK.renderFrame);
  return { page, errors };
}

async function frames() {
  const times = (args[1] || '0').split(',').map(Number);
  const out = opt('out', path.join(__dirname, 'preview'));
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser);
  const sorted = [...times].sort((a, b) => a - b);
  let last = 0;
  for (const t of sorted) {
    for (let x = last; x < t; x += 0.1) await page.evaluate((v) => window.KK.renderFrame(v), x);
    await page.evaluate((v) => window.KK.renderFrame(v), t);
    last = t;
    const file = path.join(out, `f_${t.toFixed(2).padStart(5, '0')}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 90 });
    console.log('kare', t, '->', file);
  }
  const dur = await page.evaluate(() => window.KK.duration());
  console.log('masterTimeline.duration() =', dur);
  if (errors.length) console.log('KONSOL:', errors.join('\n'));
  await browser.close();
}

function ffmpeg(argv) {
  const p = spawn('ffmpeg', argv, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', (d) => { err += d; });
  const done = new Promise((res, rej) => p.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg ' + c + '\n' + err.slice(-2000))))));
  return { p, done };
}

async function renderChunk(browser, fps, i0, i1, file) {
  const { page, errors } = await openPage(browser);
  const cdp = await page.context().newCDPSession(page);
  await page.evaluate((t) => window.KK.preroll(t), i0 / fps);
  const enc = ffmpeg(['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '12', '-pix_fmt', 'yuv420p', file]);
  for (let i = i0; i < i1; i++) {
    await page.evaluate((t) => window.KK.renderFrame(t), i / fps);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 94, optimizeForSpeed: true });
    const buf = Buffer.from(shot.data, 'base64');
    if (!enc.p.stdin.write(buf)) await new Promise((r) => enc.p.stdin.once('drain', r));
    if ((i - i0) % 60 === 0) console.log(`  [${path.basename(file)}] ${i}/${i1}`);
  }
  enc.p.stdin.end();
  await enc.done;
  if (errors.length) console.log('KONSOL:', errors.slice(0, 10).join('\n'));
  await page.close();
}

async function video() {
  const fps = Number(opt('fps', 30));
  const workers = Number(opt('workers', 4));
  const out = path.resolve(opt('out', path.join(__dirname, 'yerdeki-kagit-kuslar.mp4')));
  const tmp = fs.mkdtempSync(path.join(path.dirname(out), '.render-'));
  const browser = await chromium.launch();
  const total = Math.round(50 * fps);

  /* ses */
  const { page, errors } = await openPage(browser);
  await page.evaluate(() => window.KK.ready);
  const b64 = await page.evaluate(() => window.KK.wav());
  const wav = path.join(tmp, 'audio.wav');
  fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
  if (errors.length) console.log('KONSOL:', errors.join('\n'));
  await page.close();
  console.log('ses hazır:', wav);

  /* görüntü: paralel parçalar */
  const per = Math.ceil(total / workers);
  const parts = [];
  const jobs = [];
  for (let w = 0; w < workers; w++) {
    const i0 = w * per, i1 = Math.min(total, (w + 1) * per);
    if (i0 >= i1) break;
    const f = path.join(tmp, `part_${w}.mp4`);
    parts.push(f);
    jobs.push(renderChunk(browser, fps, i0, i1, f));
  }
  await Promise.all(jobs);
  await browser.close();
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, parts.map((p) => `file '${p}'`).join('\n'));
  const body = path.join(tmp, 'body.mp4');
  await ffmpeg(['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', body]).done;
  const tmpOut = out.replace(/\.mp4$/, '.tmp.mp4');
  /* tek son kodlama: Instagram uyumlu, GitHub'ın 100 MB sınırının altında */
  await ffmpeg(['-y', '-loglevel', 'error', '-i', body, '-i', wav, '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-maxrate', '10M', '-bufsize', '20M', '-profile:v', 'high', '-level', '4.2',
    '-pix_fmt', 'yuv420p', '-tune', 'animation', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', '-shortest', tmpOut]).done;
  fs.renameSync(tmpOut, out);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('VIDEO:', out);
}

async function audioOnly() {
  const out = path.resolve(opt('out', path.join(__dirname, 'audio.wav')));
  const browser = await chromium.launch();
  const { page, errors } = await openPage(browser);
  const t0 = Date.now();
  await page.evaluate(() => window.KK.ready);
  fs.writeFileSync(out, Buffer.from(await page.evaluate(() => window.KK.wav()), 'base64'));
  console.log('ses:', out, ((Date.now() - t0) / 1000).toFixed(1) + ' sn');
  if (errors.length) console.log('KONSOL:', errors.join('\n'));
  await browser.close();
}

if (mode === 'frames') await frames();
else if (mode === 'audio') await audioOnly();
else if (mode === 'video') await video();
else console.log('kullanım: node render.mjs frames 0,5.8 | video [--fps 30] [--workers 4]');
