# Generates the Astra title-screen textures used by the auto-installed resource pack.
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
import pathlib
root = pathlib.Path(__file__).resolve().parent
out = root / "pack"

# --- buttons (widgets.png rows: disabled y46, normal y66, hover y86; 200x20) ---
w = Image.open(out / "widgets_vanilla.png").convert("RGBA")
d = ImageDraw.Draw(w)
def button(y, fill_l, fill_r, border):
    for x in range(200):
        t = x / 199
        c = tuple(int(fill_l[i] + (fill_r[i] - fill_l[i]) * t) for i in range(4))
        d.line([(x, y), (x, y + 19)], fill=c)
    d.rectangle([0, y, 199, y + 19], outline=border)
    for cx, cy in [(0, y), (199, y), (0, y + 19), (199, y + 19)]:
        w.putpixel((cx, cy), (0, 0, 0, 0))
button(46, (10, 11, 14, 170), (10, 11, 14, 170), (24, 26, 30, 200))
button(66, (14, 16, 22, 235), (14, 16, 22, 235), (34, 38, 46, 255))
button(86, (59, 140, 246, 255), (20, 50, 120, 245), (110, 190, 255, 255))
w.save(out / "widgets.png")

# --- Astra logo mark: a pixel "A" inside a rounded badge with a star spark ---
def logo_mark(size_px):
    S = 16  # design grid
    A = [
        "....##....",
        "...####...",
        "..##..##..",
        "..##..##..",
        "..######..",
        "..##..##..",
        "..##..##..",
        "..##..##..",
    ]
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # badge
    d.rectangle([1, 1, 14, 14], fill=(12, 26, 51, 255))
    d.rectangle([1, 1, 14, 2], fill=(38, 86, 150, 255))
    for x, y in [(1, 1), (14, 1), (1, 14), (14, 14)]:
        img.putpixel((x, y), (0, 0, 0, 0))
    d.rectangle([1, 1, 14, 14], outline=(79, 179, 255, 255))
    for x, y in [(1, 1), (14, 1), (1, 14), (14, 14)]:
        img.putpixel((x, y), (0, 0, 0, 0))
    # letter A (rows 2..13 of the 16 grid)
    ox, oy = (S - len(A[0])) // 2, (S - len(A)) // 2
    for y, row in enumerate(A):
        for x, c in enumerate(row):
            if c == "#":
                img.putpixel((ox + x, oy + y), (255, 255, 255, 255))
    # spark
    for x, y in [(12, 3), (11, 3), (13, 3), (12, 2), (12, 4)]:
        img.putpixel((x, y), (140, 215, 255, 255))
    return img.resize((size_px, size_px), Image.NEAREST)


# --- logo (minecraft.png: halves at (0,0) and (0,45), each 155x44; we use a 2x = 512px texture) ---
G = {"A": ["01110","10001","10001","11111","10001","10001","10001"],
     "S": ["01111","10000","10000","01110","00001","00001","11110"],
     "T": ["11111","00100","00100","00100","00100","00100","00100"],
     "R": ["11110","10001","10001","11110","10100","10010","10001"]}
S2 = 2
LW, LH = 310 * S2, 44 * S2
word, px = "ASTRA", 9
cols = len(word) * 6 - 1
logo = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
ld = ImageDraw.Draw(logo)
ox, oy = (LW - cols * px) // 2 + 34, 16
def draw(dx, dy, color):
    for li, ch in enumerate(word):
        for r, row in enumerate(G[ch]):
            for c, v in enumerate(row):
                if v == "1":
                    x, y = ox + (li * 6 + c) * px + dx, oy + r * px + dy
                    ld.rectangle([x, y, x + px - 1, y + px - 1], fill=color)
for dx in (-3, 0, 3):
    for dy in (-3, 0, 3, 6):
        draw(dx, dy, (8, 22, 60, 255))
draw(0, 0, (79, 179, 255, 255))
for li, ch in enumerate(word):
    for r, row in enumerate(G[ch]):
        for c, v in enumerate(row):
            if v == "1" and (r == 0 or G[ch][r - 1][c] == "0"):
                x, y = ox + (li * 6 + c) * px, oy + r * px
                ld.rectangle([x, y, x + px - 1, y + 2], fill=(190, 235, 255, 255))
cx = LW // 2
for x0, y0, x1, y1 in [(cx - 2, 0, cx + 2, 9), (cx - 24, 3, cx - 18, 10), (cx + 18, 3, cx + 24, 10)]:
    ld.rectangle([x0, y0, x1, y1], fill=(140, 210, 255, 255))
