const { store } = require("../store");
const { httpError } = require("../helpers/errors");
const config = require("../config");
const { sendViaResend } = require("./resendService");
const { sendViaMailtrap } = require("./mailtrapService");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 4;

function normalizeTarget(value) {
  return value === "real" ? "real" : "mailtrap";
}

function mapRecipient(r) {
  return {
    id: r.id,
    firstName: r.first_name ?? "",
    lastName: r.last_name ?? "",
    email: r.email,
    createdAt: r.created_at ?? null,
  };
}

async function getSettings(userId) {
  const user = await store.getUserById(userId);
  if (!user) throw httpError(404, "User not found");
  const recipients = await store.listDemoRecipients(userId);
  return {
    target: normalizeTarget(user.demo_email_target),
    recipients: recipients.map(mapRecipient),
    maxRecipients: MAX_RECIPIENTS,
  };
}

async function updateTarget(userId, target) {
  const t = normalizeTarget(target);
  await store.updateUser(userId, { demo_email_target: t });
  return getSettings(userId);
}

async function addRecipient(userId, { firstName, lastName, email }) {
  const norm = String(email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(norm)) throw httpError(400, "A valid email is required");
  const count = await store.countDemoRecipients(userId);
  if (count >= MAX_RECIPIENTS) {
    throw httpError(400, `You can add up to ${MAX_RECIPIENTS} test recipients.`);
  }
  const row = await store.insertDemoRecipient(userId, {
    firstName: String(firstName || "").trim(),
    lastName: String(lastName || "").trim(),
    email: norm,
  });
  return mapRecipient(row);
}

async function updateRecipient(userId, id, { firstName, lastName, email }) {
  const patch = {};
  if (firstName !== undefined) patch.first_name = String(firstName || "").trim();
  if (lastName !== undefined) patch.last_name = String(lastName || "").trim();
  if (email !== undefined) {
    const norm = String(email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(norm)) throw httpError(400, "A valid email is required");
    patch.email = norm;
  }
  const row = await store.updateDemoRecipient(userId, id, patch);
  if (!row) throw httpError(404, "Recipient not found");
  return mapRecipient(row);
}

async function removeRecipient(userId, id) {
  await store.deleteDemoRecipient(userId, id);
  return { ok: true };
}

const { wrapDemoEmail } = require("../helpers/renderOutreachEmail");

function stubDelivery(channel, lead, note) {
  return {
    channel,
    provider: "stub",
    stubbed: true,
    deliveredTo: [],
    intendedLead: lead.email,
    note,
  };
}

async function sendOutreachEmail({ userId, lead }) {
  if (!lead.generated_subject || !lead.generated_email) {
    throw httpError(400, "Generate the email before sending.");
  }

  const settings = await getSettings(userId);
  const subject = `[Demo] ${lead.generated_subject}`;
  const { text, html } = wrapDemoEmail(lead, lead.generated_email);

  if (settings.target === "real") {
    const emails = settings.recipients.map((r) => r.email);
    if (!emails.length) {
      return stubDelivery(
        "real",
        lead,
        "No test recipients configured — delivery skipped. Add recipients in Settings → Demo email to send via Resend."
      );
    }
    if (!config.isConfigured("resend")) {
      return stubDelivery(
        "real",
        lead,
        "Resend is not configured — delivery skipped. Set RESEND_API_KEY to send to test addresses."
      );
    }
    const result = await sendViaResend({ to: emails, subject, text, html });
    return {
      channel: "real",
      provider: result.provider,
      deliveredTo: emails,
      intendedLead: lead.email,
    };
  }

  if (!config.isConfigured("mailtrap")) {
    return stubDelivery(
      "mailtrap",
      lead,
      "Mailtrap is not configured — delivery skipped. Set MAILTRAP_API_TOKEN to capture demo sends."
    );
  }
  const inboxEmail = settings.recipients[0]?.email;
  const to = inboxEmail ? [inboxEmail] : ["demo@mailtrap.io"];
  const result = await sendViaMailtrap({ to, subject, text, html });
  return {
    channel: "mailtrap",
    provider: result.provider,
    deliveredTo: to,
    intendedLead: lead.email,
    note: "Open your Mailtrap inbox to view this message.",
  };
}

module.exports = {
  MAX_RECIPIENTS,
  getSettings,
  updateTarget,
  addRecipient,
  updateRecipient,
  removeRecipient,
  sendOutreachEmail,
};
