# LoL Profesor - Software Design Document (SDD)
## Implementación Completa de APIs Riot + UI/UX Profesional

**Versión:** 2.0  
**Fecha:** Abril 2026  
**Design System Base:** Tailwind CSS + shadcn/ui patterns

---

## 1. RESUMEN EJECUTIVO

### 1.1 Objetivo
Implementar todas las APIs de Riot Games disponibles para alcanzar paridad funcional con op.gg, incluyendo UI/UX profesional basada en el design system existente.

### 1.2 Alcance
- **Backend:** 5 nuevos endpoints de Riot API
- **Frontend:** 8 nuevos componentes + refactorización de 4 existentes
- **Tipos:** 12 nuevas interfaces TypeScript
- **Integración:** Sistema completo de cache + rate limiting

### 1.3 Design System Base

```css
/* Colores Primarios */
--primary-gradient: linear-gradient(135deg, #3b82f6, #9333ea);
--ranked-solo: linear-gradient(135deg, #10b981, #059669);
--ranked-flex: linear-gradient(135deg, #8b5cf6, #7c3aed);
--win: #10b981;
--loss: #ef4444;
--neutral: #64748b;

/* Estructura de Cards */
--card-radius: 1rem;        /* rounded-2xl */
--card-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--card-border: 1px solid #e2e8f0;

/* Headers de Sección */
--header-gradient: linear-gradient(135deg, #1e293b, #0f172a);
--header-padding: 1.25rem;
--header-radius: 1rem 1rem 0 0;

/* Espaciado */
--section-gap: 1.5rem;
--card-padding: 1rem;
--element-gap: 0.75rem;
```

---

## 2. ARQUITECTURA DE APIs RIOT

### 2.1 APIs a Implementar

| Prioridad | API | Endpoint Riot | Datos Obtenidos |
|-----------|-----|---------------|-----------------|
| P0 | CHAMPION-MASTERY-V4 | `/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}` | Maestría real (nivel 1-7, puntos) |
| P0 | SPECTATOR-V4 | `/lol/spectator/v4/active-games/by-summoner/{summonerId}` | Partida en vivo via API |
| P1 | LEAGUE-V4 (Flex) | `/lol/league/v4/entries/by-summoner/{summonerId}` | Ranked Flex 5v5 |
| P1 | MATCH-V5 (Timeline) | `/lol/match/v5/matches/{matchId}/timeline` | Eventos de partida (asesinatos, objetivos) |
| P2 | CLASH-V1 | `/lol/clash/v1/players/by-summoner/{summonerId}` | Torneos Clash |

### 2.2 Endpoints Backend a Crear

```typescript
// Estructura de rutas del servidor

// 1. CHAMPION MASTERY
GET /api/mastery/:puuid
→ ChampionMasteryResponse[]

// 2. SPECTATOR (Partida en vivo via Riot API)
GET /api/spectator/:summonerId
→ SpectatorGameData | null

// 3. RANKED FLEX
GET /api/ranked/:summonerId/flex
→ RankedStats (misma estructura que solo/duo)

// 4. MATCH TIMELINE (Datos avanzados de partida)
GET /api/match/:matchId/timeline
→ MatchTimeline

// 5. PLAYER COMPREHENSIVE (Todo en uno)
GET /api/player/:gameName/:tagLine/comprehensive
→ PlayerComprehensiveData
```

---

## 3. ESPECIFICACIÓN DE TIPOS TYPESCRIPT

### 3.1 Champion Mastery (Nuevo)

```typescript
// /src/types/api.ts

export interface ChampionMastery {
  championId: number
  championLevel: number        // 1-7
  championPoints: number
  lastPlayTime: number         // Timestamp
  championPointsSinceLastLevel: number
  championPointsUntilNextLevel: number
  chestGranted: boolean        // Cofre disponible
  tokensEarned: number         // Tokens S/M (niveles 6-7)
  summonerId: string
}

export interface ChampionMasteryWithDetails extends ChampionMastery {
  championName: string
  championTitle: string
  championIcon: string
  nextLevelProgress: number    // 0-100%
  estimatedGamesToNext: number // Estimación basada en promedio
}
```

### 3.2 Spectator / Partida en Vivo (Nuevo)

