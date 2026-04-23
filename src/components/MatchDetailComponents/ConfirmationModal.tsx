import { Participant } from '../../types/api'
import { AlertTriangle } from 'lucide-react'

interface ConfirmationModalProps {
  player: Participant | null
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationModal({ player, onConfirm, onCancel }: ConfirmationModalProps) {
  if (!player) return null
  
  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }} 
      onClick={onCancel}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <AlertTriangle size={24} color="#f59e0b" />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>Cambiar de jugador</h3>
        </div>
        <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px' }}>
          Vas a buscar estadísticas de <strong>{player.summonerName || player.championName}</strong>. 
          Esto cambiará el jugador activo y mostrará sus estadísticas.
        </p>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
          ¿Querés continuar? Podés compartir la URL resultante.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#475569',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#eab308',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Sí, buscar
          </button>
        </div>
      </div>
    </div>
  )
}