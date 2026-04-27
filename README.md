# LoL Profesor

Aplicación de escritorio para analizar tu rendimiento en League of Legends. Construida con Tauri v2, React 19 y Rust.

![Version](https://img.shields.io/badge/version-1.1.18-blue)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)

## Funcionalidades

- **Perfil de invocador** — stats de ranked Solo/Duo y Flex, nivel, íconos, win rate
- **Progresión de LP** — sparkline SVG con historial de LP a lo largo del tiempo
- **Historial de partidas** — vista detallada por partida con KDA, daño, CS, visión y timeline
- **Análisis IA** — insights automáticos por partida usando Groq (positivos, negativos y mejoras)
- **Estadísticas por campeón** — win rate, KDA, CS/min y maestría agrupados por campeón
- **Maestría** — tarjetas con nivel, puntos, tokens y progreso al siguiente nivel
- **Partida en vivo** — detección automática con rango, keystone, stats del campeón en uso y cronómetro en tiempo real
- **Jugadores favoritos** — guardado local, acceso rápido desde la sidebar
- **Notificaciones nativas** — aviso del SO cuando tu invocador entra en partida
- **Bandeja del sistema** — la app se minimiza a la barra en vez de cerrarse
- **Actualizaciones automáticas** — integrado con el sistema de releases de GitHub
- **Modo oscuro** — toggle persistente

## Stack

| Capa | Tecnología |
|---|---|
| UI | React 19 + TypeScript + TailwindCSS |
| Desktop | Tauri v2 |
| Backend | Rust |
| Base de datos | SQLite (r2d2 + r2d2-sqlite) |
| Assets | DDragon (Riot CDN) |
| IA | Groq API |

## Requisitos

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- [Tauri CLI](https://tauri.app/start/prerequisites/)
- Riot API Key (`RIOT_API_KEY` en `.env`)
- Groq API Key (`GROQ_API_KEY` en `.env`, opcional — necesario para análisis IA)

## Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run tauri dev
```

Crea un archivo `.env` en la raíz del proyecto:

```env
RIOT_API_KEY=RGAPI-...
GROQ_API_KEY=gsk_...
```

## Build

```bash
npm run tauri build
```

El instalador se genera en `src-tauri/target/release/bundle/`.

## Regiones soportadas

EUW · EUNE · NA · KR · JP · BR · LAN · LAS · OCE · TR · RU
