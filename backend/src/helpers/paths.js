const path = require("node:path");
const os = require("node:os");

// Resolve from this file's location so paths are stable regardless of the
// process working directory (important on serverless platforms like Vercel).
const PROJECT_ROOT = path.join(__dirname, "..", "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data");

function rootPath(...parts) {
  return path.join(PROJECT_ROOT, ...parts);
}

function dataPath(...parts) {
  return path.join(DATA_DIR, ...parts);
}

// Writable location for runtime state. On serverless filesystems (read-only
// except /tmp) we must write under the OS temp dir.
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const WRITABLE_DIR = IS_SERVERLESS ? os.tmpdir() : DATA_DIR;

function writablePath(...parts) {
  return path.join(WRITABLE_DIR, ...parts);
}

module.exports = { rootPath, dataPath, writablePath, PROJECT_ROOT, DATA_DIR, IS_SERVERLESS };
