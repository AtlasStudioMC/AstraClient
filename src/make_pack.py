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
ox, oy = (LW - cols * px) // 2, 16
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
# Each cape: a 64x32 PNG (for previews) + Eaglercraft's 1173-byte 23x17 RGB format
import random, json, base64, math
def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
def make_cape(cid, name, top, bottom, accent, style):
    c = Image.new("RGBA", (64, 32), (0, 0, 0, 0))
    for y in range(17):
        for x in range(22):
            col = lerp(top, bottom, y / 16)
            if style == "stripes" and (x + y) % 6 < 2: col = lerp(col, accent, .55)
            if style == "wave" and abs(y - 8 - 3 * math.sin(x / 3)) < 1.2: col = accent
            if style == "split" and x % 11 < 5: col = lerp(col, accent, .35)
            c.putpixel((x, y), col + (255,))
    rnd = random.Random(cid)
    if style in ("stars", "nebula"):
        for _ in range(16):
            c.putpixel((rnd.randrange(1, 21), rnd.randrange(1, 16)), (255, 255, 255, 255))
    for ox in (1, 12):  # emblem on back and front
        for dx, dy in [(5, 7), (4, 8), (5, 8), (6, 8), (5, 9), (3, 8), (7, 8), (5, 6), (5, 10)]:
            c.putpixel((ox + dx - 1, dy), accent + (255,))
    for y in range(11):  # side strip used by Eaglercraft
        c.putpixel((22, y + 11), lerp(top, bottom, y / 10) + (255,))
    data = bytearray(1173)
    for y in range(17):
        for x in range(22):
            r, g, b, _ = c.getpixel((x, y)); i = (y * 23 + x) * 3; data[i:i + 3] = bytes((b, g, r))
    for y in range(11):
        r, g, b, _ = c.getpixel((22, y + 11)); i = ((y + 6) * 23 + 22) * 3; data[i:i + 3] = bytes((b, g, r))
    buf = __import__("io").BytesIO(); c.save(buf, "PNG")
    return {"id": cid, "name": name, "png": base64.b64encode(buf.getvalue()).decode(), "data": base64.b64encode(bytes(data)).decode()}

capes = [
    make_cape("astra", "Astra", (40, 120, 255), (8, 22, 60), (170, 225, 255), "stars"),
    make_cape("nebula", "Nebula", (140, 70, 255), (20, 10, 60), (255, 190, 255), "nebula"),
    make_cape("ocean", "Ocean", (30, 200, 220), (5, 40, 80), (220, 255, 255), "wave"),
    make_cape("aurora", "Aurora", (40, 230, 150), (20, 40, 110), (200, 255, 230), "wave"),
    make_cape("frost", "Frost", (220, 240, 255), (90, 140, 200), (40, 90, 170), "stripes"),
    make_cape("midnight", "Midnight", (30, 34, 50), (5, 6, 12), (79, 179, 255), "split"),
    make_cape("ember", "Ember", (255, 120, 60), (80, 10, 20), (255, 220, 120), "stripes"),
    make_cape("void", "Void", (60, 10, 90), (0, 0, 0), (180, 90, 255), "stars"),
]
(out / "capes.json").write_text(json.dumps(capes))
print("capes written:", len(capes))
