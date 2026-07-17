// chemistry.js
// -----------------------------------------------------------------------
// Chemistry isn't "do the tags match exactly" -- it's "does this player's
// role complement how the QB plays." A deep-ball QB wants a deep-threat
// WR. A rushing QB doesn't need a receiving back, so a pure_rusher RB is
// actually the better fit (frees up the QB to be the receiving threat).
//
// On top of the QB-driven fit, two standalone bonuses apply regardless of
// QB style: a genuine slot receiver always helps (reliable underneath
// target, every offense wants one), and a pass-rush duo on defense is
// its own kind of chemistry (stunts, twists, coverage sacks) even though
// it doesn't touch the offensive side of the formula at all.
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

const SLOT_RECEIVER_BONUS = 8;
const PASS_RUSH_DUO_BONUS = 8;
const PASS_RUSH_DUO_MIN = 2;

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

// Returns a 0-100 chemistry score for the whole roster: QB-fit with
// RB/top WR/TE, plus the standalone slot-receiver and pass-rush-duo bonuses.
export function computeChemistry(roster) {
  const { qb, rb, wrs, te, defensePlayers } = roster;
  const topWr = wrs.reduce((best, w) => (w.overall > best.overall ? w : best), wrs[0]);
  const supportingPlayers = [rb, topWr, te];

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
  let score = 50 + ratio * 50; // baseline 50 so a neutral pairing isn't a hard 0

  if (wrs.some((w) => w.tags.includes("slot"))) score += SLOT_RECEIVER_BONUS;

  const passRushers = defensePlayers.filter((p) => p.tags.includes("pass_rush"));
  if (passRushers.length >= PASS_RUSH_DUO_MIN) score += PASS_RUSH_DUO_BONUS;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// Quick true/false: does this player's tags complement the QB's style?
// Used to show a scheme-fit icon on pack cards before you pick. (Only
// covers the QB-driven side -- the standalone bonuses above always show
// as a fit on their own, handled separately where they're displayed.)
export function tagsFitQb(qbTags, playerTags) {
  return qbTags.some((qbTag) => (COMPAT[qbTag] || []).some((t) => playerTags.includes(t)));
}

// Human-readable notes explaining what's driving the chemistry score --
// both the QB-fit pairings and the two standalone bonuses.
export function explainChemistry(roster) {
  const { qb, rb, wrs, te, defensePlayers } = roster;
  const topWr = wrs.reduce((best, w) => (w.overall > best.overall ? w : best), wrs[0]);
  const supportingPlayers = [
    { role: "RB", player: rb },
    { role: "WR1", player: topWr },
    { role: "TE", player: te },
  ];

  const notes = [];
  qb.tags.forEach((qbTag) => {
    const compatTags = COMPAT[qbTag] || [];
    supportingPlayers.forEach(({ role, player }) => {
      if (player.tags.some((t) => compatTags.includes(t))) {
        notes.push(`${qb.name}'s ${qbTag.replace("_", " ")} style clicks with ${player.name} (${role})`);
      }
    });
  });

  if (wrs.some((w) => w.tags.includes("slot"))) {
    notes.push(`Having a true slot receiver helps any offense`);
  }
  const passRushers = defensePlayers.filter((p) => p.tags.includes("pass_rush"));
  if (passRushers.length >= PASS_RUSH_DUO_MIN) {
    notes.push(`${passRushers.map((p) => p.name).join(" and ")} give you a real pass-rush duo`);
  }

  return notes;
}
