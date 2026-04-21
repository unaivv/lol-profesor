# Configuración de LoL Professor

## Pasos para configurar el proyecto

### 1. Configurar el Backend (Node.js + TypeScript)

1. **Instalar dependencias del servidor:**

   ```bash
   cd server
   npm install
   ```

2. **Obtener API Key de Riot Games:**
   - Visita <https://developer.riotgames.com/>
   - Inicia sesión con tu cuenta de Riot Games
   - Crea una nueva aplicación para obtener tu API key
   - Copia el archivo `.env.example` a `.env`
   - Reemplaza `RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` con tu API key

3. **Iniciar el backend (desarrollo):**

   ```bash
   cd server
   npm run dev
   ```

   O para producción:

   ```bash
   cd server
   npm run build
   npm start
   ```

   El backend se ejecutará en <http://localhost:5000>

### 2. Configurar el Frontend (React + TypeScript)

1. **Instalar Node.js dependencies:**

   ```bash
   npm install
   ```

2. **Iniciar el frontend:**

   ```bash
   npm run dev
   ```

   El frontend se ejecutará en <http://localhost:3000>

### 3. Usar la Aplicación

1. **Buscar Jugador:**
   - Ingresa el nombre de invocador o Riot ID (ej: "Faker#KR1")
   - La aplicación mostrará estadísticas del jugador, historial de partidas y ranked

2. **Seguimiento en Tiempo Real:**
   - Inicia League of Legends
   - Comienza una partida (cualquier modo)
   - La aplicación detectará automáticamente la partida en curso
   - Verás estadísticas en tiempo real de todos los jugadores

## Notas Importantes

- **API Key Limitaciones:** La API key de Riot Games tiene límites de uso (20 solicitudes por segundo, 100 solicitudes por minuto)
- **Región:** El backend está configurado para la región NA1. Para cambiar de región, modifica las URLs en `server/src/index.ts`
- **Live Client API:** El seguimiento en tiempo real solo funciona cuando League of Legends está ejecutándose en la misma máquina

## Estructura del Proyecto

```
lol-professor/
  src/                     # Frontend React + TypeScript
    components/            # Componentes UI
    hooks/                # Custom hooks
    types/                # Definiciones TypeScript
  server/                  # Backend Node.js + TypeScript
    src/
      index.ts            # Servidor principal
      types/              # Tipos del backend
    package.json          # Dependencies del servidor
    tsconfig.json         # Configuración TypeScript
  package.json             # Dependencies del proyecto
  README.md               # Documentación principal
  SETUP.md               # Esta guía de configuración
```

## Troubleshooting

### Problemas Comunes

1. **"API Key inválida"**: Verifica que tu API key sea correcta y no haya expirado
2. **"Jugador no encontrado"**: Asegúrate de escribir correctamente el nombre y etiqueta del jugador
3. **"No se puede conectar al cliente"**: Verifica que League of Legends esté ejecutándose
4. **Errores de CORS**: El backend debe estar ejecutándose para que el frontend funcione

### Logs y Debug

- Los logs del backend aparecen en la terminal donde ejecutas `python app.py`
- Los logs del frontend aparecen en la consola del navegador (F12)

## Características Implementadas

- [x] Búsqueda de jugadores por Riot ID
- [x] Historial de partidas con estadísticas detalladas
- [x] Estadísticas clasificatorias (ranked)
- [x] Análisis de builds (items, runas)
- [x] Seguimiento en tiempo real de partidas
- [x] Interfaz responsiva y moderna
- [x] Manejo de errores y validación

## Próximas Mejoras

- [ ] Soporte para múltiples regiones
- [ ] Análisis avanzado de estadísticas
- [ ] Comparación entre jugadores
- [ ] Historial de campeones
- [ ] Gráficos y visualizaciones avanzadas