```typescript
export interface SpectatorGameData {
  gameId: number
  mapId: number
  gameMode: string            // CLASSIC, ARAM, etc.
  gameType: string
  gameQueueConfigId: number   // 420 = Solo/Duo, 440 = Flex
  participants: SpectatorParticipant[]
  observers: { encryptionKey: string }
  platformId: string          // EUW1
  bannedChampions: BannedChampion[]
  gameStartTime: number
  gameLength: number          // Segundos transcurridos
}

export interface SpectatorParticipant {
  teamId: number              // 100 = Azul, 200 = Rojo
  spell1Id: number           // Hechizo 1
  spell2Id: number           // Hechizo 2
  championId: number
  profileIconId: number
  summonerName: string
  bot: boolean
  summonerId: string
  gameCustomizationObjects: any[]
  perks: {                  // Runas completas
    perkIds: number[]        // 9 perks seleccionados
    perkStyle: number        // Estilo primario
    perkSubStyle: number     // Estilo secundario
  }
}

export interface BannedChampion {
  championId: number
  teamId: number
  pickTurn: number
}
```

### 3.3 Match Timeline (Nuevo)

```typescript
export interface MatchTimeline {
  metadata: {
    dataVersion: string
    matchId: string
    participants: string[]    // PUUUIDs
  }
  info: {
    frameInterval: number      // Milisegundos entre frames
    frames: TimelineFrame[]
    gameId: number
    participants: TimelineParticipant[]
  }
}

export interface TimelineFrame {
  events: TimelineEvent[]
  participantFrames: { [key: string]: ParticipantFrame }
  timestamp: number
}

export interface TimelineEvent {
  type: 'CHAMPION_KILL' | 'WARD_PLACED' | 'WARD_KILL' | 'BUILDING_KILL' | 
        'ELITE_MONSTER_KILL' | 'ITEM_PURCHASED' | 'ITEM_SOLD' | 'SKILL_LEVEL_UP'
  timestamp: number
  participantId?: number
  data?: any
}

export interface ParticipantFrame {
  championStats: {
    abilityHaste: number
    abilityPower: number
    armor: number
    armorPen: number
    attackDamage: number
    attackSpeed: number
    magicPen: number
    healthMax: number
    health: number
    gold: number
    level: number
  }
  currentGold: number
  goldPerSecond: number
  jungleMinionsKilled: number
  minionsKilled: number
  position: { x: number, y: number }
  xp: number
}
```

### 3.4 Player Comprehensive (Agregado a PlayerData)

```typescript
export interface PlayerComprehensiveData extends PlayerData {
  matches: DetailedMatch[]
  rankedStats: {
    solo: RankedStats | null
    flex: RankedStats | null
  }
  mastery: ChampionMasteryWithDetails[]
  currentGame: SpectatorGameData | null
  summaryStats: PlayerSummaryStats
}

export interface PlayerSummaryStats {
  totalGames: number
  wins: number
  losses: number
  winRate: number
  averageKDA: { kills: number, deaths: number, assists: number }
  favoriteChampions: { championId: number, games: number, winRate: number }[]
  recentTrend: 'improving' | 'stable' | 'declining'
  peakRank: { tier: string, rank: string, lp: number, season: string } | null
}
```

---

## 4. ESPECIFICACIÓN DE COMPONENTES UI

### 4.1 Componentes Nuevos

#### 4.1.1 ChampionMasteryCard
```typescript
interface ChampionMasteryCardProps {
  mastery: ChampionMasteryWithDetails
  showProgress?: boolean
  size?: 'sm' | 'md' | 'lg'
}
```

**Diseño:**
```
┌─────────────────────────────────────┐
│  ┌────┐                             │
│  │Icon│  Champion Name     M7       │
│  │ L7 │  Champion Title    [badge]  │
│  └────┘                             │
│  ─────────────────────────────────  │
│  Puntos: 125,430                   │
│  [████████░░░░░░░░░░] 67% → M6      │
│  Cofre: ✓  Tokens: 2/2              │
│  Última partida: Hace 2 días        │
└─────────────────────────────────────┘
```

**Estilos:**
- Card: `bg-white rounded-2xl shadow-lg border border-slate-200 p-4`
- Icon: `w-16 h-16 rounded-xl border-2 border-yellow-400` (oro/platino según nivel)
- Level badge: Absolute positioned top-right con gradiente según nivel
- Progress bar: `h-2 bg-slate-200 rounded-full overflow-hidden`

#### 4.1.2 MatchDetailCard (Expandido)
```typescript
interface MatchDetailCardProps {
  match: DetailedMatch
  playerPuuid: string
  isExpanded?: boolean
}
```

