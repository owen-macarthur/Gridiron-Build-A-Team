// packs.js
// -----------------------------------------------------------------------
// Packs hand out real named players from the free-agent pool (data.js
// FREE_AGENTS). Skill players (RB/WR/TE) slot directly into the roster;
// defensive players join a specific unit and boost it.
//
// Randomness + no-repeats: pickPlayer() first picks a broad category
// (WR/RB/TE/DEF) with equal odds, then a random player within it. This
// matters because the tiers don't have equal counts per position (the
// superstar tier alone is 10 defenders vs 3 TEs) -- picking a flat random
// index over the whole array would make whichever category has the most
// entries show up far more often than the others. Category-first picking
// keeps the four groups feeling equally likely regardless of pool shape,
// and also regardless of how the pool has been thinned out by ownership.
//
// pickPlayer() also excludes anyone in `owned` (every player you've ever
// acquired) so you never get offered the same player twice, and within a
// single pack call, already-offered players are excluded too.
//
// Slot integrity: slotSkillPlayer() clears out any rental still tracking
// the slot it's about to overwrite (see clearSlotRentals). Without this,
// an old rental for the same slot could later expire and revert the slot
// back to a stale snapshot, wiping out whatever's there now -- including
// a player you were told was yours for the whole season.
//
// Rentals (gamesLeft set) are tracked in state.rentals and reverted by
// tickRentals() once their games run out. tickRentals() should only be
// called once per week, at the moment a game is actually simulated (see
// script.js runSim) -- NOT right after a pack is confirmed, or a rental
// loses a game it was never actually used for.
// -----------------------------------------------------------------------
import { FREE_AGENTS } from "./data.js";
import { TAG_TO_UNIT, UNIT_LABEL } from "./chemistry.js";

const DEF_IMPACT_NOTE = {
  pass_rush: "gets after the QB -- boosts your D-Line unit (Pass Defense)",
  coverage: "locks down receivers -- boosts your Secondary unit (Pass Defense)",
  run_stopper: "clogs running lanes -- boosts your Linebackers unit (Run Defense)",
};

export function describeDefender(tag) {
  return DEF_IMPACT_NOTE[tag] || "impact defender";
}

function isDefensivePlayer(player) {
  return !!TAG_TO_UNIT[player.tags[0]];
}

// Broad category used for even-odds picking and for Intro Pack variety:
// "WR" | "RB" | "TE" | "DEF"
function categoryOf(player) {
  return isDefensivePlayer(player) ? "DEF" : player.pos;
}

// Picks a random category first (equal odds), then a random player within
// it. Excludes names in `excludeSet`; falls back to the full tier if
// everyone available has already been excluded.
function pickPlayer(tier, excludeSet) {
  const available = FREE_AGENTS[tier].filter((p) => !excludeSet.has(p.name));
  const pool = available.length ? available : FREE_AGENTS[tier];
  const categories = [...new Set(pool.map(categoryOf))];
  const chosenCategory = categories[Math.floor(Math.random() * categories.length)];
  const withinCategory = pool.filter((p) => categoryOf(p) === chosenCategory);
  return withinCategory[Math.floor(Math.random() * withinCategory.length)];
}

// Like pickPlayer, but picks N players guaranteed to be in different
// categories (used for the Intro Pack's "2 offense, 2 defense" spread).
function pickDistinctCategories(pool, n, excludeSet) {
  const localExclude = new Set(excludeSet);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picks = [];
  const usedCategories = new Set();
  for (const p of shuffled) {
    if (picks.length >= n) break;
    if (localExclude.has(p.name)) continue;
    const cat = categoryOf(p);
    if (usedCategories.has(cat)) continue;
    picks.push(p);
    usedCategories.add(cat);
    localExclude.add(p.name);
  }
  // Fallback if the pool didn't have enough distinct categories left.
  for (const p of shuffled) {
    if (picks.length >= n) break;
    if (picks.includes(p) || localExclude.has(p.name)) continue;
    picks.push(p);
    localExclude.add(p.name);
  }
  return picks;
}

// Removes any rental still tracking the slot about to be overwritten, so
// it can't fire a stale revert later and clobber whatever's slotted in now.
function clearSlotRentals(state, slot, wrIndex) {
  state.rentals = state.rentals.filter((r) => {
    if (r.kind !== "skill" || r.slot !== slot) return true;
    if (slot === "wr" && r.wrIndex !== wrIndex) return true;
    return false;
  });
}

// Replaces the RB/TE outright, or the weakest current WR (by overall).
function slotSkillPlayer(state, player) {
  const roster = state.roster;
  if (player.pos === "RB") {
    clearSlotRentals(state, "rb");
    const previous = roster.rb;
    roster.rb = player;
    return { slot: "rb", previous };
  }
  if (player.pos === "TE") {
    clearSlotRentals(state, "te");
    const previous = roster.te;
    roster.te = player;
    return { slot: "te", previous };
  }
  let weakestIdx = 0;
  roster.wrs.forEach((w, i) => { if (w.overall < roster.wrs[weakestIdx].overall) weakestIdx = i; });
  clearSlotRentals(state, "wr", weakestIdx);
  const previous = roster.wrs[weakestIdx];
  roster.wrs[weakestIdx] = player;
  return { slot: "wr", wrIndex: weakestIdx, previous };
}

