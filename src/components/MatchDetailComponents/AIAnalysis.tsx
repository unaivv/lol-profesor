import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

interface AIAnalysisProps {
  gameId: string
  playerPuuid?: string
}

interface Insight {
  type: 'positive' | 'negative' | 'improvement'
  title: string
  description: string
  priority: number
}

interface AIAnalysisResult {
  summary: string
  insights: Insight[]
}

export function AIAnalysis({ gameId, playerPuuid }: AIAnalysisProps) {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (analysis) {
      setAnalysis(null)
      return
    }
    
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/analyze-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: gameId, puuid: playerPuuid })
      })
      
      if (response.ok) {
        const data = await response.json()
        setAnalysis(data.data)
      } else {
        setError('Error al analizar la partida')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: '24px' }}>
      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={loading}
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '14px 24px',
          background: analysis ? '#f1f5f9' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
          color: analysis ? '#475569' : 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: '15px',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Analizando con IA...
          </>
        ) : analysis ? (
          'Ocultar análisis'
        ) : (
          <>
            <Sparkles size={18} /> Analizar con IA
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div style={{ 
          marginTop: '12px', 
          padding: '12px', 
          background: '#fef2f2', 
          borderRadius: '8px', 
          color: '#dc2626', 
          fontSize: '14px' 
        }}>
          {error}
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div style={{ 
          marginTop: '16px', 
          padding: '16px', 
          background: '#f8fafc', 
          borderRadius: '12px', 
          border: '1px solid #e2e8f0' 
        }}>
          <h4 style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            color: '#1e293b', 
            marginBottom: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px' 
          }}>
            <Sparkles size={18} color="#8b5cf6" />
            Análisis de la partida
          </h4>
          
          <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, marginBottom: '16px' }}>
            {analysis.summary}
          </p>

          {analysis.insights && analysis.insights.length > 0 && (
            <div>
              <h5 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                Insights:
              </h5>
              {analysis.insights.map((insight, idx) => (
                <div key={idx} style={{
                  marginBottom: '8px',
                  padding: '10px',
                  background: insight.type === 'positive' ? '#dcfce7' : insight.type === 'negative' ? '#fee2e2' : '#fef3c7',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${insight.type === 'positive' ? '#22c55e' : insight.type === 'negative' ? '#ef4444' : '#f59e0b'}`
                }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>
                    {insight.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                    {insight.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}