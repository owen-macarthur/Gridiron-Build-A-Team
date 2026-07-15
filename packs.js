// packs.js
// -----------------------------------------------------------------------
// Packs now hand out real named players from the free-agent pool (see
// data.js FREE_AGENTS) instead of generic numeric boosts. Skill players
// (RB/WR/TE) slot directly into the roster; defensive players join a
// specific unit (see chemistry.js TAG_TO_UNIT) and boost it.
//
// Rentals (gamesLeft set) are tracked in state.rentals and reverted by
// tickRentals() once their games run out. Season-long pickups and unit
// upgrades have gamesLeft = null and just stay for good.
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

function pickPlayer(tier) {
  const pool = FREE_AGENTS[tier];
  return pool[Math.floor(Math.random() * pool.length)];
}

function isDefensivePlayer(player) {
  return !!TAG_TO_UNIT[player.tags[0]];
}

// Replaces the RB/TE outright, or the weakest current WR (by overall).
function slotSkillPlayer(state, player) {
  const roster = state.roster;
  if (player.pos === "RB") {
    const previous = roster.rb;
    roster.rb = player;
    return { slot: "rb", previous };
  }
  if (player.pos === "TE") {
    const previous = roster.te;
    roster.te = player;
    return { slot: "te", previous };
  }
  // WR: replace whichever of the 3 currently has the lowest overall.
  let weakestIdx = 0;
  roster.wrs.forEach((w, i) => { if (w.overall < roster.wrs[weakestIdx].overall) weakestIdx = i; });
  const previous = roster.wrs[weakestIdx];
  roster.wrs[weakestIdx] = player;
  return { slot: "wr", wrIndex: weakestIdx, previous };
}

function slotDefensePlayer(state, player) {
  state.roster.defensePlayers.push(player);
}

function applyUnitUpgrade(state, unit, amount) {
  state.roster.units[unit] = Math.min(99, state.roster.units[unit] + amount);
}

function weakestUnit(roster) {
  return Object.entries(roster.units).sort((a, b) => a[1] - b[1])[0][0];
}

function playerOption(id, title, tier, gamesLeft) {
  const player = pickPlayer(tier);
  const isDefense = isDefensivePlayer(player);
  const durationText = gamesLeft ? `on a ${gamesLeft}-game rental` : "for the rest of the season";
  const impactNote = isDefense ? ` This player ${describeDefender(player.tags[0])}.` : "";

  return {
    id,
    title,
    description: `${player.name} (${player.pos}, ${player.overall} OVR) joins your team ${durationText}.${impactNote}`,
    apply: (state) => {
      if (isDefense) {
        slotDefensePlayer(state, player);
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
    description: `A coaching/depth boost to your ${UNIT_LABEL[unit]} unit (currently your weakest group) for the rest of the season. +${amount} rating.`,
    apply: (state) => applyUnitUpgrade(state, unit, amount),
  };
}

export function generateWinPack(streak, roster) {
  const options = [
    playerOption("rental", "Star Rental", "elite", 5),
    playerOption("solid_season", "Solid Starter (Season)", "solid", null),
    unitOption("group_upgrade", roster, 6),
  ];

  if (streak > 0 && streak % 3 === 0) {
    options.push(playerOption("streak_pack", `${streak}-Win Streak Pack`, "elite", null));
  }

  return options;
}

export function generateLossPack(roster) {
  return [
    playerOption("temp_solid", "Solid Player (Temporary)", "solid", 4),
    playerOption("season_meh", "Depth Piece (Season)", "depth", null),
  ];
}

// Call once per week to tick down rentals and revert any that just expired.
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
