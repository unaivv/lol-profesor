import { useState, useEffect } from 'react'
import { TrendingUp, Loader2, RotateCcw, Swords } from 'lucide-react'
import { getItemImageUrl, getItemNameById, getRuneImageUrl, getChampionImageUrl, getChampionDDragonKey, useItemMap, useChampionMap } from '../utils/ddragon'
import { fetchChampionBuild, fetchMatchupData, LolalyticsData } from '../utils/lolalytics'
import type { Role } from '../utils/roleDetection'

interface BuildAdvicePanelProps {
  myChampionName: string
  myChampionId: number
  role: Role
  opponentChampionName?: string
  opponentChampionId?: number
}

function ItemCell({ id }: { id: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <img
        src={getItemImageUrl(id)}
        alt={getItemNameById(id)}
        title={getItemNameById(id)}
        className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-600 flex-shrink-0"
        onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3' }}
      />
      <span className="text-[9px] text-slate-500 dark:text-slate-400 text-center max-w-[52px] leading-tight line-clamp-2">
        {getItemNameById(id)}
      </span>
    </div>
  )
}

function WinrateBadge({ winrate, games }: { winrate: number; games: number }) {
  const color = winrate >= 52 ? '#22c55e' : winrate <= 48 ? '#ef4444' : '#eab308'
  const label = winrate >= 52 ? 'Favorable' : winrate <= 48 ? 'Difícil' : 'Parejo'
  return (
    <div className="flex items-center gap-2">
      <span style={{ fontSize: '11px', fontWeight: 700, color, background: `${color}22`, borderRadius: '6px', padding: '2px 8px' }}>
        {winrate.toFixed(1)}% · {label}
      </span>
      {games > 0 && (
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          {games < 300 ? `${games} partidas (pocos datos)` : `${games.toLocaleString()} partidas`}
        </span>
      )}
    </div>
  )
}

const SKILL_COLORS: Record<string, string> = {
  Q: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  W: 'bg-green-500/20 text-green-400 border-green-500/40',
  E: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  R: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
}

function SkillBadge({ skill }: { skill: string }) {
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border ${SKILL_COLORS[skill] ?? 'bg-slate-700 text-slate-300 border-slate-600'}`}>
      {skill}
    </span>
  )
}

function BuildSection({ data, role }: { data: LolalyticsData; role: string }) {
  const allItems = [...data.core_items, ...(data.boots != null ? [data.boots] : [])]
  const skillBadges = data.skill_order ? data.skill_order.slice(0, 12).split('') : []
  return (
    <div className="space-y-2">
      {data.keystone_id && (
        <div className="flex items-center gap-1.5">
          <img src={getRuneImageUrl(data.keystone_id)} alt="" className="w-5 h-5 rounded-full bg-slate-800"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          {data.sec_tree_id && (
            <img src={getRuneImageUrl(data.sec_tree_id)} alt="" className="w-5 h-5 rounded-full bg-slate-800"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          )}
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Runas · {role}</span>
        </div>
      )}
      {allItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allItems.map((id, i) => <ItemCell key={i} id={id} />)}
        </div>
      )}
      {skillBadges.length > 0 && (
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Orden de habilidades</span>
          <div className="flex flex-wrap items-center gap-0.5 mt-0.5">
            {skillBadges.map((s, i) => (
              <span key={i} className="flex items-center gap-0.5">
                <SkillBadge skill={s} />
                {i < skillBadges.length - 1 && <span className="text-[8px] text-slate-500">›</span>}
              </span>
            ))}
          </div>
        </div>
      )}
      {data.situational_items && data.situational_items.length > 0 && (
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Ítems situacionales</span>
          <div className="flex flex-wrap gap-2 mt-0.5">
            {data.situational_items.map((id, i) => <ItemCell key={i} id={id} />)}
          </div>
        </div>
      )}
    </div>
  )
}

export function BuildAdvicePanel({ myChampionName, myChampionId, role, opponentChampionName, opponentChampionId }: BuildAdvicePanelProps) {
  const [build, setBuild]             = useState<LolalyticsData | null>(null)
  const [matchup, setMatchup]         = useState<LolalyticsData | null>(null)
  const [loadingBuild, setLoadingBuild]     = useState(false)
  const [loadingMatchup, setLoadingMatchup] = useState(false)
  const [errorBuild, setErrorBuild]         = useState<string | null>(null)
  const [errorMatchup, setErrorMatchup]     = useState<string | null>(null)
  const [fetchedBuild, setFetchedBuild]     = useState(false)
  const [fetchedMatchup, setFetchedMatchup] = useState(false)
  useItemMap()
  const championMapReady = useChampionMap()

  useEffect(() => {
    if (fetchedBuild || !myChampionId || !championMapReady) return
    const key = getChampionDDragonKey(myChampionId)
    if (!key) return
    setFetchedBuild(true)
    setLoadingBuild(true)
    fetchChampionBuild(key, role)
      .then(setBuild)
      .catch((e: unknown) => setErrorBuild(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoadingBuild(false))
  }, [myChampionId, role, fetchedBuild, championMapReady])

  useEffect(() => {
    if (fetchedMatchup || !myChampionId || !opponentChampionId || !championMapReady) return
    const key = getChampionDDragonKey(myChampionId)
    if (!key) return
    setFetchedMatchup(true)
    setLoadingMatchup(true)
    fetchMatchupData(key, role, opponentChampionId)
      .then(setMatchup)
      .catch((e: unknown) => setErrorMatchup(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoadingMatchup(false))
  }, [myChampionId, role, opponentChampionId, fetchedMatchup, championMapReady])

  const retry = () => {
    setFetchedBuild(false); setBuild(null)
    setFetchedMatchup(false); setMatchup(null)
  }

  if (loadingBuild) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3 py-4 justify-center text-slate-400 dark:text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Cargando build...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4">
      {/* Build */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Build · <span className="font-normal text-slate-500 dark:text-slate-400">{myChampionName}</span>
            </h4>
          </div>
          {build && build.total_games > 0 && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500">{build.total_games.toLocaleString()} partidas</span>
          )}
        </div>
        {errorBuild ? (
          <div>
            <p className="text-xs text-rose-500">{errorBuild}</p>
            <button onClick={retry} className="mt-1 flex items-center gap-1 text-xs text-blue-500 hover:underline">
              <RotateCcw className="w-3 h-3" /> Reintentar
            </button>
          </div>
        ) : build ? (
          <BuildSection data={build} role={role} />
        ) : null}
      </div>

      {/* Matchup */}
      {opponentChampionName && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Swords className="w-4 h-4 text-red-400" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              vs
              {opponentChampionId && (
                <img src={getChampionImageUrl(opponentChampionId)} alt={opponentChampionName}
                  className="w-5 h-5 rounded-md border border-slate-200 dark:border-slate-600" />
              )}
              <span className="font-normal text-slate-500 dark:text-slate-400">{opponentChampionName}</span>
            </h4>
          </div>
          {loadingMatchup && (
            <div className="flex items-center gap-2 py-2 text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-xs">Cargando matchup...</span>
            </div>
          )}
          {errorMatchup && <p className="text-xs text-slate-400 italic">{errorMatchup}</p>}
          {matchup && !loadingMatchup && (
            <div className="space-y-2">
              {matchup.winrate > 0 && <WinrateBadge winrate={matchup.winrate} games={matchup.total_games} />}
              {matchup.core_items.length > 0 && <BuildSection data={matchup} role={role} />}
            </div>
          )}
        </div>
      )}

      <p className="text-[9px] text-slate-400 dark:text-slate-500">Fuente: Lolalytics · Platinum+</p>
    </div>
  )
}
