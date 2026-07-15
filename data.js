// data.js
// -----------------------------------------------------------------------
// Two pools live here:
//   TEAMS         -- full real rosters (QB + RB + 3 WR + TE + 3 impact
//                     defenders). Used for the QB draft screen AND as
//                     opponents every week -- opponents stay at full
//                     strength, which is what makes you the underdog.
//   FREE_AGENTS   -- the pool packs pull real named players from, split
//                     into elite / solid / depth tiers.
//   createDefaultRoster -- builds YOUR starting roster: your drafted QB
//                     plus a wall of 60-overall "Default" placeholders.
//                     You build a real team by winning/losing packs.
//
// TO EXTEND LATER: add more TEAMS entries in the same shape to scale
// toward all 32; add more FREE_AGENTS entries to deepen the pack pool.
// Nothing else needs to change.
//
// TAGS reference (used by chemistry.js):
//   QB tags:  rushing, deep_ball, quick_game, rpo, pocket_passer, play_action
//   Skill tags: pure_rusher, receiving_back, deep_threat, possession, slot
//   Defense tags (map to a unit): pass_rush -> DL, coverage -> Secondary,
//     run_stopper -> LB
// -----------------------------------------------------------------------

// -----------------------------------------------------------------------
// Your Week 1 roster is intentionally bad -- your QB is the only real
// player. Everyone else is a 60-overall placeholder with no tags, so
// chemistry only kicks in once you've earned real players through packs.
// -----------------------------------------------------------------------
export function createDefaultRoster(qb) {
  return {
    qb,
    rb: { name: "Default RB", pos: "RB", overall: 60, tags: [] },
    wrs: [
      { name: "Default WR1", pos: "WR", overall: 60, tags: [] },
      { name: "Default WR2", pos: "WR", overall: 60, tags: [] },
      { name: "Default WR3", pos: "WR", overall: 60, tags: [] },
    ],
    te: { name: "Default TE", pos: "TE", overall: 60, tags: [] },
    units: { OL: 60, DL: 60, LB: 60, Secondary: 60, ST: 60 },
    defensePlayers: [], // impact defenders acquired via packs, grouped into units
  };
}

// -----------------------------------------------------------------------
// Free-agent pool that packs draw named players from. Three tiers:
//   elite  (90-99) -> Star Rentals, streak packs
//   solid  (80-89) -> season-long win-pack players, temporary loss-pack players
//   depth  (65-79) -> season-long loss-pack players
// Mix of offense (RB/WR/TE) and defense (EDGE/CB/LB) -- defensive picks
// join a specific unit (see chemistry.js TAG_TO_UNIT) rather than a slot.
// -----------------------------------------------------------------------
export const FREE_AGENTS = {
  elite: [
    { name: "Ja'Marr Chase", pos: "WR", overall: 98, tags: ["deep_threat"] },
    { name: "Saquon Barkley", pos: "RB", overall: 97, tags: ["pure_rusher"] },
    { name: "George Kittle", pos: "TE", overall: 91, tags: ["possession"] },
    { name: "Myles Garrett", pos: "EDGE", overall: 97, tags: ["pass_rush"] },
    { name: "Sauce Gardner", pos: "CB", overall: 93, tags: ["coverage"] },
    { name: "Micah Parsons", pos: "LB", overall: 96, tags: ["run_stopper"] },
  ],
  solid: [
    { name: "Rico Dowdle", pos: "RB", overall: 82, tags: ["pure_rusher"] },
    { name: "Courtland Sutton", pos: "WR", overall: 83, tags: ["possession"] },
    { name: "Evan Engram", pos: "TE", overall: 82, tags: ["possession"] },
    { name: "Josh Hines-Allen", pos: "EDGE", overall: 85, tags: ["pass_rush"] },
    { name: "Jaire Alexander", pos: "CB", overall: 84, tags: ["coverage"] },
    { name: "Bobby Wagner", pos: "LB", overall: 83, tags: ["run_stopper"] },
  ],
  depth: [
    { name: "Tyler Badie", pos: "RB", overall: 70, tags: ["receiving_back"] },
    { name: "Tutu Atwell", pos: "WR", overall: 72, tags: ["slot"] },
    { name: "Durham Smythe", pos: "TE", overall: 68, tags: ["possession"] },
    { name: "Jonathan Bullard", pos: "EDGE", overall: 71, tags: ["pass_rush"] },
    { name: "Kindle Vildor", pos: "CB", overall: 69, tags: ["coverage"] },
    { name: "Kwon Alexander", pos: "LB", overall: 70, tags: ["run_stopper"] },
  ],
};

