// Shared helpers for Astra account API (Vercel serverless, no dependencies).
// Storage: Upstash Redis REST (Vercel Marketplace "Upstash for Redis" sets these env vars).
const crypto = require("crypto");

// Vercel may prefix these (e.g. STORAGE_KV_REST_API_URL), so match by suffix
function env(...suffixes) {
  for (const suf of suffixes) {
    if (process.env[suf]) return process.env[suf];
    const key = Object.keys(process.env).find((k) => k.endsWith("_" + suf) && process.env[k]);
    if (key) return process.env[key];
  }
}
const REDIS_URL = env("KV_REST_API_URL", "UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = env("KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN");
// AUTH_SECRET is optional: fall back to a key derived from the private database token
const SECRET = process.env.AUTH_SECRET ||
  (REDIS_TOKEN ? crypto.createHash("sha256").update("astra-session:" + REDIS_TOKEN).digest("hex") : undefined);
const SESSION_DAYS = 30;

async function redis(...cmd) {
  if (!REDIS_URL || !REDIS_TOKEN) throw httpError(500, "Accounts need a database: connect Upstash for Redis in Vercel, then redeploy");
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${REDIS_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const data = await res.json();
  if (data.error) throw httpError(500, "Database error");
  return data.result;
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function checkPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const test = crypto.scryptSync(password, salt, 64);
  const real = Buffer.from(hash, "hex");
  return real.length === test.length && crypto.timingSafeEqual(real, test);
}

function sign(payload) {
  if (!SECRET) throw httpError(500, "Accounts are not configured on this server yet");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function makeToken(username) {
  return sign({ u: username, exp: Date.now() + SESSION_DAYS * 864e5 });
}

function readToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const [body, mac] = token.split(".");
  if (!body || !mac || !SECRET) throw httpError(401, "Please log in");
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected)))
    throw httpError(401, "Please log in");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString());
  if (payload.exp < Date.now()) throw httpError(401, "Session expired, please log in again");
  return payload.u;
}

const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
const userKey = (name) => `astra:user:${name.toLowerCase()}`;

// keep only the preset fields the launcher uses, with sane sizes
function cleanPresets(p) {
  const out = { cosmetics: {}, mods: {}, settings: {} };
  if (!p || typeof p !== "object") return out;
  for (const k of Object.keys(out)) {
    const src = p[k];
    if (!src || typeof src !== "object") continue;
    for (const [key, val] of Object.entries(src).slice(0, 80)) {
      if (!/^[A-Za-z0-9_]{1,32}$/.test(key)) continue;
      if (typeof val === "boolean" || typeof val === "number") out[k][key] = val;
      else if (typeof val === "string" && val.length <= 64) out[k][key] = val;
    }
  }
  return out;
}

async function rateLimit(req, bucket, limit, windowSec) {
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const key = `astra:rl:${bucket}:${ip}`;
  const n = await redis("INCR", key);
  if (n === 1) await redis("EXPIRE", key, windowSec);
  if (n > limit) throw httpError(429, "Too many attempts, try again in a few minutes");
}

function handler(fn) {
  return async (req, res) => {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const result = await fn(req, body);
      res.status(200).json(result);
    } catch (e) {
      res.status(e.status || 500).json({ error: e.status ? e.message : "Something went wrong" });
    }
  };
}

module.exports = { redis, httpError, hashPassword, checkPassword, makeToken, readToken, USERNAME_RE, userKey, cleanPresets, rateLimit, handler };
