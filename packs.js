// packs.js
// -----------------------------------------------------------------------
// Win/loss packs give the player a boost applied via teamStrength()'s
// "boosts" array (see engine.js). Rentals expire after N games; season-long
// boosts stick around; group boosts nudge a whole unit (e.g. defense).
//
// A "boost" object looks like: { label, amount, gamesLeft (or null = season) }
// -----------------------------------------------------------------------

const DEF_IMPACT_NOTE = {
  pass_rush: "gets after the QB -- boosts your Pass Defense grade",
  coverage: "locks down receivers -- boosts your Pass Defense grade",
  run_stopper: "clogs running lanes -- boosts your Run Defense grade",
};

function describeDefender(tag) {
  return DEF_IMPACT_NOTE[tag] || "impact defender";
}

export function generateWinPack(streak) {
  const streakBonus = streak >= 5 ? 1.5 : streak >= 3 ? 1.2 : 1;

  const options = [
    {
      id: "rental",
      title: "Star Rental",
      description: `A great player on a 5-game rental. Big short-term boost, then they're gone.`,
      apply: (state) => addBoost(state, { label: "Star Rental", amount: 6 * streakBonus, gamesLeft: 5 }),
    },
    {
      id: "solid_season",
      title: "Solid Starter (Season)",
      description: `A dependable player for the rest of the season. Smaller boost, but it lasts.`,
      apply: (state) => addBoost(state, { label: "Solid Starter", amount: 3.5 * streakBonus, gamesLeft: null }),
    },
    {
      id: "group_upgrade",
      title: "Unit Upgrade",
      description: `Coaching/depth boost to a whole group (O-line or a defensive unit) for the season.`,
      apply: (state) => addBoost(state, { label: "Unit Upgrade", amount: 2.5 * streakBonus, gamesLeft: null }),
    },
  ];

  if (streak > 0 && streak % 3 === 0) {
    options.push({
      id: "streak_pack",
      title: `${streak}-Win Streak Pack`,
      description: `You're rolling. A high-end player joins for the rest of the season.`,
      apply: (state) => addBoost(state, { label: `${streak}-Win Streak Pack`, amount: 5 * streakBonus, gamesLeft: null }),
    });
  }

  return options;
}

export function generateLossPack() {
  return [
    {
      id: "temp_solid",
      title: "Solid Player (Temporary)",
      description: `A useful player joins on a short-term deal. Modest boost.`,
      apply: (state) => addBoost(state, { label: "Temp Pickup", amount: 2.5, gamesLeft: 4 }),
    },
    {
      id: "season_meh",
      title: "Depth Piece (Season)",
      description: `Below-average player, but locked in for the whole season. Small, steady boost.`,
      apply: (state) => addBoost(state, { label: "Depth Piece", amount: 1.5, gamesLeft: null }),
    },
  ];
}

function addBoost(state, boost) {
  state.boosts.push(boost);
  return state;
}

// Call this once per week to tick down rentals and drop expired ones.
export function tickBoosts(state) {
  state.boosts = state.boosts
    .map((b) => (b.gamesLeft ? { ...b, gamesLeft: b.gamesLeft - 1 } : b))
    .filter((b) => b.gamesLeft === null || b.gamesLeft > 0);
  return state;
}

export { describeDefender };
