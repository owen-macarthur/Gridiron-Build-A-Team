// packs.js
// -----------------------------------------------------------------------
// Packs hand out real named players from the free-agent pool (data.js
// FREE_AGENTS). Skill players (RB/WR/TE) slot directly into the roster;
// defensive players join a specific unit and boost it.
//
// WR ordering: after any WR change, roster.wrs is re-sorted descending by
// overall, so "WR1" always means "your best receiver" regardless of which
// slot happened to get overwritten.
//
// Rental tracking is by player OBJECT REFERENCE, not array index or slot
// name. This matters because WR sorting can shuffle indices around --
// index-based tracking would revert the wrong slot after a sort. Storing
// the actual player reference means tickRentals() can always find where
// that specific player currently lives (or confirm they're already gone)
// regardless of how the array has been reordered.
//
// Slot integrity: slotSkillPlayer() clears out any rental still tracking
// the exact player object about to be displaced, so an old rental can't
// later fire and revert to a stale snapshot.
//
// Category-weighted picking: pickPlayer() picks a broad category
// (WR/RB/TE/DEF) with equal odds first, then a player within it, so the
// four groups feel equally likely regardless of pool shape or how much
// of the pool you've already owned.
//
// tickRentals() should only be called once per week, at the moment a game
// is actually simulated (see script.js runSim) -- not right after a pack
// is confirmed, or a rental loses a game it was never used for.
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

function categoryOf(player) {
  return isDefensivePlayer(player) ? "DEF" : player.pos; // "WR" | "RB" | "TE" | "DEF"
}

function sortWrsDescending(roster) {
  roster.wrs.sort((a, b) => b.overall - a.overall);
}

function pickPlayer(tier, excludeSet) {
  const available = FREE_AGENTS[tier].filter((p) => !excludeSet.has(p.name));
  const pool = available.length ? available : FREE_AGENTS[tier];
  const categories = [...new Set(pool.map(categoryOf))];
  const chosenCategory = categories[Math.floor(Math.random() * categories.length)];
  const withinCategory = pool.filter((p) => categoryOf(p) === chosenCategory);
  return withinCategory[Math.floor(Math.random() * withinCategory.length)];
}

// Picks exactly one player of the given position (RB/WR/TE), excluding
// already-owned/excluded names. Used by the Intro Pack, which always
// offers exactly one of each position (not a random category draw).
function pickOnePosition(pool, pos, excludeSet) {
  const candidates = pool.filter((p) => p.pos === pos && !excludeSet.has(p.name));
  const fallback = pool.filter((p) => p.pos === pos);
  const list = candidates.length ? candidates : fallback;
  return list[Math.floor(Math.random() * list.length)];
}

// Removes any rental still tracking this exact player object, so it can't
// fire a stale revert later after the player's been displaced.
function clearRentalTrackingFor(state, outgoingPlayer) {
  state.rentals = state.rentals.filter((r) => r.player !== outgoingPlayer);
}

// Replaces the RB/TE outright, or the weakest current WR (by overall),
// then re-sorts WRs so WR1 is always the best of the three.
function slotSkillPlayer(state, player) {
  const roster = state.roster;
  if (player.pos === "RB") {
    const previous = roster.rb;
    clearRentalTrackingFor(state, previous);
    roster.rb = player;
    return { slot: "rb", previous };
  }
  if (player.pos === "TE") {
    const previous = roster.te;
    clearRentalTrackingFor(state, previous);
    roster.te = player;
    return { slot: "te", previous };
  }
  let weakestIdx = 0;
  roster.wrs.forEach((w, i) => { if (w.overall < roster.wrs[weakestIdx].overall) weakestIdx = i; });
  const previous = roster.wrs[weakestIdx];
  clearRentalTrackingFor(state, previous);
  roster.wrs[weakestIdx] = player;
  sortWrsDescending(roster);
  return { slot: "wr", previous };
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
        if (gamesLeft) state.rentals.push({ kind: "skill", player, gamesLeft, ...slotInfo });
      }
    },
  };
}

function unitOption(id, title, roster, amount) {
  const unit = weakestUnit(roster);
  return {
    id,
    title: title || `${UNIT_LABEL[unit]} Upgrade`,
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
    unitOption("group_upgrade", null, roster, 10),
  ];

  if (streak > 0 && streak % 3 === 0) {
    const streakTier = streak >= 5 ? "superstar" : "great";
    const streakPlayer = pickPlayer(streakTier, exclude);
    exclude.add(streakPlayer.name);
    options.push(playerOption("streak_pack", `${streak}-Win Streak Pack`, streakPlayer, null));
  }

  return options;
}

// No more rentals in the loss pack -- a season-long unit boost (smaller
// than the win-pack version) instead, plus a season-long depth player.
export function generateLossPack(roster, ownedPlayers) {
  const exclude = new Set(ownedPlayers);
  const seasonPlayer = pickPlayer("depth", exclude);

  return [
    unitOption("unit_boost", null, roster, 6),
    playerOption("season_meh", "Depth Piece (Season)", seasonPlayer, null),
  ];
}

// Pre-season "fantasy pack": exactly one RB, one WR, one TE offered on the
// offensive side (pick 2 of 3), and one DL/LB/Secondary defender each on
// the defensive side (pick 2 of 3). All season-long. Pulled from the
// "solid" tier -- good enough to matter, not so good it undercuts the
// "build from nothing" pitch.
export function generateIntroPack(ownedPlayers) {
  const exclude = new Set(ownedPlayers);
  const offensePool = FREE_AGENTS.solid.filter((p) => !isDefensivePlayer(p));
  const defensePool = FREE_AGENTS.solid.filter((p) => isDefensivePlayer(p));

  const rb = pickOnePosition(offensePool, "RB", exclude); exclude.add(rb.name);
  const wr = pickOnePosition(offensePool, "WR", exclude); exclude.add(wr.name);
  const te = pickOnePosition(offensePool, "TE", exclude); exclude.add(te.name);

  const offense = [rb, wr, te].map((p) => playerOption(`intro_${p.name}`, p.name, p, null));
  const defense = defensePool.map((p) => playerOption(`intro_${p.name}`, p.name, p, null));

  return { offense, defense };
}

// Call once per week, at the moment a game is actually simulated, to tick
// down rentals and revert any that just expired. Finds the current
// location of the rental's player by reference (not a stale index), so
// it stays correct even after WR sorting has shuffled the array.
export function tickRentals(state) {
  state.rentals = state.rentals.filter((r) => {
    r.gamesLeft -= 1;
    if (r.gamesLeft > 0) return true;

    if (r.kind === "skill") {
      if (r.slot === "rb" && state.roster.rb === r.player) state.roster.rb = r.previous;
      else if (r.slot === "te" && state.roster.te === r.player) state.roster.te = r.previous;
      else if (r.slot === "wr") {
        const idx = state.roster.wrs.indexOf(r.player);
        if (idx !== -1) {
          state.roster.wrs[idx] = r.previous;
          sortWrsDescending(state.roster);
        }
      }
    } else if (r.kind === "defense") {
      state.roster.defensePlayers = state.roster.defensePlayers.filter((p) => p !== r.player);
    }
    return false;
  });
}