**Diseño Expandido:**
```
┌────────────────────────────────────────────────────────────┐
│  🏆 VICTORIA              24:32    Clásico    2/3/2025    │
├────────────────────────────────────────────────────────────┤
│  KDA: 8/2/12    CS: 186    Oro: 12.4k    Daño: 45.2k      │
├────────────────────────────────────────────────────────────┤
│  [Item1][Item2][Item3][Item4][Item5][Item6][Trinket]      │
├────────────────────────────────────────────────────────────┤
│  Runas: [Domination] + [Sorcery]                           │
│  [Electrocute][SuddenImpact][Eyeball][TreasureHunter]      │
├────────────────────────────────────────────────────────────┤
│  EQUIPO AZUL (Victoria)        EQUIPO ROJO (Derrota)      │
│  ┌─────────────────────────┐   ┌─────────────────────────┐│
│  │ Jax      12/3/8  MVP    │   │ Darius    3/8/2         ││
│  │ Lee Sin   8/2/12 (YOU)   │   │ Vi        4/6/1         ││
│  │ ...                      │   │ ...                     ││
│  └─────────────────────────┘   └─────────────────────────┘│
├────────────────────────────────────────────────────────────┤
│  📊 Estadísticas avanzadas    ▼                           │
└────────────────────────────────────────────────────────────┘
```

#### 4.1.3 SpectatorCard (Partida en Vivo via Riot)
```typescript
interface SpectatorCardProps {
  game: SpectatorGameData
  playerPuuid: string
}
```

**Diseño:**
```
┌──────────────────────────────────────────────────────┐
│ 🔴 EN VIVO • 12:34 • Clasificatoria Solo/Duo        │
├──────────────────────────────────────────────────────┤
│ ⏱️ Tiempo: 24:35                                    │
│                                                      │
│  EQUIPO AZUL (100)       EQUIPO ROJO (200)         │
│  ┌────────────────────┐  ┌────────────────────┐     │
│  │ 🥇 Jax        8/2/1│  │ Darius      2/4/1 │     │
│  │ 🥈 Lee Sin    6/1/4│  │ Vi          1/5/2│    │
│  │ 🥉 Ahri       4/2/6│  │ Viktor      3/2/1│    │
│  └────────────────────┘  └────────────────────┘     │
│                                                      │
│  🎯 Objetivos: 3 Dragones vs 1 Dragón + 1 Barón    │
│  💰 Oro: 52.3k vs 48.1k                            │
└──────────────────────────────────────────────────────┘
```

#### 4.1.4 RankedComparisonCard
```typescript
interface RankedComparisonCardProps {
  solo: RankedStats | null
  flex: RankedStats | null
}
```

**Diseño:**
```
┌─────────────────────────────────────────────────────────┐
│ 📊 RANKEDS                                              │
├──────────────────────────┬──────────────────────────────┤
│    SOLO/DUO              │    FLEX 5v5                  │
│                          │                              │
│  ┌──────┐                │  ┌──────┐                     │
│  │ GOLD │                │  │ SILVER│                   │
│  │  IV  │                │  │  II  │                    │
│  └──────┘                │  └──────┘                     │
│                          │                              │
│  2,340 LP                │  1,250 LP                     │
│                          │                              │
│  [███░░░░░░░] 34%        │  [██████░░░] 67%              │
│                          │                              │
│  45V - 32D (58%)         │  12V - 8D (60%)               │
│                          │                              │
│  🔥 En racha             │                               │
└──────────────────────────┴──────────────────────────────┘
```

#### 4.1.5 PlayerSummaryDashboard
```typescript
interface PlayerSummaryDashboardProps {
  summary: PlayerSummaryStats
  playerData: PlayerData
}
```

**Diseño:**
```
┌─────────────────────────────────────────────────────────┐
│ Resumen de Temporada                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │  156    │ │  58%    │ │  3.2    │ │  ↑      │         │
│  │ Partidas│ │ Win Rate│ │ KDA     │ │ Tendencia│         │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│                                                         │
│  Campeones más jugados:                                 │
│  ┌─────────────────────────────────────────────────────┐│
│  │ 1. Yasuo (34 partidas, 62% WR)  ████████████        ││
│  │ 2. Lee Sin (28 partidas, 54% WR) ██████████         ││
│  │ 3. Ahri (21 partidas, 58% WR)   ████████            ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  Rango más alto esta temporada: Diamond IV (2,450 LP)  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 4.1.6 TimelineEventList
```typescript
interface TimelineEventListProps {
  timeline: MatchTimeline
  maxEvents?: number
}
```

**Diseño:**
```
┌─────────────────────────────────────────────────────────┐
│ 📈 Timeline de la Partida                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  04:32  🔪 First Blood - Yasuo asesina a Zed           │
│  08:15  🐉 Dragón Infernal para Equipo Azul             │
│  12:45  💀 Yasuo (8/0/2) está imparable!               │
│  15:20  👁️ Barón Nashor para Equipo Rojo               │
│  18:30  ⚔️ Teamfight: 4 kills para Azul, 1 para Rojo   │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

