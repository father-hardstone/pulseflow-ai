const adminService = require("../services/adminService");
const { httpError } = require("../helpers/errors");

async function stats(_req, res) {
  const stats = await adminService.getPlatformStats();
  res.json({ ok: true, stats });
}

async function integrations(_req, res) {
  res.json({ ok: true, configured: adminService.getIntegrationStatus() });
}

async function listUsers(_req, res) {
  const users = await adminService.listUsers();
  res.json({ ok: true, users });
}

async function getUser(req, res) {
  const user = await adminService.getUser(req.params.id);
  res.json({ ok: true, user });
}

async function patchUser(req, res) {
  const { isActive } = req.body || {};
  if (typeof isActive !== "boolean") {
    throw httpError(400, "isActive (boolean) is required");
  }
  const user = await adminService.setUserActive(req.params.id, isActive);
  res.json({ ok: true, user });
}

async function removeUser(req, res) {
  const result = await adminService.deleteUser(req.params.id);
  res.json({ ok: true, ...result });
}

async function listKnowledge(_req, res) {
  const items = await adminService.listKnowledge();
  res.json({ ok: true, items });
}

async function removeKnowledge(req, res) {
  const result = await adminService.deleteKnowledge(req.params.id);
  res.json({ ok: true, ...result });
}

async function listLeads(_req, res) {
  const leads = await adminService.listLeads();
  res.json({ ok: true, leads });
}

async function removeLead(req, res) {
  const result = await adminService.deleteLead(req.params.id);
  res.json({ ok: true, ...result });
}

async function listAdmins(_req, res) {
  const admins = await adminService.listAdmins();
  res.json({ ok: true, admins });
}

module.exports = {
  stats,
  integrations,
  listUsers,
  getUser,
  patchUser,
  removeUser,
  listKnowledge,
  removeKnowledge,
  listLeads,
  removeLead,
  listAdmins,
};
