// MatchDetail Styles

export const overlay = {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  overflow: 'hidden'
}

export const modal = {
  background: 'white',
  borderRadius: '16px',
  width: '100%',
  maxWidth: '900px',
  maxHeight: '90vh',
  position: 'relative' as const,
  display: 'flex',
  flexDirection: 'column' as const
}

export const closeButton = {
  position: 'absolute' as const,
  top: '-12px',
  right: '-12px',
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  border: '1px solid #e2e8f0',
  background: 'white',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100
}

export const content = {
  flex: 1,
  overflowY: 'auto' as const,
  padding: '24px',
  paddingBottom: '100px'
}

export const header = {
  background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
  margin: '-24px -24px 24px -24px',
  padding: '20px 24px',
  borderRadius: '16px 16px 0 0'
}

export const headerLeft = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px'
}

export const headerRight = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
}

export const resultBadge = (won: boolean) => ({
  padding: '8px 16px',
  borderRadius: '8px',
  background: won ? '#10b981' : '#ef4444',
  color: 'white',
  fontWeight: 700,
  fontSize: '14px'
})

export const statsGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '24px',
  marginBottom: '24px'
}

export const performanceCard = {
  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
  borderRadius: '12px',
  padding: '16px',
  border: '1px solid #93c5fd'
}

export const buildCard = {
  background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
  borderRadius: '12px',
  padding: '16px',
  border: '1px solid #fde047'
}

export const itemSlot = (item: number) => ({
  width: '40px',
  height: '40px',
  background: item > 0 ? '#0f172a' : 'rgba(15, 23, 42, 0.1)',
  borderRadius: '6px',
  overflow: 'hidden' as const,
  border: item === 0 ? '1px dashed #94a3b8' : 'none'
})

export const teamSection = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px'
}

// Note: accentColor passed but ignored for baseline styling
export const teamTitle = (_color: string) => ({
  fontSize: '14px',
  fontWeight: 600,
  color: '#1e293b',
  marginBottom: '8px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
})

export const playerRow = (isCurrentPlayer: boolean, isMVP: boolean) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 10px',
  borderRadius: '8px',
  background: isCurrentPlayer ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
  border: isCurrentPlayer ? '2px solid #eab308' : isMVP ? '2px solid #8b5cf6' : '1px solid transparent',
  position: 'relative' as const,
  cursor: !isCurrentPlayer ? 'pointer' : 'default'
})

export const playerBadge = (isCurrentPlayer: boolean) => ({
  position: 'absolute' as const,
  top: '-4px',
  left: '-4px',
  background: isCurrentPlayer ? '#eab308' : '#8b5cf6',
  color: 'white',
  fontSize: '8px',
  fontWeight: 'bold',
  padding: '2px 4px',
  borderRadius: '4px',
  zIndex: 10
})

export const championIcon = {
  width: '32px',
  height: '32px',
  borderRadius: '6px'
}

export const championName = (isCurrentPlayer: boolean) => ({
  fontSize: '12px',
  fontWeight: isCurrentPlayer ? 700 : 500,
  color: isCurrentPlayer ? '#b45309' : '#1e293b',
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis'
})

export const championDetail = {
  fontSize: '10px',
  color: '#64748b'
}

// Note: color passed for future use
export const kdaDisplay = (_color: string) => ({
  display: 'flex',
  gap: '4px',
  alignItems: 'center',
  minWidth: '60px'
})

export const kdaNumber = (color: string) => ({
  fontSize: '12px',
  fontWeight: 600,
  color
})

export const kdaSeparator = {
  color: '#94a3b8',
  fontSize: '10px'
}

export const itemsGrid = {
  display: 'flex',
  gap: '2px',
  flexWrap: 'wrap' as const
}

export const itemSlotSmall = (item: number) => ({
  width: '20px',
  height: '20px',
  background: item > 0 ? '#0f172a' : 'rgba(15, 23, 42, 0.3)',
  borderRadius: '3px',
  overflow: 'hidden' as const,
  border: item === 0 ? '1px dashed #475569' : 'none'
})

export const visionBadge = (score: number) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
  minWidth: '40px',
  padding: '2px 6px',
  background: score >= 25 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(100, 116, 139, 0.1)',
  borderRadius: '4px'
})

export const visionScore = (score: number) => ({
  fontSize: '11px',
  fontWeight: 600,
  color: score >= 25 ? '#3b82f6' : '#64748b'
})

export const fixedButton = {
  position: 'absolute' as const,
  bottom: 0,
  left: 0,
  right: 0,
  padding: '16px 24px',
  background: 'white',
  borderTop: '1px solid #e2e8f0',
  display: 'flex',
  justifyContent: 'center',
  zIndex: 20
}

export const analyzeButton = (hasAnalysis: boolean, loading: boolean) => ({
  width: '100%',
  maxWidth: '400px',
  padding: '14px 24px',
  background: hasAnalysis ? '#f1f5f9' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
  color: hasAnalysis ? '#475569' : 'white',
  border: 'none',
  borderRadius: '12px',
  fontSize: '15px',
  fontWeight: 600,
  cursor: loading ? 'not-allowed' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px'
})

export const insightsSection = {
  padding: '24px 0'
}

export const insightsCard = {
  marginTop: '16px',
  padding: '16px',
  background: '#f8fafc',
  borderRadius: '12px',
  border: '1px solid #e2e8f0'
}

export const insightItem = (type: 'positive' | 'negative' | 'neutral') => ({
  marginBottom: '8px',
  padding: '10px',
  background: type === 'positive' ? '#dcfce7' : type === 'negative' ? '#fee2e2' : '#fef3c7',
  borderRadius: '8px',
  borderLeft: `4px solid ${type === 'positive' ? '#22c55e' : type === 'negative' ? '#ef4444' : '#f59e0b'}`
})

export const errorMessage = {
  marginTop: '12px',
  padding: '12px',
  background: '#fef2f2',
  borderRadius: '8px',
  color: '#dc2626',
  fontSize: '14px'
}