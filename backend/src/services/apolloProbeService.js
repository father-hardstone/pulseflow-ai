const config = require("../config");

// Probes whether this API key can call People Search (required for campaigns).
async function probePeopleSearchAccess() {
  const key = config.apollo.apiKey;
  if (!key) {
    return { configured: false, accessible: false, message: "APOLLO_API_KEY is not set" };
  }

  try {
    const res = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": key },
      body: JSON.stringify({ page: 1, per_page: 1, person_titles: ["CEO"] }),
      signal: AbortSignal.timeout(10000),
    });
    const body = await res.json().catch(() => ({}));

    if (res.status === 403 || body.error_code === "API_INACCESSIBLE") {
      return {
        configured: true,
        accessible: false,
        status: res.status,
        message:
          body.error ||
          "Apollo People Search API is not available on your current plan. Upgrade at https://app.apollo.io/",
        upgradeUrl: "https://app.apollo.io/#/settings/plans/upgrade",
      };
    }

    if (!res.ok) {
      return {
        configured: true,
        accessible: false,
        status: res.status,
        message: body.error || body.message || `Apollo API returned HTTP ${res.status}`,
      };
    }

    return {
      configured: true,
      accessible: true,
      status: res.status,
      message: "People Search API is accessible",
    };
  } catch (err) {
    return {
      configured: true,
      accessible: false,
      message: `Could not reach Apollo API: ${err.message}`,
    };
  }
}

module.exports = { probePeopleSearchAccess };
