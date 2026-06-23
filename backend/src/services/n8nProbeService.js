const config = require("../config");

// POST probe — 404 means workflow not imported/active; any other response means registered.
async function probeLaunchWebhook() {
  const url = config.n8n.launchWebhookUrl;
  if (!url) {
    return { configured: false, live: false, url: null, status: null };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "health_probe",
        userId: "00000000-0000-0000-0000-000000000000",
        objective: "",
        filters: { jobTitle: "probe", limit: 1 },
      }),
      signal: AbortSignal.timeout(8000),
    });
    return {
      configured: true,
      live: res.status !== 404,
      url,
      status: res.status,
    };
  } catch {
    return { configured: true, live: false, url, status: null };
  }
}

module.exports = { probeLaunchWebhook };
