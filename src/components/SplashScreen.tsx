import { useEffect, useState } from 'react'

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 400)
    }, 1800)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f3e8ff 100%)',
        transition: 'opacity 0.4s ease',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'all' : 'none',
      }}
    >
      <img
        src="/logo.png"
        alt="LoL Profesor"
        style={{
          width: '280px',
          height: 'auto',
          animation: 'splashFadeIn 0.6s ease forwards',
        }}
      />
      <div
        style={{
          marginTop: '32px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        {[0, 150, 300].map(delay => (
          <div
            key={delay}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #9333ea)',
              animation: `splashBounce 0.9s ${delay}ms ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes splashFadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes splashBounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50%       { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
