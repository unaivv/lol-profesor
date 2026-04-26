import { useEffect, useState } from 'react'
import { X, Bell, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { useNotifications, AppNotification, NotificationType } from '../../context/NotificationContext'

const DEFAULT_TIMEOUT = 5000

const TYPE_CONFIG: Record<NotificationType, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  update:  { icon: Bell,          color: '#60a5fa', bg: '#0f172a', border: 'rgba(96,165,250,0.3)' },
  info:    { icon: Info,          color: '#60a5fa', bg: '#0f172a', border: 'rgba(96,165,250,0.3)' },
  success: { icon: CheckCircle,   color: '#4ade80', bg: '#0f172a', border: 'rgba(74,222,128,0.3)' },
  warning: { icon: AlertTriangle, color: '#fbbf24', bg: '#0f172a', border: 'rgba(251,191,36,0.3)' },
  error:   { icon: AlertCircle,   color: '#f87171', bg: '#0f172a', border: 'rgba(248,113,113,0.3)' },
}

function NotificationItem({ n, onDismiss }: { n: AppNotification; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false)
  const cfg = TYPE_CONFIG[n.type]
  const Icon = cfg.icon

  useEffect(() => {
    // Trigger enter animation on mount
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (n.persistent) return
    const timeout = n.timeout ?? DEFAULT_TIMEOUT
    const t = setTimeout(() => handleDismiss(), timeout)
    return () => clearTimeout(t)
  }, [n.id])

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(onDismiss, 300)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 14px',
        borderRadius: '10px',
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        width: '300px',
        transform: visible ? 'translateX(0)' : 'translateX(320px)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease',
      }}
    >
      <Icon size={16} style={{ color: cfg.color, flexShrink: 0, marginTop: '2px' }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 600, lineHeight: '1.3' }}>
          {n.title}
        </div>
        {n.message && (
          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px', lineHeight: '1.4' }}>
            {n.message}
          </div>
        )}
        {n.action && (
          <button
            onClick={() => { n.action!.onClick(); handleDismiss() }}
            style={{
              marginTop: '8px',
              padding: '4px 10px',
              background: cfg.color,
              color: '#0f172a',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {n.action.label}
          </button>
        )}
      </div>

      <button
        onClick={handleDismiss}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '0', flexShrink: 0, display: 'flex', alignItems: 'center' }}
      >
        <X size={13} />
      </button>
    </div>
  )
}

export function NotificationCenter() {
  const { notifications, dismiss } = useNotifications()

  if (notifications.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      {notifications.slice(-4).map(n => (
        <div key={n.id} style={{ pointerEvents: 'all' }}>
          <NotificationItem n={n} onDismiss={() => dismiss(n.id)} />
        </div>
      ))}
    </div>
  )
}