mark = logo_mark(LH - 8)
logo.paste(mark, (ox - mark.width - 10, (LH - mark.height) // 2), mark)
mc = Image.new("RGBA", (256 * S2, 256 * S2), (0, 0, 0, 0))
mc.paste(logo.crop((0, 0, LW // 2, LH)), (0, 0))
mc.paste(logo.crop((LW // 2, 0, LW, LH)), (0, 45 * S2))
mc.save(out / "minecraft.png")

# --- hide "Java Edition" (1.12) ---
Image.new("RGBA", (128, 16), (0, 0, 0, 0)).save(out / "edition.png")

# --- darker, moodier background ---
bg = Image.open(root / "img/panorama_src.png").convert("RGB").resize((720, 720), Image.LANCZOS)
bg = ImageEnhance.Color(bg).enhance(0.55)
bg = ImageEnhance.Brightness(bg).enhance(0.55)
bg.save(out / "panorama.png", optimize=True)

(out / "splashes.txt").write_text("Astra Client!\n")
print("pack textures written to", out)

# --- cosmetic capes ---
# The cape people see is a 10x16 "face". We draw that, then build the full 64x32
# texture (front, back, top and side edges) and Eaglercraft's 1173-byte 23x17 RGB blob.
import random, json, base64, math, io

W, H = 10, 16  # visible cape face

def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

def shade(c, f):
    return tuple(max(0, min(255, round(v * f))) for v in c)

EMBLEM_A = [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"]

def stamp(face, art, ox, oy, color):
    for y, row in enumerate(art):
        for x, ch in enumerate(row):
            if ch == "#" and 0 <= ox + x < W and 0 <= oy + y < H:
                face[oy + y][ox + x] = color

def frame(face, border, inner=None):
    for x in range(W):
        face[0][x] = border; face[H - 1][x] = border
    for y in range(H):
        face[y][0] = border; face[y][W - 1] = border
    if inner:
        for x in range(1, W - 1):
            face[1][x] = inner; face[H - 2][x] = inner
        for y in range(1, H - 1):
            face[y][1] = inner; face[y][W - 2] = inner

def field(top, bottom, dither=None, rnd=None):
    face = [[mix(top, bottom, y / (H - 1)) for x in range(W)] for y in range(H)]
    if dither:  # subtle checker dithering so the gradient does not look flat
        for y in range(H):
            for x in range(W):
                if (x + y) % 2 == 0:
                    face[y][x] = shade(face[y][x], dither)
    return face

def cape_astra():
    face = field((36, 96, 190), (7, 18, 42), 0.94)
    frame(face, (79, 179, 255), (18, 44, 88))
    stamp(face, EMBLEM_A, 2, 5, (255, 255, 255))
    for x, y in [(7, 4), (6, 4), (8, 4), (7, 3), (7, 5)]:
        face[y][x] = (150, 220, 255)
    return face

def cape_nebula():
    rnd = random.Random("nebula")
    face = field((108, 56, 200), (10, 6, 32), 0.9)
    for y in range(H):  # glowing core
        for x in range(W):
            d = math.hypot((x - 4.5) / 4.0, (y - 7.5) / 6.0)
            if d < 1:
                face[y][x] = mix(face[y][x], (215, 160, 255), (1 - d) * 0.55)
    for _ in range(14):
        face[rnd.randrange(1, H - 1)][rnd.randrange(1, W - 1)] = (255, 255, 255)
    frame(face, (60, 26, 120))
    return face

def cape_ocean():
    face = field((44, 190, 214), (4, 40, 86), 0.95)
    for y in range(1, H - 1):  # rolling wave crests
        for x in range(W):
            wave = math.sin((x / W) * math.pi * 2 + y * 0.55) * 1.1
            if abs(((y + 1.5) % 3.5) - 1.75 + wave) < 0.55:
                face[y][x] = mix(face[y][x], (225, 255, 255), 0.8)
    frame(face, (12, 74, 120), (20, 120, 165))
    return face

def cape_aurora():
    face = field((10, 22, 46), (4, 8, 20), 0.95)
    for x in range(W):  # vertical ribbons
        top = 1 + (x * 3) % 4
        height = 6 + ((x * 5) % 5)
        for y in range(top, min(H - 1, top + height)):
            t = (y - top) / height
            face[y][x] = mix(mix((90, 255, 170), (70, 150, 255), x / (W - 1)), face[y][x], t)
    frame(face, (16, 44, 70))
    return face

def cape_frost():
    face = field((238, 248, 255), (110, 165, 215), 0.97)
    flake = ["#.#.#", ".###.", "#####", ".###.", "#.#.#"]
    stamp(face, flake, 2, 6, (255, 255, 255))
    for y in range(H):
        for x in range(W):
            if (x * 3 + y * 5) % 11 == 0:
                face[y][x] = shade(face[y][x], 1.06)
    frame(face, (52, 104, 168), (150, 200, 235))
    return face

def cape_midnight():
    rnd = random.Random("midnight")
    face = field((26, 30, 48), (5, 6, 12), 0.92)
    moon = ["..###.", ".##..#", "###...", "###...", ".##..#", "..###."]
    stamp(face, moon, 2, 4, (240, 244, 255))
    glow = [".####.", "##..##", "##....", "##....", "##..##", ".####."]
    for y, row in enumerate(glow):  # soft halo around the crescent
        for x, ch in enumerate(row):
            px, py = 1 + x, 3 + y
            if ch == "#" and 0 < px < W - 1 and 0 < py < H - 1 and face[py][px][0] < 200:
                face[py][px] = mix(face[py][px], (120, 150, 210), 0.3)
    for _ in range(10):  # stars below the moon
        face[rnd.randrange(10, H - 1)][rnd.randrange(1, W - 1)] = (200, 220, 255)
    frame(face, (79, 179, 255))
    return face

def cape_ember():
    face = field((34, 10, 14), (14, 5, 8), 0.95)
    # classic dithered fire ramp: hottest at the hem, fading out halfway up
    ramp = [(255, 238, 170), (255, 186, 70), (240, 120, 36), (196, 62, 24), (110, 28, 18)]
    for y in range(H - 1, 3, -1):
        t = (H - 1 - y) / (H - 5)
        idx = min(len(ramp) - 1, int(t * len(ramp)))
        c = ramp[idx]
        nxt = ramp[min(len(ramp) - 1, idx + 1)]
        for x in range(W):
            checker = (x + y) % 2 == 0
            face[y][x] = c if not checker else mix(c, nxt, 0.75)
    for x, y in [(2, 5), (5, 4), (7, 6), (4, 7), (8, 8)]:  # rising sparks
        face[y][x] = mix(face[y][x], (255, 208, 120), 0.85)
    frame(face, (120, 34, 20), (60, 16, 12))
    return face

def cape_void():
    face = [[(0, 0, 0) for _ in range(W)] for _ in range(H)]
    for y in range(H):  # portal rings
        for x in range(W):
            d = math.hypot((x - 4.5) / 4.2, (y - 7.5) / 7.0)
            ring = (math.sin(d * 7.5 - 1.2) + 1) / 2
            glow = ring * max(0.0, 1.15 - d) ** 0.5
            face[y][x] = mix((10, 3, 20), (190, 110, 255), min(1, glow * 1.25))
    frame(face, (92, 40, 160))
    return face

DESIGNS = [("astra", "Astra", cape_astra), ("nebula", "Nebula", cape_nebula), ("ocean", "Ocean", cape_ocean),
           ("aurora", "Aurora", cape_aurora), ("frost", "Frost", cape_frost), ("midnight", "Midnight", cape_midnight),
           ("ember", "Ember", cape_ember), ("void", "Void", cape_void)]

def build_cape(cid, name, make):
    face = make()
    img = Image.new("RGBA", (64, 32), (0, 0, 0, 0))
    edge = face[H // 2][0]
    for y in range(H):
        for x in range(W):
            img.putpixel((1 + x, 1 + y), face[y][x] + (255,))          # outer face
            img.putpixel((12 + x, 1 + y), shade(face[y][x], 0.82) + (255,))  # inner face
    for x in range(W):                                                  # top and bottom strips
        img.putpixel((1 + x, 0), face[0][x] + (255,))
        img.putpixel((12 + x, 0), shade(face[0][x], 0.82) + (255,))
    for y in range(H):                                                  # side edges
        img.putpixel((0, 1 + y), shade(face[y][0], 0.9) + (255,))
        img.putpixel((11, 1 + y), shade(face[y][W - 1], 0.9) + (255,))
    # Eaglercraft's packed format: 23x17 BGR, plus the side strip it reads from x=22
    data = bytearray(1173)
    for y in range(17):
        for x in range(22):
            r, g, b, _ = img.getpixel((x, y)); i = (y * 23 + x) * 3
            data[i:i + 3] = bytes((b, g, r))
    for y in range(11):
        r, g, b, _ = img.getpixel((11, min(16, y + 1))); i = ((y + 6) * 23 + 22) * 3
        data[i:i + 3] = bytes((b, g, r))
    buf = io.BytesIO(); img.save(buf, "PNG")
    return {"id": cid, "name": name, "png": base64.b64encode(buf.getvalue()).decode(),
            "data": base64.b64encode(bytes(data)).decode()}

capes = [build_cape(*d) for d in DESIGNS]
(out / "capes.json").write_text(json.dumps(capes))
print("capes written:", len(capes))

logo_mark(256).save(out / "logo.png")
buf = __import__("io").BytesIO(); logo_mark(64).save(buf, "PNG")
(out / "logo.b64").write_text(base64.b64encode(buf.getvalue()).decode())
print("logo written")


# --- website imagery (resized + compressed so the page stays small) ---
def web_img(src_name, out_name, w, h, quality=72):
    im = Image.open(root / "img" / src_name).convert("RGB")
    scale = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    left, top = (im.width - w) // 2, (im.height - h) // 2
    im.crop((left, top, left + w, top + h)).save(out / out_name, "JPEG", quality=quality, optimize=True)

web_img("magic.jpg", "web_hero.jpg", 1600, 900)
web_img("launcher.jpg", "web_band.jpg", 1600, 620)
web_img("website.jpg", "web_cta.jpg", 1400, 520, 70)
print("website images written")
