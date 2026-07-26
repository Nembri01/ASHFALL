#!/usr/bin/env python
"""ASHFALL store assets generator (Pillow only, no external rasterizer).
Outputs into ../assets:
  icon-1024.png        app icon, opaque (iOS-safe, no alpha)
  icon-foreground.png  Android adaptive foreground (transparent, emblem in safe zone)
  icon-background.png  Android adaptive background
  splash.png           2732x2732 splash (centered emblem on dark)
  feature-graphic.png  1024x500 Google Play feature graphic
Run:  python tools/generate_assets.py
"""
import os, math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.normpath(os.path.join(HERE, "..", "assets"))
os.makedirs(OUT, exist_ok=True)

BG_IN   = (33, 26, 14)
BG_MID  = (12, 11, 10)
BG_OUT  = (5, 5, 7)
AMBER   = (255, 140, 26)
AMBER_L = (255, 210, 122)
RED     = (255, 45, 58)
TOX     = (155, 255, 91)
INK     = (233, 228, 216)

def font(sz, bold=True):
    for p in (r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
              r"C:\Windows\Fonts\ARIALBD.TTF", r"C:\Windows\Fonts\arial.ttf"):
        try:
            return ImageFont.truetype(p, sz)
        except Exception:
            pass
    return ImageFont.load_default()

def radial(size, inner, mid, outer, cx=0.5, cy=0.42):
    """Smooth radial gradient via small image upscaled."""
    s = 192
    img = Image.new("RGB", (s, s))
    px = img.load()
    icx, icy = cx * s, cy * s
    maxd = math.hypot(max(icx, s - icx), max(icy, s - icy))
    for y in range(s):
        for x in range(s):
            d = math.hypot(x - icx, y - icy) / maxd
            if d < 0.5:
                t = d / 0.5
                c = tuple(int(inner[i] + (mid[i] - inner[i]) * t) for i in range(3))
            else:
                t = (d - 0.5) / 0.5
                c = tuple(int(mid[i] + (outer[i] - mid[i]) * min(1, t)) for i in range(3))
            px[x, y] = c
    return img.resize((size, size), Image.BICUBIC)

def emblem(size, scale=1.0):
    """Transparent RGBA emblem: neon reticle + red core."""
    S = size
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    dg = ImageDraw.Draw(glow)
    cx, cy = S * 0.5, S * 0.46
    R = S * 0.30 * scale
    lw = max(3, int(S * 0.028 * scale))

    # toxic outer ring (faint)
    dg.ellipse([cx - R * 1.28, cy - R * 1.28, cx + R * 1.28, cy + R * 1.28],
               outline=TOX + (90,), width=max(2, lw // 3))
    # main amber ring
    for col, w in ((AMBER, lw), (AMBER_L, max(1, lw // 3))):
        dg.ellipse([cx - R, cy - R, cx + R, cy + R], outline=col + (255,), width=w)
        d.ellipse([cx - R, cy - R, cx + R, cy + R], outline=col + (255,), width=w)
    # crosshair ticks
    g = R * 0.42
    for (x0, y0, x1, y1) in (
        (cx, cy - R * 1.30, cx, cy - R - g),
        (cx, cy + R + g, cx, cy + R * 1.30),
        (cx - R * 1.30, cy, cx - R - g, cy),
        (cx + R + g, cy, cx + R * 1.30, cy),
    ):
        dg.line([x0, y0, x1, y1], fill=AMBER + (255,), width=lw)
        d.line([x0, y0, x1, y1], fill=AMBER_L + (255,), width=lw)
    # red core
    cr = R * 0.30
    dg.ellipse([cx - cr * 1.6, cy - cr * 1.6, cx + cr * 1.6, cy + cr * 1.6], fill=RED + (130,))
    d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=RED + (255,))

    glow = glow.filter(ImageFilter.GaussianBlur(S * 0.018))
    return Image.alpha_composite(glow, img)

def word(img, text, cx, top, size, track=0.16):
    d = ImageDraw.Draw(img)
    f = font(size)
    # measure with tracking
    widths = []
    for ch in text:
        bb = d.textbbox((0, 0), ch, font=f)
        widths.append(bb[2] - bb[0])
    sp = size * track
    total = sum(widths) + sp * (len(text) - 1)
    x = cx - total / 2
    for i, ch in enumerate(text):
        col = AMBER if i >= 3 else INK
        d.text((x + 2, top + 3), ch, font=f, fill=(0, 0, 0, 160))  # shadow
        d.text((x, top), ch, font=f, fill=col + (255,))
        x += widths[i] + sp

def rounded_opaque(emb, bg):
    base = bg.convert("RGBA")
    base.alpha_composite(emb)
    return base.convert("RGB")

# ---- ICON 1024 (opaque, emblem only — OS shows the app name) ----
# named for @capacitor/assets conventions: icon-only / icon-foreground / icon-background / splash / splash-dark
size = 1024
bg = radial(size, BG_IN, BG_MID, BG_OUT)
icon = rounded_opaque(emblem(size, scale=1.12), bg)
icon.save(os.path.join(OUT, "icon-only.png"))
icon.save(os.path.join(OUT, "icon-1024.png"))   # convenience copy for store upload

# ---- Android adaptive: background + foreground (emblem in 66% safe zone) ----
radial(size, BG_IN, BG_MID, BG_OUT).save(os.path.join(OUT, "icon-background.png"))
fg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
fg.alpha_composite(emblem(size, scale=0.62))
fg.save(os.path.join(OUT, "icon-foreground.png"))

# ---- SPLASH 2732 (emblem + wordmark, safely centered) ----
sp = 2732
spbg = radial(sp, BG_IN, BG_MID, BG_OUT, cy=0.5).convert("RGBA")
es = int(sp * 0.46)
spbg.alpha_composite(emblem(es), (int((sp - es) / 2), int(sp * 0.20)))
word(spbg, "ASHFALL", sp * 0.5, sp * 0.70, int(sp * 0.10))
_sp = spbg.convert("RGB")
_sp.save(os.path.join(OUT, "splash.png"))
_sp.save(os.path.join(OUT, "splash-dark.png"))   # same art for dark mode

# ---- FEATURE GRAPHIC 1024x500 ----
fw, fh = 1024, 500
fimg = radial(max(fw, fh), BG_IN, BG_MID, BG_OUT, cx=0.7, cy=0.5).crop((0, 0, fw, fh)).convert("RGBA")
emb = emblem(440)
fimg.alpha_composite(emb, (40, 30))
d = ImageDraw.Draw(fimg)
word(fimg, "ASHFALL", 640, 150, 116, track=0.10)
fsub = font(34, bold=True)
sub = "WASTELAND  SURVIVAL"
bb = d.textbbox((0, 0), sub, font=fsub)
d.text((640 - (bb[2] - bb[0]) / 2, 300), sub, font=fsub, fill=(138, 151, 168, 255))
fsub2 = font(26, bold=False)
tag = "Endless waves. Giant bosses. One thumb."
bb = d.textbbox((0, 0), tag, font=fsub2)
d.text((640 - (bb[2] - bb[0]) / 2, 360), tag, font=fsub2, fill=(255, 178, 77, 255))
fimg.convert("RGB").save(os.path.join(OUT, "feature-graphic.png"))

print("OK ->", OUT)
for n in os.listdir(OUT):
    p = os.path.join(OUT, n)
    print(f"  {n}  {os.path.getsize(p)//1024} KB")
