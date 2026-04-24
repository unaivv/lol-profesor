import { getCurrentWindow } from '@tauri-apps/api/window'
import { Minus, Settings, Square, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TitleBarButton } from './TitleBarButton'

const appWindow = getCurrentWindow()

export function TitleBar(): JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized)
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized)
    })
    return () => { unlisten.then(f => f()) }
  }, [])

  const handleMaximize = async (): Promise<void> => {
    await appWindow.toggleMaximize()
    setIsMaximized(await appWindow.isMaximized())
  }

  return (
    <div
      data-tauri-drag-region
      className="flex h-9 shrink-0 select-none items-center justify-between border-b border-indigo-500/10 bg-white pl-3"
    >
      <img
        data-tauri-drag-region
        src="/logo.png"
        alt="LoL Profesor"
        className="h-6 w-auto pointer-events-none"
      />

      <div className="flex">
        <TitleBarButton onClick={() => navigate('/settings')} title="Configuración">
          <Settings size={14} />
        </TitleBarButton>
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
