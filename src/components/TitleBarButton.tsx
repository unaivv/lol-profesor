import { cn } from '../lib/utils'
import type { ReactNode } from 'react'

interface TitleBarButtonProps {
  onClick: () => void
  title: string
  isClose?: boolean
  children: ReactNode
}

export function TitleBarButton({ onClick, title, isClose, children }: TitleBarButtonProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'flex h-9 w-[46px] cursor-pointer items-center justify-center border-none bg-transparent text-gray-500 transition-colors',
        isClose ? 'hover:bg-red-500/15 hover:text-red-500' : 'hover:bg-indigo-500/[0.08]',
      )}
    >
      {children}
    </button>
  )
}
