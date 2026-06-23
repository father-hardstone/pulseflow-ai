const { requireConfig } = require("../helpers/requireConfig");
const { createSupabaseStore } = require("./supabaseStore");

// Supabase is the sole datastore (no fallback). The store is created lazily and
// every access fails fast if Supabase env vars are missing.
let instance = null;

function build() {
  requireConfig("supabase");
  if (!instance) instance = createSupabaseStore();
  return instance;
}

const store = new Proxy(
  {},
  {
    get(_target, prop) {
      const s = build();
      const value = s[prop];
      return typeof value === "function" ? value.bind(s) : value;
    },
  }
);

module.exports = { store };
