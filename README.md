# Aurora Harvest

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![Rank](https://make.fun/badge/best-game-01/gentle-walrus-31/aurora-harvest/rank.svg)](https://make.fun/bounty/best-game-01)
[![Reward](https://make.fun/badge/best-game-01/gentle-walrus-31/aurora-harvest/reward.svg)](https://make.fun/bounty/best-game-01)

Aurora Harvest is an original arcade game made for the [make.fun best-game-01 bounty](https://make.fun/bounty/best-game-01). You fly a lantern of light through the aurora, collecting falling orbs, dodging storm clouds, and chasing golden comets — reach 500 points to win before your 3 lives run out.

## How to play

- **Move:** WASD / arrow keys, or move the mouse — the lantern chases the pointer.
- **Start / restart:** Space or Enter to start, R to restart.
- **Pause:** P or Esc. M mutes the sound.
- **Score:** orbs are worth 10 points; collecting them back-to-back builds a combo up to ×5. A golden comet is worth 50 (100 bonus at full lives), and a shield protects you for 5 seconds.
- **Win / lose:** win at 500 points; lose when all 3 lives are gone. Levels rise every 20 seconds, up to level 10.

## Run it

No build step, no network requests — just static files:

```sh
node serve.ts
# then open http://localhost:8080 in desktop Chrome
```

Or serve `game/` with any static HTTP server and open `game/index.html`.

## Entry

- Game: `game/` (plain HTML/CSS/JavaScript, WebAudio sounds made in code)
- Screenshots: `screenshots/` (start, play, game over, combo — real renders of the game)
- Submission program: `main.ts`, which copies `game/` and `screenshots/` and writes `dossier.json` via `vendor/makefun-game.ts`

## License

MIT — see [LICENSE](LICENSE).
