import { Skeleton } from './Skeleton'

/* ─────────────────────────────────────────────
   MatchCardSkeleton
   Mirrors the height/layout of a real MatchCard
───────────────────────────────────────────── */
export function MatchCardSkeleton() {
  return (
    <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-hidden mb-2 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 flex-1">
          {/* Champion icon */}
          <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />

          {/* Name + champion */}
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-28 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>

          {/* W/L badge */}
          <Skeleton className="h-5 w-16 rounded-lg" />

          {/* KDA */}
          <div className="flex flex-col items-center gap-1">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-3 w-10 rounded" />
          </div>

          {/* Duration */}
          <Skeleton className="h-3.5 w-12 rounded" />

          {/* Queue */}
          <Skeleton className="h-4 w-16 rounded" />

          {/* Date */}
          <Skeleton className="h-3.5 w-16 rounded" />
        </div>

        {/* Expand button */}
        <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MatchHistorySkeleton
   Header + 5 MatchCardSkeleton rows
───────────────────────────────────────────── */
export function MatchHistorySkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-md">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-5 flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl bg-slate-700" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-36 rounded bg-slate-700" />
          <Skeleton className="h-3 w-24 rounded bg-slate-700" />
        </div>
      </div>

      {/* Match rows */}
      <div className="p-4 space-y-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <MatchCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   ProfileHeaderSkeleton
   Avatar + name/tag + rank badge + stat cards
───────────────────────────────────────────── */
export function ProfileHeaderSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Main gradient section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <Skeleton className="w-28 h-28 rounded-3xl bg-slate-700" />
          </div>

          {/* Player info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-52 rounded-lg bg-slate-700" />
              <Skeleton className="h-6 w-20 rounded-full bg-slate-700" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-12 rounded bg-slate-700" />
              <Skeleton className="h-4 w-16 rounded bg-slate-700" />
              <Skeleton className="h-4 w-12 rounded bg-slate-700" />
            </div>
            {/* LP sparkline placeholder */}
            <Skeleton className="h-14 w-64 rounded-2xl bg-slate-700" />
          </div>

          {/* Stat cards */}
          <div className="flex flex-col gap-3 w-full lg:w-auto">
            <Skeleton className="h-20 w-full lg:w-48 rounded-2xl bg-slate-700" />
            <Skeleton className="h-16 w-full lg:w-48 rounded-2xl bg-slate-700" />
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-32 rounded" />
          <Skeleton className="h-6 w-24 rounded-md" />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   StatsOverviewSkeleton
   3 stat box cards, matching StatsOverview layout
───────────────────────────────────────────── */
export function StatsOverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-20 rounded" />
              <Skeleton className="h-3 w-14 rounded" />
            </div>
          </div>
          <Skeleton className="h-7 w-24 rounded" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   SpectatorCardSkeleton
   2-column team layout, 5 player rows each
───────────────────────────────────────────── */
export function SpectatorCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-3 w-40 rounded" />
        </div>
      </div>

      {/* Two-column teams */}
      <div className="grid grid-cols-2 gap-4">
        {[true, false].map((isBlue) => (
          <div key={String(isBlue)}>
            <Skeleton className="h-3.5 w-24 rounded mb-2" />
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/30"
                >
                  <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-24 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                  <Skeleton className="h-4 w-10 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   StatsPageSkeleton
   Full-page skeleton: ProfileHeader + StatsOverview + MatchHistory
───────────────────────────────────────────── */
export function StatsPageSkeleton() {
  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <ProfileHeaderSkeleton />
      <StatsOverviewSkeleton />
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-5">
        <div className="xl:col-span-8 space-y-6">
          {/* RankedComparison placeholder */}
          <Skeleton className="h-32 w-full rounded-2xl" />
          <MatchHistorySkeleton />
        </div>
        <div className="xl:col-span-4 space-y-6">
          {/* PerformanceRadar placeholder */}
          <Skeleton className="h-64 w-full rounded-2xl" />
          {/* MostPlayedChampions placeholder */}
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
