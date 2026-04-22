import { getRankColor } from '../RankedComparisonCard'

interface StatsOverviewCardProps {
  icon?: React.ReactNode
  iconBg?: string
  value: number | string
  label?: string
  subValue?: string
  tier?: string
  isRanked?: boolean
  rankImage?: string
}

export function StatsOverviewCard({ icon, iconBg, value, label, subValue, tier, isRanked, rankImage }: StatsOverviewCardProps) {
  if (isRanked && tier) {
    const tierUpper = tier?.toUpperCase()
    const gradientBg = tierUpper === 'IRON' ? 'linear-gradient(135deg, #4b5563, #1f2937)' :
      tierUpper === 'BRONZE' ? 'linear-gradient(135deg, #cd7f32, #8b4513)' :
        tierUpper === 'SILVER' ? 'linear-gradient(135deg, #c0c0c0, #808080)' :
          tierUpper === 'GOLD' ? 'linear-gradient(135deg, #fbbf24, #d97706)' :
            tierUpper === 'PLATINUM' ? 'linear-gradient(135deg, #34d399, #059669)' :
              tierUpper === 'EMERALD' ? 'linear-gradient(135deg, #10b981, #047857)' :
                tierUpper === 'DIAMOND' ? 'linear-gradient(135deg, #60a5fa, #2563eb)' :
                  tierUpper === 'MASTER' ? 'linear-gradient(135deg, #a855f7, #7c3aed)' :
                    tierUpper === 'GRANDMASTER' ? 'linear-gradient(135deg, #f87171, #dc2626)' :
                      tierUpper === 'CHALLENGER' ? 'linear-gradient(135deg, #f472b6, #db2777)' :
                        'linear-gradient(135deg, #9ca3af, #6b7280)'

    return (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: `3px solid ${getRankColor(tier)}`,
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: '280px'
      }}>
        {rankImage ? (
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '8px',
              backgroundImage: `url(${rankImage})`,
              backgroundSize: '350%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundColor: '#f8fafc',
              flexShrink: 0
            }}
          />
        ) : (
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: gradientBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {icon}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
            Clasificatorias
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: getRankColor(tier),
            whiteSpace: 'nowrap'
          }}>
            {value}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>{subValue?.split(' • ')[0]}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{subValue?.split(' • ')[1]}</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: iconBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>{value}</div>
        {label && <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>{label}</div>}
      </div>
    </div>
  )
}