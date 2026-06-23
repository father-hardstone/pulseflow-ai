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

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name ?? u.fullName ?? null,
    llmProvider: u.llm_provider === "groq" ? "groq" : "gemini",
    createdAt: u.created_at ?? null,
  };
}

function signTokens(user) {
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, typ: "user" },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessTtl }
  );
  const refreshToken = jwt.sign(
    { sub: user.id, type: "refresh", typ: "user" },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshTtl }
  );
  return { accessToken, refreshToken };
}

function verifyAccess(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

async function signup({ email, password, fullName }) {
  requireConfig("auth");
  const normEmail = normalizeEmail(email);
  if (!EMAIL_RE.test(normEmail)) throw httpError(400, "A valid email is required");
  if (!password || String(password).length < 8) {
    throw httpError(400, "Password must be at least 8 characters");
  }

  const existing = await store.getUserByEmail(normEmail);
  if (existing) throw httpError(409, "Email is already registered");

  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = await store.createUser({ email: normEmail, passwordHash, fullName });
  return { user: publicUser(user), ...signTokens(user) };
}

async function login({ email, password }) {
  requireConfig("auth");
  const normEmail = normalizeEmail(email);
  const user = await store.getUserByEmail(normEmail);
  if (!user) throw httpError(401, "Invalid email or password");
  if (user.is_active === false) throw httpError(403, "Account is disabled");

  const ok = await bcrypt.compare(String(password || ""), user.password_hash);
  if (!ok) throw httpError(401, "Invalid email or password");

  return { user: publicUser(user), ...signTokens(user) };
}

async function refresh(refreshToken) {
  requireConfig("auth");
  if (!refreshToken) throw httpError(400, "Missing refresh token");

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch {
    throw httpError(401, "Invalid or expired refresh token");
  }

  const user = await store.getUserById(decoded.sub);
  if (!user) throw httpError(401, "User no longer exists");

  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, typ: "user" },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessTtl }
  );
  return { accessToken };
}

async function me(userId) {
  requireConfig("auth");
  const user = await store.getUserById(userId);
  if (!user) throw httpError(404, "User not found");
  return publicUser(user);
}

async function updateProfile(userId, { fullName, llmProvider } = {}) {
  requireConfig("auth");
  const user = await store.getUserById(userId);
  if (!user) throw httpError(404, "User not found");

  const patch = {};
  if (fullName !== undefined) {
    patch.full_name = String(fullName || "").trim() || null;
  }
  if (llmProvider !== undefined) {
    const p = llmProvider === "groq" ? "groq" : "gemini";
    if (!config.isLlmProviderConfigured(p)) {
      const missing = config.missingForLlm(p);
      throw httpError(
        503,
        `${p === "groq" ? "Groq" : "Gemini"} is not available. Missing env var(s): ${missing.join(", ")}.`,
        { capability: "llm", missing }
      );
    }
    patch.llm_provider = p;
  }

  if (Object.keys(patch).length === 0) {
    return publicUser(user);
  }

  const updated = await store.updateUser(userId, patch);
  return publicUser(updated);
}

module.exports = { signup, login, refresh, me, updateProfile, verifyAccess, publicUser };
