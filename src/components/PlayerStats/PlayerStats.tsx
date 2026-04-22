import { Trophy, Flame, Award, Shield } from 'lucide-react'
import { PlayerStatsProps } from './PlayerStats.types'
import { getRankEmblemUrl } from '@/lib/utils'
import { styles } from './PlayerStats.styles'
import { getSoloRanked } from './PlayerStats.utils'

export function PlayerStats({ rankedStats }: PlayerStatsProps) {
  const soloRanked = getSoloRanked(rankedStats)

  const winRate = soloRanked
    ? Math.round((soloRanked.wins / (soloRanked.wins + soloRanked.losses)) * 100)
    : 0
  const totalGames = soloRanked ? soloRanked.wins + soloRanked.losses : 0

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <Shield className="w-5 h-5 text-blue-400" />
          <h2 className="font-bold text-sm">Clasificatoria Solo/Duo</h2>
        </div>
        {soloRanked?.hotStreak && (
          <div className={styles.hotStreakBadge}>
            <Flame className="w-3.5 h-3.5" />
            <span>En racha</span>
          </div>
        )}
      </div>

      <div className={styles.content}>
        {soloRanked ? (
          <div className={styles.contentSpace}>
            <div className={styles.rankSection}>
              <div className={styles.rankImageWrapper}>
                <img 
                  src={getRankEmblemUrl(soloRanked.tier)} 
                  alt={soloRanked.tier}
                  className={styles.rankImage}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.style.background = 'linear-gradient(135deg, #64748b, #475569)';
                    (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-white font-bold text-lg flex items-center justify-center h-full">${soloRanked.tier[0]}</span>`;
                  }}
                />
              </div>
              <div className={styles.rankInfo}>
                <div className={styles.rankTitle}>
                  {soloRanked.tier} {soloRanked.rank}
                </div>
                <div className={styles.rankLp}>{soloRanked.leaguePoints} LP</div>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statCardWin}>
                <div className={styles.statLabel}>Victorias</div>
                <div className={styles.statValue}>{soloRanked.wins}</div>
              </div>
              <div className={styles.statCardLoss}>
                <div className={styles.statLabel}>Derrotas</div>
                <div className={styles.statValue}>{soloRanked.losses}</div>
              </div>
              <div className={`${styles.statCard} ${winRate >= 50 ? styles.statCardWin : styles.statCardLoss}`}>
                <div className={`${styles.statLabel} ${winRate >= 50 ? styles.textWin : styles.textLoss}`}>Win Rate</div>
                <div className={`${styles.statValue} ${winRate >= 50 ? styles.textWin : styles.textLoss}`}>{winRate}%</div>
              </div>
            </div>

            <div className={styles.progressSection}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>Progreso hacia siguiente división</span>
                <span className={styles.progressValue}>{soloRanked.leaguePoints}/100 LP</span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${Math.min(soloRanked.leaguePoints, 100)}%` }}
                />
              </div>
            </div>

            <div className={styles.badges}>
              {soloRanked.veteran && (
                <span className={styles.veteranBadge}>
                  <Award className="w-3.5 h-3.5" />
                  Veterano
                </span>
              )}
              <span className={styles.gamesBadge}>
                <Trophy className="w-3.5 h-3.5" />
                {totalGames} partidas
              </span>
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Shield className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className={styles.emptyTitle}>Sin datos clasificatorios</h3>
            <p className={styles.emptyText}>Completa tus 10 partidas de colocación</p>
          </div>
        )}
      </div>
    </div>
  )
}