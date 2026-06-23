const adminAuthService = require("../services/adminAuthService");

async function login(req, res) {
  const { email, password } = req.body || {};
  const result = await adminAuthService.login({ email, password });
  res.json({ ok: true, ...result });
}

async function refresh(req, res) {
  const { refreshToken } = req.body || {};
  const result = await adminAuthService.refresh(refreshToken);
  res.json({ ok: true, ...result });
}

async function logout(_req, res) {
  res.json({ ok: true });
}

async function me(req, res) {
  const admin = await adminAuthService.me(req.admin.id);
  res.json({ ok: true, admin });
}

async function createAdmin(req, res) {
  const { email, password, fullName, role } = req.body || {};
  const admin = await adminAuthService.createAdmin(
    { email, password, fullName, role },
    req.admin
  );
  res.status(201).json({ ok: true, admin });
}

async function updateMe(req, res) {
  const { fullName } = req.body || {};
  const admin = await adminAuthService.updateProfile(req.admin.id, { fullName });
  res.json({ ok: true, admin });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  await adminAuthService.changePassword(req.admin.id, { currentPassword, newPassword });
  res.json({ ok: true });
}

module.exports = { login, refresh, logout, me, createAdmin, updateMe, changePassword };
