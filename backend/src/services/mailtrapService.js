const config = require("../config");
const { httpError } = require("../helpers/errors");

// Mailtrap Email Sandbox — messages appear in your Mailtrap inbox (no real delivery).
async function sendViaMailtrap({ to, subject, text, html }) {
  if (!config.mailtrap.apiToken) {
    throw httpError(503, "Mailtrap is not configured. Set MAILTRAP_API_TOKEN.");
  }

  const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));

  const res = await fetch("https://sandbox.api.mailtrap.io/api/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.mailtrap.apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      from: { email: config.mailtrap.fromEmail, name: config.mailtrap.fromName },
      to: recipients,
      subject,
      text,
      html: html || text.replace(/\n/g, "<br>"),
      category: "PulseFlow Demo",
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.errors?.[0] || data?.message || res.statusText;
    throw httpError(502, `Mailtrap failed: ${msg}`, { provider: "mailtrap", data });
  }
  return { provider: "mailtrap", success: data.success !== false };
}

module.exports = { sendViaMailtrap };
