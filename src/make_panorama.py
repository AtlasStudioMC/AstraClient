# Renders the Ladue title-screen panorama: a seamless 360 degree pixel-art sky with floating
# islands over a sea of clouds. Every pixel of the six cube faces is computed from the direction
# it looks in, so the faces meet with no seams and nothing is stretched.
#   python src/make_panorama.py [out_dir]   (writes panorama_0..5.png and a preview.png)
import math, pathlib, sys
from PIL import Image

N = 256          # logical pixels per face (each one becomes a 4x4 block: chunky, Minecraft-like)
SCALE = 4

# ---------------------------------------------------------------- noise
def _h(ix, iy, iz, seed=0):
    n = (ix * 374761393 + iy * 668265263 + iz * 2147483647 + seed * 1013904223) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0

def _smooth(t):
    return t * t * (3 - 2 * t)

def noise3(x, y, z, seed=0):
    ix, iy, iz = math.floor(x), math.floor(y), math.floor(z)
    fx, fy, fz = _smooth(x - ix), _smooth(y - iy), _smooth(z - iz)
    def lerp(a, b, t): return a + (b - a) * t
    c = [[[_h(ix + dx, iy + dy, iz + dz, seed) for dz in (0, 1)] for dy in (0, 1)] for dx in (0, 1)]
    x00 = lerp(c[0][0][0], c[1][0][0], fx); x10 = lerp(c[0][1][0], c[1][1][0], fx)
    x01 = lerp(c[0][0][1], c[1][0][1], fx); x11 = lerp(c[0][1][1], c[1][1][1], fx)
    return lerp(lerp(x00, x10, fy), lerp(x01, x11, fy), fz)

def fbm(x, y, z, octaves=4, seed=0):
    total, amp, freq, norm = 0.0, 1.0, 1.0, 0.0
    for o in range(octaves):
        total += noise3(x * freq, y * freq, z * freq, seed + o * 17) * amp
        norm += amp; amp *= 0.5; freq *= 2.03
    return total / norm

def noise1(x, seed=0):
    return noise3(x, 0.5, 0.5, seed)

# ---------------------------------------------------------------- colour helpers
def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)

def mul(c, k):
    return (c[0] * k, c[1] * k, c[2] * k)

def ramp(stops, x):
    if x <= stops[0][0]: return stops[0][1]
    for (x0, c0), (x1, c1) in zip(stops, stops[1:]):
        if x <= x1: return mix(c0, c1, (x - x0) / (x1 - x0))
    return stops[-1][1]

def angdiff(a, b):
    return (a - b + 180.0) % 360.0 - 180.0

# ---------------------------------------------------------------- scene
SUN_AZ = 140.0     # dawn glow (to the right and behind the starting view)
MOON = (-40.0, 25.0, 3.6)   # azimuth, elevation, angular radius in degrees

SKY = [(-90, (14, 22, 52)), (0, (122, 150, 214)), (3, (86, 118, 198)), (10, (48, 80, 160)),
       (24, (28, 47, 110)), (48, (17, 27, 68)), (90, (9, 13, 36))]
GLOW = (255, 164, 128)
GLOW_HIGH = (176, 112, 176)

# az, half width, top elevation, depth below top, haze, waterfall x (or None), trees, seed
ISLANDS = [
    (-20, 7.0, 7.5, 9.0, 0.15, 0.55, 4, 1),
    (25, 3.6, 11.0, 4.6, 0.38, None, 1, 2),
    (72, 12.0, 4.5, 11.5, 0.04, -0.45, 6, 3),
    (128, 5.0, 9.0, 6.0, 0.48, 0.3, 2, 4),
    (188, 9.0, 6.0, 8.5, 0.22, -0.6, 4, 5),
    (246, 6.0, 12.0, 7.0, 0.42, None, 3, 6),
    (300, 10.0, 5.0, 10.0, 0.10, 0.25, 5, 7),
    (101, 2.2, 15.0, 2.6, 0.58, None, 1, 8),
    (342, 2.6, 16.5, 3.0, 0.52, None, 1, 9),
    (214, 1.8, 17.5, 2.2, 0.62, None, 0, 10),
]