---

### 4.2 Refactorización de Componentes Existentes

#### 4.2.1 ProfileHeader (Mejorado)

**Cambios:**
- Agregar insignias de rango (Solo + Flex)
- Mostrar último login
- Agregar botón "Ver en OP.GG" (link externo)
- Mostrar estado "En partida" si Spectator detecta juego activo

```
┌────────────────────────────────────────────────────────────┐
│ ┌────┐  MeowthTeamRocket#TRCKT              [En partida 🔴] │
│ │Icon│  Nivel 286 • EUW                       [Ver OP.GG] │
│ └────┘                                                     │
│ ┌──────────┐ ┌──────────┐                                   │
│ │ 🥇 GOLD  │ │ 🥈 SILVER│  Última partida: Hace 2 horas     │
│ │  Solo/Duo│ │  Flex   │                                   │
│ └──────────┘ └──────────┘                                   │
└────────────────────────────────────────────────────────────┘
```

#### 4.2.2 MatchHistory (Mejorado)

**Nuevas funciones:**
- Filtros por cola: Todos / Solo/Duo / Flex / ARAM / Normal
- Filtros por campeón: Dropdown multiselect
- Vista compacta vs expandida
- Paginación o "Cargar más"
- Exportar a CSV/JSON

**Filtros UI:**
```
┌─────────────────────────────────────────────────────────┐
│ Historial de Partidas                     [⚙️ Filtros] │
├─────────────────────────────────────────────────────────┤
│ [Todos ▼] [Cualquier Campeón ▼] [Últimos 20 ▼] [🔍]    │
│ [Solo/Duo] [Flex] [ARAM] [Normal] [Personalizado]      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Partida 1...                                          │
│  Partida 2...                                          │
│  ...                                                   │
│                                                         │
│              [Cargar más partidas ↓]                   │
└─────────────────────────────────────────────────────────┘
```

#### 4.2.3 ChampionStats (Real con datos de API)

**Cambios:**
- Usar datos reales de MATCH-V5 en lugar de simulados
- Agregar filtro por cola
- Agregar gráfico de tendencia (últimas 20 partidas)
- Comparación con promedio global

