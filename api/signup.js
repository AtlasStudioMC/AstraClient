const { redis, httpError, hashPassword, makeToken, USERNAME_RE, userKey, cleanPresets, rateLimit, handler } = require("./_lib");

module.exports = handler(async (req, body) => {
  if (req.method !== "POST") throw httpError(405, "Use POST");
  const { username = "", password = "", presets } = body;
  if (!USERNAME_RE.test(username)) throw httpError(400, "Username must be 3-16 letters, numbers or _");
  if (typeof password !== "string" || password.length < 8 || password.length > 200)
    throw httpError(400, "Password must be at least 8 characters");
  await rateLimit(req, "signup", 5, 3600);
  const user = { username, password: hashPassword(password), presets: cleanPresets(presets), created: Date.now() };
  const ok = await redis("SET", userKey(username), JSON.stringify(user), "NX");
  if (ok !== "OK") throw httpError(409, "That username is taken");
  return { token: makeToken(username), username, presets: user.presets };
});
