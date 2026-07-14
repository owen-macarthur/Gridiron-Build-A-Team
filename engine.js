// engine.js
// -----------------------------------------------------------------------
// The actual game logic, kept separate from the UI on purpose. render()
// functions in script.js should never need to know HOW a result was
// calculated, just what the result object looks like. That split is what
// lets us swap the "simple ticker" for a fancier field animation later
// without touching this file at all.
// -----------------------------------------------------------------------

// Weighted overall for a full team -- this is the core "how good are you" number.
export function teamStrength(team, boosts = []) {
  const wrAvg = team.wrs.reduce((s, p) => s + p.overall, 0) / team.wrs.length;
  const defAvg = team.defense.reduce((s, p) => s + p.overall, 0) / team.defense.length;

  let strength =
    team.qb.overall * 0.30 +
    team.rb.overall * 0.15 +
    wrAvg * 0.25 +
    team.te.overall * 0.10 +
    defAvg * 0.20;

  // Boosts from win/loss packs (see packs.js) nudge this up over the season.
  boosts.forEach((b) => (strength += b.amount));

  return strength;
}

// The core "did you win" roll. Strength difference + chemistry + randomness.
export function simulateWeek(userTeam, oppTeam, chemistry, userBoosts = []) {
  const userStrength = teamStrength(userTeam, userBoosts) + (chemistry - 50) * 0.25;
  const oppStrength = teamStrength(oppTeam);
  const diff = userStrength - oppStrength;

  // Logistic curve: bigger talent gaps matter, but there's always upset chance.
  const winProb = 1 / (1 + Math.exp(-diff / 8));
  const won = Math.random() < winProb;

  const grades = generateGrades(userTeam, chemistry, won, diff);
  const { userScore, oppScore } = generateScoreline(won, diff);
  const playByPlay = generatePlayByPlay(userTeam, oppTeam, grades, won, userScore, oppScore);

  return { won, winProb, grades, userScore, oppScore, playByPlay };
}

// Turns a continuous 0-100 sub-score into a 1-5 grade.
function toGrade(value) {
  if (value >= 85) return 5;
  if (value >= 70) return 4;
  if (value >= 55) return 3;
  if (value >= 40) return 2;
  return 1;
}

function rand(spread) {
  return (Math.random() - 0.5) * spread;
}

function generateGrades(team, chemistry, won, diff) {
  const wrAvg = team.wrs.reduce((s, p) => s + p.overall, 0) / team.wrs.length;
  const defAvg = team.defense.reduce((s, p) => s + p.overall, 0) / team.defense.length;
  const passRush = team.defense.filter((p) => p.tags.includes("pass_rush"));
  const coverage = team.defense.filter((p) => p.tags.includes("coverage"));
  const runStop = team.defense.filter((p) => p.tags.includes("run_stopper"));

  const passGame = (team.qb.overall * 0.6 + wrAvg * 0.3 + (chemistry - 50) * 0.4) + rand(15);
  const runGame = (team.rb.overall * 0.7 + team.te.overall * 0.15) + rand(18);
  const twoMinute = (team.qb.overall * 0.8 + (chemistry - 50) * 0.5) + rand(15);
  const runDefense = (avgOr(runStop, defAvg)) + rand(15);
  const passDefense = (avgOr(coverage, defAvg) * 0.6 + avgOr(passRush, defAvg) * 0.4) + rand(15);
  const turnovers = (team.qb.overall - 20) + rand(25); // higher QB overall -> fewer giveaways
  const specialTeams = 60 + rand(30);

  return {
    "Pass Game": toGrade(passGame),
    "Run Game": toGrade(runGame),
    "2-Minute Offense": toGrade(twoMinute),
    "Run Defense": toGrade(runDefense),
    "Pass Defense": toGrade(passDefense),
    "Turnover Battle": toGrade(turnovers),
    "Special Teams": toGrade(specialTeams),
  };
}

function avgOr(list, fallback) {
  if (!list.length) return fallback;
  return list.reduce((s, p) => s + p.overall, 0) / list.length;
}

function generateScoreline(won, diff) {
  const base = 20 + Math.round(rand(14));
  const margin = Math.max(1, Math.round(Math.abs(diff) / 2 + rand(6)));
  const userScore = won ? base + margin : base;
  const oppScore = won ? base : base + margin;
  return { userScore: Math.max(userScore, 3), oppScore: Math.max(oppScore, 3) };
}

// Simple scripted-feeling ticker lines. This is the "option 1" version --
// text lines that reveal one at a time. Swap this function out later for
// the fancier animated version without touching anything else.
function generatePlayByPlay(userTeam, oppTeam, grades, won, userScore, oppScore) {
  const lines = [];
  const u = userTeam.city;
  const o = oppTeam.city;

  lines.push(`Kickoff: ${u} ${userTeam.name} vs ${o} ${oppTeam.name}`);

  if (grades["Pass Game"] >= 4) {
    lines.push(`${userTeam.qb.name} is slicing this defense up through the air.`);
  } else if (grades["Pass Game"] <= 2) {
    lines.push(`${userTeam.qb.name} is under siege -- the passing game can't find a rhythm.`);
  }

  if (grades["Run Game"] >= 4) {
    lines.push(`${userTeam.rb.name} is breaking off chunk runs all afternoon.`);
  } else if (grades["Run Game"] <= 2) {
    lines.push(`${userTeam.rb.name} can't find a crease -- the run game stalls.`);
  }

  if (grades["Turnover Battle"] <= 2) {
    lines.push(`Costly turnover for ${u} -- ${o} capitalizes.`);
  } else if (grades["Turnover Battle"] >= 4) {
    lines.push(`${u}'s defense forces a turnover at a huge moment.`);
  }

  if (grades["Pass Defense"] >= 4) {
    lines.push(`The secondary is locking receivers down -- ${o}'s passing attack is stuck.`);
  }
  if (grades["Run Defense"] >= 4) {
    lines.push(`The front seven is stuffing every run ${o} tries.`);
  }

  if (grades["2-Minute Offense"] >= 4) {
    lines.push(`Clutch two-minute drive from ${userTeam.qb.name} before the half.`);
  }

  lines.push(`FINAL: ${u} ${userScore} -- ${o} ${oppScore}`);
  lines.push(won ? `${u} win it.` : `${u} fall short.`);

  return lines;
}

// QB choice multiplier: picking a lower-overall QB out of the 3 offered
// gives a bigger multiplier on your final score. Scaled against the best
// overall in the choice set, not some fixed number, so it stays fair no
// matter which 3 QBs get offered.
export function computeQbMultiplier(chosenQb, choiceSet) {
  const best = Math.max(...choiceSet.map((q) => q.overall));
  const gap = best - chosenQb.overall;
  return +(1 + gap * 0.02).toFixed(2);
}

// Final grade/score for the season, factoring in the QB multiplier.
export function computeSeasonScore(wins, losses, avgGradeTotal, qbMultiplier) {
  const winPct = wins / Math.max(1, wins + losses);
  const base = winPct * 60 + (avgGradeTotal / 35) * 40; // avgGradeTotal out of 7 cats * 5 max = 35
  const finalScore = Math.round(base * qbMultiplier);
  return { finalScore, letter: toLetterGrade(finalScore) };
}

function toLetterGrade(score) {
  if (score >= 95) return "S";
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}
