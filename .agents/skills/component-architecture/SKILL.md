---
name: component-architecture
description:
  Estructura de componentes recomendada para el proyecto. Apply when creating
  new components or refactoring existing ones. Define file organization, export
  patterns, and co-location of related code.
license: MIT
metadata:
  author: lol-professor
  version: '1.0.0'
---

# Component Architecture - LoL Professor

Estructura de archivos recomendada para mantener el código limpio, mantenible y escalable.

## Estructura de Archivos

```
src/
├── components/
│   ├── ComponentName/
│   │   ├── index.ts              # Exports públicos
│   │   ├── ComponentName.tsx     # Componente principal
│   │   ├── ComponentName.types.ts # Tipos específicos del componente
│   │   └── ComponentName.utils.ts # Funciones helper (si son complejas)
│   │
│   ├── ui/                       # Componentes reutilizables (shadcn style)
│   │   ├── button.tsx
│   │   ├── button.types.ts
│   │   └── ...
│   │
│   └── layout/                   # Componentes de layout
│       ├── Header.tsx
│       └── Footer.tsx
│
├── pages/
│   └── PageName/
│       ├── index.ts
│       ├── PageName.tsx
│       └── PageName.types.ts
│
├── hooks/
│   └── useHookName.ts
│
├── lib/
│   ├── utils.ts                  # Utilidades globales
│   └── api.ts                    # Funciones de API
│
└── types/
    └── index.ts                  # Tipos globales/de dominio
```

## Reglas por Tipo de Archivo

### 1. Componentes (`.tsx`)

```tsx
// ✅ CORRECTO: Componente en archivo propio
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import type { ComponentProps } from './ComponentName.types'

interface Props {
  title: string
  onClick?: () => void
}

export function ComponentName({ title, onClick, className }: Props) {
  const computed = useMemo(() => {
    // lógica compleja
    return result
  }, [])

  return (
    <div className={cn('base-classes', className)}>
      <h1>{title}</h1>
      <Button onClick={onClick}>Click</Button>
    </div>
  )
}
```

### 2. Tipos (`.types.ts` o `types/` dentro del componente)

```tsx
// ✅ CORRECTO: Tipos específicos exportados desde el componente
// component/PlayerStats.tsx
export interface PlayerStatsProps {
  rankedStats: RankedStats | RankedStatsExtended | null
}

export interface RankedStats {
  tier: string
  rank: string
  wins: number
  losses: number
}
```

### 3. Utilidades (`.utils.ts`)

```tsx
// ✅ CORRECTO: Funciones helper relacionadas al componente
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export function getRankColor(tier: string): string {
  const colors: Record<string, string> = {
    IRON: '#3E3E3E',
    GOLD: '#FFD700',
    // ...
  }
  return colors[tier] || '#888'
}
```

### 4. Barrel Export (`index.ts`)

```tsx
// ✅ CORRECTO: Export centralizado
export { PlayerStats } from './PlayerStats'
export type { PlayerStatsProps } from './PlayerStats'
export { getRankEmblemUrl } from './utils'
```

## Patrones de Export

### Named Exports (Recomendado)

```tsx
// ✅ Preferido para componentes
export function PlayerStats({ ... }: Props) { ... }
export type { PlayerStatsProps } from './types'

// ✅ Para utilities
export function formatGold(gold: number): string { ... }
```

### Default Exports (Evitar)

```tsx
// ❌ NO usar default exports
export default function Component() { ... }

// ✅ En su lugar, usar named exports
export function Component() { ... }
```

## Co-location de Código

### related files在一起

```
components/RankedComparisonCard/
├── index.ts              # Exports
├── RankedComparisonCard.tsx
├── RankedComparisonCard.types.ts
└── RankedComparisonCard.utils.ts  # Si hay lógica compleja
```

### Cuándo separar archivos

| Tipo de código | Dónde va | Razón |
|---------------|----------|-------|
| UI del componente | `.tsx` | Necesario para render |
| Tipos del componente | `.types.ts` o dentro del `.tsx` |type-only |
| Lógica simple (< 10 líneas) | `.tsx` o `.utils.ts` adjacent |Mantiene código junto |
| Lógica compleja (> 10 líneas) | `.utils.ts` |Mejora legibilidad |
| Constantes de configuración | `.config.ts` |Separación de concerns |

## Import Paths

```tsx
// ✅ Usar aliases (@/)
import { Button } from '@/components/ui/button'
import { PlayerStats } from '@/components/PlayerStats'
import { cn } from '@/lib/utils'

// ❌ Evitar paths relativos largos
import { Button } from '../../../../components/ui/button'
```

## Ejemplo Completo

```tsx
// src/components/PlayerStats/index.ts
export { PlayerStats } from './PlayerStats'
export type { PlayerStatsProps } from './PlayerStats'

// src/components/PlayerStats/PlayerStats.tsx
import { Shield, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getRankEmblemUrl } from '@/lib/utils'
import type { RankedStats, RankedStatsExtended } from '@/types/api'

export interface PlayerStatsProps {
  rankedStats: RankedStats | RankedStatsExtended | null
}

function isRankedStatsExtended(stats: ...): stats is RankedStatsExtended {
  return stats !== null && 'solo' in stats && 'flex' in stats
}

export function PlayerStats({ rankedStats }: PlayerStatsProps) {
  // componente
}

// src/components/PlayerStats/PlayerStats.utils.ts (si es necesario)
export function getWinRate(wins: number, losses: number): number {
  return Math.round((wins / (wins + losses)) * 100)
}
```

## Beneficios

1. **Encontrabilidad**: Archivos relacionados están juntos
2. **Mantenibilidad**: Tipos cerca del código que los usa
3. **Escalabilidad**: Estructura consistente cuando el proyecto crece
4. **Testing**: Tests pueden estar junto al componente (`.test.ts`)
5. **Refactoring**: Fácil identificar qué archivos modificar