export const TEAMS = [
  {
    code: "BUF", city: "Buffalo", name: "Bills", color: "#0C2D64", accent: "#D8A62B",
    qb: { name: "Josh Allen", pos: "QB", overall: 97, tags: ["rushing", "deep_ball"] },
    rb: { name: "James Cook", pos: "RB", overall: 89, tags: ["pure_rusher"] },
    wrs: [
      { name: "Khalil Shakir", pos: "WR", overall: 85, tags: ["possession", "slot"] },
      { name: "Keon Coleman", pos: "WR", overall: 82, tags: ["deep_threat"] },
      { name: "Curtis Samuel", pos: "WR", overall: 80, tags: ["slot"] },
    ],
    te: { name: "Dalton Kincaid", pos: "TE", overall: 84, tags: ["possession"] },
    defense: [
      { name: "Greg Rousseau", pos: "EDGE", overall: 87, tags: ["pass_rush"] },
      { name: "Christian Benford", pos: "CB", overall: 85, tags: ["coverage"] },
      { name: "Terrel Bernard", pos: "LB", overall: 84, tags: ["run_stopper"] },
    ],
  },
  {
    code: "MIA", city: "Miami", name: "Dolphins", color: "#008E97", accent: "#F58220",
    qb: { name: "Tua Tagovailoa", pos: "QB", overall: 87, tags: ["quick_game", "pocket_passer"] },
    rb: { name: "De'Von Achane", pos: "RB", overall: 90, tags: ["receiving_back"] },
    wrs: [
      { name: "Tyreek Hill", pos: "WR", overall: 96, tags: ["deep_threat"] },
      { name: "Jaylen Waddle", pos: "WR", overall: 90, tags: ["slot"] },
      { name: "Malik Washington", pos: "WR", overall: 78, tags: ["possession"] },
    ],
    te: { name: "Jonnu Smith", pos: "TE", overall: 82, tags: ["possession"] },
    defense: [
      { name: "Bradley Chubb", pos: "EDGE", overall: 86, tags: ["pass_rush"] },
      { name: "Jalen Ramsey", pos: "CB", overall: 92, tags: ["coverage"] },
      { name: "Jordyn Brooks", pos: "LB", overall: 83, tags: ["run_stopper"] },
    ],
  },
  {
    code: "BAL", city: "Baltimore", name: "Ravens", color: "#241773", accent: "#9E7C0C",
    qb: { name: "Lamar Jackson", pos: "QB", overall: 94, tags: ["rushing", "deep_ball"] },
    rb: { name: "Derrick Henry", pos: "RB", overall: 92, tags: ["pure_rusher"] },
    wrs: [
      { name: "Zay Flowers", pos: "WR", overall: 87, tags: ["slot"] },
      { name: "Rashod Bateman", pos: "WR", overall: 82, tags: ["possession"] },
      { name: "DeAndre Hopkins", pos: "WR", overall: 83, tags: ["possession"] },
    ],
    te: { name: "Mark Andrews", pos: "TE", overall: 88, tags: ["deep_threat"] },
    defense: [
      { name: "Kyle Van Noy", pos: "EDGE", overall: 82, tags: ["pass_rush"] },
      { name: "Marlon Humphrey", pos: "CB", overall: 90, tags: ["coverage"] },
      { name: "Roquan Smith", pos: "LB", overall: 92, tags: ["run_stopper"] },
    ],
  },
  {
    code: "CIN", city: "Cincinnati", name: "Bengals", color: "#FB4F14", accent: "#000000",
    qb: { name: "Joe Burrow", pos: "QB", overall: 95, tags: ["deep_ball", "pocket_passer"] },
    rb: { name: "Chase Brown", pos: "RB", overall: 84, tags: ["receiving_back"] },
    wrs: [
      { name: "Ja'Marr Chase", pos: "WR", overall: 98, tags: ["deep_threat"] },
      { name: "Tee Higgins", pos: "WR", overall: 90, tags: ["possession"] },
      { name: "Andrei Iosivas", pos: "WR", overall: 76, tags: ["slot"] },
    ],
    te: { name: "Mike Gesicki", pos: "TE", overall: 79, tags: ["possession"] },
    defense: [
      { name: "Trey Hendrickson", pos: "EDGE", overall: 93, tags: ["pass_rush"] },
      { name: "DJ Turner", pos: "CB", overall: 80, tags: ["coverage"] },
      { name: "Logan Wilson", pos: "LB", overall: 84, tags: ["run_stopper"] },
    ],
  },
  {
    code: "SF", city: "San Francisco", name: "49ers", color: "#AA0000", accent: "#B3995D",
    qb: { name: "Brock Purdy", pos: "QB", overall: 88, tags: ["rpo", "quick_game"] },
    rb: { name: "Christian McCaffrey", pos: "RB", overall: 96, tags: ["receiving_back"] },
    wrs: [
      { name: "Deebo Samuel", pos: "WR", overall: 87, tags: ["possession"] },
      { name: "Brandon Aiyuk", pos: "WR", overall: 88, tags: ["deep_threat"] },
      { name: "Jauan Jennings", pos: "WR", overall: 80, tags: ["slot"] },
    ],
    te: { name: "George Kittle", pos: "TE", overall: 91, tags: ["possession"] },
    defense: [
      { name: "Nick Bosa", pos: "EDGE", overall: 96, tags: ["pass_rush"] },
      { name: "Charvarius Ward", pos: "CB", overall: 86, tags: ["coverage"] },
      { name: "Fred Warner", pos: "LB", overall: 95, tags: ["run_stopper"] },
    ],
  },
  {
    code: "DET", city: "Detroit", name: "Lions", color: "#0076B6", accent: "#B0B7BC",
    qb: { name: "Jared Goff", pos: "QB", overall: 89, tags: ["pocket_passer", "play_action"] },
    rb: { name: "Jahmyr Gibbs", pos: "RB", overall: 91, tags: ["receiving_back"] },
    wrs: [
      { name: "Amon-Ra St. Brown", pos: "WR", overall: 93, tags: ["slot"] },
      { name: "Jameson Williams", pos: "WR", overall: 84, tags: ["deep_threat"] },
      { name: "Tim Patrick", pos: "WR", overall: 76, tags: ["possession"] },
    ],
    te: { name: "Sam LaPorta", pos: "TE", overall: 87, tags: ["possession"] },
    defense: [
      { name: "Aidan Hutchinson", pos: "EDGE", overall: 92, tags: ["pass_rush"] },
      { name: "Terrion Arnold", pos: "CB", overall: 82, tags: ["coverage"] },
      { name: "Alex Anzalone", pos: "LB", overall: 81, tags: ["run_stopper"] },
    ],
  },
  {
    code: "KC", city: "Kansas City", name: "Chiefs", color: "#E31837", accent: "#FFB81C",
    qb: { name: "Patrick Mahomes", pos: "QB", overall: 99, tags: ["deep_ball", "rushing"] },
    rb: { name: "Isiah Pacheco", pos: "RB", overall: 83, tags: ["pure_rusher"] },
    wrs: [
      { name: "Xavier Worthy", pos: "WR", overall: 85, tags: ["deep_threat"] },
      { name: "Rashee Rice", pos: "WR", overall: 86, tags: ["slot"] },
      { name: "JuJu Smith-Schuster", pos: "WR", overall: 77, tags: ["possession"] },
    ],
    te: { name: "Travis Kelce", pos: "TE", overall: 90, tags: ["possession"] },
    defense: [
      { name: "George Karlaftis", pos: "EDGE", overall: 85, tags: ["pass_rush"] },
      { name: "Trent McDuffie", pos: "CB", overall: 88, tags: ["coverage"] },
      { name: "Nick Bolton", pos: "LB", overall: 84, tags: ["run_stopper"] },
    ],
  },
  {
    code: "PHI", city: "Philadelphia", name: "Eagles", color: "#004C54", accent: "#A5ACAF",
    qb: { name: "Jalen Hurts", pos: "QB", overall: 90, tags: ["rushing", "rpo"] },
    rb: { name: "Saquon Barkley", pos: "RB", overall: 97, tags: ["pure_rusher"] },
    wrs: [
      { name: "A.J. Brown", pos: "WR", overall: 95, tags: ["deep_threat"] },
      { name: "DeVonta Smith", pos: "WR", overall: 88, tags: ["possession"] },
      { name: "Jahan Dotson", pos: "WR", overall: 76, tags: ["slot"] },
    ],
    te: { name: "Dallas Goedert", pos: "TE", overall: 85, tags: ["possession"] },
    defense: [
      { name: "Josh Sweat", pos: "EDGE", overall: 87, tags: ["pass_rush"] },
      { name: "Darius Slay", pos: "CB", overall: 84, tags: ["coverage"] },
      { name: "Zack Baun", pos: "LB", overall: 86, tags: ["run_stopper"] },
    ],
  },
];
