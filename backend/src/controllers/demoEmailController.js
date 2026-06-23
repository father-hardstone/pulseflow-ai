const demoEmail = require("../services/demoEmailService");
const { httpError } = require("../helpers/errors");

async function getDemoEmail(req, res) {
  const settings = await demoEmail.getSettings(req.user.id);
  res.json({ ok: true, ...settings });
}

async function patchDemoEmail(req, res) {
  const { target } = req.body || {};
  if (target === undefined) {
    throw httpError(400, "target is required (mailtrap | real)");
  }
  const settings = await demoEmail.updateTarget(req.user.id, target);
  res.json({ ok: true, ...settings });
}

async function addRecipient(req, res) {
  const { firstName, lastName, email } = req.body || {};
  const recipient = await demoEmail.addRecipient(req.user.id, { firstName, lastName, email });
  res.status(201).json({ ok: true, recipient });
}

async function patchRecipient(req, res) {
  const { firstName, lastName, email } = req.body || {};
  const recipient = await demoEmail.updateRecipient(req.user.id, req.params.id, {
    firstName,
    lastName,
    email,
  });
  res.json({ ok: true, recipient });
}

async function removeRecipient(req, res) {
  await demoEmail.removeRecipient(req.user.id, req.params.id);
  res.json({ ok: true });
}

module.exports = {
  getDemoEmail,
  patchDemoEmail,
  addRecipient,
  patchRecipient,
  removeRecipient,
};
