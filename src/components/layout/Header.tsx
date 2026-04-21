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
  subtitle = '',
  showFeatures = true,
  actions,
  variant = 'default'
}: HeaderProps) {
  const renderLogo = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ 
        width: '48px', 
        height: '48px', 
        background: 'linear-gradient(135deg, #3b82f6, #9333ea)', 
        borderRadius: '16px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'white',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <Sparkles size={24} />
      </div>
      <div>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #3b82f6, #9333ea)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>{title}</h1>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '80px' }}>
            {renderLogo()}
          </div>
        )
      case 'profile':
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '80px' }}>
            {renderLogo()}
            {actions}
          </div>
        )
      default:
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '80px' }}>
            {renderLogo()}
            {showFeatures && renderFeatures()}
            {actions}
          </div>
        )
    }
  }

  return (
    <header style={{ 
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        {renderContent()}
      </div>
    </header>
  )
}
