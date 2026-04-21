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
        <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Estadísticas Clave</h4>
        <ul style={{ color: 'rgba(255, 255, 255, 0.9)', lineHeight: '1.8' }}>
          <li>Nivel: {playerData.summonerLevel}</li>
          <li>Región: {playerData.region || 'EUW'}</li>
          <li>Partidas: {playerData.matches?.length || 0}</li>
          <li>Ranking: {soloRanked ? `${soloRanked.tier} ${soloRanked.rank}` : 'Sin ranking'}</li>
          <li>Win Rate: {soloRanked ? `${Math.round((soloRanked.wins / (soloRanked.wins + soloRanked.losses)) * 100)}%` : '0%'}</li>
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
        <p>
          {playerData ? `Análisis profesional para ${playerData.gameName}#${playerData.tagLine}` : 'Análisis profesional para jugadores de League of Legends'}
        </p>
        <div style={{ marginTop: '12px', fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
          Última actualización: {new Date().toLocaleDateString('es-ES')}
        </div>
      </div>
      {renderPlayerInfo()}
      <div>
        <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Acciones Rápidas</h4>
        <ul style={{ color: 'rgba(255, 255, 255, 0.9)', lineHeight: '1.8' }}>
          <li>Ver historial completo</li>
          <li>Analizar rendimiento</li>
          <li>Comparar estadísticas</li>
          <li>Exportar datos</li>
        </ul>
      </div>
      <div>
        <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Enlaces</h4>
        <ul style={{ color: 'rgba(255, 255, 255, 0.9)', lineHeight: '1.8' }}>
          <li>Documentación</li>
          <li>API de Riot Games</li>
          <li>Soporte</li>
          <li>Términos de uso</li>
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
    <footer className="footer" style={{ marginTop: '60px' }}>
      <div className="container">
        <div className="footer-content">
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
