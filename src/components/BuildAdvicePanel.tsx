import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Sparkles, Swords, Users, Loader2, ChevronRight, Shield } from 'lucide-react'
import { getItemImageUrlByName, useItemMap } from '../utils/ddragon'

interface OptimalBuild {
  keystone: string
  secondary_tree: string
  core_items: string[]
  boots: string
  situational: string[]
  tips: string
}

interface VsLane {
  opponent: string
  keystone: string
  item_changes: string[]
  tips: string
}

interface VsComp {
  comp_type: string
  item_changes: string[]
  tips: string
}

interface BuildAdvice {
  champion: string
  role: string
  optimal: OptimalBuild
  vs_lane: VsLane
  vs_comp: VsComp
}

type Tab = 'optimal' | 'vs_lane' | 'vs_comp'

interface BuildAdvicePanelProps {
  myPuuid: string
  myChampionName: string
  participants: object[]
}

function ItemIcon({ name }: { name: string }) {
  const url = getItemImageUrlByName(name)
  if (!url) return null
  return (
    <img
      src={url}
      alt={name}
      title={name}
      className="w-7 h-7 rounded-md border border-slate-300 dark:border-slate-600 flex-shrink-0"
      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
    />
  )
}

function ItemPill({ name }: { name: string }) {
  const url = getItemImageUrlByName(name)
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
      {url && (
        <img
          src={url}
          alt=""
          className="w-4 h-4 rounded-sm flex-shrink-0"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}
      {name}
    </span>
  )
}

function ItemRow({ items, label }: { items: string[]; label: string }) {
  if (!items?.length) return null
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => item?.trim() ? <ItemPill key={i} name={item.trim()} /> : null)}
      </div>
    </div>
  )
}

function RunePill({ name, sub }: { name: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
      <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
      <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">{name}</span>
      {sub && <span className="text-xs text-amber-600 dark:text-amber-400 ml-1">· {sub}</span>}
    </div>
  )
}

function TipBox({ text, color }: { text?: string; color: 'blue' | 'orange' | 'purple' }) {
  if (!text) return null
  const cls = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800 text-orange-700 dark:text-orange-300',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800 text-purple-700 dark:text-purple-300',
  }[color]
  const iconCls = { blue: 'text-blue-500', orange: 'text-orange-500', purple: 'text-purple-500' }[color]
  return (
    <div className={`flex gap-2 p-2.5 rounded-lg border ${cls}`}>
      <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${iconCls}`} />
      <p className="text-xs leading-relaxed">{text}</p>
    </div>
  )
}

export function BuildAdvicePanel({ myPuuid, myChampionName, participants }: BuildAdvicePanelProps) {
  const [advice, setAdvice] = useState<BuildAdvice | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('optimal')
  const [fetched, setFetched] = useState(false)
  useItemMap() // subscribe so component re-renders once item.json is loaded

  useEffect(() => {
    if (fetched || !myPuuid || !myChampionName || !participants.length) return
    setFetched(true)
    setLoading(true)
    setError(null)

    invoke<BuildAdvice>('get_live_build_advice', { myPuuid, myChampionName, participants })
      .then(setAdvice)
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg.includes('GROQ_API_KEY') ? 'Groq API key no configurada' : 'Error generando build. Inténtalo de nuevo.')
      })
      .finally(() => setLoading(false))
  }, [myPuuid, myChampionName, participants, fetched])

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Build IA</h4>
        </div>
        <div className="flex items-center gap-3 py-6 justify-center text-slate-400 dark:text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Analizando composición...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Build IA</h4>
        </div>
        <p className="text-xs text-rose-500 dark:text-rose-400">{error}</p>
        <button onClick={() => setFetched(false)} className="mt-2 text-xs text-blue-500 hover:underline">
          Reintentar
        </button>
      </div>
    )
  }

  if (!advice) return null

  // Guard: ensure nested objects exist (Groq response may be incomplete for ARAM)
  const optimal = advice.optimal ?? {}
  const vsLane  = advice.vs_lane  ?? {}
  const vsComp  = advice.vs_comp  ?? {}

  const vsLaneLabel = vsLane.opponent ? `vs ${vsLane.opponent}` : 'vs Línea'

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'optimal',  label: 'Óptima',     icon: Sparkles },
    { id: 'vs_lane',  label: vsLaneLabel,  icon: Swords   },
    { id: 'vs_comp',  label: 'vs Comp',    icon: Users    },
  ]

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Build IA · <span className="font-normal text-slate-500 dark:text-slate-400">{advice.champion ?? myChampionName} · {advice.role}</span>
        </h4>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === id
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Optimal tab */}
      {tab === 'optimal' && (
        <div className="space-y-3">
          {optimal.keystone && (
            <RunePill name={optimal.keystone} sub={optimal.secondary_tree} />
          )}

          {/* Items grid with icons */}
          {(optimal.core_items?.length > 0 || optimal.boots) && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Items principales</p>
              <div className="flex flex-wrap gap-2">
                {[...(optimal.core_items ?? []), optimal.boots].filter(Boolean).map((item, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <ItemIcon name={item} />
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 text-center max-w-[56px] leading-tight">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ItemRow items={optimal.situational ?? []} label="Situacionales" />
          <TipBox text={optimal.tips} color="blue" />
        </div>
      )}

      {/* vs Lane tab */}
      {tab === 'vs_lane' && (
        <div className="space-y-3">
          {vsLane.opponent ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
              <Swords className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-red-700 dark:text-red-300">Enfrentamiento: {vsLane.opponent}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">Sin rival de línea detectado (ARAM u otro modo)</p>
          )}

          {vsLane.keystone && <RunePill name={vsLane.keystone} />}

          {(vsLane.item_changes?.length ?? 0) > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Adaptaciones</p>
              <ul className="space-y-1">
                {vsLane.item_changes.map((change, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="text-amber-500 flex-shrink-0">•</span>
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <TipBox text={vsLane.tips} color="orange" />
        </div>
      )}

      {/* vs Comp tab */}
      {tab === 'vs_comp' && (
        <div className="space-y-3">
          {vsComp.comp_type && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
              <Shield className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">Composición: {vsComp.comp_type}</p>
            </div>
          )}

          {(vsComp.item_changes?.length ?? 0) > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Adaptaciones</p>
              <ul className="space-y-1">
                {vsComp.item_changes.map((change, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="text-purple-500 flex-shrink-0">•</span>
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <TipBox text={vsComp.tips} color="purple" />
        </div>
      )}
    </div>
  )
}
