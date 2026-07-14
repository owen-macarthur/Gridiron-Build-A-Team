# Underdog GM (prototype)

An NFL-flavored season game: draft a QB (a *worse* QB earns a bigger score
multiplier), build chemistry around him, sim your games, and cash in win/loss
packs to grow your roster.

## What's in this prototype

- **8 teams**, full skill-position + 3 impact-defender rosters, each with
  chemistry tags (see `data.js`).
- Full game loop: QB draft → team reveal/chemistry → weekly sim → 7-category
  grades → win/loss pack → repeat for 8 weeks → season recap with letter grade.
- Play-by-play is the "simple animated ticker" version (text lines fading in
  one at a time) -- the stat-reveal-animation version is a good next step
  once the mechanics feel right.

## Running it locally

Because the files use ES modules (`import`/`export`), your browser needs to
load them over `http://`, not by double-clicking `index.html` (that opens it
as `file://`, which modules block for security reasons). Easiest options:

- **VS Code**: install the "Live Server" extension, right-click
  `index.html` → "Open with Live Server."
- **No install needed**: if you have Node, run this from the project folder:
  ```
  npx serve .
  ```
  then open the URL it prints.

## Deploying

Same as Build-A-Player: push this folder to a GitHub repo and turn on GitHub
Pages (Settings → Pages → deploy from the branch/folder). GitHub Pages serves
everything over `https://`, so the ES modules work with zero changes.

## File structure

| File | Purpose |
|---|---|
| `data.js` | Team/player data + chemistry tags. Add more teams here to scale toward 32 -- your old `generate-data.js` Sleeper-API approach from Build-A-Player would slot in nicely for auto-generating this. |
| `chemistry.js` | Tag-compatibility scoring between QB and RB/WR1/TE. |
| `engine.js` | Team strength math, win/loss roll, the 7 grade categories, play-by-play text, QB multiplier, season score/letter grade. |
| `packs.js` | Win/loss/streak pack options and how boosts apply/expire. |
| `script.js` | UI only -- screen-by-screen rendering and event wiring. No game-balance numbers should live here. |
| `style.css` | "Primetime war room" visual theme -- dark stadium palette, gold accent, scoreboard/mono type for stats. |

## Known simplifications (intentional, for the prototype)

- 8 teams, so opponents repeat across the season -- fine for testing, but
  the 32-team version should build a real schedule with no repeats.
- Season length is 8 games (`WEEKS_TOTAL` in `script.js`), with the playoff
  line scaled proportionally to your 10-7-in-17 idea. Bump `WEEKS_TOTAL` to
  17 once you're ready and the playoff math updates itself.
- Grades and win probability use reasonable-feeling formulas, not real
  play-by-play simulation -- easy to retune in `engine.js` once you've played
  it and have a feel for what should swing more/less.
- Special Teams and Discipline grades are placeholder/random for now since
  there's no kicker or penalty data yet.

## Roadmap (per your notes -- not built yet, just structured to support it)

- **Save slots (3-5)**: `state` in `script.js` is already a single plain
  object -- serializing it to `localStorage` (or a downloadable file, since
  GitHub Pages has no backend) is a small addition when you're ready.
- **Dynasty mode**: carry a saved Super Bowl-winning team into a new season.
  Holding off on this makes sense until there's a plan for capping/decaying
  an overpowered roster between seasons.
- **Friend vs. friend matchups**: since `simulateWeek(userTeam, oppTeam, ...)`
  already takes two arbitrary teams, loading two saved teams against each
  other is mostly a UI flow, not new engine work.
- **Mid-sim play-calling**: would hook into `generatePlayByPlay` in
  `engine.js`, turning some ticker lines into decision points instead of
  fixed text.
