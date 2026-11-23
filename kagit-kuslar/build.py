#!/usr/bin/env python3
"""src/ parçalarını tek, bağımsız HTML dosyasında birleştirir."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
JS_ORDER = ["util.js", "fx.js", "audio.js", "rig.js", "story.js", "timeline.js", "main.js"]


def main() -> None:
    tpl = (SRC / "template.html").read_text(encoding="utf-8")
    css = (SRC / "style.css").read_text(encoding="utf-8")
    svg = (SRC / "scene.svg").read_text(encoding="utf-8")
    js = "\n".join((SRC / "js" / name).read_text(encoding="utf-8") for name in JS_ORDER)
    out = tpl.replace("/*__CSS__*/", css).replace("/*__SVG__*/", svg).replace("/*__JS__*/", js)
    target = ROOT / "yerdeki-kagit-kuslar.html"
    target.write_text(out, encoding="utf-8")
    print(f"{target.name}: {len(out) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
