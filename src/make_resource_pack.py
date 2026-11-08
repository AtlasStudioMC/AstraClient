# Builds "Ladue Client" resource pack for Minecraft 26.2: title-screen panorama, pack icon, splashes.
import io, json, re, sys, zipfile, pathlib
from PIL import Image, ImageEnhance, ImageOps, ImageDraw, ImageFilter
root = pathlib.Path(sys.argv[1])            # AstraClient repo
out = root / "ladue-resource-pack.zip"
NAVY = (31, 61, 124)
S = 1024

# Seamless 360 degree pixel-art sky with floating islands over a sea of clouds (see make_panorama.py).
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from make_panorama import render_faces
faces = render_faces()

icon = Image.open(root / "src/pack/logo_clear.png").convert("RGBA").resize((128, 128), Image.LANCZOS)
splashes = "\n".join([
    "Go Rams!", "Ladue Horton Watkins!", "Veritas, Sapientia, Honor, Amicitia!", "ladue.cc.cd",
    "Now on 26.2!", "Made for LHWHS!", "Play in your browser!", "Join the Ladue server!",
    "Study hall approved!", "Ladue Client!", "Blue and white!", "No install needed!",
]) + "\n"
mcmeta = {"pack": {
    "description": "§9Ladue §fClient §7- LHWHS title screen",
    "pack_format": 69, "min_format": [1, 0], "max_format": [999, 0],
    "supported_formats": {"min_inclusive": 1, "max_inclusive": 999}}}

def png(img):
    b = io.BytesIO(); img.save(b, "PNG", optimize=True); return b.getvalue()
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("pack.mcmeta", json.dumps(mcmeta, indent=2))
    z.writestr("pack.png", png(icon))
    for i, f in faces.items():
        z.writestr(f"assets/minecraft/textures/gui/title/background/panorama_{i}.png", png(f))
    z.writestr("assets/minecraft/texts/splashes.txt", splashes)
print(out, out.stat().st_size // 1024, "KB")

# The launcher installs the pack from games/ladue-pack.json (file name -> base64) and finds it
# through a cache-busting hash in index.html and src/engine.js.
import base64, hashlib
with zipfile.ZipFile(out) as z:
    pack = {n: base64.b64encode(z.read(n)).decode() for n in z.namelist()}
data = json.dumps(pack, separators=(",", ":")).encode()
(root / "games/ladue-pack.json").write_bytes(data)
h = hashlib.sha1(data).hexdigest()[:10]
for f in ("index.html", "src/engine.js"):
    p = root / f
    b = re.sub(rb"games/ladue-pack\.json\?v=[0-9a-f]+", b"games/ladue-pack.json?v=" + h.encode(), p.read_bytes())
    p.write_bytes(b)
print("games/ladue-pack.json", len(data) // 1024, "KB, v=" + h)
