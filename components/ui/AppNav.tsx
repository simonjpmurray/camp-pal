'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Flame, LayoutDashboard, User, LogOut, Plus, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import DarkModeToggle from './DarkModeToggle'
import PushSetup from './PushSetup'
import SidebarWeatherCompact from './SidebarWeatherCompact'
import NotificationBell from './NotificationBell'

const TRIP_PATH_RE = /^\/trips\/([0-9a-f-]{36})(?:\/|$)/i

const EXTERNAL_LINKS = [
  { label: 'Decathlon', href: 'https://www.decathlon.co.uk/' },
  { label: 'AllTrails', href: 'https://www.alltrails.com/' },
]

export default function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const tripIdMatch = pathname.match(TRIP_PATH_RE)
  const activeTripId = tripIdMatch ? tripIdMatch[1] : null

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
      <aside className="hidden md:flex flex-col w-96 shrink-0 border-r min-h-screen px-4 py-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <Link href="/dashboard" className="flex items-center gap-2 px-3 mb-6">
          <Flame className="w-6 h-6" style={{ color: 'var(--forest)' }} />
          <span className="font-display text-lg font-semibold" style={{ color: 'var(--forest)' }}>CampFire</span>
        </Link>

        <Link
          href="/trips/new"
          className="flex items-center gap-2 text-white text-sm font-medium px-3 py-2.5 rounded-xl mb-4 hover:opacity-90 transition-opacity"
          style={{ background: 'var(--forest)' }}
        >
          <Plus className="w-4 h-4" />
          New trip
        </Link>

        <nav className="space-y-1 mb-4">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={pathname.startsWith(item.href)
                ? { background: 'var(--forest)', color: 'white' }
                : { color: '#000' }}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        {activeTripId && (
          <div className="mb-4">
            <SidebarWeatherCompact tripId={activeTripId} />
          </div>
        )}

        <div className="mb-4">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 px-3" style={{ color: 'var(--muted)' }}>Outdoor</div>
          <div className="space-y-1">
            {EXTERNAL_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: '#000' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span>{link.label}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </a>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center justify-between px-3 mt-4 mb-2">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Theme</span>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <DarkModeToggle />
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ color: '#000' }}
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
        <NotificationBell />
        <DarkModeToggle />
      </nav>
    </>
  )
}
