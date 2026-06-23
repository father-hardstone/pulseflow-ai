#!/usr/bin/env node
/**
 * Verify the n8n launch webhook is registered (workflow imported + Active).
 */
const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const url = process.env.N8N_LAUNCH_WEBHOOK_URL || "http://localhost:5678/webhook/pulseflow-launch";

async function main() {
  console.log(`Probing ${url} ...`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "launch_campaign",
      userId: "00000000-0000-0000-0000-000000000000",
      objective: "probe",
      filters: { jobTitle: "Founder", limit: 1 },
    }),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  if (res.status === 404) {
    console.error("\n✗ Webhook not registered (404).\n");
    console.error("Fix:");
    console.error("  1. Open http://localhost:5678");
    console.error("  2. Workflows → Import from File → backend/n8n/pulseflow-campaign.workflow.json");
    console.error('  3. Open "PulseFlow AI - Launch Campaign"');
    console.error("  4. Toggle **Active** ON (top-right)");
    console.error("  5. Webhook URL must be: http://localhost:5678/webhook/pulseflow-launch");
    if (body.message) console.error(`\nn8n: ${body.message}`);
    process.exit(1);
  }

  console.log(`✓ Webhook is live (workflow active). HTTP ${res.status}`);
  if (res.status >= 500) {
    console.log(
      "  Note: 5xx on probe is OK — it means n8n received the webhook (Apollo/worker may fail on test payload)."
    );
  }
}

main().catch((err) => {
  console.error("✗ Could not reach n8n:", err.message);
  console.error("Is Docker running?  docker ps  →  n8n_pulseflow on port 5678");
  process.exit(1);
});
