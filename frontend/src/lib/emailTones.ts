export const EMAIL_TONES = [
  { id: "friendly_professional", label: "Friendly & professional" },
  { id: "formal_respectful", label: "Formal & respectful" },
  { id: "warm_straightforward", label: "Warm & straightforward" },
  { id: "confident_casual", label: "Confident & business-casual" },
  { id: "polite_direct", label: "Polite & direct" },
] as const;

export type EmailToneId = (typeof EMAIL_TONES)[number]["id"];

export const DEFAULT_EMAIL_TONE: EmailToneId = "friendly_professional";
