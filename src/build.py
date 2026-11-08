"""Build Ladue Client.

Outputs:
  index.html + games/*.bin   hosted site for Vercel (games download on demand)
  LadueClient.html           offline single-file version (games embedded, not committed)

Needs the original Eaglercraft offline HTML files in the project root (not committed).
"""
import base64, gzip, json, pathlib, sys


root = pathlib.Path(__file__).resolve().parent.parent
src = root / "src"
# id -> (file, worlds database name)
GAMES = {
    "v18": ("EaglercraftX_1.8_u53_Offline_Signed.html", "astra_worlds_1_8"),
    "v18w": ("EaglercraftX_1.8_u53_WASM-GC_Offline.html", "astra_worlds_1_8"),
    "v112": ("Eaglercraft_1.12.2_u3_Offline.html", "astra_worlds_1_12"),
    "v152": ("Eaglercraft_1.5.2_sp2.01_Offline.html", None),
    "v263": ("eaglercraft-26.3-8c167d43.html", "ladue_worlds_26_2"),
}

capes = [{k: c[k] for k in ("id", "name", "png", "data")} for c in json.loads((src / "pack/capes.json").read_text())]
overlay = ("window.ASTRA_CAPES=" + json.dumps([{"id": c["id"], "name": c["name"], "png": c["png"]} for c in capes]) + ";\n"
           + (src / "astra-overlay.js").read_text())

# swap the upstream client branding for Astra in the strings the game shows on screen
REBRAND = {
    "v18": [("EaglercraftX 1.8-u53 ultimate [", "Ladue Client 1.8.8 ["),
            ("EaglercraftX 1.8-u53 - ", "Ladue Client 1.8.8 - "),
            ("EaglercraftX 1.8 u53", "Ladue Client 1.8.8"),
            ("EaglercraftX u53", "Ladue Client")],
    "v18w": [("EaglercraftX 1.8-u53 ultimate [", "Ladue Client 1.8.8 ["),
             ("EaglercraftX 1.8-u53 - ", "Ladue Client 1.8.8 - ")],
    "v112": [("Eaglercraft 1.12.2 (u3)", "Ladue Client 1.12.2"),
             ("Eaglercraft 1.12.2 1.12.2-u3 - ", "Ladue Client 1.12.2 - ")],
    "v152": [("eaglercraft 1.5.2-sp2.01 official", "Ladue Client 1.5.2"),
             ("Eaglercraft: 1.5.2-sp2.01", "Ladue Client: 1.5.2")],
}
# Make the client introduce itself to servers as Astra, so a server plugin can tag
# Astra players. The original name is kept in brackets so anything that checks for it
# still matches. These strings appear exactly once each in their builds.
BRAND_PATCHES = {
    "v18": [('case 0:return C(644);default:', 'case 0:return "Astra (eagler)";default:')],
    "v112": [('"vanilla"', '"Astra (vanilla)"')],
}
TITLES = {"v262": "Ladue Client 26.2", "v18": "Ladue Client 1.8.8", "v18w": "Ladue Client 1.8.8", "v112": "Ladue Client 1.12.2", "v152": "Ladue Client 1.5.2"}

def rebrand(html, id_):
    pairs = REBRAND.get(id_, [])
    # EaglercraftX 1.8 ships its client code gzipped inside a <style> tag, so patch in there too
    tag = '<style type="eaglercraft" id="eaglercraftXClientBundle">data:application/octet-stream;base64,'
    at = html.find(tag)
    if at >= 0:
        start = at + len(tag)
        end = html.index("<", start)
        code = gzip.decompress(base64.b64decode(html[start:end])).decode("utf-8")
        for a, b in pairs + BRAND_PATCHES.get(id_, []):
            if a not in code:
                print(f"  note: {id_} pattern not found, skipping: {a[:40]}")
            code = code.replace(a, b)
        html = html[:start] + base64.b64encode(gzip.compress(code.encode("utf-8"), 9, mtime=0)).decode() + html[end:]
    else:
        for a, b in pairs + BRAND_PATCHES.get(id_, []):
            if a not in html:
                print(f"  note: {id_} pattern not found, skipping: {a[:40]}")
            html = html.replace(a, b)
    import re as _re
    return _re.sub(r"<title>.*?</title>", "<title>" + TITLES.get(id_, "Ladue Client") + "</title>", html, count=1, flags=_re.S)

def game_bytes(fn, db, id_):
    html = (root / fn).read_text(encoding="utf-8")
    if db:  # separate world saves per version so they don't clash
        html = html.replace('worldsDB: "worlds"', f'worldsDB: "{db}"', 1)
    html = rebrand(html, id_)
    idx = html.rfind("</body>")
    html = html[:idx] + "<script>" + overlay.replace("</script", "<\\/script") + "</script>\n" + html[idx:]
    return gzip.compress(html.encode("utf-8"), 9, mtime=0)

def page(hosted_ids, payloads):
    out = (src / "launcher.html").read_text()
    pack = {n: base64.b64encode((src / "pack" / n).read_bytes()).decode()
            for n in ["panorama.png", "widgets.png", "minecraft.png", "edition.png", "splashes.txt"]}
    out = out.replace("__PACKFILES__", json.dumps(pack))
    out = out.replace("__CAPES__", json.dumps(capes))
    out = out.replace("__HOSTED__", json.dumps(hosted_ids))
    out = out.replace("__LOGO__", "data:image/png;base64," + (src / "pack/logo.b64").read_text().strip())
    out = out.replace("__ENGINE__", (src / "engine.js").read_text())
    imgs = {"__LAUNCHER_BG__": src / "img/launcher.webp", "__BG_HERO__": src / "pack/web_hero.jpg",
            "__BG_BAND__": src / "pack/web_band.jpg", "__BG_CTA__": src / "pack/web_cta.jpg"}
    for key, path in imgs.items():
        mime = "image/webp" if path.suffix == ".webp" else "image/jpeg"
        out = out.replace(key, f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode())
    return out.replace("<!--PAYLOADS-->", payloads)  # last, so placeholders inside game files are untouched

available = {i: g for i, g in GAMES.items() if (root / g[0]).exists()}
missing = set(GAMES) - set(available)
if missing:
    print("skipping missing versions:", ", ".join(sorted(missing)))

games_dir = root / "games"
games_dir.mkdir(exist_ok=True)
blocks = []
for id_, (fn, db) in available.items():
    data = game_bytes(fn, db, id_)
    (games_dir / f"{id_}.bin").write_bytes(data)
    print(f"games/{id_}.bin", round(len(data) / 1e6, 1), "MB")
    if "--no-offline" not in sys.argv:
        blocks.append(f'<script type="application/octet-stream" id="{id_}">{base64.b64encode(data).decode()}</script>')

import shutil
shutil.copyfile(src / "pack/logo.png", root / "logo.png")  # for link previews

(root / "index.html").write_text(page(list(available), ""), encoding="utf-8")
print("index.html", round((root / "index.html").stat().st_size / 1e6, 2), "MB")
if blocks:
    offline = page([], "\n".join(blocks))
    (root / "LadueClient.html").write_text(offline, encoding="utf-8")
    print("LadueClient.html", round(len(offline) / 1e6, 1), "MB")
