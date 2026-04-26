import { useState } from 'react'
import { X, User } from 'lucide-react'
import { getProfileIconUrl } from '../../utils/ddragon'

interface FavoriteItemProps {
  gameName: string
  tagLine: string
  region: string
  profileIconId?: number
  onClick: () => void
  onRemove: () => void
}

const TEXT = '#f1f5f9'
const TEXT_MUTED = '#64748b'
const ACTIVE_BG = 'rgba(59, 130, 246, 0.12)'

export function FavoriteItem({ gameName, tagLine, region, profileIconId, onClick, onRemove }: FavoriteItemProps) {
  const [hovered, setHovered] = useState(false)
  const [iconError, setIconError] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 10px',
        borderRadius: '6px',
        background: hovered ? ACTIVE_BG : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.1s',
        borderLeft: '3px solid transparent',
      }}
    >
      <div
        onClick={onClick}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}
      >
        <div style={{ width: '26px', height: '26px', borderRadius: '5px', overflow: 'hidden', flexShrink: 0, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {iconError || !profileIconId ? (
            <User size={14} color={TEXT_MUTED} />
          ) : (
            <img
              src={getProfileIconUrl(profileIconId)}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setIconError(true)}
            />
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: TEXT, fontSize: '11px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {gameName}
          </div>
          <div style={{ color: TEXT_MUTED, fontSize: '10px' }}>
            #{tagLine} · {region}
          </div>
        </div>
      </div>

      {hovered && (
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: TEXT_MUTED, display: 'flex', alignItems: 'center', flexShrink: 0 }}
        >
          <X size={11} />
        </button>
      )}
    </div>
  )
}
