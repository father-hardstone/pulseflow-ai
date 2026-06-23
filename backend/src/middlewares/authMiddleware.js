const config = require("../config");
const { httpError } = require("../helpers/errors");
const { requireConfig } = require("../helpers/requireConfig");
const { verifyAccess } = require("../services/authService");

// Protects private routes: requires a valid Bearer access token.
function authRequired(req, _res, next) {
  try {
    requireConfig("auth");
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw httpError(401, "Authentication required");
    }

    let decoded;
    try {
      decoded = verifyAccess(token);
    } catch {
      throw httpError(401, "Invalid or expired token");
    }

    if (decoded.typ && decoded.typ !== "user") {
      throw httpError(401, "Invalid token type");
    }

    req.user = { id: decoded.sub, email: decoded.email };
    next();
  } catch (err) {
    next(err);
  }
}

// Protects worker endpoints called by n8n (shared secret header).
function workerAuth(req, _res, next) {
  try {
    requireConfig("worker");
    const provided = req.headers["x-worker-secret"];
    if (!provided || provided !== config.worker.secret) {
      throw httpError(401, "Invalid worker secret");
    }
    next();
  } catch (err) {
    next(err);
  }
}

const { verifyAdminAccess } = require("../services/adminAuthService");

// Protects admin routes: requires a valid admin Bearer token (typ=admin).
function adminAuthRequired(req, _res, next) {
  try {
    requireConfig("adminAuth");
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw httpError(401, "Admin authentication required");
    }

    let decoded;
    try {
      decoded = verifyAdminAccess(token);
    } catch {
      throw httpError(401, "Invalid or expired admin token");
    }
    if (decoded.typ !== "admin") {
      throw httpError(401, "Invalid token type");
    }

    req.admin = { id: decoded.sub, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authRequired, workerAuth, adminAuthRequired };
