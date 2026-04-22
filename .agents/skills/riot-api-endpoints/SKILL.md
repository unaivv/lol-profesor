---
name: riot-api-endpoints
description:
  Documentación de los endpoints de la Riot API usados en el proyecto LoL Professor.
  Úsala para entender qué datos están disponibles, cómo mapearlos, y como referencia
  rápida al trabajar con la API de League of Legends.
license: MIT
metadata:
  author: lol-professor
  version: '1.0.0'
---

# Riot API Endpoints - LoL Professor

Documentación de los endpoints de Riot API usados en el proyecto, con ejemplos de
respuestas y campos disponibles.

## Endpoints en Uso

### 1. Account V1 - Buscar cuenta por Riot ID

**Endpoint:** `GET /riot/account/v1/accounts/by-riot/{gameName}/{tagLine}`

**Uso en código:** `server/src/index.ts` - línea ~60

```typescript
const accountResp = await riotApi.get(
  `${BASE_URL}/riot/account/v1/accounts/by-riot/${gameName}/${tagLine}`
)
```

**Respuesta:**
```json
{
  "puuid": "string",
  "gameName": "string",
  "tagLine": "string"
}
```

**Campos útiles:**
- `puuid` - Identificador único del jugador (usado para otras APIs)
- `gameName` - Nombre del jugador
- `tagLine` - Tag del jugador (ej: "TRCKT")

---

### 2. Summoner V4 - Datos del invocador

**Endpoint:** `GET /lol/summoner/v4/summoners/by-puuid/{encryptedPUUID}`

**Uso en código:** `server/src/index.ts` - línea ~70

```typescript
const summonerResp = await riotApi.get(
  `${REGIONAL_URL}/lol/summoner/v4/summoners/by-puuid/${puuid}`
)
```

**Respuesta:**
```json
{
  "id": "string",
  "accountId": "string",
  "puuid": "string",
  "name": "string",
  "profileIconId": number,
  "revisionDate": number,
  "summonerLevel": number
}
```

**Campos útiles:**
- `id` - Summoner ID (para ranked stats)
- `profileIconId` - ID del icono de perfil
- `summonerLevel` - Nivel del invocador

---

### 3. League V4 - Stats Clasificatorias

**Endpoint:** `GET /lol/league/v4/entries/by-summoner/{encryptedSummonerId}`

**Uso en código:** `server/src/index.ts` - línea ~370

```typescript
const response = await riotApi.get<RiotRankedEntry[]>(
  `${REGIONAL_URL}/lol/league/v4/entries/by-summoner/${summonerId}`
)
```

**Respuesta (array):**
```json
[
  {
    "leagueId": "string",
    "queueType": "RANKED_SOLO_5x5" | "RANKED_FLEX_SR",
    "tier": "IRON" | "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "EMERALD" | "DIAMOND" | "MASTER" | "GRANDMASTER" | "CHALLENGER",
    "rank": "I" | "II" | "III" | "IV",
    "leaguePoints": number,
    "wins": number,
    "losses": number,
    "veteran": boolean,
    "inactive": boolean,
    "freshBlood": boolean,
    "hotStreak": boolean
  }
]
```

---

### 4. Champion Mastery V4 - Maestría de campeones

**Endpoint:** `GET /lol/champion-mastery/v4/champion-masteries/by-puuid/{encryptedPUUID}`

**Uso en código:** `server/src/index.ts` - línea ~475

```typescript
const response = await riotApi.get<ChampionMastery[]>(
  `${REGIONAL_URL}/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`
)
```

**Respuesta (array de objetos):**
```json
[
  {
    "championId": number,
    "championLevel": number,        // 1-7
    "championPoints": number,
    "lastPlayTime": number,         // Timestamp
    "championPointsSinceLastLevel": number,
    "championPointsUntilNextLevel": number,
    "chestGranted": boolean,
    "tokensEarned": number,
    "summonerId": "string"
  }
]
```

---

### 5. Match V5 - Historial de partidas

**Endpoint:** `GET /lol/match/v5/matches/by-puuid/{encryptedPUUID}/ids`

**Uso en código:** `server/src/index.ts` - línea ~115

```typescript
const matchIdsResponse = await riotApi.get<string[]>(
  `${BASE_URL}/lol/match/v5/matches/by-puuid/${puuid}/ids`,
  { params: { count, start } }
)
```

**Respuesta:** Array de match IDs `["EUW1_1234567890", ...]`

---

### 6. Match V5 - Detalles de partida

**Endpoint:** `GET /lol/match/v5/matches/{matchId}`

**Uso en código:** `server/src/index.ts` - línea ~140

```typescript
const matchResponse = await riotApi.get<any>(
  `${BASE_URL}/lol/match/v5/matches/${matchId}`
)
```

