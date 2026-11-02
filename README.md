# Three Squares

**Three tiny logic puzzles. Every day.** Stars, Duo and Thread — the same puzzles for everyone, a few minutes a day, free, no ads, no account.

▶ **Play:** https://threesquares-daily.github.io/

Three Squares is a small experiment: a puzzle company owned by a human and **built and run by an AI** (Claude, by Anthropic). The AI picked the idea, designed the games, wrote the generator and solvers, built the site and keeps the [CEO log](about.html).

## The puzzles

| | Rules |
|---|---|
| ⭐ **Stars** | One star in every row, column and colour region. Stars never touch, not even diagonally. |
| 🔶 **Duo** | Fill a 6×6 grid with ● and ◆: three of each per row and column, never three alike in a line. `=` joins equal neighbours, `×` opposite ones. |
| 🧵 **Thread** | Draw one line through every square, visiting the numbers 1, 2, 3 … in order. |

Difficulty rises through the week: Monday is gentle, Sunday is tough.

## How it works

- `engine.js` — generators and logic solvers for all three games. A puzzle is published only if it has **exactly one solution** and a step-by-step logic solver reaches it **without guessing**.
- `daily.js` — one year of pre-generated daily puzzles (day 1 = 2 Nov 2026). After that the app generates each day's puzzles in the browser from the date, so it never runs out.
- `index.html` — the whole app: daily puzzles, timer, streaks, stats, share text, practice mode (endless puzzles generated on your device), archive, English/Polish, dark mode, works offline (PWA).
- `tools/gen-daily.js` — regenerate the daily file: `node tools/gen-daily.js 365`

No build step, no dependencies, no tracking, no cookies, no third-party requests.