```
┌─────────────────────────────────────────────────────────┐
│ Estadísticas por Campeón              [Solo/Duo ▼]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Yasuo                              ████████████ 34 pts │
│  ┌────┐  34 partidas    62% WR      [Gráfico mini]     │
│  │Icon│  4.2 KDA         ↑ Mejorando últimas 5         │
│  └────┘                                                 │
│                                                         │
│  Lee Sin                            ██████████ 28 pts   │
│  ┌────┐  28 partidas    54% WR                         │
│  │Icon│  3.1 KDA         → Estable                      │
│  └────┘                                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 4.2.4 MasteryStats (Real con CHAMPION-MASTERY-V4)

**Cambios:**
- Reemplazar simulación con datos reales de API
- Mostrar progreso real hacia siguiente nivel
- Agregar cálculo estimado de partidas para siguiente nivel
- Filtros: Por nivel / Por puntos / Por última partida

```
┌─────────────────────────────────────────────────────────┐
│ Maestría de Campeones        [Por Nivel ▼] [Grid/List] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │  M7     │ │  M7     │ │  M6     │ │  M6     │        │
│  │ Yasuo   │ │ Lee Sin │ │ Ahri    │ │ Jax     │        │
│  │ 254K    │ │ 180K    │ │ 45K     │ │ 32K     │        │
│  │ ⭐⭐⭐   │ │ ⭐⭐⭐   │ │ ⭐⭐     │ │ ⭐⭐     │        │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │
│                                                         │
│  [Ver todos los campeones →]                            │
└─────────────────────────────────────────────────────────┘
```

---

## 5. PÁGINAS Y VISTAS

### 5.1 StatsPage Refactorizada

**Estructura:**
```
StatsPage
├── ProfileHeader (mejorado con ranked dual)
├── QuickStatsBar (4 cards: Nivel, Partidas, Rango, Región)
├── TabNavigation
│   ├── Summary (default)
│   ├── Champions
│   ├── Mastery
│   ├── Live Game
│   └── Analysis (nuevo)
└── TabContent
```

#### 5.1.1 Tab "Summary" (Resumen)

**Layout:** Grid de 12 columnas
```
┌────────────────────────────────────────────────────────────┐
│                    ProfileHeader                           │
├────────────────────────────────────────────────────────────┤
│  [Nivel 286] [156 Pts] [Gold IV] [EUW]                     │
├────────────────────────────────────────────────────────────┤
│  [Resumen] [Campeones] [Maestría] [En Vivo] [Análisis]    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────────┬───────────────────────────┐  │
│  │                         │                           │  │
│  │   RankedComparisonCard  │    LiveGameCard           │  │
│  │   (Solo + Flex)         │    (Spectator API)        │  │
│  │                         │                           │  │
│  ├─────────────────────────┤                           │  │
│  │                         │                           │  │
│  │   PlayerSummaryDashboard│    ChampionMasteryPreview │  │
│  │   (Estadísticas clave)  │    (Top 5 maestría)       │  │
│  │                         │                           │  │
│  ├─────────────────────────┴───────────────────────────┤  │
│  │                                                     │  │
│  │   MatchHistory (últimas 5 partidas destacadas)      │  │
│  │   [Ver historial completo →]                        │  │
│  │                                                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### 5.1.2 Tab "Champions" (Campeones)

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│  Filtros: [Todas las colas ▼] [Todos los campeones ▼]     │
│  [Buscar campeón... 🔍]                                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Vista: [Tarjetas ▼]  Ordenar: [Por partidas ▼]            │
│                                                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ Yasuo   │ │ Lee Sin │ │ Ahri    │ │ Jax     │          │
│  │ [stats] │ │ [stats] │ │ [stats] │ │ [stats] │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                            │
│  [Cargar más campeones ↓]                                  │
└────────────────────────────────────────────────────────────┘
```

#### 5.1.3 Tab "Mastery" (Maestría)

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│  Resumen de Maestría                                        │
│  Total de puntos: 1,245,600  •  Campeones M7: 12          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Ordenar: [Por nivel ▼]  Mostrar: [Todos ▼]               │
│                                                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐│
│  │ M7      │ │ M7      │ │ M6      │ │ M5      │ │ M4     ││
│  │ [icon]  │ │ [icon]  │ │ [icon]  │ │ [icon]  │ │[icon]  ││
│  │ Yasuo   │ │ Lee     │ │ Ahri    │ │ Jax     │ │Zed     ││
│  │ 254,300 │ │ 180,200 │ │ 45,600  │ │ 21,400  │ │8,200   ││
│  │ ⭐⭐⭐   │ │ ⭐⭐⭐   │ │ ⭐⭐     │ │ ⭐       │ │        ││
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └────────┘│
│                                                            │
│  [Ver en formato lista 📋]                                  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### 5.1.4 Tab "Live Game" (En Vivo)

**Estados:**

1. **Jugando ahora (Spectator API):**
```
┌────────────────────────────────────────────────────────────┐
│ 🔴 EN VIVO • Partida Clasificatoria Solo/Duo              │
│    Duración: 24:35  •  Mapa: Grieta del Invocador         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  EQUIPO AZUL                                    52.3k oro  │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Jax        8/2/1   12.4k  [Items] [Runas]           │ │
│  │ Lee Sin    6/1/4   10.2k  [Items] [Runas]  (YOU)    │ │
│  │ Ahri       4/2/6    8.1k  [Items] [Runas]           │ │
│  │ ...                                                 │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                            │
│  EQUIPO ROJO                                    48.1k oro  │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Darius     2/4/1    9.2k  [Items] [Runas]           │ │
│  │ Vi         1/5/2    7.8k  [Items] [Runas]           │ │
│  │ ...                                                 │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                            │
│  📊 Estimador de Victoria: 68% favorito Azul               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

2. **No jugando:**
```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                    😴 No hay partida activa               │
│                                                            │
│     El jugador no está en una partida en este momento     │
│                                                            │
│     [Actualizar 🔃]                                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### 5.1.5 Tab "Analysis" (Análisis - NUEVO)

**Nuevas métricas avanzadas:**
```
┌────────────────────────────────────────────────────────────┐
│ Análisis de Rendimiento                                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Tendencia de Win Rate (últimas 30 partidas)              │
│  [Gráfico de línea con promedio móvil]                    │
│                                                            │
│  ┌────────────────────┬────────────────────┐              │
│  │  Desempeño por    │  Comparación vs    │              │
│  │  hora del día     │  jugadores del     │              │
│  │  [Heatmap]        │  mismo elo          │              │
│  │                   │  [Radar chart]      │              │
│  └────────────────────┴────────────────────┘              │
│                                                            │
│  Rol más efectivo: Jungla (62% WR)                        │
│  Mejor duo: Yasuo + Lee Sin (75% WR juntos)              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 6. FLUJO DE DATOS Y ESTADOS

