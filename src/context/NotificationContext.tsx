import { createContext, useContext, useState, useCallback } from 'react'

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'update'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message?: string
  action?: { label: string; onClick: () => void }
  persistent?: boolean
  timeout?: number
}

interface NotificationContextValue {
  notifications: AppNotification[]
  push: (n: Omit<AppNotification, 'id'>) => string
  dismiss: (id: string) => void
  clear: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const push = useCallback((n: Omit<AppNotification, 'id'>): string => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setNotifications(prev => [...prev, { ...n, id }])
    return id
  }, [])

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clear = useCallback(() => setNotifications([]), [])

  return (
    <NotificationContext value={{ notifications, push, dismiss, clear }}>
      {children}
    </NotificationContext>
  )
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
