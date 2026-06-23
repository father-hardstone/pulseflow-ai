const config = require("../config");

async function probeHunterAccess() {
  const key = config.hunter.apiKey;
  if (!key) {
    return { configured: false, accessible: false, message: "HUNTER_API_KEY is not set" };
  }

  try {
    const url = new URL("https://api.hunter.io/v2/account");
    url.searchParams.set("api_key", key);
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const body = await res.json().catch(() => ({}));

    if (!res.ok || body.errors) {
      const err = body.errors?.[0];
      return {
        configured: true,
        accessible: false,
        status: res.status,
        message: err?.details || err?.id || `Hunter API returned HTTP ${res.status}`,
      };
    }

    const credits = body.data?.requests?.searches;
    return {
      configured: true,
      accessible: true,
      status: res.status,
      message: "Hunter API is accessible",
      plan: body.data?.plan_name || null,
      searchesRemaining: credits ? Math.max(0, (credits.available || 0) - (credits.used || 0)) : null,
    };
  } catch (err) {
    return { configured: true, accessible: false, message: err.message };
  }
}

module.exports = { probeHunterAccess };
