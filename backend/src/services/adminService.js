const config = require("../config");
const { store } = require("../store");
const { httpError } = require("../helpers/errors");

async function getPlatformStats() {
  return store.getPlatformStats();
}

async function listUsers() {
  return store.listAllUsers();
}

async function getUser(id) {
  const user = await store.getUserWithStats(id);
  if (!user) throw httpError(404, "User not found");
  return user;
}

async function setUserActive(id, isActive) {
  const user = await store.updateUser(id, { is_active: isActive });
  if (!user) throw httpError(404, "User not found");
  return user;
}

async function deleteUser(id) {
  const ok = await store.deleteUser(id);
  if (!ok) throw httpError(404, "User not found");
  return { id };
}

async function listKnowledge() {
  return store.listAllKnowledge();
}

async function deleteKnowledge(id) {
  const item = await store.getKnowledge(id);
  if (!item) throw httpError(404, "Knowledge item not found");
  await store.deleteKnowledge(id);
  return { id };
}

async function listLeads() {
  return store.listAllLeads();
}

async function deleteLead(id) {
  const lead = await store.getLead(id);
  if (!lead) throw httpError(404, "Lead not found");
  await store.deleteLead(id);
  return { id };
}

async function listAdmins() {
  return store.listAdmins();
}

function getIntegrationStatus() {
  return {
    auth: config.isConfigured("auth"),
    adminAuth: config.isConfigured("adminAuth"),
    supabase: config.isConfigured("supabase"),
    embeddings: config.isConfigured("embeddings"),
    llm: config.isConfigured("llm"),
    llmProvider: config.activeLlmProvider(),
    llmModel: config.activeLlmModel(),
    apollo: config.isConfigured("apollo"),
    n8n: config.isConfigured("n8n"),
    hunter: config.isConfigured("hunter"),
  };
}

module.exports = {
  getPlatformStats,
  listUsers,
  getUser,
  setUserActive,
  deleteUser,
  listKnowledge,
  deleteKnowledge,
  listLeads,
  deleteLead,
  listAdmins,
  getIntegrationStatus,
};
