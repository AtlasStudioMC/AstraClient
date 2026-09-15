const { redis, httpError, checkPassword, makeToken, userKey, rateLimit, handler } = require("./_lib");

module.exports = handler(async (req, body) => {
  if (req.method !== "POST") throw httpError(405, "Use POST");
  const { username = "", password = "" } = body;
  await rateLimit(req, "login", 10, 600);
  const raw = typeof username === "string" && username ? await redis("GET", userKey(username)) : null;
  const user = raw && JSON.parse(raw);
  if (!user || typeof password !== "string" || !checkPassword(password, user.password))
    throw httpError(401, "Wrong username or password");
  return { token: makeToken(user.username), username: user.username, presets: user.presets };
});
