const fs = require("node:fs/promises");

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function findLead(leads, leadIdOrEmail) {
  if (!leadIdOrEmail) return null;
  const needle = String(leadIdOrEmail).trim().toLowerCase();
  return (
    leads.find((l) => String(l.id || "").trim().toLowerCase() === needle) ||
    leads.find((l) => String(l.email || "").trim().toLowerCase() === needle) ||
    null
  );
}

async function loadLeadsFromFile(leadsPath) {
  const leadsJson = await readJson(leadsPath);
  const leads = Array.isArray(leadsJson) ? leadsJson : leadsJson?.leads;
  return Array.isArray(leads) ? leads : null;
}

module.exports = { loadLeadsFromFile, findLead };

