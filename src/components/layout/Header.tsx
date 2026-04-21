import { ReactNode } from 'react'
import { Sparkles, Trophy, Target, Shield } from 'lucide-react'

interface HeaderProps {
  title?: string
  subtitle?: string
  showFeatures?: boolean
  actions?: ReactNode
  variant?: 'default' | 'minimal' | 'profile'
}

export function Header({ 
  title = 'LoL Professor', 
  subtitle = 'Análisis Elite de League of Legends',
  showFeatures = true,
  actions,
  variant = 'default'
}: HeaderProps) {
  const renderLogo = () => (
    <div className="logo">
      <div className="logo-icon">
        <Sparkles size={24} />
      </div>
      <div>
        <h1 className="logo-text">{title}</h1>
        {subtitle && (
          <p style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )

  const renderFeatures = () => (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '14px' }}>
        <Trophy size={16} style={{ color: '#eab308' }} />
        <span>Estadísticas Avanzadas</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '14px' }}>
        <Target size={16} style={{ color: '#3b82f6' }} />
        <span>Tracking en Tiempo Real</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '14px' }}>
        <Shield size={16} style={{ color: '#10b981' }} />
        <span>Datos Oficiales</span>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (variant) {
      case 'minimal':
        return (
          <div className="header-content">
            {renderLogo()}
          </div>
        )
      case 'profile':
        return (
          <div className="header-content">
            {renderLogo()}
            {actions}
          </div>
        )
      default:
        return (
          <div className="header-content">
            {renderLogo()}
            {showFeatures && renderFeatures()}
            {actions}
          </div>
        )
    }
  }

  return (
    <header className="header">
      <div className="container">
        {renderContent()}
      </div>
    </header>
  )
}
