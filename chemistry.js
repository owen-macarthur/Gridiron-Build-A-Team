// chemistry.js
// -----------------------------------------------------------------------
// Chemistry isn't "do the tags match exactly" -- it's "does this player's
// role complement how the QB plays." A deep-ball QB wants a deep-threat
// WR. A rushing QB doesn't need a receiving back, so a pure_rusher RB is
// actually the better fit (frees up the QB to be the receiving threat).
//
// COMPAT maps each QB tag -> the skill-player tags that pair well with it.
// Add new tags/pairings here as the roster data grows.
// -----------------------------------------------------------------------

const COMPAT = {
  deep_ball: ["deep_threat"],
  rushing: ["pure_rusher"],
  quick_game: ["slot", "receiving_back"],
  rpo: ["receiving_back", "slot"],
  pocket_passer: ["possession"],
  play_action: ["possession", "deep_threat"],
};

// Shared by engine.js (grading) and packs.js (slotting defenders into units).
// Kept here since it's fundamentally about what a tag *means*.
export const TAG_TO_UNIT = {
  pass_rush: "DL",
  coverage: "Secondary",
  run_stopper: "LB",
};

export const UNIT_LABEL = {
  OL: "O-Line",
  DL: "D-Line",
  LB: "Linebackers",
  Secondary: "Secondary",
  ST: "Special Teams",
};

// Returns a 0-100 chemistry score for a QB + their RB, WR1 (top WR), and TE.
export function computeChemistry(qb, rb, wr1, te) {
  const supportingPlayers = [rb, wr1, te];
  let matches = 0;
  let checks = 0;

  qb.tags.forEach((qbTag) => {
    const compatTags = COMPAT[qbTag] || [];
    supportingPlayers.forEach((player) => {
      checks++;
      if (player.tags.some((t) => compatTags.includes(t))) matches++;
    });
  });

  const ratio = checks ? matches / checks : 0;
  // Baseline of 50 so a totally neutral pairing isn't a hard 0.
  return Math.round(50 + ratio * 50);
}

// Quick true/false: does this player's tags complement the QB's style?
// Used to show a scheme-fit icon on pack cards before you pick.
export function tagsFitQb(qbTags, playerTags) {
  return qbTags.some((qbTag) => (COMPAT[qbTag] || []).some((t) => playerTags.includes(t)));
}

// Small helper for the UI: explain *why* a chemistry score landed where it did.
export function explainChemistry(qb, rb, wr1, te) {
  const notes = [];
  const supportingPlayers = [
    { role: "RB", player: rb },
    { role: "WR1", player: wr1 },
    { role: "TE", player: te },
  ];

  qb.tags.forEach((qbTag) => {
    const compatTags = COMPAT[qbTag] || [];
    supportingPlayers.forEach(({ role, player }) => {
      if (player.tags.some((t) => compatTags.includes(t))) {
        notes.push(`${qb.name}'s ${qbTag.replace("_", " ")} style clicks with ${player.name} (${role})`);
      }
    });
  });

  return notes;
}