def sky_color(az, el):
    c = ramp(SKY, el)
    g = math.exp(-(angdiff(az, SUN_AZ) / 34.0) ** 2)
    low = max(0.0, 1.0 - max(el, 0.0) / 16.0) * g
    high = max(0.0, 1.0 - abs(el - 14.0) / 22.0) * g
    c = mix(c, GLOW_HIGH, 0.28 * high)
    c = mix(c, GLOW, 0.62 * low)
    return c

def island_at(az, el):
    """Colour of an island at this direction, or None."""
    for (caz, hw, top, depth, haze, fall, trees, seed) in ISLANDS:
        da = angdiff(az, caz)
        x = da / hw
        if abs(x) > 1.35: continue
        sky = sky_color(az, el)
        # waterfall first: it hangs from the rim down into the clouds
        if fall is not None and abs(x - fall) * hw < 0.32:
            ytop = top - 0.4
            if -6.0 < el < ytop:
                streak = _h(int(el * 9), seed, 3) * 0.25 + (0.15 if int(el * 3) % 4 == 0 else 0)
                col = mix((150, 200, 245), (235, 245, 255), 0.5 + streak)
                return mix(col, sky, haze * 0.8 + max(0.0, -el) / 8.0 * 0.5)
        if abs(x) > 1.0:
            continue
        bump = (noise1(x * 3.0 + seed * 7.1, seed) - 0.5) * 0.9 * (hw / 7.0)
        ytop = top + bump * (1 - x * x) ** 0.3 - abs(x) ** 7 * 1.6
        jag = (noise1(x * 11.0 + seed * 3.3, seed + 5) - 0.5) * depth * 0.22
        ybot = top - depth * max(0.0, 1 - abs(x) ** 1.6) ** 0.85 + jag
        # trees on top
        for k in range(trees):
            tx = -0.75 + 1.5 * (k + 0.5) / max(trees, 1) + (_h(k, seed, 9) - 0.5) * 0.25
            tr = (0.9 + _h(k, seed, 11) * 0.7) * (hw / 7.0) ** 0.35
            ty = top + 0.35 + tr
            dx = (x - tx) * hw
            if (dx / tr) ** 2 + ((el - ty) / (tr * 1.1)) ** 2 < 1.0:
                shade = 0.82 + 0.25 * (1 if dx < 0 else 0) + (_h(int(el * 4), int(dx * 4), seed) - 0.5) * 0.12
                return mix(mul((62, 138, 74), shade), sky, haze)
            if abs(dx) < 0.22 and ytop - 0.1 < el < ty - tr * 0.6:
                return mix((86, 62, 44), sky, haze)
        if not (ybot <= el <= ytop):
            continue
        d = ytop - el
        lit = 1.08 if da < 0 else 0.86
        speck = (_h(int(el * 4), int(da * 4), seed) - 0.5) * 0.14
        if d < 0.35:
            col = (134, 204, 98)
        elif d < 0.75:
            col = (82, 160, 76)
        elif d < 1.45:
            col = mul((124, 88, 60), lit + speck)
        else:
            depth_t = (d - 1.45) / max(depth, 0.1)
            col = mul(mix((104, 106, 126), (58, 56, 82), depth_t), lit + speck)
        return mix(col, sky, haze)
    return None

def moon_at(az, el, d):
    maz, mel, r = MOON
    mx = (math.cos(math.radians(mel)) * math.sin(math.radians(maz)), math.sin(math.radians(mel)),
          math.cos(math.radians(mel)) * math.cos(math.radians(maz)))
    dot = max(-1.0, min(1.0, d[0] * mx[0] + d[1] * mx[1] + d[2] * mx[2]))
    th = math.degrees(math.acos(dot))
    if th > r * 4.5: return None, 0.0
    if th <= r:
        lx, ly = angdiff(az, maz) / r, (el - mel) / r
        crater = fbm(lx * 1.7 + 3, ly * 1.7, 0.5, 3, 77)
        base = mix((236, 240, 248), (190, 198, 220), max(0.0, (crater - 0.45) * 2.4))
        shade = 1.0 - max(0.0, lx * 0.18 + 0.05)
        return mul(base, shade), 1.0
    return (150, 175, 235), (1 - (th - r) / (r * 3.5)) ** 2 * 0.45

