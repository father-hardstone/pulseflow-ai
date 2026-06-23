function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderPlainTextAsHtml(text) {
  // Preserve line breaks and spacing in a readable way.
  return escapeHtml(text).replace(/\r?\n/g, "<br/>");
}

function renderEmailHtml({ subject, body, meta = {} }) {
  const title = "Ready to send email";
  const toneLine = meta?.tone ? `Tone: ${escapeHtml(meta.tone)}` : "";
  const recipient = meta?.recipient || {};
  const sendingStubLine = meta?.sendingStub
    ? "Email sending mechanism is a stub (not sending)."
    : "";

  const usage = meta?.usage || {};
  const timing = meta?.timing || {};
  const model = meta?.model ? `Model: ${escapeHtml(meta.model)}` : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Liberation Sans", sans-serif; margin: 24px; color: #111; }
      .container { max-width: 640px; margin: 0 auto; }
      .topbar { background: #111827; color: #fff; border-radius: 10px; padding: 10px 12px; margin-bottom: 14px; font-size: 12px; font-weight: 600; letter-spacing: 0.2px; }
      h1 { font-size: 18px; margin: 0 0 12px; }
      h2 { font-size: 13px; margin: 18px 0 8px; color: #111; }
      .subtle { color: #555; font-size: 12px; }
      .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; background: #fff; }
      .email-subject { font-weight: 600; margin-bottom: 10px; }
      .email-body { font-size: 14px; line-height: 1.55; white-space: normal; }
      .log { border: 1px dashed #d1d5db; border-radius: 10px; padding: 12px; background: #fafafa; }
      .kv { display: grid; grid-template-columns: 180px 1fr; gap: 6px 12px; font-size: 12px; }
      .k { color: #555; }
      .v { color: #111; word-break: break-word; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="topbar">Email Automation Demo</div>
      <h1>${escapeHtml(title)}</h1>

      <div class="card">
        <div class="email-subject">${escapeHtml(subject || "(no subject)")}</div>
        <div class="email-body">${renderPlainTextAsHtml(body || "")}</div>
      </div>

      <h2>Technical log</h2>
      <div class="log">
        <div class="subtle">${escapeHtml(sendingStubLine)}</div>
        <div style="height: 10px"></div>
        <div class="kv">
          <div class="k">Recipient</div>
          <div class="v">${escapeHtml(recipient.name || "")}${recipient.email ? ` &lt;${escapeHtml(recipient.email)}&gt;` : ""}</div>

          <div class="k">Profile</div>
          <div class="v">${escapeHtml(recipient.profession || "")}</div>

          <div class="k">Request time</div>
          <div class="v">${escapeHtml(String(timing.totalElapsedMs ?? ""))}${timing.totalElapsedMs !== undefined ? " ms" : ""}</div>

          <div class="k">Gemini time</div>
          <div class="v">${escapeHtml(String(timing.geminiElapsedMs ?? ""))}${timing.geminiElapsedMs !== undefined ? " ms" : ""}</div>

          <div class="k">Model</div>
          <div class="v">${model ? model.replace(/^Model:\s*/, "") : ""}</div>

          <div class="k">Tokens (prompt)</div>
          <div class="v">${escapeHtml(String(usage.promptTokenCount ?? ""))}</div>

          <div class="k">Tokens (candidates)</div>
          <div class="v">${escapeHtml(String(usage.candidatesTokenCount ?? ""))}</div>

          <div class="k">Tokens (total)</div>
          <div class="v">${escapeHtml(String(usage.totalTokenCount ?? ""))}</div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

module.exports = { renderEmailHtml };

