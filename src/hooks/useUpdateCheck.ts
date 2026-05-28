import { useEffect, useRef } from 'react'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { useNotifications } from '../context/NotificationContext'

export function useUpdateCheck(enabled: boolean) {
  const { push } = useNotifications()
  const checked = useRef(false)

  useEffect(() => {
    if (!enabled || checked.current) return
    checked.current = true

    check()
      .then(update => {
        if (!update?.available) return
        push({
          type: 'update',
          title: 'Nueva versión disponible',
          message: `v${update.version} lista para instalar`,
          persistent: true,
          action: {
            label: 'Actualizar',
            onClick: () => {
              update.downloadAndInstall().then(() => relaunch()).catch(() => {})
            },
          },
        })
      })
      .catch(() => { /* silent fail */ })
  }, [enabled])
}