def cloud_sea(az, el, d):
    t = 1.0 / max(-d[1], 1e-3)
    px, pz = d[0] * t, d[2] * t
    n = fbm(px * 0.42, pz * 0.42, 0.37, 4, 31)
    n += (fbm(px * 1.7, pz * 1.7, 0.11, 2, 61) - 0.5) * 0.10 / (1.0 + (t - 1.0) * 0.25)
    hi = fbm(px * 1.3 + 9, pz * 1.3, 0.73, 2, 41)
    g = math.exp(-(angdiff(az, SUN_AZ) / 40.0) ** 2)
    if n > 0.56:
        col = mix((184, 198, 238), (238, 243, 255), (n - 0.56) * 3.4 + (hi - 0.5) * 0.7)
    elif n > 0.47:
        col = mix((98, 116, 178), (184, 198, 238), (n - 0.47) / 0.09)
    else:
        col = mix((22, 36, 88), (74, 92, 156), n / 0.47)
    col = mix(col, (255, 196, 168), 0.38 * g * max(0.0, min(1.0, (n - 0.45) * 4)))
    fog = 1.0 - math.exp(-(t - 1.0) / 9.0)
    return mix(col, sky_color(az, 0.0), fog * 0.85)

def horizon_clouds(az, el):
    if not (-1.5 < el < 15.0): return None, 0.0
    a = math.radians(az)
    n = fbm(math.cos(a) * 6.0, math.sin(a) * 6.0, el * 0.55, 4, 53)
    band = max(0.0, 1.0 - abs(el - 4.0) / 11.0)
    v = n * band
    if v < 0.42: return None, 0.0
    g = math.exp(-(angdiff(az, SUN_AZ) / 38.0) ** 2)
    col = mix((150, 170, 225), (214, 224, 250), (v - 0.42) * 4)
    col = mix(col, (255, 190, 160), 0.55 * g)
    return col, 0.55 if v < 0.5 else 0.8

def star_at(face, i, j, el, az):
    if el < 6.0: return None
    dens = min(1.0, (el - 6.0) / 28.0) * 0.0105
    r = _h(i, j, face, 101)
    if r > dens: return None
    b = _h(i, j, face, 202)
    tint = _h(i, j, face, 303)
    col = (255, 255, 255) if tint < 0.6 else ((200, 222, 255) if tint < 0.85 else (255, 236, 196))
    fade = 1.0 - 0.75 * math.exp(-(angdiff(az, SUN_AZ) / 40.0) ** 2) * max(0.0, 1 - el / 40.0)
    return col, (0.35 + 0.65 * b) * fade, b > 0.93

# ---------------------------------------------------------------- school crest + aurora
CREST = (38.0, 15.0, 9.0)   # azimuth, elevation of the centre, angular half-size (degrees)
_crest = Image.open(pathlib.Path(__file__).resolve().parent / "pack/logo_clear.png").convert("RGBA")
_crest_px = _crest.load()

def crest_at(az, el):
    caz, cel, half = CREST
    lx = angdiff(az, caz) / half
    ly = (cel - el) / half
    r2 = lx * lx + ly * ly
    glow = max(0.0, 1.0 - r2 / 2.6) ** 2 * 0.55
    if abs(lx) <= 1 and abs(ly) <= 1:
        u = int((lx + 1) / 2 * (_crest.width - 1)); v = int((ly + 1) / 2 * (_crest.height - 1))
        c = _crest_px[u, v]
        if c[3] > 40:
            return (c[0], c[1], c[2]), c[3] / 255.0, glow
    return None, 0.0, glow

def aurora_at(az, el):
    if not (16.0 < el < 62.0): return None, 0.0
    a = math.radians(az)
    wave = 32.0 + 9.0 * math.sin(a * 2.0 + 0.6) + 5.0 * math.sin(a * 5.0 + 1.7)
    d = abs(el - wave)
    if d > 7.0: return None, 0.0
    n = fbm(math.cos(a) * 4.0, math.sin(a) * 4.0, el * 0.08, 3, 91)
    strength = (1.0 - d / 7.0) ** 1.5 * max(0.0, n - 0.38) * 2.2
    if strength <= 0.02: return None, 0.0
    col = mix((90, 170, 255), (190, 230, 255), (el - wave + 7.0) / 14.0)
    return col, min(0.55, strength)

# ---------------------------------------------------------------- dithering
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
STEP = 9.0
def dither(c, i, j):
    t = (BAYER[j & 3][i & 3] + 0.5) / 16.0 - 0.5
    return tuple(int(max(0, min(255, round((v + t * STEP) / STEP) * STEP))) for v in c)

