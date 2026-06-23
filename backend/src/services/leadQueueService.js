const fs = require("node:fs/promises");
const { writablePath } = require("../helpers/paths");

const DEFAULT_STATE_FILE = ".lead-state.json";

async function readState(statePath) {
  try {
    const raw = await fs.readFile(statePath, "utf8");
    const json = JSON.parse(raw);
    return typeof json?.nextIndex === "number" ? json : { nextIndex: 0 };
  } catch {
    return { nextIndex: 0 };
  }
}

async function writeState(statePath, state) {
  await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
}

/**
 * Picks the next lead in sequence and advances pointer.
 * Stores state in repo root `.lead-state.json` by default.
 */
async function pickNextLead(leads, { stateFile = DEFAULT_STATE_FILE } = {}) {
  const statePath = writablePath(stateFile);
  const state = await readState(statePath);

  const idx = Number(state.nextIndex) || 0;
  const safeIdx = ((idx % leads.length) + leads.length) % leads.length;

  const lead = leads[safeIdx];
  const nextIndex = safeIdx + 1;

  try {
    await writeState(statePath, { nextIndex });
  } catch {
    // On serverless platforms the filesystem may be read-only or non-persistent.
    // Sequential selection will still work within the current invocation.
  }

  return { lead, pickedIndex: safeIdx, nextIndex, stateFile };
}

module.exports = { pickNextLead };

