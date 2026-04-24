import { getCurrentWindow } from '@tauri-apps/api/window'
import { Minus, Square, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const appWindow = getCurrentWindow()

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized)
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized)
    })
    return () => { unlisten.then(f => f()) }
  }, [])

  const handleMaximize = async () => {
    await appWindow.toggleMaximize()
    setIsMaximized(await appWindow.isMaximized())
  }

  return (
    <div
      data-tauri-drag-region
      style={{
        height: '36px',
        background: '#ffffff',
        borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '12px',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <img
        data-tauri-drag-region
        src="/logo.png"
        alt="LoL Profesor"
        style={{ height: '24px', width: 'auto', pointerEvents: 'none' }}
      />

      <div style={{ display: 'flex' }}>
        <TitleBarButton onClick={() => appWindow.minimize()} title="Minimizar">
          <Minus size={14} />
        </TitleBarButton>
        <TitleBarButton onClick={handleMaximize} title={isMaximized ? 'Restaurar' : 'Maximizar'}>
          <Square size={12} />
        </TitleBarButton>
        <TitleBarButton onClick={() => appWindow.close()} title="Cerrar" isClose>
          <X size={14} />
        </TitleBarButton>
      </div>
    </div>
  )
}

function TitleBarButton({
  onClick,
  title,
  isClose,
  children,
}: {
  onClick: () => void
  title: string
  isClose?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: '46px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        color: '#6b7280',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = isClose
          ? 'rgba(239,68,68,0.15)'
          : 'rgba(99,102,241,0.08)'
        if (isClose) (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        ;(e.currentTarget as HTMLButtonElement).style.color = '#6b7280'
      }}
    >
      {children}
    </button>
  )
}
