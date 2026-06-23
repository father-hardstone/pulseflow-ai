const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config");
const { store } = require("../store");
const { httpError } = require("../helpers/errors");
const { requireConfig } = require("../helpers/requireConfig");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function publicAdmin(a) {
  return {
    id: a.id,
    email: a.email,
    fullName: a.full_name ?? a.fullName ?? null,
    role: a.role || "admin",
    createdAt: a.created_at ?? null,
  };
}

function signAdminTokens(admin) {
  const accessToken = jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role, typ: "admin" },
    config.adminJwt.accessSecret,
    { expiresIn: config.adminJwt.accessTtl }
  );
  const refreshToken = jwt.sign(
    { sub: admin.id, typ: "admin", type: "refresh" },
    config.adminJwt.refreshSecret,
    { expiresIn: config.adminJwt.refreshTtl }
  );
  return { accessToken, refreshToken };
}

function verifyAdminAccess(token) {
  return jwt.verify(token, config.adminJwt.accessSecret);
}

async function login({ email, password }) {
  requireConfig("adminAuth");
  const normEmail = normalizeEmail(email);
  const admin = await store.getAdminByEmail(normEmail);
  if (!admin || admin.is_active === false) {
    throw httpError(401, "Invalid admin credentials");
  }

  const ok = await bcrypt.compare(String(password || ""), admin.password_hash);
  if (!ok) throw httpError(401, "Invalid admin credentials");

  return { admin: publicAdmin(admin), ...signAdminTokens(admin) };
}

async function refresh(refreshToken) {
  requireConfig("adminAuth");
  if (!refreshToken) throw httpError(400, "Missing refresh token");

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, config.adminJwt.refreshSecret);
  } catch {
    throw httpError(401, "Invalid or expired refresh token");
  }
  if (decoded.typ !== "admin") throw httpError(401, "Invalid token type");

  const admin = await store.getAdminById(decoded.sub);
  if (!admin || admin.is_active === false) {
    throw httpError(401, "Admin no longer exists");
  }

  const accessToken = jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role, typ: "admin" },
    config.adminJwt.accessSecret,
    { expiresIn: config.adminJwt.accessTtl }
  );
  return { accessToken };
}

async function me(adminId) {
  requireConfig("adminAuth");
  const admin = await store.getAdminById(adminId);
  if (!admin || admin.is_active === false) throw httpError(404, "Admin not found");
  return publicAdmin(admin);
}

async function createAdmin({ email, password, fullName, role = "admin" }, actor) {
  requireConfig("adminAuth");
  if (actor.role !== "super_admin") {
    throw httpError(403, "Only super admins can create admin accounts");
  }

  const normEmail = normalizeEmail(email);
  if (!EMAIL_RE.test(normEmail)) throw httpError(400, "A valid email is required");
  if (!password || String(password).length < 10) {
    throw httpError(400, "Admin password must be at least 10 characters");
  }

  const existing = await store.getAdminByEmail(normEmail);
  if (existing) throw httpError(409, "Admin email is already registered");

  const passwordHash = await bcrypt.hash(String(password), 12);
  const admin = await store.createAdmin({
    email: normEmail,
    passwordHash,
    fullName,
    role: role === "super_admin" ? "super_admin" : "admin",
  });
  return publicAdmin(admin);
}

async function updateProfile(adminId, { fullName }) {
  requireConfig("adminAuth");
  const patch = {};
  if (fullName !== undefined) patch.full_name = String(fullName || "").trim() || null;
  if (!Object.keys(patch).length) {
    throw httpError(400, "No profile fields to update");
  }
  const admin = await store.updateAdmin(adminId, patch);
  if (!admin) throw httpError(404, "Admin not found");
  return publicAdmin(admin);
}

async function changePassword(adminId, { currentPassword, newPassword }) {
  requireConfig("adminAuth");
  const admin = await store.getAdminById(adminId);
  if (!admin || admin.is_active === false) throw httpError(404, "Admin not found");

  const ok = await bcrypt.compare(String(currentPassword || ""), admin.password_hash);
  if (!ok) throw httpError(401, "Current password is incorrect");

  if (!newPassword || String(newPassword).length < 10) {
    throw httpError(400, "New password must be at least 10 characters");
  }

  const passwordHash = await bcrypt.hash(String(newPassword), 12);
  await store.updateAdmin(adminId, { password_hash: passwordHash });
  return { ok: true };
}

async function bootstrapFirstAdmin() {
  if (!config.admin.bootstrapEmail || !config.admin.bootstrapPassword) return false;
  requireConfig("adminAuth");

  const count = await store.countAdmins();
  if (count > 0) return false;

  const email = normalizeEmail(config.admin.bootstrapEmail);
  const passwordHash = await bcrypt.hash(String(config.admin.bootstrapPassword), 12);
  await store.createAdmin({
    email,
    passwordHash,
    fullName: "Bootstrap Admin",
    role: "super_admin",
  });
  // eslint-disable-next-line no-console
  console.log(`[admin] Bootstrapped first super_admin: ${email}`);
  return true;
}

module.exports = {
  login,
  refresh,
  me,
  createAdmin,
  updateProfile,
  changePassword,
  bootstrapFirstAdmin,
  verifyAdminAccess,
  publicAdmin,
};
