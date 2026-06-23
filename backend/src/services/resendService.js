const config = require("../config");
const { httpError } = require("../helpers/errors");

async function sendViaResend({ to, subject, text, html }) {
  if (!config.resend.apiKey) {
    throw httpError(503, "Resend is not configured. Set RESEND_API_KEY.");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resend.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${config.resend.fromName} <${config.resend.fromEmail}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      html,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw httpError(502, `Resend failed: ${data?.message || res.statusText}`, { provider: "resend", data });
  }
  return { provider: "resend", id: data.id };
}

module.exports = { sendViaResend };
