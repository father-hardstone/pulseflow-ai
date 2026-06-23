const config = require("../config");
const { httpError } = require("../helpers/errors");
const { requireConfig } = require("../helpers/requireConfig");

function hunterKey() {
  requireConfig("hunter");
  return config.hunter.apiKey;
}

function buildDiscoverQuery(filters = {}) {
  const parts = [filters.location, filters.industry, filters.jobTitle, filters.keyword]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  if (parts.length) return `${parts.join(" ")} companies`;
  return "B2B software companies";
}

async function hunterFetch(path, { method = "GET", body } = {}) {
  const url = new URL(`https://api.hunter.io/v2/${path}`);
  url.searchParams.set("api_key", hunterKey());

  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.errors) {
    const err = json.errors?.[0];
    throw httpError(
      res.status === 403 ? 503 : 502,
      err?.details || err?.id || `Hunter ${path} failed (HTTP ${res.status})`,
      { code: "HUNTER_API_FAILED", path, status: res.status }
    );
  }
  return json;
}

async function discoverCompanies(filters = {}, limit = 5) {
  const query = buildDiscoverQuery(filters);
  const json = await hunterFetch("discover", {
    method: "POST",
    body: { query, limit: Math.min(limit, 10) },
  });
  return (json.data || []).filter((c) => c.domain);
}

async function domainSearch(domain, { limit = 5, jobTitle = "" } = {}) {
  const url = new URL("https://api.hunter.io/v2/domain-search");
  url.searchParams.set("api_key", hunterKey());
  url.searchParams.set("domain", domain);
  url.searchParams.set("limit", String(Math.min(limit, 10)));

  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.errors) {
    const err = json.errors?.[0];
    throw httpError(502, err?.details || err?.id || `Hunter domain-search failed`, {
      domain,
    });
  }

  let emails = json.data?.emails || [];
  const titleNeedle = String(jobTitle || "").trim().toLowerCase();
  if (titleNeedle) {
    const matched = emails.filter((e) =>
      String(e.position || e.position_raw || "").toLowerCase().includes(titleNeedle)
    );
    if (matched.length) emails = matched;
  }

  return {
    organization: json.data?.organization || domain,
    emails: emails.slice(0, limit),
  };
}

function mapEmailToLead(email, orgName, industry) {
  return {
    first_name: email.first_name || "",
    last_name: email.last_name || "",
    email: email.value,
    company_name: orgName || "",
    job_title: email.position || email.position_raw || "",
    industry: industry || "",
  };
}

function buildHunterEnrichment(orgName, domain, emailMeta) {
  const block = [
    "=== HUNTER PROSPECTING CONTEXT ===",
    `Company: ${orgName}`,
    `Domain: ${domain}`,
    emailMeta?.position ? `Role: ${emailMeta.position}` : null,
    emailMeta?.department ? `Department: ${emailMeta.department}` : null,
    emailMeta?.seniority ? `Seniority: ${emailMeta.seniority}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    summary: { name: orgName, domain, industry: "" },
    block,
    source: "hunter_prospecting",
    domain,
  };
}

async function prospectLeads(filters = {}, limit = 1) {
  const companies = await discoverCompanies(filters, Math.max(limit, 3));
  if (!companies.length) {
    throw httpError(404, "No companies matched your Hunter discover query.", { filters });
  }

  const leads = [];
  const enrichments = [];

  for (const company of companies) {
    if (leads.length >= limit) break;
    const domain = company.domain;
    const orgName = company.organization || domain;
    const remaining = limit - leads.length;
    const { emails } = await domainSearch(domain, {
      limit: remaining,
      jobTitle: filters.jobTitle,
    });

    for (const email of emails) {
      if (!email.value || leads.some((l) => l.email === email.value)) continue;
      leads.push(mapEmailToLead(email, orgName, filters.industry));
      enrichments.push(buildHunterEnrichment(orgName, domain, email));
      if (leads.length >= limit) break;
    }
  }

  if (!leads.length) {
    throw httpError(404, "Hunter found companies but no mailable contacts for this query.", {
      filters,
    });
  }

  return { leads, enrichments };
}

module.exports = {
  buildDiscoverQuery,
  discoverCompanies,
  domainSearch,
  prospectLeads,
};