### 6.1 Diagrama de Flujo

```
Usuario busca jugador
        │
        ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  1. ACCOUNT  │────▶│  2. SUMMONER  │────▶│  3. RANKED   │
│     -V1      │     │     -V4      │     │    -V4 x2    │
└───────────────┘     └───────────────┘     └───────────────┘
        │                                           │
        │         ┌───────────────┐                │
        └────────▶│  4. MATCH-V5  │◀───────────────┘
                  │   (IDs + x5   │
                  │   detalles)   │
                  └───────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │  5. MASTERY   │
                  │     -V4       │
                  └───────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │  6. SPECTATOR │ (Opcional - si está jugando)
                  │     -V4       │
                  └───────────────┘
                          │
                          ▼
                  ┌───────────────────────┐
                  │  PlayerComprehensive  │
                  │       Data            │
                  └───────────────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ localStorage│
                   │  + Cache    │
                   └─────────────┘
```

### 6.2 Estrategia de Cache

```typescript
// Cache hierarchy
interface CacheStrategy {
  memory: {
    duration: 60000,        // 1 minuto
    maxSize: 50           // 50 jugadores
  }
  localStorage: {
    duration: 300000,      // 5 minutos
    key: 'lolProfessorCache'
  }
  session: {
    currentPlayer: 'lolProfessorPlayer'
  }
}
```

### 6.3 Estados de Carga

```typescript
// Loading states con UI
enum LoadingState {
  IDLE = 'idle',                    // Default
  SEARCHING = 'searching',          // 🔍 Buscando jugador...
  FETCHING_MATCHES = 'matches',     // 📊 Cargando partidas (1/20)...
  FETCHING_MASTERY = 'mastery',     // 🏆 Cargando maestría...
  FETCHING_SPECTATOR = 'spectator', // 👁️ Verificando partida activa...
  COMPLETE = 'complete',            // ✅ Listo
  ERROR = 'error'                   // ❌ Error
}
```

**UI de Carga Mejorada:**
```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                      🔄 Cargando...                        │
│                                                            │
│              ┌─────────────────────────┐                   │
│              │ ████████████░░░░░░░░░ │                   │
│              └─────────────────────────┘                   │
│                                                            │
│  📊 Cargando partidas (15/20)...                          │
│                                                            │
│  ✓ Datos del jugador                                      │
│  ✓ Estadísticas ranked                                    │
│  ✓ Partidas (15/20)                                       │
│  🔄 Maestría de campeones                                 │
│  ⏳ Verificando partida en vivo                           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 7. IMPLEMENTACIÓN TÉCNICA

### 7.1 Nuevos Hooks

```typescript
// useChampionMastery.ts
export function useChampionMastery(puuid: string) {
  const [mastery, setMastery] = useState<ChampionMasteryWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (!puuid) return
    setLoading(true)
    fetch(`/api/mastery/${puuid}`)
      .then(r => r.json())
      .then(data => setMastery(enhanceMasteryData(data)))
      .finally(() => setLoading(false))
  }, [puuid])
  
  return { mastery, loading }
}

