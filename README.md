# Astra Client

Eaglercraft launcher website with a blue Astra title screen, built-in capes, an in-game mod menu (Right Shift) and optional accounts that save your presets.

Versions: EaglercraftX 1.8.8 (JS and WASM-GC), Eaglercraft 1.12.2, Eaglercraft 1.5.2.

## Deploying on Vercel

1. Import this repo in Vercel (no build command, output is the repo root).
2. Accounts need two things in **Project Settings**:
   - **Storage → Marketplace → Upstash for Redis** (connect it to the project; it adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`).
   - Optional: **Environment Variables → `AUTH_SECRET`**, a long random string (`openssl rand -hex 32`). If you skip it, one is derived from the database token.
3. Redeploy (env vars only apply to new deployments). Without these the site and games still work, only log in / sign up is disabled.

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

## Rebuilding

Put the original Eaglercraft offline files in the project root, then:

```bash
python3 src/make_pack.py && python3 src/build.py
```

Eaglercraft is made by lax1dude, ayunami2000 and contributors. Not affiliated with Mojang or Microsoft.
