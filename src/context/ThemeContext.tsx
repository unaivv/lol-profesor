import { createContext, useContext, useState, useEffect } from 'react'

export type Theme = 'system' | 'light' | 'dark'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  resolvedTheme: ResolvedTheme
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'lolProfessorTheme'

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolve(t: Theme): ResolvedTheme {
  return t === 'system' ? getSystemTheme() : t
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(STORAGE_KEY) as Theme) || 'system'
  )
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolve(theme))

  useEffect(() => {
    const resolved = resolve(theme)
    applyTheme(resolved)
    setResolvedTheme(resolved)

    if (theme !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const r: ResolvedTheme = e.matches ? 'dark' : 'light'
      applyTheme(r)
      setResolvedTheme(r)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = (t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t)
    setThemeState(t)
  }

  return (
    <ThemeContext value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
