const { redis, httpError, readToken, userKey, cleanPresets, handler } = require("./_lib");

module.exports = handler(async (req, body) => {
  const name = readToken(req);
  const raw = await redis("GET", userKey(name));
  if (!raw) throw httpError(401, "Please log in");
  const user = JSON.parse(raw);
  if (req.method === "GET") return { username: user.username, presets: user.presets };
  if (req.method === "PUT") {
    user.presets = cleanPresets(body);
    user.updated = Date.now();
    await redis("SET", userKey(name), JSON.stringify(user));
    return { ok: true };
  }
  throw httpError(405, "Use GET or PUT");
});
