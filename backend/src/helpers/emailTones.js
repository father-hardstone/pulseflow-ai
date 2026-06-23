const TONE_OPTIONS = [
  {
    id: "friendly_professional",
    label: "Friendly & professional",
    prompt: "friendly, concise, and professional — approachable but credible",
  },
  {
    id: "formal_respectful",
    label: "Formal & respectful",
    prompt: "formal, respectful, and concise — suitable for executives",
  },
  {
    id: "warm_straightforward",
    label: "Warm & straightforward",
    prompt: "warm, professional, and straightforward — human without fluff",
  },
  {
    id: "confident_casual",
    label: "Confident & business-casual",
    prompt: "confident, succinct, business-casual — direct and energetic",
  },
  {
    id: "polite_direct",
    label: "Polite & direct",
    prompt: "polite, direct, and professional — clear ask, no hype",
  },
];

const DEFAULT_TONE_ID = "friendly_professional";

function resolveTone(input) {
  const raw = String(input || "").trim();
  if (!raw) {
    return TONE_OPTIONS.find((t) => t.id === DEFAULT_TONE_ID).prompt;
  }
  const match = TONE_OPTIONS.find((t) => t.id === raw);
  if (match) return match.prompt;
  // Allow passing a full tone string for advanced use.
  if (raw.length > 20) return raw;
  return TONE_OPTIONS.find((t) => t.id === DEFAULT_TONE_ID).prompt;
}

function isValidToneId(id) {
  return TONE_OPTIONS.some((t) => t.id === id);
}

module.exports = { TONE_OPTIONS, DEFAULT_TONE_ID, resolveTone, isValidToneId };
