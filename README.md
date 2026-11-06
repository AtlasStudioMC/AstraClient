# Ladue Client

Live at https://ladue.js.org

Browser Minecraft launcher website with a blue Ladue title screen, built-in capes, an in-game mod menu (Right Shift) and optional accounts that save your presets.

Versions: 1.8.8 (JS and WASM-GC), 1.12.2 and 1.5.2 in the browser, plus 26.2 (Java Edition) on the Ladue server.

## Legal

This repo ships **original code only** — see `LICENSE`. The actual Minecraft
game builds (Eaglercraft) are **not committed here** and must be hosted
separately by whoever deploys this (see "Hosting the game files" below).
Read `NOTICE.md` for the full disclaimer and a DMCA/takedown contact.

## Hosting the game files

`src/build.py` turns the original offline Eaglercraft HTML files (which you
must supply yourself — they are not in this repo) into `games/*.bin`. That
folder is gitignored, so a plain `git push` will NOT deploy them.

Two ways to get them onto Vercel:

1. **Vercel CLI, deployed directly from your machine** (recommended): after
   running `src/build.py` locally, run `vercel --prod` from the project root.
   The CLI uploads the local filesystem, `games/` included, regardless of
   what's tracked in git.
2. **External storage**: upload `games/*.bin` to Vercel Blob, R2, or similar,
   and point `src/engine.js`'s fetch URL at that host instead of `games/`.

Either way, the binaries never need to touch the public git history.

## Deploying on Vercel

1. Import this repo in Vercel (no build command, output is the repo root).
2. Accounts need two things in **Project Settings**:
   - **Storage → Marketplace → Upstash for Redis** (connect it to the project; it adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`).
   - Optional: **Environment Variables → `AUTH_SECRET`**, a long random string (`openssl rand -hex 32`). If you skip it, one is derived from the database token.
3. Redeploy (env vars only apply to new deployments). Without these the site and games still work, only log in / sign up is disabled.

## Name tag for Astra players (server side)

Astra tells servers its name is `Astra (eagler)` on 1.8.8 and `Astra (vanilla)` on 1.12.2.
The bundled plugin reads that and puts a tag in front of those players' names - above their
head and in the tab list - which **everyone** on the server sees, including players on other clients.

1. Build it: `cd server-plugin && mvn package` (produces `target/astratag-1.0.0.jar`).
2. Drop the jar in your server's `plugins/` folder and restart. Works on Spigot/Paper 1.8 through current.
3. Edit `plugins/AstraTag/config.yml` to change the tag (`prefix`, default `&b[A] &r`), then `/astratag reload`.

Commands (op only): `/astratag check <player>` shows what client a player reports,
`/astratag give|take <player>` tags someone by hand, `/astratag reload` re-reads the config.
Players with the permission `astratag.always` are tagged regardless of client.

Note: on a proxy setup (EaglerXBungee/Velocity) install this on the backend Spigot/Paper server.

## Project layout

| Path | What it is |
|---|---|
| `index.html` | Built website + launcher (generated) |
| `games/*.bin` | Gzipped game files, downloaded when you press Play (generated) |
| `api/` | Vercel serverless functions: `signup`, `login`, `presets` |
| `src/launcher.html` | Website and launcher source |
| `src/engine.js` | Game unpacking, title-screen pack install, cape/username profile writer |
| `src/astra-overlay.js` | In-game mod menu and HUD mods |
| `src/make_pack.py` | Generates title-screen textures and capes |
| `src/build.py` | Builds `index.html`, `games/` and the offline `AstraClient.html` |
| `server-plugin/` | Spigot plugin that tags Astra players on your server |

## Rebuilding

Put the original offline game HTML files in the project root, then:

```bash
python3 src/make_pack.py && python3 src/build.py
```

## Credits

Astra is a launcher and mod layer built on the open-source browser ports of Minecraft by lax1dude, ayunami2000 and contributors. Minecraft is a trademark of Mojang Studios; Astra is not affiliated with Mojang or Microsoft.
