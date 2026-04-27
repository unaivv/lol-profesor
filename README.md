# LoL Profesor

Desktop app to analyze your League of Legends performance. Built with Tauri v2, React 19 and Rust.

![Version](https://img.shields.io/badge/version-1.1.18-blue)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)

## Features

- **Summoner profile** — Solo/Duo and Flex ranked stats, level, icons, win rate
- **LP progression** — SVG sparkline tracking LP history over time
- **Match history** — detailed match view with KDA, damage, CS, vision and timeline
- **AI analysis** — automatic per-match insights using Groq (positives, negatives, improvements)
- **Champion stats** — win rate, KDA, CS/min and mastery grouped by champion
- **Mastery** — cards with level, points, tokens and progress to next level
- **Live game** — auto-detection with rank, keystone rune, champion stats and real-time countdown
- **Favorite players** — local storage, quick access from the sidebar
- **Native notifications** — OS alert when your summoner enters a game
- **System tray** — app minimizes to tray instead of closing
- **Auto-updater** — integrated with GitHub releases
- **Dark mode** — persistent toggle

## Stack

| Layer | Technology |
|---|---|
| UI | React 19 + TypeScript + TailwindCSS |
| Desktop | Tauri v2 |
| Backend | Rust |
| Database | SQLite (r2d2 + r2d2-sqlite) |
| Assets | DDragon (Riot CDN) |
| AI | Groq API |

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- [Tauri CLI](https://tauri.app/start/prerequisites/)
- Riot API Key (`RIOT_API_KEY` in `.env`)
- Groq API Key (`GROQ_API_KEY` in `.env`, optional — required for AI analysis)

## Development

```bash
# Install dependencies
npm install

# Start in development mode
npm run tauri dev
```

Create a `.env` file at the project root:

```env
RIOT_API_KEY=RGAPI-...
GROQ_API_KEY=gsk_...
```

## Build

```bash
npm run tauri build
```

The installer is generated in `src-tauri/target/release/bundle/`.

## Supported regions

EUW · EUNE · NA · KR · JP · BR · LAN · LAS · OCE · TR · RU
