'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Tent, LayoutDashboard, User, LogOut, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import DarkModeToggle from './DarkModeToggle'
import PushSetup from './PushSetup'

export default function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navItems = [
    { href: '/dashboard', label: 'Trips', icon: <LayoutDashboard className="w-5 h-5" /> },
    { href: '/profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
  ]

  return (
    <>
      <PushSetup />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r min-h-screen px-3 py-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <Link href="/dashboard" className="flex items-center gap-2 px-3 mb-8">
          <Tent className="w-6 h-6" style={{ color: 'var(--forest)' }} />
          <span className="font-display text-lg font-semibold" style={{ color: 'var(--forest)' }}>Camp Pal</span>
        </Link>

        <Link
          href="/trips/new"
          className="flex items-center gap-2 text-white text-sm font-medium px-3 py-2.5 rounded-xl mb-6 hover:opacity-90 transition-opacity"
          style={{ background: 'var(--forest)' }}
        >
          <Plus className="w-4 h-4" />
          New trip
        </Link>

        <nav className="flex-1 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={pathname.startsWith(item.href)
                ? { background: 'var(--forest)', color: 'white' }
                : { color: 'var(--muted)' }}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-between px-3 mt-4 mb-2">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Theme</span>
          <DarkModeToggle />
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ color: 'var(--muted)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 border-t flex items-center justify-around px-4 py-2 z-50"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-medium transition-colors"
            style={pathname.startsWith(item.href) ? { color: 'var(--forest)' } : { color: 'var(--muted)' }}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
        <Link
          href="/trips/new"
          className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-medium text-white"
          style={{ background: 'var(--forest)' }}
        >
          <Plus className="w-5 h-5" />
          New
        </Link>
        <DarkModeToggle />
      </nav>
    </>
  )
}
