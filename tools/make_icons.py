"""Generate every StreamHub icon from the chosen logo (concept A in make_logo.py).

Needs Pillow, so run it with the build venv's Python:
    python tools/make_icons.py

Writes the web/PWA icons, the Android launcher mipmaps and, through ico(), the
Windows .ico used by desktop/build_exe.py.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_logo import render  # noqa: E402

LOGO = "a"
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
MIPMAPS = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}


def ico(path):
    """Multi-size Windows icon (16 to 256 px)."""
    render(LOGO, 256).save(path, sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])


def main():
    written = []
    for size in (192, 512):
        path = os.path.join(ROOT, "icons", f"icon-{size}.png")
        render(LOGO, size).save(path)
        written.append(path)
    for density, size in MIPMAPS.items():
        folder = os.path.join(ROOT, "android", "app", "src", "main", "res", f"mipmap-{density}")
        os.makedirs(folder, exist_ok=True)
        path = os.path.join(folder, "ic_launcher.png")
        render(LOGO, size).save(path)
        written.append(path)
    print(json.dumps({"success": True, "icons": len(written)}))


if __name__ == "__main__":
    main()
