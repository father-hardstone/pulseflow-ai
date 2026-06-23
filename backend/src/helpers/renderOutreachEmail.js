function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphsFromBody(body) {
  return String(body || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function composeStructuredEmail(parts) {
  const blocks = [parts.greeting, parts.opening, parts.body, parts.cta, parts.signOff]
    .map((s) => String(s || "").trim())
    .filter(Boolean);
  return blocks.join("\n\n");
}

function resolveSenderName(user) {
  const full = String(user?.full_name || user?.fullName || "").trim();
  if (full) return full;
  const email = String(user?.email || "").trim();
  if (email.includes("@")) {
    const local = email.split("@")[0].split(/[._+-]/)[0];
    if (local) return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return "there";
}

const SENDER_PLACEHOLDER_RE = /\[\s*your\s+name\s*\]/gi;

function applySenderName(text, senderName) {
  const name = String(senderName || "").trim();
  if (!name) return String(text || "").trim();
  return String(text || "")
    .replace(SENDER_PLACEHOLDER_RE, name)
    .trim();
}

function renderOutreachHtml(body, { leadName, companyName } = {}) {
  const paras = paragraphsFromBody(body);
  const bodyHtml = paras
    .map(
      (p) =>
        `<p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#1e293b;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`
    )
    .join("");

  const meta =
    leadName || companyName
      ? `<p style="margin:0 0 20px;font-size:12px;color:#64748b;">${escapeHtml(
          [leadName, companyName].filter(Boolean).join(" · ")
        )}</p>`
      : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr>
          <td style="height:4px;background:linear-gradient(90deg,#6366f1,#8b5cf6);"></td>
        </tr>
        <tr>
          <td style="padding:32px 36px 28px;">
            ${meta}
            ${bodyHtml}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderDemoFooter(lead) {
  const name = `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "Lead";
  const bits = [`Demo send`, `Intended for ${name}`];
  if (lead.company_name) bits.push(lead.company_name);
  return bits.join(" · ");
}

function wrapDemoEmail(lead, body) {
  const leadName = `${lead.first_name || ""} ${lead.last_name || ""}`.trim();
  const text = String(body || "").trim();
  const html = renderOutreachHtml(text, {
    leadName: leadName && leadName !== "Team" ? leadName : null,
    companyName: lead.company_name || null,
  });
  const footer = renderDemoFooter(lead);
  return {
    text: `${text}\n\n—\n${footer}`,
    html: html.replace(
      "</body>",
      `<p style="margin:0;padding:16px;font-size:11px;color:#94a3b8;text-align:center;">${escapeHtml(footer)}</p></body>`
    ),
  };
}

module.exports = {
  composeStructuredEmail,
  paragraphsFromBody,
  renderOutreachHtml,
  wrapDemoEmail,
  resolveSenderName,
  applySenderName,
};
