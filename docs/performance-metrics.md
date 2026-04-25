# Métricas de Rendimiento — Fórmulas y Justificación

## Contexto

Cada métrica se normaliza a una escala 0–100 donde:
- **0–39**: por debajo del promedio
- **40–69**: rango promedio
- **70–89**: buen jugador
- **90–100**: excelente

Las referencias están calibradas para jugadores de ranked en EUW/LAN (Gold–Platinum como referencia de "promedio").

---

## 1. Farm 🌾

```
avgDeathsPer30 = (deaths / (timePlayed / 60)) * 30
score = max(0, 100 - avgDeathsPer30 * 13)
```

**Referencia real:**
| CS/min | Nivel aproximado |
|--------|-----------------|
| < 5    | Malo            |
| 5–6.5  | Promedio        |
| 6.5–8  | Bueno           |
| 8+     | Excelente       |

**Por qué `/ 8`:**
El techo en 8 CS/min representa un jugador sólido pero alcanzable, no nivel pro (10+ CS/min). A 6.5 CS/min se obtiene ~81, que refleja bien "buen farmeador".

**Fórmula anterior:** `csPerMin / 10` → necesitaba 10 CS/min para 100, prácticamente imposible en soloQ.

---

## 2. Supervivencia 🛡️

```
deathsPer30 = (deaths / (timePlayed / 60)) * 30
score = max(0, 100 - deathsPer30 * 13)
```

**Referencia real:**
| Muertes / 30 min | Nivel aproximado |
|-----------------|-----------------|
| 0–2             | Excelente       |
| 2–4             | Bueno           |
| 4–6             | Promedio        |
| 6+              | Malo            |

**Por qué normalizar por `timePlayed`:**
5 muertes en una partida de 40 minutos es muy diferente a 5 muertes en 20 minutos. La versión anterior usaba `(10 - deaths) * 10`, lo que castigaba igual sin importar la duración. Normalizar por cada 30 minutos es el estándar usado en análisis estadísticos de LoL.

**Por qué el coeficiente `* 13`:**
- 0 muertes/30min → 100
- 3 muertes/30min → 61 (bueno)
- 5 muertes/30min → 35 (malo)
- 7+ muertes/30min → ~9 (muy malo)

---

## 3. Visión 👁️

```
score = min(100, (avgVisionScore / 40) * 100)
```

**Referencia real:**
| Vision Score promedio | Nivel aproximado |
|----------------------|-----------------|
| < 15                 | Malo            |
| 15–25                | Promedio        |
| 25–35                | Bueno           |
| 35–40+               | Excelente       |

**Por qué `/ 40`:**
El techo anterior de 30 era demasiado bajo — los supports lo rompían sistemáticamente y el resto quedaba comprimido entre 30–70. Con 40 como techo:
- Un jugador promedio (20 VS) obtiene 50
- Un buen jugador no-support (30 VS) obtiene 75
- Un support activo (40+ VS) obtiene 100

Nota: esta métrica sigue siendo favorable a roles con más visión por diseño del juego, lo cual es correcto (si jugás support y no ponés wards, es un problema real).

---

## 4. Daño ⚔️

```
score = min(100, (avgDpm / 1000) * 100)
```

**Referencia real (DPM por rol):**
| Rol     | DPM promedio | DPM bueno |
|---------|-------------|-----------|
| ADC     | 600–800     | 900–1100  |
| Mid     | 500–700     | 800–1000  |
| Top     | 400–600     | 700–900   |
| Jungle  | 300–500     | 600–700   |
| Support | 100–300     | 300–500   |

**Por qué `/ 1000`:**
El techo anterior era 1500 DPM, que solo los mejores carries en partidas largas alcanzan. 1000 DPM representa el techo real de un carry excelente en soloQ. A 700 DPM se obtiene 70, que es correcto para un buen ADC.

---

## 5. KDA 🎯

```
rawKda = (kills + assists) / max(deaths, 1)
score = min(100, (rawKda / 5) * 100)
```

**Referencia real:**
| KDA ratio | Nivel aproximado |
|-----------|-----------------|
| < 1.5     | Malo            |
| 1.5–2.5   | Promedio        |
| 2.5–4.0   | Bueno           |
| 4.0+      | Excelente       |

**Por qué `max(deaths, 1)` en vez de multiplicar por 10:**
La fórmula anterior era `(k+a)/d * 10` comparado contra 50, lo cual es matemáticamente equivalente a pedir KDA 5.0 para 100 pero de forma confusa. Además, con 0 muertes usaba `(k+a) * 2` en lugar de la fórmula estándar, creando inconsistencias. Usar `max(deaths, 1)` es el estándar de la industria para evitar división por cero sin introducir bonificaciones artificiales.

**Por qué techo en 5:**
KDA 5.0 es extraordinario en soloQ. A KDA 3.0 se obtiene 60, que refleja fielmente "buen jugador pero con margen de mejora".

---

## 6. Impacto 🏆

```
teamKills = suma de kills de todos los participantes del mismo teamId
killParticipation = (kills + assists) / max(teamKills, 1)
score = (winRate * 0.5) + (avgKillParticipation * 100 * 0.5)
```

**Por qué no solo win rate:**
El win rate solo no mide impacto individual. Un jugador puede ganar 10 partidas seguidas siendo el eslabón más débil del equipo. Kill participation mide cuánto estuvo presente el jugador en las acciones decisivas del equipo.

**Por qué 50/50:**
- Win rate captura el resultado final (importa).
- Kill participation captura la presencia en peleas (importa).
- Un peso igual equilibra "ganaste" con "fuiste relevante para ganar".

**Referencia real:**
| Kill Participation | Nivel aproximado |
|-------------------|-----------------|
| < 40%             | Bajo impacto    |
| 40–60%            | Promedio        |
| 60–75%            | Bueno           |
| 75%+              | Muy alto        |

---

## Score Global

```
overallScore = promedio(farm, supervivencia, visión, daño, kda, impacto)
```

El promedio simple es intencionado: ninguna métrica tiene más peso que otra a nivel global. Si en el futuro se quiere ponderar por rol (e.g., más peso a visión para supports), se puede extender aquí.

---

## Integración con IA (Insights)

Las métricas calculadas se pasan como contexto adicional al prompt de análisis de la IA. Esto permite que la IA compare el rendimiento de una partida específica contra las tendencias recientes del jugador:

> *"Tu farm en esta partida (6.8 CS/min, score 85) está por encima de tu promedio reciente (5.9 CS/min, score 73)"*

Los scores se incluyen en el prompt como un bloque `RENDIMIENTO RECIENTE (últimas 20 partidas)` separado de los datos de la partida individual.
