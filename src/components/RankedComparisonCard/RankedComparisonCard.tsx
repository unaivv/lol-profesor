import { Trophy, TrendingUp, Target, Shield } from 'lucide-react'
import { getRankEmblemUrl } from '@/lib/utils'
import { styles, rankCardStyles, emptyStyles } from './RankedComparisonCard.styles'
import { getRankColor } from './RankedComparisonCard.utils'
import type { RankedComparisonCardProps } from './RankedComparisonCard.types'

interface RankedCardProps {
  stats: import('@/types/api').RankedStats | null
  title: string
  icon: React.ElementType
}

function RankedCard({ stats, title, icon: Icon }: RankedCardProps) {
  if (!stats) {
    return (
      <div className={rankCardStyles.empty}>
        <div className={rankCardStyles.emptyIcon}>
          <Icon className="w-6 h-6 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className={rankCardStyles.emptyTitle}>{title}</h3>
        <p className={rankCardStyles.emptyText}>Sin datos</p>
      </div>
    )
  }

  const winRate = Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
  const tierColor = getRankColor(stats.tier)

  return (
    <div className={rankCardStyles.container}>
      <div className={rankCardStyles.header}>
        <div
          className={rankCardStyles.iconWrapper}
          style={{
            backgroundImage: `url(${getRankEmblemUrl(stats.tier)})`,
            backgroundSize: '350%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: 'var(--bg-card-subtle)'
          }}
        />
        <div className={rankCardStyles.info}>
          <h3 className={rankCardStyles.title}>{title}</h3>
          <p className={rankCardStyles.tier} style={{ color: tierColor }}>{stats.tier} {stats.rank}</p>
        </div>
      </div>

      <div className={rankCardStyles.lpSection}>
        <div className={rankCardStyles.lpValue}>{stats.leaguePoints} <span className={rankCardStyles.lpLabel}>LP</span></div>
        <div className={rankCardStyles.progressBar}>
          <div
            className={rankCardStyles.progressFill}
            style={{ width: `${Math.min(stats.leaguePoints, 100)}%` }}
          />
        </div>
      </div>

      <div className={rankCardStyles.statsGrid}>
        <div>
          <div className={rankCardStyles.statValueWin}>{stats.wins}</div>
          <div className={rankCardStyles.statLabel}>Victorias</div>
        </div>
        <div>
          <div className={rankCardStyles.statValueLoss}>{stats.losses}</div>
          <div className={rankCardStyles.statLabel}>Derrotas</div>
        </div>
        <div>
          <div className={`${rankCardStyles.statValue} ${winRate >= 50 ? rankCardStyles.textWin : rankCardStyles.textLoss}`}>{winRate}%</div>
          <div className={rankCardStyles.statLabel}>Win Rate</div>
        </div>
      </div>

      {stats.hotStreak && (
        <div className={rankCardStyles.hotStreak}>
          <TrendingUp className="w-3.5 h-3.5" />
          <span>En racha de victorias</span>
        </div>
      )}
    </div>
  )
}

export function RankedComparisonCard({ rankedStats }: RankedComparisonCardProps) {
  const solo = rankedStats?.solo || null
  const flex = rankedStats?.flex || null

  const hasAnyRanked = solo !== null || flex !== null

  if (!hasAnyRanked) {
    return (
      <div className={emptyStyles.container}>
        <div className={emptyStyles.header}>
          <div className={emptyStyles.headerIcon}>
            <Shield className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </div>
          <h2 className={emptyStyles.headerTitle}>Clasificatorias</h2>
        </div>
        <div className={emptyStyles.content}>
          <div className={emptyStyles.iconWrapper}>
            <Trophy className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className={emptyStyles.title}>Sin datos clasificatorios</h3>
          <p className={emptyStyles.text}>El jugador no tiene partidas clasificatorias esta temporada</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <Shield className="w-5 h-5 text-white" />
        </div>
        <h2 className={styles.headerTitle}>Estadísticas Clasificatorias</h2>
      </div>
      <div className={`${styles.grid}`}>
        <RankedCard stats={solo} title="Solo/Duo" icon={Target} />
        <RankedCard stats={flex} title="Flex 5v5" icon={Trophy} />
      </div>
    </div>
  )
}