export const styles = {
  container: 'bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden',
  header: 'bg-gradient-to-r from-slate-800 to-slate-900 text-white px-5 py-3.5 flex items-center justify-between',
  headerContent: 'flex items-center gap-2',
  hotStreakBadge: 'flex items-center gap-1 text-xs text-orange-400',
  
  content: 'p-6 space-y-6',
  contentSpace: 'space-y-6',
  
  rankSection: 'flex items-center gap-5',
  rankImageWrapper: 'w-24 h-24 rounded-xl overflow-hidden shadow-lg flex-shrink-0 bg-contain',
  rankImage: 'w-full h-full object-contain p-0.5',
  rankInfo: 'flex-1 min-w-0',
  rankTitle: 'text-2xl font-bold truncate',
  rankLp: 'text-slate-500 text-sm',
  
  statsGrid: 'grid grid-cols-3 gap-3',
  statCard: 'rounded-xl p-3 text-center border',
  statCardWin: 'bg-emerald-50 border-emerald-100',
  statCardLoss: 'bg-rose-50 border-rose-100',
  statLabel: 'text-xs font-semibold mb-1',
  statValue: 'text-lg font-bold',
  textWin: 'text-emerald-600 text-emerald-700',
  textLoss: 'text-orange-600 text-orange-700',
  
  progressSection: 'space-y-2',
  progressHeader: 'flex justify-between text-xs',
  progressLabel: 'text-slate-500',
  progressValue: 'font-semibold text-slate-700',
  progressBar: 'h-2.5 bg-slate-100 rounded-full overflow-hidden',
  progressFill: 'h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all',
  
  badges: 'flex flex-wrap gap-2 pt-1',
  veteranBadge: 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200',
  gamesBadge: 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200',
  
  emptyState: 'text-center py-6',
  emptyIcon: 'w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3',
  emptyTitle: 'text-sm font-semibold text-slate-700 mb-1',
  emptyText: 'text-xs text-slate-500',
} as const