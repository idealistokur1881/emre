# Yerdeki Kağıt Kuşlar

50 saniyelik, tamamen sözsüz 9:16 (1080×1920) Reels animasyonu. Konusu duyulmak ve gerçekten dinlenmek.

## Dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `yerdeki-kagit-kuslar.html` | Tek dosyalık interaktif animasyon. Tarayıcıda aç, perdedeki ▶'e bas. |
| `../video/yerdeki-kagit-kuslar-1080p.mp4` | Instagram'a yüklenecek sesli video (1080×1920, 60 fps, H.264 + AAC, −14.8 LUFS). |
| `kapak.jpg` | Reels kapak karesi (41. sn, yükselen kuş sürüsü). |
| `src/` | Düzenlenebilir kaynak: `scene.svg`, `style.css`, `js/*.js`. |
| `build.py` | `src/` parçalarını tek HTML'de birleştirir. |
| `render.mjs` | Playwright + ffmpeg ile kare kare video ve ses render'ı. |

## Tarayıcıda oynatma

- **▶ / Boşluk:** oynat / duraklat
- **Başa sar:** her şeyi (SVG, kuşlar, ses) sıfırdan başlatır
- **Zaman çubuğu:** sahneyi anında günceller
- **H:** arayüzü tamamen gizler (temiz ekran kaydı için)

GSAP 3.12.5 cdnjs'ten yüklenir, geri kalan her şey dosyanın içindedir. Harici görsel, ses ya da font kullanılmaz.

## Mimari

- **SVG** (`#camera-rig` altında 4 derinlik katmanı): mekân, kalabalık, kahraman, dinleyen yabancı, kahraman kuş ve makro el sahnesi.
- **Canvas** (`OrigamiFXEngine`): 184 origami kuş ve kıvılcım, nefes ve toz parçacıkları. Her şey zamanın saf fonksiyonudur (`render(t)`). Bu yüzden zaman çubuğu, başa sarma ve kare kare kayıt birebir aynı sonucu verir.
- **GSAP** `masterTimeline`: kamera, oyunculuk (mimik, jest), ışık ve renk senaryosu. Süresi tam 50.0 sn.
- **Web Audio** (`SoundEngine`): çello, 112 BPM çark tıkırtısı, bildirim ping'leri, kağıt foley'i, 27. sn vakum sessizliği, çelesta ve vokal-formant koro (Cm9 → Abmaj7 → Ebmaj9 → Cmaj9). Partisyonun tamamı `OfflineAudioContext` ile örnek hassasiyetinde önceden üretilir, sonra görüntü saatiyle oynatılır. Böylece gezinirken ve başa sararken ses kaymaz, üst üste binmez.

## Yeniden üretme

```bash
python3 build.py                                    # src → yerdeki-kagit-kuslar.html
npm i gsap@3.12.5                                   # render için yerel GSAP (veya GSAP_PATH=...)
node render.mjs frames 5.8,27,37.5,44.8             # anahtar kareler → preview/
node render.mjs audio --out ses.wav                 # yalnızca ses
node render.mjs video --fps 60 --workers 4 --out ../video/yerdeki-kagit-kuslar-1080p.mp4
```

## Paylaşım notu

Önerilen açıklama: *"Bazen insanın dünyasını değiştirmek için kalabalıklar değil; yerden tek bir kuşu eğilip alan bir kişi yeter."*
