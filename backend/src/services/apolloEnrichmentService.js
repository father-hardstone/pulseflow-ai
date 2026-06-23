const config = require("../config");
const { httpError } = require("../helpers/errors");
const { requireConfig } = require("../helpers/requireConfig");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeDomain(input) {
  let d = String(input || "").trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].split("?")[0];
  if (!d || !d.includes(".")) {
    throw httpError(400, "Enter a valid company domain (e.g. linear.app).");
  }
  return d;
}

function parseInboundEmail(email) {
  const norm = String(email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(norm)) {
    throw httpError(400, "Enter a valid inbound email (e.g. ahmed@linear.app).");
  }
  const [local, domain] = norm.split("@");
  return { email: norm, local, domain: normalizeDomain(domain) };
}

function titleCaseLocalPart(local) {
  const chunk = String(local || "").split(/[._+-]/)[0] || "";
  if (!chunk) return "there";
  return chunk.charAt(0).toUpperCase() + chunk.slice(1);
}

async function enrichOrganization(domain) {
  requireConfig("apollo");
  const res = await fetch("https://api.apollo.io/api/v1/organizations/enrich", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": config.apollo.apiKey,
    },
    body: JSON.stringify({ domain }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await res.json().catch(() => ({}));

  if (!res.ok || body.error) {
    throw httpError(
      res.status === 403 ? 503 : 502,
      body.error || body.message || `Apollo organization enrich failed (HTTP ${res.status})`,
      { code: "APOLLO_ENRICH_FAILED", domain }
    );
  }

  const org = body.organization;
  if (!org?.name) {
    throw httpError(404, `No organization data found for ${domain}.`, { domain });
  }
  return org;
}

function summarizeOrganization(org) {
  const keywords = Array.isArray(org.keywords) ? org.keywords.slice(0, 8) : [];
  return {
    name: org.name,
    domain: org.primary_domain || org.website_url || "",
    industry: org.industry || "",
    employees: org.estimated_num_employees ?? null,
    foundedYear: org.founded_year ?? null,
    description: org.short_description || org.seo_description || "",
    linkedinUrl: org.linkedin_url || "",
    keywords,
    location: [org.city, org.state, org.country].filter(Boolean).join(", "),
  };
}

function buildEnrichmentBlock(summary, inbound = {}) {
  const lines = [
    "=== INBOUND ACCOUNT ENRICHMENT (Apollo) ===",
    `Company: ${summary.name}`,
    summary.domain ? `Domain: ${summary.domain}` : null,
    summary.industry ? `Industry: ${summary.industry}` : null,
    summary.employees != null ? `Estimated employees: ${summary.employees}` : null,
    summary.foundedYear ? `Founded: ${summary.foundedYear}` : null,
    summary.location ? `HQ: ${summary.location}` : null,
    summary.description ? `About: ${summary.description}` : null,
    summary.keywords.length ? `Focus areas: ${summary.keywords.join(", ")}` : null,
    inbound.email ? `Inbound contact: ${inbound.email}` : null,
    inbound.role ? `Inferred role/title: ${inbound.role}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

async function resolveInboundLead({ domain, inboundEmail }) {
  if (inboundEmail) {
    const parsed = parseInboundEmail(inboundEmail);
    const org = await enrichOrganization(parsed.domain);
    const summary = summarizeOrganization(org);
    const firstName = titleCaseLocalPart(parsed.local);
    return {
      lead: {
        first_name: firstName,
        last_name: "",
        email: parsed.email,
        company_name: summary.name,
        job_title: "",
        industry: summary.industry || "",
      },
      enrichment: {
        summary,
        block: buildEnrichmentBlock(summary, { email: parsed.email }),
        source: "inbound_email",
        domain: parsed.domain,
      },
    };
  }

  if (domain) {
    const normDomain = normalizeDomain(domain);
    const org = await enrichOrganization(normDomain);
    const summary = summarizeOrganization(org);
    return {
      lead: {
        first_name: "",
        last_name: "",
        email: `inbound@${normDomain}`,
        company_name: summary.name,
        job_title: "",
        industry: summary.industry || "",
      },
      enrichment: {
        summary,
        block: buildEnrichmentBlock(summary),
        source: "inbound_domain",
        domain: normDomain,
      },
    };
  }

  throw httpError(400, "Provide either `domain` or `inboundEmail` for inbound enrichment.");
}

async function probeOrganizationEnrich() {
  const key = config.apollo.apiKey;
  if (!key) {
    return { configured: false, accessible: false, message: "APOLLO_API_KEY is not set" };
  }
  try {
    const res = await fetch("https://api.apollo.io/api/v1/organizations/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": key },
      body: JSON.stringify({ domain: "apollo.io" }),
      signal: AbortSignal.timeout(10000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.error) {
      return {
        configured: true,
        accessible: false,
        status: res.status,
        message: body.error || body.message || `HTTP ${res.status}`,
      };
    }
    return {
      configured: true,
      accessible: Boolean(body.organization?.name),
      status: res.status,
      message: "Organization enrich API is accessible",
    };
  } catch (err) {
    return { configured: true, accessible: false, message: err.message };
  }
}

module.exports = {
  normalizeDomain,
  parseInboundEmail,
  enrichOrganization,
  resolveInboundLead,
  probeOrganizationEnrich,
  summarizeOrganization,
  buildEnrichmentBlock,
};