# ---------------------------------------------------------------- faces
def direction(face, u, v):
    a, b = 2 * u - 1, 1 - 2 * v
    if face == 0: d = (a, b, 1.0)
    elif face == 1: d = (1.0, b, -a)
    elif face == 2: d = (-a, b, -1.0)
    elif face == 3: d = (-1.0, b, a)
    elif face == 4: d = (a, 1.0, 2 * v - 1)
    else: d = (a, -1.0, b)
    l = math.sqrt(d[0] ** 2 + d[1] ** 2 + d[2] ** 2)
    return (d[0] / l, d[1] / l, d[2] / l)

def render_face(face):
    img = Image.new("RGB", (N, N))
    px = img.load()
    bright = []
    for j in range(N):
        for i in range(N):
            d = direction(face, (i + 0.5) / N, (j + 0.5) / N)
            el = math.degrees(math.asin(max(-1.0, min(1.0, d[1]))))
            az = math.degrees(math.atan2(d[0], d[2]))
            if el < -0.3:
                col = cloud_sea(az, el, d)
            else:
                col = sky_color(az, el)
                s = star_at(face, i, j, el, az)
                if s:
                    col = mix(col, s[0], s[1])
                    if s[2]: bright.append((i, j, s[0]))
                ac, aw = aurora_at(az, el)
                if ac is not None:
                    col = mix(col, ac, aw)
                cc, cw, cg = crest_at(az, el)
                if cg > 0:
                    col = mix(col, (120, 160, 240), cg)
                if cc is not None:
                    col = mix(col, cc, cw)
                m, w = moon_at(az, el, d)
                if m is not None:
                    col = m if w >= 1.0 else mix(col, m, w)
            hc, hw = horizon_clouds(az, el)
            if hc is not None and el > -1.5:
                col = mix(col, hc, hw)
            isl = island_at(az, el)
            if isl is not None:
                col = isl
            px[i, j] = dither(col, i, j)
    for (i, j, c) in bright:   # little plus-shaped sparkle on the brightest stars
        for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            x, y = i + di, j + dj
            if 0 <= x < N and 0 <= y < N:
                px[x, y] = tuple(int(a + (b - a) * 0.45) for a, b in zip(px[x, y], c))
    return img.resize((N * SCALE, N * SCALE), Image.NEAREST)

def render_faces():
    return {k: render_face(k) for k in range(6)}

def preview(faces, yaw=0.0, pitch=-8.0, w=960, h=540, fov=85.0):
    """What the title screen sees: a perspective view through the cube."""
    img = Image.new("RGB", (w, h))
    px = img.load()
    data = {k: f.load() for k, f in faces.items()}
    size = faces[0].width
    f = 1.0 / math.tan(math.radians(fov) / 2)
    cy, sy = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
    cp, sp = math.cos(math.radians(pitch)), math.sin(math.radians(pitch))
    for y in range(h):
        for x in range(w):
            vx, vy, vz = (2 * (x + 0.5) / w - 1) * w / h, 1 - 2 * (y + 0.5) / h, f
            vy, vz = vy * cp + vz * sp, -vy * sp + vz * cp
            vx, vz = vx * cy + vz * sy, -vx * sy + vz * cy
            ax, ay, az = abs(vx), abs(vy), abs(vz)
            if az >= ax and az >= ay:
                k, u, v = (0, vx / az, -vy / az) if vz > 0 else (2, -vx / az, -vy / az)
            elif ax >= ay:
                k, u, v = (1, -vz / ax, -vy / ax) if vx > 0 else (3, vz / ax, -vy / ax)
            else:
                k, u, v = (4, vx / ay, vz / ay) if vy > 0 else (5, vx / ay, -vz / ay)
            i = min(size - 1, int((u + 1) / 2 * size)); j = min(size - 1, int((v + 1) / 2 * size))
            px[x, y] = data[k][i, j]
    return img

if __name__ == "__main__":
    out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    out.mkdir(parents=True, exist_ok=True)
    faces = render_faces()
    for k, f in faces.items():
        f.save(out / f"panorama_{k}.png", optimize=True)
    for yaw in (0, 90, 180, 270):
        preview(faces, yaw=yaw).save(out / f"preview_{yaw}.png")
    print("done", out)
