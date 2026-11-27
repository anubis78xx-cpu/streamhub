"""StreamHub logo concepts, drawn with Pillow (run with the build venv's Python).

    python tools/make_logo.py preview <out.png>   -> the 3 concepts side by side
    python tools/make_logo.py render <a|b|c> <size> <out.png>
"""
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter

VIOLET = (124, 92, 255)
PINK = (255, 92, 138)
CYAN = (0, 210, 255)
DARK = (13, 15, 23)
SS = 4  # supersampling factor for smooth edges


def gradient(size, c1, c2, diagonal=True):
    """Linear gradient from top-left (c1) to bottom-right (c2)."""
    small = Image.new("RGB", (256, 256))
    px = small.load()
    for y in range(256):
        for x in range(256):
            t = (x + y) / 510 if diagonal else y / 255
            px[x, y] = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
    return small.resize((size, size), Image.BICUBIC)


def rounded_mask(size, radius, box=None):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle(box or (0, 0, size - 1, size - 1), radius=radius, fill=255)
    return m


def play_mask(size, cx, cy, h, round_px):
    """Play triangle with softened corners (blur + threshold)."""
    m = Image.new("L", (size, size), 0)
    w = h * 0.9
    pts = [(cx - w * 0.38, cy - h / 2), (cx - w * 0.38, cy + h / 2), (cx + w * 0.62, cy)]
    ImageDraw.Draw(m).polygon(pts, fill=255)
    if round_px:
        m = m.filter(ImageFilter.GaussianBlur(round_px)).point(lambda v: 255 if v > 128 else 0)
    return m


def concept_a(S):
    """Dark tile, gradient ring with orbit dots, gradient play: 'all your services around one player'."""
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    img.paste(Image.new("RGB", (S, S), DARK), (0, 0), rounded_mask(S, int(S * 0.22)))
    grad = gradient(S, VIOLET, PINK)
    ring = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(ring)
    m = int(S * 0.17)
    d.ellipse((m, m, S - m, S - m), outline=255, width=int(S * 0.045))
    # Orbit dots: the services gathered by the hub.
    r = S / 2 - m
    for fx, fy in ((0.5, -1), (1, 0.15), (-0.85, 0.55)):
        nx, ny = fx / (fx * fx + fy * fy) ** 0.5, fy / (fx * fx + fy * fy) ** 0.5
        cx, cy, dr = S / 2 + nx * r, S / 2 + ny * r, S * 0.055
        d.ellipse((cx - dr, cy - dr, cx + dr, cy + dr), fill=255)
    glow = ring.filter(ImageFilter.GaussianBlur(S * 0.03))
    img.paste(grad, (0, 0), ImageChops.multiply(glow, Image.new("L", (S, S), 110)))
    img.paste(grad, (0, 0), ring)
    img.paste(grad, (0, 0), play_mask(S, S / 2, S / 2, S * 0.30, S * 0.012))
    return img


def concept_b(S):
    """Gradient tile with three fanned white screens; the front one plays."""
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    img.paste(gradient(S, VIOLET, PINK), (0, 0), rounded_mask(S, int(S * 0.22)))
    w, h = S * 0.50, S * 0.36
    for i, (dx, dy, alpha) in enumerate(((-0.10, -0.12, 90), (-0.05, -0.06, 150), (0.03, 0.02, 255))):
        x0, y0 = S / 2 - w / 2 + dx * S, S / 2 - h / 2 + dy * S + S * 0.04
        layer = Image.new("L", (S, S), 0)
        ImageDraw.Draw(layer).rounded_rectangle((x0, y0, x0 + w, y0 + h), radius=int(S * 0.05), fill=alpha)
        if i == 2:
            shadow = layer.filter(ImageFilter.GaussianBlur(S * 0.03))
            img.paste((40, 10, 60), (int(S * 0.01), int(S * 0.02)), ImageChops.multiply(shadow, Image.new("L", (S, S), 90)))
        img.paste((255, 255, 255), (0, 0), layer)
    cx, cy = S / 2 + 0.03 * S, S / 2 + 0.06 * S
    img.paste(gradient(S, VIOLET, PINK), (0, 0), play_mask(S, cx, cy, S * 0.17, S * 0.008))
    return img


def concept_c(S):
    """Neon: dark tile, glowing cyan-to-pink TV outline with antenna and play."""
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    img.paste(Image.new("RGB", (S, S), (8, 8, 18)), (0, 0), rounded_mask(S, int(S * 0.22)))
    grad = gradient(S, CYAN, PINK)
    shape = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(shape)
    lw = int(S * 0.04)
    box = (S * 0.17, S * 0.33, S * 0.83, S * 0.80)
    d.rounded_rectangle(box, radius=int(S * 0.08), outline=255, width=lw)
    d.line((S * 0.38, S * 0.17, S * 0.5, S * 0.31), fill=255, width=lw)
    d.line((S * 0.62, S * 0.17, S * 0.5, S * 0.31), fill=255, width=lw)
    shape = ImageChops.lighter(shape, play_mask(S, S * 0.5, S * 0.565, S * 0.20, S * 0.01))
    for blur, strength in ((S * 0.06, 120), (S * 0.02, 170)):
        glow = shape.filter(ImageFilter.GaussianBlur(blur))
        img.paste(grad, (0, 0), ImageChops.multiply(glow, Image.new("L", (S, S), strength)))
    img.paste(grad, (0, 0), shape)
    return img


CONCEPTS = {"a": concept_a, "b": concept_b, "c": concept_c}


def render(name, size):
    big = CONCEPTS[name](size * SS)
    return big.resize((size, size), Image.LANCZOS)


def preview(out):
    tile, pad = 300, 40
    sheet = Image.new("RGB", (pad + 3 * (tile + pad), tile + 2 * pad + 50), (235, 236, 242))
    d = ImageDraw.Draw(sheet)
    for i, name in enumerate("abc"):
        x = pad + i * (tile + pad)
        img = render(name, tile)
        sheet.paste(img, (x, pad), img)
        small = render(name, 48)
        sheet.paste(small, (x + tile - 48, pad + tile + 6), small)
        d.text((x, pad + tile + 18), f"Logo {name.upper()}", fill=(30, 30, 40))
    sheet.save(out)


if __name__ == "__main__":
    if sys.argv[1] == "preview":
        preview(sys.argv[2])
    else:
        render(sys.argv[2], int(sys.argv[3])).save(sys.argv[4])
