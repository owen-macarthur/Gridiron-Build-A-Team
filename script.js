// script.js
// -----------------------------------------------------------------------
// UI layer only. This file should not contain game-balance math -- that
// all lives in engine.js / chemistry.js / packs.js. If you're tuning
// numbers, you almost certainly want one of those files instead.
// -----------------------------------------------------------------------
import { TEAMS } from "./data.js";
import { computeChemistry, explainChemistry } from "./chemistry.js";
import { teamStrength, simulateWeek, computeQbMultiplier, computeSeasonScore } from "./engine.js";
import { generateWinPack, generateLossPack, tickBoosts, describeDefender } from "./packs.js";

const WEEKS_TOTAL = 8; // Prototype length. Full version target: 17 + playoffs.
const PLAYOFF_LINE = Math.ceil((WEEKS_TOTAL * 10) / 17); // scaled version of "10-7 or better"

const app = document.getElementById("app");

let state = null;

function newGameState() {
  return {
    team: null,
    qbMultiplier: 1,
    chemistry: 50,
    boosts: [],
    week: 1,
    wins: 0,
    losses: 0,
    streak: 0,
    gradeHistory: [], // array of grade objects, one per week
  };
}

// ---------------------------------------------------------------------
// Screen: Title
// ---------------------------------------------------------------------
function renderTitle() {
  app.innerHTML = `
    <div class="eyebrow">Underdog GM &middot; Prototype</div>
    <h1>UNDERDOG GM</h1>
    <p>Draft a QB, build chemistry, and see how far you can carry a roster that isn't stacked. Beat the odds and your score multiplier climbs.</p>
    <button id="start-btn">Start Season</button>
  `;
  document.getElementById("start-btn").addEventListener("click", () => {
    state = newGameState();
    renderQbSelect();
  });
}

