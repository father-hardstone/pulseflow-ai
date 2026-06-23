const { resolveTone, TONE_OPTIONS, DEFAULT_TONE_ID } = require("./emailTones");

function pickTone(toneId) {
  return resolveTone(toneId);
}

module.exports = { pickTone, TONE_OPTIONS, DEFAULT_TONE_ID, resolveTone };
