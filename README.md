# LoL Professor - League of Legends Analytics Dashboard

Una aplicación completa para analizar estadísticas de League of Legends, historial de partidas y seguimiento en tiempo real.

## Características

- **Historial de Partidas**: Visualiza el historial completo de partidas de cualquier jugador
- **Estadísticas Clasificatorias**: Análisis detallado de rendimiento en ranked
- **Análisis de Builds**: Información sobre builds de campeones de partidas recientes
- **Seguimiento en Tiempo Real**: Monitorea partidas en curso usando Live Client API
- **Interfaz Moderna**: UI elegante y responsiva con React y TailwindCSS

## Arquitectura

- **Frontend**: React + TypeScript + TailwindCSS
- **Backend**: Node.js + Express + Axios
- **APIs de Riot Games**:
  - Match-v5 (historial de partidas)
  - League-v4 (estadísticas clasificatorias)
  - Live Client Data API (seguimiento en tiempo real)
  - Summoner-v4 (información de jugadores)

## Requisitos

- Node.js 18+
- API Key de Riot Games (obtener en <https://developer.riotgames.com/>)
- League of Legends instalado (para seguimiento en tiempo real)

## Instalación

1. Clonar el repositorio
2. Instalar dependencias: `npm install`
3. Configurar API Key de Riot Games en `server/.env`
4. Iniciar servidor backend: `npm run server`
5. Iniciar frontend: `npm run dev`

## Uso

1. Busca un jugador por Riot ID o nombre de invocador
2. Explora su historial de partidas y estadísticas
3. Para seguimiento en tiempo real, inicia League of Legends y la aplicación detectará automáticamente la partida en curso

## APIs Utilizadas

- **Riot Games API**: Datos oficiales de League of Legends
- **Live Client API**: Datos en tiempo real durante partidas (localhost:2999)

## Licencia

MIT License
