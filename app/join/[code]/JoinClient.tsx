'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Calendar, Users, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'

interface TripInfo {
  id: string
  name: string
  location_name: string
  start_date: string
  end_date: string
  memberCount: number
}

interface Props {
  trip: TripInfo | null
}

export default function JoinClient({ trip }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    setJoining(true)
    setError('')

    // Friction-free: if the visitor has no session yet (e.g. they followed the
    // invite link in a fresh browser before <AnonymousAuth /> ran), sign them in
    // anonymously here so they can join without hitting a login wall.
    let { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const { data, error: anonErr } = await supabase.auth.signInAnonymously()
      if (anonErr || !data.user) {
        setError(anonErr?.message ?? 'Could not start a session. Please try again.')
        setJoining(false)
        return
      }
      user = data.user
    }

    if (!trip) return

    const { error: insertErr } = await supabase
      .from('trip_members')
      .insert({ trip_id: trip.id, user_id: user.id, role: 'member' })

    if (insertErr && !insertErr.message.includes('duplicate')) {
      setError(insertErr.message)
      setJoining(false)
      return
    }

    // Notify other members (non-fatal). Prefer the display name; fall back to the
    // email prefix (real accounts) and finally a generic label.
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .maybeSingle()
      const joinerName = profile?.name?.trim() || user.email?.split('@')[0] || 'Someone'
      await fetch('/api/push/notify-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: trip.id, joinerName }),
      })
    } catch { /* non-fatal */ }

    router.push(`/trips/${trip.id}`)
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-[4px] border flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--tint-essential)', borderColor: 'var(--hairline)' }}>
            <AlertCircle className="w-8 h-8" style={{ color: 'var(--signal-red)' }} />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2 tracking-tight" style={{ color: 'var(--ink)' }}>Invite not found</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--muted-text)' }}>This invite link may have expired or is invalid.</p>
          <Link href="/" className="font-mono-data text-[11px] uppercase tracking-widest" style={{ color: 'var(--ember)' }}>
            Go to CampFire →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center justify-center mb-3">
            <span className="relative flex items-center justify-center w-9 h-9 border-2 rounded-[3px]" style={{ borderColor: 'var(--ink)' }}>
              <span className="font-display font-bold text-lg leading-none" style={{ color: 'var(--ink)' }}>C</span>
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: 'var(--ember)' }} />
            </span>
          </Link>
          <div className="kicker" style={{ color: 'var(--ember)' }}>You&apos;re invited</div>
          <h1 className="font-display text-4xl font-bold mt-1 tracking-tight" style={{ color: 'var(--ink)' }}>{trip.name}</h1>
        </div>

        <div className="rounded-[4px] p-5 mb-4 space-y-2.5 font-mono-data text-[11px] uppercase tracking-wider"
          style={{ border: '1.5px dashed rgba(212,84,30,0.4)', background: 'var(--tint-essential)', color: 'var(--muted-text)' }}>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--ember)' }} />
            {trip.location_name}
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 shrink-0" style={{ color: 'var(--ember)' }} />
            {format(parseISO(trip.start_date), 'd MMM')} – {format(parseISO(trip.end_date), 'd MMM yyyy')}
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 shrink-0" style={{ color: 'var(--ember)' }} />
            {trip.memberCount} crew already joined
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-[3px] px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full text-white py-3 rounded-[3px] font-semibold transition-opacity disabled:opacity-60 hover:opacity-90"
          style={{ background: 'var(--ember)' }}
        >
          {joining ? 'Joining…' : 'Join the trip →'}
        </button>
        <p className="text-center text-xs mt-3" style={{ color: 'var(--muted-text)' }}>
          No account needed — you can add an email later to access from another device.
        </p>
      </div>
    </div>
  )
}
