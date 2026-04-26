# Sistema de Notificaciones In-App

## Archivos

| Archivo | Rol |
|---------|-----|
| `src/context/NotificationContext.tsx` | Estado global, hook `useNotifications` |
| `src/components/ui/NotificationCenter.tsx` | Renderizado de toasts (top-right, fixed) |
| `src/hooks/useUpdateCheck.ts` | Check de actualizaciones al arrancar la app |

---

## Uso básico

```ts
import { useNotifications } from '../context/NotificationContext'

const { push, dismiss, clear } = useNotifications()
```

### Notificación simple (auto-descarta en 5s)
```ts
push({ type: 'info', title: 'Partida detectada' })
```

### Con mensaje secundario
```ts
push({ type: 'success', title: 'Actualización completada', message: 'v1.2.0 instalada' })
```

### Persistente con acción
```ts
push({
  type: 'update',
  title: 'Nueva versión disponible',
  message: 'v1.3.0 lista para instalar',
  persistent: true,
  action: { label: 'Actualizar', onClick: () => navigate('/settings') },
})
```

### Timeout personalizado
```ts
push({ type: 'warning', title: 'API lenta', timeout: 8000 })
```

### Descartar manualmente
```ts
const id = push({ type: 'info', title: '...' })
dismiss(id)   // descarta esa notificación
clear()       // descarta todas
```

---

## Tipos disponibles

| Tipo | Color | Ícono | Uso sugerido |
|------|-------|-------|--------------|
| `info` | Azul | Info | Mensajes informativos genéricos |
| `success` | Verde | Check | Operación completada con éxito |
| `warning` | Amarillo | Triángulo | Advertencias no críticas |
| `error` | Rojo | Círculo | Errores que requieren atención |
| `update` | Azul | Campana | Nueva versión disponible |

---

## Interfaz completa

```ts
interface AppNotification {
  id: string           // generado automáticamente
  type: NotificationType
  title: string
  message?: string     // línea secundaria debajo del título
  action?: {
    label: string
    onClick: () => void  // la notificación se descarta al hacer click
  }
  persistent?: boolean  // si true, no se auto-descarta
  timeout?: number      // ms hasta auto-descartar (default: 5000)
}
```

---

## Comportamiento

- Máximo 4 notificaciones visibles simultáneamente (muestra las más recientes)
- Animación slide-in desde la derecha al aparecer
- Fade + slide al desaparecer
- El botón X descarta manualmente cualquier notificación
- Las persistentes solo se descartan con X o llamando a `dismiss(id)`

---

## Agregar nuevas notificaciones de sistema

Para disparar una notificación al arrancar la app (como hace `useUpdateCheck`), crear un hook en `src/hooks/` que use `useNotifications` y llamarlo en `AppInner` dentro de `App.tsx`, condicionado a `!splash` para que no aparezca durante la pantalla de carga.