// ---------------------------------------------------------------------
// Screen: QB Select -- 3 random QBs, pick one
// ---------------------------------------------------------------------
function renderQbSelect() {
  const shuffled = [...TEAMS].sort(() => Math.random() - 0.5).slice(0, 3);
  const choices = shuffled.map((t) => ({ team: t, qb: t.qb }));

  app.innerHTML = `
    <div class="eyebrow">Week 0 &middot; Draft Room</div>
    <h1>Pick Your QB</h1>
    <p>Lower overall = a bigger multiplier on your final score. Great record with a lesser QB can out-grade a stacked team that just walked in.</p>
    <div class="card-grid" id="qb-grid"></div>
  `;

  const grid = document.getElementById("qb-grid");
  choices.forEach(({ team, qb }) => {
    const mult = computeQbMultiplier(qb, choices.map((c) => c.qb));
    const card = document.createElement("div");
    card.className = "card selectable";
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="qb-name">${qb.name}</div>
      <div class="qb-team">${team.city} ${team.name}</div>
      <span class="overall-pill">OVR ${qb.overall}</span>
      <div class="tag-row">${qb.tags.map((t) => `<span class="tag">${t.replace("_", " ")}</span>`).join("")}</div>
      <div class="multiplier-badge"><span>&times;</span><span class="num">${mult.toFixed(2)}</span></div>
    `;
    const choose = () => chooseQb(team, qb, choices.map((c) => c.qb));
    card.addEventListener("click", choose);
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") choose(); });
    grid.appendChild(card);
  });
}

function chooseQb(team, qb, choiceSet) {
  state.team = team;
  state.qbMultiplier = computeQbMultiplier(qb, choiceSet);
  state.chemistry = computeChemistry(team.qb, team.rb, team.wrs[0], team.te);
  renderTeamReveal();
}

// ---------------------------------------------------------------------
// Screen: Team reveal + chemistry breakdown
// ---------------------------------------------------------------------
function renderTeamReveal() {
  const t = state.team;
  const notes = explainChemistry(t.qb, t.rb, t.wrs[0], t.te);

  app.innerHTML = `
    ${statusStrip()}
    <div class="eyebrow">Your Squad</div>
    <h1>${t.city} ${t.name}</h1>
    <div class="multiplier-badge"><span>Score Multiplier</span><span class="num">&times;${state.qbMultiplier.toFixed(2)}</span></div>

    <div class="card" style="margin-top:18px;">
      <h2>Chemistry: ${state.chemistry}/100</h2>
      ${notes.length
        ? `<p>${notes.join(". ")}.</p>`
        : `<p>No standout tag pairings yet -- a fairly neutral fit.</p>`}
    </div>

    <div class="card">
      <h3>Offense</h3>
      <div class="roster-row"><span class="roster-role">QB</span><span>${t.qb.name}</span><span class="overall-pill">${t.qb.overall}</span></div>
      <div class="roster-row"><span class="roster-role">RB</span><span>${t.rb.name}</span><span class="overall-pill">${t.rb.overall}</span></div>
      ${t.wrs.map((w, i) => `<div class="roster-row"><span class="roster-role">WR${i + 1}</span><span>${w.name}</span><span class="overall-pill">${w.overall}</span></div>`).join("")}
      <div class="roster-row"><span class="roster-role">TE</span><span>${t.te.name}</span><span class="overall-pill">${t.te.overall}</span></div>
    </div>

    <div class="card">
      <h3>Impact Defense</h3>
      ${t.defense.map((d) => `<div class="roster-row"><span class="roster-role">${d.pos}</span><span>${d.name}</span><span class="overall-pill">${d.overall}</span></div>`).join("")}
    </div>

    <button id="play-btn">Play Week ${state.week}</button>
  `;
  document.getElementById("play-btn").addEventListener("click", playWeek);
}

// ---------------------------------------------------------------------
// Screen: Weekly sim ticker
// ---------------------------------------------------------------------
function playWeek() {
  const opponents = TEAMS.filter((t) => t.code !== state.team.code);
  const opponent = opponents[Math.floor(Math.random() * opponents.length)];
  const result = simulateWeek(state.team, opponent, state.chemistry, state.boosts);

  app.innerHTML = `
    ${statusStrip()}
    <div class="eyebrow">Week ${state.week} &middot; Live</div>
    <h1>${state.team.city} vs ${opponent.city}</h1>
    <div class="ticker" id="ticker"></div>
  `;

  const ticker = document.getElementById("ticker");
  result.playByPlay.forEach((line, i) => {
    setTimeout(() => {
      const div = document.createElement("div");
      div.className = "ticker-line";
      div.textContent = line;
      ticker.appendChild(div);
      if (i === result.playByPlay.length - 1) {
        setTimeout(() => renderWeekResult(opponent, result), 700);
      }
    }, i * 550);
  });
}

// ---------------------------------------------------------------------
// Screen: Grades + win/loss result
// ---------------------------------------------------------------------
function renderWeekResult(opponent, result) {
  state.gradeHistory.push(result.grades);
  if (result.won) { state.wins++; state.streak++; } else { state.losses++; state.streak = 0; }

  const gradeRows = Object.entries(result.grades)
    .map(([label, grade]) => `
      <div class="grade-row">
        <span class="grade-label">${label}</span>
        <span class="grade-stars">${"★".repeat(grade)}<span class="dim">${"★".repeat(5 - grade)}</span></span>
      </div>`)
    .join("");

  app.innerHTML = `
    ${statusStrip()}
    <div class="result-banner ${result.won ? "win" : "loss"}">${result.won ? "WIN" : "LOSS"}</div>
    <div class="scoreboard">
      <span>${state.team.city} ${result.userScore}</span>
      <span class="vs">FINAL</span>
      <span>${opponent.city} ${result.oppScore}</span>
    </div>
    <div class="card">
      <h2>Game Grades</h2>
      ${gradeRows}
    </div>
    <button id="pack-btn">Open ${result.won ? "Win" : "Loss"} Pack</button>
  `;
  document.getElementById("pack-btn").addEventListener("click", () => renderPackScreen(result.won));
}

// ---------------------------------------------------------------------
// Screen: Pack selection
// ---------------------------------------------------------------------
function renderPackScreen(won) {
  const options = won ? generateWinPack(state.streak) : generateLossPack();

  app.innerHTML = `
    ${statusStrip()}
    <div class="eyebrow">${won ? "Win" : "Loss"} Pack</div>
    <h1>Choose Your Reward</h1>
    ${options.map((opt) => `
      <div class="card selectable pack-option" data-id="${opt.id}" tabindex="0">
        <h3>${opt.title}</h3>
        <p>${opt.description}</p>
      </div>`).join("")}
  `;

  app.querySelectorAll(".pack-option").forEach((el) => {
    const id = el.getAttribute("data-id");
    const opt = options.find((o) => o.id === id);
    const pick = () => {
      opt.apply(state);
      renderPackConfirm(opt);
    };
    el.addEventListener("click", pick);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") pick(); });
  });
}

function renderPackConfirm(opt) {
  const defenderNote = state.team.defense
    .map((d) => `${d.name} (${d.pos}) ${describeDefender(d.tags[0])}`)
    .slice(0, 1)[0];

  app.innerHTML = `
    ${statusStrip()}
    <div class="card">
      <h2>Added: ${opt.title}</h2>
      <p>${opt.description}</p>
      <p style="color:var(--muted); font-size:0.85rem;">Reminder -- your existing impact defender ${defenderNote}.</p>
    </div>
    <button id="continue-btn">${state.week >= WEEKS_TOTAL ? "See Season Recap" : `Continue to Week ${state.week + 1}`}</button>
  `;
  document.getElementById("continue-btn").addEventListener("click", () => {
    tickBoosts(state);
    state.week++;
    if (state.week > WEEKS_TOTAL) renderRecap();
    else renderTeamReveal();
  });
}

// ---------------------------------------------------------------------
// Screen: Season recap
// ---------------------------------------------------------------------
function renderRecap() {
  const catTotals = {};
  state.gradeHistory.forEach((g) => {
    Object.entries(g).forEach(([k, v]) => { catTotals[k] = (catTotals[k] || 0) + v; });
  });
  const weeks = state.gradeHistory.length;
  const catAverages = Object.fromEntries(
    Object.entries(catTotals).map(([k, v]) => [k, (v / weeks).toFixed(1)])
  );
  const avgGradeTotal = Object.values(catAverages).reduce((s, v) => s + parseFloat(v), 0);
  const { finalScore, letter } = computeSeasonScore(state.wins, state.losses, avgGradeTotal, state.qbMultiplier);
  const madePlayoffs = state.wins >= PLAYOFF_LINE;

  app.innerHTML = `
    <div class="eyebrow">Season Recap</div>
    <h1>${state.team.city} ${state.team.name}</h1>
    <p>Final Record: <strong>${state.wins}-${state.losses}</strong> &middot; QB Multiplier: <strong>&times;${state.qbMultiplier.toFixed(2)}</strong></p>
    <p>${madePlayoffs
      ? `You hit the ${PLAYOFF_LINE}-${weeks - PLAYOFF_LINE} playoff line. (Full 17-game version: 10-7.)`
      : `Missed the ${PLAYOFF_LINE}-${weeks - PLAYOFF_LINE} playoff line. (Full 17-game version: 10-7.)`}</p>

    <div class="final-grade">${letter}</div>
    <p style="text-align:center; color:var(--muted);">Score: ${finalScore}</p>

    <div class="card">
      <h2>Season Averages</h2>
      ${Object.entries(catAverages).map(([k, v]) => `
        <div class="grade-row"><span class="grade-label">${k}</span><span class="grade-stars">${v} / 5</span></div>
      `).join("")}
    </div>

    <button id="again-btn">Play Again</button>
  `;
  document.getElementById("again-btn").addEventListener("click", renderTitle);
}

// ---------------------------------------------------------------------
// Shared status strip
// ---------------------------------------------------------------------
function statusStrip() {
  if (!state.team) return "";
  return `
    <div class="status-strip">
      <span>WEEK ${state.week}/${WEEKS_TOTAL}</span>
      <span>RECORD ${state.wins}-${state.losses}</span>
      <span>STREAK ${state.streak}</span>
      <span>MULT &times;${state.qbMultiplier.toFixed(2)}</span>
    </div>
  `;
}

renderTitle();
