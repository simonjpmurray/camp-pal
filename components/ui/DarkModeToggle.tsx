'use client'

import { useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function DarkModeToggle() {
  // The dark class is set by the bootstrap script in layout.tsx before paint.
  // Read it directly to avoid a useEffect/setState pair that triggers the
  // react-hooks/set-state-in-effect lint rule.
  const [dark, setDark] = useState(() => {
    if (typeof document === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  })

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
      aria-label="Toggle dark mode"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
