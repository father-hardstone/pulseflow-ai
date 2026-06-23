const authService = require("../services/authService");

async function signup(req, res) {
  const { email, password, fullName } = req.body || {};
  const result = await authService.signup({ email, password, fullName });
  res.status(201).json({ ok: true, ...result });
}

async function login(req, res) {
  const { email, password } = req.body || {};
  const result = await authService.login({ email, password });
  res.json({ ok: true, ...result });
}

async function refresh(req, res) {
  const { refreshToken } = req.body || {};
  const result = await authService.refresh(refreshToken);
  res.json({ ok: true, ...result });
}

async function logout(_req, res) {
  // Stateless JWT: client discards tokens. Endpoint exists for symmetry and
  // future refresh-token revocation lists.
  res.json({ ok: true });
}

async function me(req, res) {
  const user = await authService.me(req.user.id);
  res.json({ ok: true, user });
}

async function updateMe(req, res) {
  const { fullName, llmProvider } = req.body || {};
  const user = await authService.updateProfile(req.user.id, { fullName, llmProvider });
  res.json({ ok: true, user });
}

module.exports = { signup, login, refresh, logout, me, updateMe };
