const fs = require("node:fs/promises");
const { parse } = require("csv-parse/sync");

function pick(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function normalizeEmail(email) {
  const v = String(email || "").trim();
  if (!v) return "";
  // Apollo exports can contain quotes/spaces; keep it simple.
  return v.replace(/^"+|"+$/g, "").trim();
}

function buildDetail(row) {
  const title = pick(row, ["Title"]);
  const company = pick(row, ["Company Name", "Company Name for Emails"]);
  const city = pick(row, ["City"]);
  const state = pick(row, ["State"]);
  const country = pick(row, ["Country"]);

  const parts = [];
  if (title && company) parts.push(`${title} at ${company}`);
  else if (title) parts.push(title);
  else if (company) parts.push(company);

  const loc = [city, state, country].filter(Boolean).join(", ");
  if (loc) parts.push(`Based in ${loc}`);

  return parts.join(". ");
}

function inferField(row) {
  // Best-effort mapping for {{field}} in templates.
  const dept = pick(row, ["Departments", "Sub Departments"]);
  if (dept) return dept;
  const title = pick(row, ["Title"]);
  if (title) return title;
  const industry = pick(row, ["Industry"]);
  if (industry) return industry;
  return "";
}

async function extractFirstApolloLeadWithEmail(csvPath) {
  const raw = await fs.readFile(csvPath, "utf8");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true,
  });

  for (const row of rows) {
    const email = normalizeEmail(pick(row, ["Email", "Secondary Email", "Tertiary Email"]));
    if (!email) continue;

    const firstName = pick(row, ["First Name"]);
    const lastName = pick(row, ["Last Name"]);
    const name = `${firstName} ${lastName}`.trim() || pick(row, ["Company Name"]) || "there";

    return {
      id: pick(row, ["Apollo Contact Id"]) || email,
      name,
      detail: buildDetail(row),
      field: inferField(row),
      email,
      apollo: {
        title: pick(row, ["Title"]),
        company: pick(row, ["Company Name", "Company Name for Emails"]),
        linkedinUrl: pick(row, ["Person Linkedin Url"]),
        website: pick(row, ["Website"]),
      },
    };
  }

  return null;
}

async function extractApolloLeadsWithEmails(csvPath) {
  const raw = await fs.readFile(csvPath, "utf8");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true,
  });

  const leads = [];
  for (const row of rows) {
    const email = normalizeEmail(pick(row, ["Email", "Secondary Email", "Tertiary Email"]));
    if (!email) continue;

    const firstName = pick(row, ["First Name"]);
    const lastName = pick(row, ["Last Name"]);
    const name =
      `${firstName} ${lastName}`.trim() || pick(row, ["Company Name"]) || "there";

    leads.push({
      id: pick(row, ["Apollo Contact Id"]) || email,
      name,
      detail: buildDetail(row),
      field: inferField(row),
      email,
      apollo: {
        title: pick(row, ["Title"]),
        company: pick(row, ["Company Name", "Company Name for Emails"]),
        linkedinUrl: pick(row, ["Person Linkedin Url"]),
        website: pick(row, ["Website"]),
      },
    });
  }

  return leads;
}

module.exports = { extractFirstApolloLeadWithEmail, extractApolloLeadsWithEmails };

