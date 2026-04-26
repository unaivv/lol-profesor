import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { check } from '@tauri-apps/plugin-updater'
import { useNotifications } from '../context/NotificationContext'

export function useUpdateCheck(enabled: boolean) {
  const { push } = useNotifications()
  const navigate = useNavigate()
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
          action: { label: 'Actualizar', onClick: () => navigate('/settings') },
        })
      })
      .catch(() => { /* silent fail */ })
  }, [enabled])
}
