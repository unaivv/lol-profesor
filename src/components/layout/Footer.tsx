import { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { PlayerData, RankedStats, RankedStatsExtended } from '../../types/api'

interface FooterProps {
  playerData?: PlayerData | null
  showPlayerInfo?: boolean
  customContent?: ReactNode
  variant?: 'default' | 'minimal' | 'profile'
}

// Helper para obtener solo ranked
function getSoloRanked(stats: RankedStats | RankedStatsExtended | null | undefined): RankedStats | null {
  if (!stats) return null
  if ('solo' in stats) return (stats as RankedStatsExtended).solo
  return stats as RankedStats
}

export function Footer({
  playerData,
  showPlayerInfo = false,
  customContent,
  variant = 'default'
}: FooterProps) {
  const renderPlayerInfo = () => {
    if (!playerData || !showPlayerInfo) return null

    const soloRanked = getSoloRanked(playerData.rankedStats)

    return (
      <div>
        <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: 'white' }}>Estadísticas Clave</h4>
        <ul style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.8', listStyle: 'none', padding: 0 }}>
          <li style={{ padding: '4px 0' }}>Nivel: {playerData.summonerLevel}</li>
          <li style={{ padding: '4px 0' }}>Región: {playerData.region || 'EUW'}</li>
          <li style={{ padding: '4px 0' }}>Partidas: {playerData.matches?.length || 0}</li>
          <li style={{ padding: '4px 0' }}>Ranking: {soloRanked ? `${soloRanked.tier} ${soloRanked.rank}` : 'Sin ranking'}</li>
          <li style={{ padding: '4px 0' }}>Win Rate: {soloRanked ? `${Math.round((soloRanked.wins / (soloRanked.wins + soloRanked.losses)) * 100)}%` : '0%'}</li>
        </ul>
      </div>
    )
  }

  const renderDefaultContent = () => (
    <>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ width: '32px', height: '32px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={16} style={{ color: 'white' }} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>LoL Professor</h3>
        </div>
        <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
          {playerData ? `Análisis profesional para ${playerData.gameName}#${playerData.tagLine}` : 'Análisis profesional para jugadores de League of Legends'}
        </p>
        <div style={{ marginTop: '12px', fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
          Última actualización: {new Date().toLocaleDateString('es-ES')}
        </div>
      </div>
      {renderPlayerInfo()}
      <div>
        <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: 'white' }}>Acciones Rápidas</h4>
        <ul style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.8', listStyle: 'none', padding: 0 }}>
          <li style={{ padding: '4px 0' }}>Ver historial completo</li>
          <li style={{ padding: '4px 0' }}>Analizar rendimiento</li>
          <li style={{ padding: '4px 0' }}>Comparar estadísticas</li>
          <li style={{ padding: '4px 0' }}>Exportar datos</li>
        </ul>
      </div>
      <div>
        <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: 'white' }}>Enlaces</h4>
        <ul style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.8', listStyle: 'none', padding: 0 }}>
          <li style={{ padding: '4px 0' }}>Documentación</li>
          <li style={{ padding: '4px 0' }}>API de Riot Games</li>
          <li style={{ padding: '4px 0' }}>Soporte</li>
          <li style={{ padding: '4px 0' }}>Términos de uso</li>
        </ul>
      </div>
    </>
  )

  const renderContent = () => {
    if (customContent) return customContent
    if (variant === 'minimal') return null
    return renderDefaultContent()
  }

  return (
    <footer style={{ 
      marginTop: '60px',
      background: 'linear-gradient(135deg, #3b82f6, #9333ea)',
      color: 'white',
      padding: '60px 20px 40px'
    }}>
      <div className="container">
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '40px'
        }}>
          {renderContent()}
        </div>
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)', marginTop: '40px', paddingTop: '32px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            © {new Date().getFullYear()} LoL Professor. Todos los derechos reservados. Datos proporcionados por Riot Games API.
          </p>
        </div>
      </div>
    </footer>
  )
}