**Estructura de respuesta (participant):**
```json
{
  "participantId": number,
  "teamId": number,           // 100 = Azul, 200 = Rojo
  "win": boolean,
  "championId": number,
  "championName": "string",
  "summonerName": "string",
  "puuid": "string",
  "kills": number,
  "deaths": number,
  "assists": number,
  "goldEarned": number,
  "totalMinionsKilled": number,
  "neutralMinionsKilled": number,
  "visionWardsBoughtInGame": number,
  "visionScore": number,           // PUNTUACIÓN DE VISIÓN - IMPORTANTE
  "wardsPlaced": number,           // Total wards colocados
  "wardsKilled": number,           // Wards enemigos destruidos
  "sightWardsBoughtInGame": number,
  "damageDealtToChampions": number,
  "damageTaken": number,
  "totalHeal": number,
  "timePlayed": number,            // Segundos
  "champLevel": number,
  "item0" - "item6": number,       // IDs de objetos
  "perks": {
    "styles": [
      {
        "style": number,
        "selections": [
          { "perk": number }
        ]
      }
    ]
  }
}
```

**⚠️ IMPORTANTE - Campos de Visión:**
- `visionScore` - Puntuación oficial de visión del juego (0-100+)
- `visionWardsBoughtInGame` - Solo control wards comprados
- `wardsPlaced` - Total de wards colocados (incluyendo trinket)
- `wardsKilled` - Wards enemigos eliminados

**No usar** `visionWardsBoughtInGame` solo para calcular visión - usar `visionScore` o combinar los campos.

---

### 7. Match V5 - Timeline (minuto a minuto)

**Endpoint:** `GET /lol/match/v5/matches/{matchId}/timeline`

**Uso en código:** `server/src/index.ts` - línea ~335

```typescript
const response = await riotApi.get(
  `${BASE_URL}/lol/match/v5/matches/${matchId}/timeline`
)
```

**Estructura:**
```json
{
  "metadata": {
    "dataVersion": "string",
    "matchId": "string",
    "participants": ["puuid1", "puuid2", ...]
  },
  "info": {
    "frameInterval": number,  // Ms entre frames
    "frames": [
      {
        "timestamp": number,
        "participantFrames": {
          "1": { "participantId": 1, "level": 10, "currentHealth": 500, "minionsKilled": 100, ... },
          ...
        },
        "events": [
          {
            "type": "CHAMPION_KILL" | "WARD_PLACED" | "WARD_KILL" | "ITEM_PURCHASED",
            "timestamp": number,
            "participantId": number,
            "wardType": "CONTROL_WARD" | "YELLOW_TRINKET" | "VISION_WARD"
          }
        ]
      }
    ]
  }
}
```

---

### 8. Spectator V4 - Partida en vivo

**Endpoint:** `GET /lol/spectator/v5/active-games/by-summoner/{encryptedSummonerId}`

**Uso en código:** `server/src/index.ts` - línea ~490

```typescript
const response = await riotApi.get<SpectatorGameData>(
  `${REGIONAL_URL}/lol/spectator/v5/active-games/by-summoner/${puuid}`
)
```

**Respuesta:**
```json
{
  "gameId": number,
  "mapId": number,
  "gameMode": "CLASSIC" | "ARAM" | "URF",
  "gameType": "MATCHED_GAME",
  "gameQueueConfigId": number,  // 420 = Solo/Duo, 440 = Flex
  "participants": [
    {
      "teamId": number,
      "spell1Id": number,
      "spell2Id": number,
      "championId": number,
      "profileIconId": number,
      "summonerName": "string",
      "bot": boolean,
      "summonerId": "string",
      "perks": { "perkIds": [1,2,3...], "perkStyle": number, "perkSubStyle": number }
    }
  ],
  "bannedChampions": [...]
}
```

---

## Campos Importantes por Tipo de Datos

### Stats de Jugador (Participant)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `visionScore` | number | Puntuación oficial de visión |
| `visionWardsBoughtInGame` | number | Control wards comprados |
| `wardsPlaced` | number | Total wards colocados |
| `wardsKilled` | number | Wards enemigos eliminados |
| `totalMinionsKilled` | number | CS total (sin neutrales) |
| `neutralMinionsKilled` | number | Monstruos de jungla |
| `damageDealtToChampions` | number | Daño a campeones |
| `damageTaken` | number | Daño recibido |
| `totalHeal` | number | Curación total |
| `timePlayed` | number | Tiempo de juego en segundos |

### Rankings
| Queue Type | Descripción |
|------------|-------------|
| `RANKED_SOLO_5x5` | Clasificatoria Solo/Duo |
| `RANKED_FLEX_SR` | Flex |

### Champs Positions
| Position | Descripción |
|----------|-------------|
| `TOP` | Top |
| `JUNGLE` | Jungla |
| `MIDDLE` | Mid |
| `BOTTOM` | ADC/Support |
| `UTILITY` | Support |

## Notas de Implementación

1. **Rate Limiting:** La API de Riot tiene límites. Usar cache cuando sea posible.
2. **Regiones:** 
   - `BASE_URL` = `https://europe.api.riotgames.com` (para Match V5)
   - `REGIONAL_URL` = `https://euw1.api.riotgames.com` (para otras APIs)
3. **PUUID vs SummonerID:** PUUID es más estable y se usa para match history, SummonerID para ranked.
4. **Vision Score:** Siempre preferir `visionScore` sobre `visionWardsBoughtInGame`.