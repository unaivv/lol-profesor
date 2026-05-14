import { ReactNode, useState, useRef } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
}

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPos({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX + rect.width / 2,
      })
    }
    setVisible(true)
  }

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
      style={{ display: 'inline-flex' }}
    >
      {children}
      {visible && createPortal(
        <div style={{
          position: 'absolute',
          top: pos.top - 6,
          left: pos.left,
          transform: 'translateX(-50%) translateY(-100%)',
          padding: '6px 10px',
          background: '#1e293b',
          color: '#f1f5f9',
          fontSize: '11px',
          borderRadius: '6px',
          whiteSpace: 'nowrap',
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }}>
          {content}
        </div>,
        document.body
      )}
    </div>
  )
}