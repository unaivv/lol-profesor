# Tauri Release Flow — LoL Profesor

## Flujo completo de publicación

```
git tag vX.Y.Z  →  git push origin vX.Y.Z
       ↓
GitHub Actions dispara el workflow release.yml
       ↓
El workflow lee el tag, actualiza versión en tauri.conf.json y package.json
       ↓
Compila 3 jobs en paralelo: macOS (ARM), Ubuntu, Windows
       ↓
Sube los instaladores a un draft release en GitHub
       ↓
Esperás a que los 3 jobs estén en verde
       ↓
Publicás el draft en github.com/unaivv/lol-profesor/releases
```

---

## Regla de oro: versión = tag

El workflow sincroniza automáticamente la versión desde el tag:

```yaml
- name: Sync version from tag
  shell: bash
  run: |
    TAG=${GITHUB_REF_NAME#v}
    npm pkg set version="$TAG"
    node -e "
      const fs = require('fs');
      const p = 'src-tauri/tauri.conf.json';
      const c = JSON.parse(fs.readFileSync(p));
      c.version = '$TAG';
      fs.writeFileSync(p, JSON.stringify(c, null, 4));
    "
```

**Nunca toques `version` en `tauri.conf.json` o `package.json` para hacer una release.** El tag manda.

---

## Comando para lanzar una release

```bash
git tag v1.0.3
git push origin v1.0.3
```

Eso es todo. El resto lo hace el workflow.

---

## Assets generados por plataforma

| Plataforma | Archivos |
|------------|----------|
| Windows    | `*_x64-setup.exe` (NSIS), `*_x64.msi` |
| macOS ARM  | `*_aarch64.dmg`, `*_aarch64.app.tar.gz` |
| Ubuntu     | `*_amd64.deb`, `*_amd64.AppImage` |

El updater usa los `.tar.gz` / `.zip` firmados + archivos `.sig` para verificar integridad.

---

## Signing keys (firma de binarios)

Requerido para que el updater funcione. Setup inicial (ya hecho):

```bash
# Generar par de claves con contraseña "none"
npx tauri signer generate -w ~/.tauri/lol-profesor.key --password "none"
```

Secrets en GitHub (`Settings → Secrets → Actions`):
- `TAURI_SIGNING_PRIVATE_KEY` → contenido de `~/.tauri/lol-profesor.key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` → `none`

La clave pública está embebida en `src-tauri/tauri.conf.json`:
```json
"plugins": {
  "updater": {
    "pubkey": "...",
    "endpoints": ["https://github.com/unaivv/lol-profesor/releases/latest/download/latest.json"]
  }
}
```

**IMPORTANTE:** Si regenerás las claves, hay que actualizar el secret en GitHub Y la `pubkey` en `tauri.conf.json`. Son un par — no se pueden usar por separado.

---

## Updater: dev vs producción

| Entorno | Comportamiento |
|---------|---------------|
| Dev (`tauri dev`) | Siempre dice "estás en la última versión" — no hay release firmado |
| Producción | Compara la versión instalada contra el `latest.json` de GitHub Releases |

El `latest.json` lo genera automáticamente `tauri-action` al subir los assets.

---

## Pitfalls frecuentes

### ❌ Publicar el draft antes de que terminen los 3 jobs
Los jobs suben assets en paralelo. Si publicás mientras alguno sigue corriendo, el release queda sin algunos instaladores. **Esperá a que los 3 estén en verde antes de publicar.**

### ❌ Versión en tauri.conf.json no coincide con el tag
Si `tauri.conf.json` dice `1.0.0` y pusheás el tag `v1.0.2`, `tauri-action` crea la release con tag `v1.0.0`. El workflow ya lo soluciona automáticamente, pero si alguna vez editás la versión a mano podés romper esto.

### ❌ Secret TAURI_SIGNING_PRIVATE_KEY_PASSWORD vacío
GitHub no acepta secrets vacíos. La clave fue generada con password `none` — el secret tiene ese valor literal.

### ❌ Repo privado
El updater necesita acceder a las releases sin autenticación. El repo debe ser **público**.

---

## Checklist de release

- [ ] Todos los cambios commiteados y pusheados a `main`
- [ ] `git tag vX.Y.Z && git push origin vX.Y.Z`
- [ ] Esperar que los 3 jobs de GitHub Actions estén en verde
- [ ] Verificar que el draft tiene los assets (`.exe`, `.msi`, `.dmg`, `.deb`, `.AppImage`)
- [ ] Publicar el draft → **"Edit" → "Publish release"**
