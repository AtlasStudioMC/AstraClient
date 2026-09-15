"""Build Astra Client.

Outputs:
  index.html + games/*.bin   hosted site for Vercel (games download on demand)
  AstraClient.html           offline single-file version (games embedded, not committed)

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
}

capes = [{k: c[k] for k in ("id", "name", "png", "data")} for c in json.loads((src / "pack/capes.json").read_text())]
overlay = ("window.ASTRA_CAPES=" + json.dumps([{"id": c["id"], "name": c["name"], "png": c["png"]} for c in capes]) + ";\n"
           + (src / "astra-overlay.js").read_text())

def game_bytes(fn, db):
    html = (root / fn).read_text(encoding="utf-8")
    if db:  # separate world saves per version so they don't clash
        html = html.replace('worldsDB: "worlds"', f'worldsDB: "{db}"', 1)
    html = html.replace("<title>My Drive - Google Drive</title>", "<title>Eaglercraft 1.5.2</title>", 1)
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
    out = out.replace("__ENGINE__", (src / "engine.js").read_text())
    for key, img in {"__WEBSITE_BG__": "website.jpg", "__LAUNCHER_BG__": "launcher.jpg"}.items():
        out = out.replace(key, "data:image/jpeg;base64," + base64.b64encode((src / "img" / img).read_bytes()).decode())
    return out.replace("<!--PAYLOADS-->", payloads)  # last, so placeholders inside game files are untouched

available = {i: g for i, g in GAMES.items() if (root / g[0]).exists()}
missing = set(GAMES) - set(available)
if missing:
    print("skipping missing versions:", ", ".join(sorted(missing)))

games_dir = root / "games"
games_dir.mkdir(exist_ok=True)
blocks = []
for id_, (fn, db) in available.items():
    data = game_bytes(fn, db)
    (games_dir / f"{id_}.bin").write_bytes(data)
    print(f"games/{id_}.bin", round(len(data) / 1e6, 1), "MB")
    if "--no-offline" not in sys.argv:
        blocks.append(f'<script type="application/octet-stream" id="{id_}">{base64.b64encode(data).decode()}</script>')

(root / "index.html").write_text(page(list(available), ""), encoding="utf-8")
print("index.html", round((root / "index.html").stat().st_size / 1e6, 2), "MB")
if blocks:
    offline = page([], "\n".join(blocks))
    (root / "AstraClient.html").write_text(offline, encoding="utf-8")
    print("AstraClient.html", round(len(offline) / 1e6, 1), "MB")