function applyUnitUpgrade(state, unit, amount) {
  state.roster.units[unit] = Math.min(99, state.roster.units[unit] + amount);
}

function weakestUnit(roster) {
  return Object.entries(roster.units).sort((a, b) => a[1] - b[1])[0][0];
}

// Builds a pack option around an already-picked player object so the
// caller controls exclusion across the whole pack (see generateWinPack).
function playerOption(id, title, player, gamesLeft) {
  const isDefense = isDefensivePlayer(player);
  const durationText = gamesLeft ? `on a ${gamesLeft}-game rental` : "for the rest of the season";
  const impactNote = isDefense ? ` This player ${describeDefender(player.tags[0])}.` : "";

  return {
    id,
    title,
    player, // exposed so the UI can render tag chips + spin reveal
    description: `${player.name} (${player.pos}, ${player.overall} OVR) joins your team ${durationText}.${impactNote}`,
    apply: (state) => {
      state.ownedPlayers.add(player.name);
      if (isDefense) {
        state.roster.defensePlayers.push(player);
        if (gamesLeft) state.rentals.push({ kind: "defense", player, gamesLeft });
      } else {
        const slotInfo = slotSkillPlayer(state, player);
        if (gamesLeft) state.rentals.push({ kind: "skill", gamesLeft, ...slotInfo });
      }
    },
  };
}

function unitOption(id, roster, amount) {
  const unit = weakestUnit(roster);
  return {
    id,
    title: `${UNIT_LABEL[unit]} Upgrade`,
    player: null,
    description: `A coaching/depth boost to your ${UNIT_LABEL[unit]} unit (currently your weakest group) for the rest of the season. +${amount} rating.`,
    apply: (state) => applyUnitUpgrade(state, unit, amount),
  };
}

// `ownedPlayers` is a Set of every player name acquired so far this game --
// passed in by script.js from state.ownedPlayers.
export function generateWinPack(streak, roster, ownedPlayers) {
  const exclude = new Set(ownedPlayers);

  const rentalPlayer = pickPlayer("superstar", exclude);
  exclude.add(rentalPlayer.name);
  const seasonPlayer = pickPlayer("great", exclude);
  exclude.add(seasonPlayer.name);

  const options = [
    playerOption("rental", "Star Rental", rentalPlayer, 2),
    playerOption("solid_season", "Solid Starter (Season)", seasonPlayer, null),
    unitOption("group_upgrade", roster, 6),
  ];

  if (streak > 0 && streak % 3 === 0) {
    const streakTier = streak >= 5 ? "superstar" : "great";
    const streakPlayer = pickPlayer(streakTier, exclude);
    exclude.add(streakPlayer.name);
    options.push(playerOption("streak_pack", `${streak}-Win Streak Pack`, streakPlayer, null));
  }

  return options;
}

export function generateLossPack(roster, ownedPlayers) {
  const exclude = new Set(ownedPlayers);

  const tempPlayer = pickPlayer("solid", exclude);
  exclude.add(tempPlayer.name);
  const seasonPlayer = pickPlayer("depth", exclude);
  exclude.add(seasonPlayer.name);

  return [
    playerOption("temp_solid", "Solid Player (Temporary)", tempPlayer, 4),
    playerOption("season_meh", "Depth Piece (Season)", seasonPlayer, null),
  ];
}

// One-time pre-season pack: 2 offensive + 2 defensive players, all
// season-long (no rentals), so you're not starting Week 1 with an
// entirely default roster. Pulled from the "solid" tier -- good enough to
// matter, not so good it undercuts the whole "build from nothing" pitch.
export function generateIntroPack(ownedPlayers) {
  const exclude = new Set(ownedPlayers);
  const offensePool = FREE_AGENTS.solid.filter((p) => !isDefensivePlayer(p));
  const defensePool = FREE_AGENTS.solid.filter((p) => isDefensivePlayer(p));

  const offensePicks = pickDistinctCategories(offensePool, 2, exclude);
  offensePicks.forEach((p) => exclude.add(p.name));
  const defensePicks = pickDistinctCategories(defensePool, 2, exclude);

  return [...offensePicks, ...defensePicks].map((player) =>
    playerOption(`intro_${player.name}`, player.name, player, null)
  );
}

// Call once per week, at the moment a game is actually simulated, to tick
// down rentals and revert any that just expired.
export function tickRentals(state) {
  state.rentals = state.rentals.filter((r) => {
    r.gamesLeft -= 1;
    if (r.gamesLeft > 0) return true;

    if (r.kind === "skill") {
      if (r.slot === "rb") state.roster.rb = r.previous;
      else if (r.slot === "te") state.roster.te = r.previous;
      else if (r.slot === "wr") state.roster.wrs[r.wrIndex] = r.previous;
    } else if (r.kind === "defense") {
      state.roster.defensePlayers = state.roster.defensePlayers.filter((p) => p !== r.player);
    }
    return false;
  });
}
