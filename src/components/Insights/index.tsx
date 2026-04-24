import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'

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

interface InsightsProps {
  matchGameId: string
  playerPuuid?: string
}

export default function Insights({ matchGameId, playerPuuid }: InsightsProps) {
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (aiAnalysis) {
      setAiAnalysis(null)
      return
    }
    
    setAiLoading(true)
    setAiError(null)

    try {
      const data = await invoke<AIAnalysisResult>('analyze_match', {
        matchId: matchGameId,
        puuid: playerPuuid,
      })
      setAiAnalysis(data)

      // Scroll AFTER data is ready
      setTimeout(() => {
        const el = document.getElementById('ai-analysis-results')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch {
      setAiError('Error al analizar la partida')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <>
      {/* Fixed Analyze Button - Always visible */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        background: 'white',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'center',
        zIndex: 20
      }}>
        <button
          onClick={handleAnalyze}
          disabled={aiLoading}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '14px 24px',
            background: aiAnalysis ? '#f1f5f9' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            color: aiAnalysis ? '#475569' : 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: aiLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {aiLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Analizando con IA...
            </>
          ) : aiAnalysis ? (
            'Ocultar análisis'
          ) : (
            <>
              <Sparkles size={18} /> Analizar con IA
            </>
          )}
        </button>
      </div>

      {/* Analysis Results - At the very bottom */}
      <div id="ai-analysis-results" style={{ padding: '24px 0' }}>
        {aiError && (
          <div style={{ marginTop: '12px', padding: '12px', background: '#fef2f2', borderRadius: '8px', color: '#dc2626', fontSize: '14px' }}>
            {aiError}
          </div>
        )}

        {aiAnalysis && (
          <div style={{ marginTop: '16px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#8b5cf6" />
              Análisis de la partida
            </h4>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>{aiAnalysis.summary}</p>
            {aiAnalysis.insights && aiAnalysis.insights.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h5 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Insights:</h5>
                {aiAnalysis.insights.map((insight: any, idx: number) => (
                  <div key={idx} style={{
                    marginBottom: '8px',
                    padding: '10px',
                    background: insight.type === 'positive' ? '#dcfce7' : insight.type === 'negative' ? '#fee2e2' : '#fef3c7',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${insight.type === 'positive' ? '#22c55e' : insight.type === 'negative' ? '#ef4444' : '#f59e0b'}`
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>{insight.title}</div>
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>{insight.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}