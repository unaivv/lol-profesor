export const styles = {
  container: 'bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 mb-6',
  header: 'flex items-center gap-3 mb-4',
  headerIcon: 'w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center',
  headerTitle: 'text-lg font-bold text-slate-800 dark:text-slate-100',
  grid: 'grid grid-cols-1 md:grid-cols-2 gap-4',
} as const

export const rankCardStyles = {
  container: 'bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700',
  empty: 'bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600 text-center',
  emptyIcon: 'w-12 h-12 bg-slate-200 dark:bg-slate-600 rounded-xl flex items-center justify-center mx-auto mb-3',
  emptyTitle: 'font-bold text-slate-700 dark:text-slate-200 mb-1',
  emptyText: 'text-sm text-slate-500 dark:text-slate-400',

  header: 'flex items-center gap-4 mb-5',
  iconWrapper: 'w-24 h-24 rounded-xl overflow-hidden shadow-sm flex-shrink-0',
  icon: 'w-full h-full object-contain p-1',
  info: 'flex-1 min-w-0',
  title: 'font-bold text-base text-slate-700 dark:text-slate-200',
  tier: 'text-2xl font-bold text-amber-500',

  lpSection: 'mb-5',
  lpValue: 'text-3xl font-bold text-slate-900 dark:text-slate-100',
  lpLabel: 'text-sm font-normal text-slate-500 dark:text-slate-400',
  progressBar: 'h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-2',
  progressFill: 'h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400',

  statsGrid: 'grid grid-cols-3 gap-4 text-center py-3 bg-slate-50 dark:bg-slate-700 rounded-xl',
  statValue: 'text-xl font-bold text-slate-800 dark:text-slate-100',
  statValueWin: 'text-xl font-bold text-emerald-600',
  statValueLoss: 'text-xl font-bold text-rose-600',
  statLabel: 'text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide',
  textWin: 'text-emerald-600',
  textLoss: 'text-orange-600',

  hotStreak: 'mt-4 flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 rounded-lg px-3 py-2',
} as const

export const emptyStyles = {
  container: 'bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6',
  header: 'flex items-center gap-3 mb-4',
  headerIcon: 'w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center',
  headerTitle: 'text-lg font-bold text-slate-800 dark:text-slate-100',
  content: 'text-center py-8',
  iconWrapper: 'w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4',
  title: 'text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2',
  text: 'text-sm text-slate-500 dark:text-slate-400',
} as const