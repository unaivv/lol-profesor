import { check } from '@tauri-apps/plugin-updater'
import { restart } from '@tauri-apps/plugin-process'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, CheckCircle, Download, AlertCircle } from 'lucide-react'

type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'up-to-date' }
  | { status: 'available'; version: string; body: string | null | undefined }
  | { status: 'downloading'; progress: number }
  | { status: 'ready' }
  | { status: 'error'; message: string }

export function SettingsPage() {
  const navigate = useNavigate()
  const [update, setUpdate] = useState<UpdateState>({ status: 'idle' })

  const checkForUpdates = async () => {
    setUpdate({ status: 'checking' })
    try {
      const result = await check()
      if (!result) {
        setUpdate({ status: 'up-to-date' })
        return
      }
      setUpdate({ status: 'available', version: result.version, body: result.body })
    } catch (e) {
      setUpdate({ status: 'error', message: String(e) })
    }
  }

  const downloadAndInstall = async () => {
    if (update.status !== 'available') return
    try {
      const result = await check()
      if (!result) return

      setUpdate({ status: 'downloading', progress: 0 })
      await result.downloadAndInstall(event => {
        if (event.event === 'Progress') {
          const pct = event.data.chunkLength && event.data.contentLength
            ? Math.round((event.data.chunkLength / event.data.contentLength) * 100)
            : 0
          setUpdate({ status: 'downloading', progress: pct })
        }
      })
      setUpdate({ status: 'ready' })
    } catch (e) {
      setUpdate({ status: 'error', message: String(e) })
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f3e8ff 100%)',
      padding: '32px',
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#6b7280', fontSize: '14px', marginBottom: '24px',
            padding: 0,
          }}
        >
          <ArrowLeft size={16} /> Volver
        </button>

        <h1 style={{
          fontSize: '24px', fontWeight: 'bold', marginBottom: '32px',
          background: 'linear-gradient(135deg, #3b82f6, #9333ea)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          Configuración
        </h1>

        {/* Actualizaciones */}
        <div style={{
          background: 'white', borderRadius: '16px', padding: '24px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
          border: '1px solid rgba(99,102,241,0.08)',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
            Actualizaciones
          </h2>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
            Versión actual: <strong>{__APP_VERSION__}</strong>
          </p>

          <UpdateStatus state={update} onInstall={downloadAndInstall} />

          {update.status !== 'downloading' && update.status !== 'ready' && (
            <button
              onClick={checkForUpdates}
              disabled={update.status === 'checking'}
              style={{
                marginTop: '16px',
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'linear-gradient(135deg, #3b82f6, #9333ea)',
                color: 'white', border: 'none', borderRadius: '10px',
                padding: '10px 20px', fontSize: '14px', fontWeight: '600',
                cursor: update.status === 'checking' ? 'not-allowed' : 'pointer',
                opacity: update.status === 'checking' ? 0.7 : 1,
              }}
            >
              <RefreshCw size={15} style={{
                animation: update.status === 'checking' ? 'spin 1s linear infinite' : 'none',
              }} />
              {update.status === 'checking' ? 'Buscando...' : 'Buscar actualizaciones'}
            </button>
          )}

          {update.status === 'ready' && (
            <button
              onClick={() => restart()}
              style={{
                marginTop: '16px',
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white', border: 'none', borderRadius: '10px',
                padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              }}
            >
              Reiniciar para aplicar
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function UpdateStatus({ state, onInstall }: { state: UpdateState; onInstall: () => void }) {
  if (state.status === 'idle') return null

  if (state.status === 'checking') {
    return <p style={{ fontSize: '14px', color: '#6b7280' }}>Buscando actualizaciones...</p>
  }

  if (state.status === 'up-to-date') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '14px' }}>
        <CheckCircle size={16} /> Estás en la última versión
      </div>
    )
  }

  if (state.status === 'available') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontSize: '14px', marginBottom: '8px' }}>
          <Download size={16} /> Nueva versión disponible: <strong>v{state.version}</strong>
        </div>
        {state.body && (
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
            {state.body}
          </p>
        )}
        <button
          onClick={onInstall}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'linear-gradient(135deg, #3b82f6, #9333ea)',
            color: 'white', border: 'none', borderRadius: '10px',
            padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
          }}
        >
          <Download size={15} /> Descargar e instalar
        </button>
      </div>
    )
  }

  if (state.status === 'downloading') {
    return (
      <div>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
          Descargando... {state.progress > 0 ? `${state.progress}%` : ''}
        </p>
        <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '99px',
            background: 'linear-gradient(135deg, #3b82f6, #9333ea)',
            width: state.progress > 0 ? `${state.progress}%` : '40%',
            transition: 'width 0.3s ease',
            animation: state.progress === 0 ? 'indeterminate 1.5s ease-in-out infinite' : 'none',
          }} />
        </div>
        <style>{`
          @keyframes indeterminate {
            0% { transform: translateX(-100%); width: 40%; }
            100% { transform: translateX(300%); width: 40%; }
          }
        `}</style>
      </div>
    )
  }

  if (state.status === 'ready') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '14px' }}>
        <CheckCircle size={16} /> Actualización lista para instalar
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '14px' }}>
        <AlertCircle size={16} /> {state.status === 'error' ? (state as any).message : ''}
      </div>
    )
  }

  return null
}
