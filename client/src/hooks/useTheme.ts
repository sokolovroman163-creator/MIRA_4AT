import { useState, useCallback } from 'react'

type Theme = 'light' | 'dark' | 'system'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark')
  } else if (theme === 'light') {
    root.removeAttribute('data-theme')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) root.setAttribute('data-theme', 'dark')
    else root.removeAttribute('data-theme')
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('mira_theme') as Theme) || 'system'
  )

  const changeTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem('mira_theme', newTheme)
    setTheme(newTheme)
    applyTheme(newTheme)
  }, [])

  return { theme, changeTheme }
}
