# Builds "Ladue Client" resource pack for Minecraft 26.2: title-screen panorama, pack icon, splashes.
import io, json, sys, zipfile, pathlib
from PIL import Image, ImageEnhance, ImageOps, ImageDraw, ImageFilter
root = pathlib.Path(sys.argv[1])            # AstraClient repo
out = root / "ladue-resource-pack.zip"
NAVY = (31, 61, 124)
S = 1024

hero = Image.open(root / "src/pack/web_hero.jpg").convert("RGB")
# A seamless strip: the art, then its mirror, so the panorama loops with no seam.
strip = Image.new("RGB", (hero.width * 2, hero.height))
strip.paste(hero, (0, 0)); strip.paste(ImageOps.mirror(hero), (hero.width, 0))
strip = strip.resize((S * 4, S), Image.LANCZOS)
# Pull it toward Ladue navy and white.
strip = ImageEnhance.Color(strip).enhance(0.92)
tint = Image.new("RGB", strip.size, NAVY)
strip = Image.blend(strip, tint, 0.18)
strip = ImageEnhance.Contrast(strip).enhance(1.12)
strip = ImageEnhance.Brightness(strip).enhance(0.96)

faces = {}
for i in range(4):                         # 0 front, 1 right, 2 back, 3 left
    faces[i] = strip.crop((i * S, 0, (i + 1) * S, S))
top_color = strip.crop((0, 0, S * 4, 8)).resize((1, 1), Image.LANCZOS).getpixel((0, 0))
bottom_color = strip.crop((0, S - 8, S * 4, S)).resize((1, 1), Image.LANCZOS).getpixel((0, 0))
faces[4] = Image.new("RGB", (S, S), top_color).filter(ImageFilter.GaussianBlur(2))
faces[5] = Image.new("RGB", (S, S), bottom_color)

# Clear Ladue crest on the back face, with a soft navy glow so it reads over the sky.
crest = Image.open(root / "src/pack/logo_clear.png").convert("RGBA").resize((340, 340), Image.LANCZOS)
glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
halo = Image.new("L", (S, S), 0); ImageDraw.Draw(halo).ellipse((S//2 - 230, S//2 - 230, S//2 + 230, S//2 + 230), fill=120)
halo = halo.filter(ImageFilter.GaussianBlur(60))
glow.paste(Image.new("RGBA", (S, S), (12, 30, 80, 255)), (0, 0), halo)
back = faces[2].convert("RGBA"); back.alpha_composite(glow)
back.alpha_composite(crest, (S // 2 - 170, S // 2 - 170))
faces[2] = back.convert("RGB")

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
faces[2].resize((512, 512)).save(root.resolve().parent / "_rp/preview_back.png")
print(out, out.stat().st_size // 1024, "KB")