// useSpectator.ts
export function useSpectator(summonerId: string) {
  const [game, setGame] = useState<SpectatorGameData | null>(null)
  const [loading, setLoading] = useState(false)
  
  const checkGame = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/spectator/${summonerId}`)
    if (res.ok) {
      const data = await res.json()
      setGame(data)
    } else {
      setGame(null)
    }
    setLoading(false)
  }, [summonerId])
  
  // Auto-refresh cada 30 segundos si hay partida
  useEffect(() => {
    checkGame()
    if (game) {
      const interval = setInterval(checkGame, 30000)
      return () => clearInterval(interval)
    }
  }, [summonerId, game?.gameId])
  
  return { game, loading, refresh: checkGame }
}

// useMatchTimeline.ts
export function useMatchTimeline(matchId: string) {
  const [timeline, setTimeline] = useState<MatchTimeline | null>(null)
  
  useEffect(() => {
    if (!matchId) return
    fetch(`/api/match/${matchId}/timeline`)
      .then(r => r.json())
      .then(setTimeline)
  }, [matchId])
  
  return { timeline }
}
```

### 7.2 Nuevos Endpoints Backend

```typescript
// server/src/index.ts - Nuevas rutas

// 1. Champion Mastery
app.get('/api/mastery/:puuid', async (req, res) => {
  try {
    const { puuid } = req.params
    const response = await riotApi.get(
      `${REGIONAL_URL}/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`
    )
    res.json(response.data)
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch mastery data')
  }
})

// 2. Spectator (Partida en vivo via Riot API)
app.get('/api/spectator/:summonerId', async (req, res) => {
  try {
    const { summonerId } = req.params
    const response = await riotApi.get(
      `${REGIONAL_URL}/lol/spectator/v4/active-games/by-summoner/${summonerId}`
    )
    res.json(response.data)
  } catch (error: any) {
    if (error.response?.status === 404) {
      res.status(404).json({ error: 'Player not in game' })
    } else {
      handleApiError(error, res, 'Failed to check spectator data')
    }
  }
})

// 3. Ranked Flex
app.get('/api/ranked/:summonerId/flex', async (req, res) => {
  try {
    const { summonerId } = req.params
    const response = await riotApi.get(
      `${REGIONAL_URL}/lol/league/v4/entries/by-summoner/${summonerId}`
    )
    const flexQueue = response.data.find(
      (entry: any) => entry.queueType === 'RANKED_FLEX_SR'
    )
    if (flexQueue) {
      res.json(transformRankedData(flexQueue))
    } else {
      res.status(404).json({ error: 'No flex ranked data' })
    }
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch flex ranked data')
  }
})

// 4. Match Timeline
app.get('/api/match/:matchId/timeline', async (req, res) => {
  try {
    const { matchId } = req.params
    const response = await riotApi.get(
      `${BASE_URL}/lol/match/v5/matches/${matchId}/timeline`
    )
    res.json(response.data)
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch timeline')
  }
})

// 5. Comprehensive Player Data (Todo en uno)
app.get('/api/player/:gameName/:tagLine/comprehensive', async (req, res) => {
  try {
    const { gameName, tagLine } = req.params
    
    // 1. Account
    const account = await riotApi.get<RiotAccount>(...)
    
    // 2. Summoner
    const summoner = await riotApi.get<RiotSummoner>(...)
    
    // 3. Ranked (Solo + Flex) - Parallel
    const [rankedEntries, mastery, matchIds, spectator] = await Promise.all([
      riotApi.get<RiotRankedEntry[]>(...),
      riotApi.get<ChampionMastery[]>(...),
      riotApi.get<string[]>(...),
      riotApi.get<SpectatorGameData>(...).catch(() => null)
    ])
    
    // 4. Match details (limit 10)
    const matches = await Promise.all(
      matchIds.data.slice(0, 10).map(id => 
        riotApi.get(`${BASE_URL}/lol/match/v5/matches/${id}`)
      )
    )
    
    // Combine all
    const comprehensive: PlayerComprehensiveData = {
      ...baseData,
      rankedStats: {
        solo: extractSolo(rankedEntries.data),
        flex: extractFlex(rankedEntries.data)
      },
      mastery: enhanceMastery(mastery.data),
      matches: transformMatches(matches.map(m => m.data)),
      currentGame: spectator,
      summaryStats: calculateSummary(matches, rankedEntries.data)
    }
    
    res.json(comprehensive)
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch comprehensive data')
  }
})
```

---

## 8. UI COMPONENTS LIBRARY

### 8.1 Estructura de Carpetas

```
src/
├── components/
│   ├── ui/                    # shadcn/ui base
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   └── ...
│   │
│   ├── player/                # NUEVO - Componentes de jugador
│   │   ├── ProfileHeader.tsx
│   │   ├── RankedComparisonCard.tsx
│   │   ├── PlayerSummaryDashboard.tsx
│   │   └── QuickStatsBar.tsx
│   │
│   ├── matches/               # NUEVO - Componentes de partidas
│   │   ├── MatchHistory.tsx
│   │   ├── MatchDetailCard.tsx
│   │   ├── MatchFilters.tsx
│   │   ├── MatchTimeline.tsx
│   │   └── ParticipantRow.tsx
│   │
│   ├── champions/             # NUEVO - Componentes de campeones
│   │   ├── ChampionStats.tsx
│   │   ├── ChampionCard.tsx
│   │   └── ChampionTrendChart.tsx
│   │
│   ├── mastery/               # NUEVO - Componentes de maestría
│   │   ├── MasteryStats.tsx
│   │   ├── MasteryCard.tsx
│   │   ├── MasteryGrid.tsx
│   │   └── MasteryProgressBar.tsx
│   │
│   ├── live/                  # NUEVO - Componentes de partida en vivo
│   │   ├── SpectatorCard.tsx
│   │   ├── LiveGameTracker.tsx
│   │   ├── LiveParticipant.tsx
│   │   └── WinProbability.tsx
│   │
│   └── layout/
│       ├── Header.tsx
│       └── Footer.tsx
│
├── hooks/
│   ├── usePlayerData.ts
│   ├── useChampionMastery.ts    # NUEVO
│   ├── useSpectator.ts          # NUEVO
│   ├── useMatchTimeline.ts      # NUEVO
│   └── useComprehensiveData.ts  # NUEVO
│
├── types/
│   ├── api.ts                   # EXTENDIDO
│   └── index.ts
│
└── lib/
    ├── utils.ts
    ├── riotApi.ts               # NUEVO - Cliente API
    └── dataTransformers.ts      # NUEVO - Transformadores de datos
```

### 8.2 Design Tokens (Tailwind Config)

```javascript
// tailwind.config.js extend
theme: {
  extend: {
    colors: {
      ranked: {
        iron: '#7d7d7d',
        bronze: '#cd7f32',
        silver: '#c0c0c0',
        gold: '#ffd700',
        platinum: '#00bfff',
        emerald: '#50c878',
        diamond: '#b9f2ff',
        master: '#9370db',
        grandmaster: '#ff4500',
        challenger: '#ffff00',
      },
      match: {
        win: '#10b981',
        loss: '#ef4444',
        neutral: '#64748b',
      }
    },
    backgroundImage: {
      'gradient-ranked': 'linear-gradient(135deg, var(--tw-gradient-stops))',
      'gradient-win': 'linear-gradient(135deg, #10b981, #059669)',
      'gradient-loss': 'linear-gradient(135deg, #ef4444, #dc2626)',
    },
    animation: {
      'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      'shimmer': 'shimmer 2s linear infinite',
    },
    keyframes: {
      shimmer: {
        '0%': { backgroundPosition: '-1000px 0' },
        '100%': { backgroundPosition: '1000px 0' },
      }
    }
  }
}
```

---

## 9. CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Backend (2-3 días)
- [ ] Crear endpoint `/api/mastery/:puuid`
- [ ] Crear endpoint `/api/spectator/:summonerId`
- [ ] Crear endpoint `/api/ranked/:summonerId/flex`
- [ ] Crear endpoint `/api/match/:matchId/timeline`
- [ ] Crear endpoint `/api/player/:gameName/:tagLine/comprehensive`
- [ ] Agregar tipos TypeScript en servidor
- [ ] Testing con Postman/Thunder Client

### Fase 2: Hooks y Data Layer (1-2 días)
- [ ] Implementar `useChampionMastery`
- [ ] Implementar `useSpectator`
- [ ] Implementar `useMatchTimeline`
- [ ] Implementar `useComprehensiveData`
- [ ] Crear transformers de datos
- [ ] Implementar cache strategy

### Fase 3: Componentes UI (3-4 días)
- [ ] ChampionMasteryCard
- [ ] RankedComparisonCard
- [ ] MatchDetailCard (expandido)
- [ ] SpectatorCard
- [ ] PlayerSummaryDashboard
- [ ] MatchFilters
- [ ] TimelineEventList
- [ ] ChampionCard (stats)

### Fase 4: Refactorización (2 días)
- [ ] Refactorizar ProfileHeader
- [ ] Refactorizar MatchHistory (con filtros)
- [ ] Refactorizar ChampionStats (datos reales)
- [ ] Refactorizar MasteryStats (datos reales)
- [ ] Refactorizar StatsPage (nuevo layout)

### Fase 5: Testing y Polish (2-3 días)
- [ ] Testing E2E con diferentes jugadores
- [ ] Optimización de performance (React.memo, useMemo)
- [ ] Manejo de errores y estados vacíos
- [ ] Responsive design testing
- [ ] Accesibilidad (ARIA labels, keyboard nav)
- [ ] Dark mode (opcional)

---

## 10. REFERENCIAS

### APIs Riot Games
- [Riot Developer Portal](https://developer.riotgames.com/apis)
- [ACCOUNT-V1](https://developer.riotgames.com/apis#account-v1)
- [SUMMONER-V4](https://developer.riotgames.com/apis#summoner-v4)
- [MATCH-V5](https://developer.riotgames.com/apis#match-v5)
- [LEAGUE-V4](https://developer.riotgames.com/apis#league-v4)
- [CHAMPION-MASTERY-V4](https://developer.riotgames.com/apis#champion-mastery-v4)
- [SPECTATOR-V4](https://developer.riotgames.com/apis#spectator-v4)

### Design System
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [Lucide Icons](https://lucide.dev/icons/)

### Referencias UI
- [op.gg](https://op.gg)
- [u.gg](https://u.gg)
- [porofessor.gg](https://porofessor.gg)

---

**Documento creado para implementación inmediata con design system existente como base.**
