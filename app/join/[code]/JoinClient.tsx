'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Flame, MapPin, Calendar, Users, AlertCircle } from 'lucide-react'
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
  const [authUser, setAuthUser] = useState<User | null>(null)

  useEffect(() => {
    // Seed immediately from local storage (no network round-trip).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setAuthUser(session.user)
    })

    // Stay in sync with <AnonymousAuth /> completing its signInAnonymously() call.
    // Without this, handleJoin() would race AnonymousAuth: both would call
    // signInAnonymously() concurrently, creating two separate anonymous users.
    // The one that resolved last would overwrite the session, so the user who
    // actually joined the trip would no longer be the active session — RLS then
    // denies access when they're redirected to the trip page.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, []) // supabase is a stable singleton from createBrowserClient

  async function handleJoin() {
    setJoining(true)
    setError('')

    // Use the user already resolved by <AnonymousAuth /> via onAuthStateChange.
    // Only fall back to signInAnonymously() if that never fired (e.g. Anonymous
    // Sign-ins is disabled in the Supabase dashboard).
    let user = authUser
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
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Invite not found</h1>
          <p className="text-stone-500 text-sm mb-6">This invite link may have expired or is invalid.</p>
          <Link href="/" className="text-sm font-medium" style={{ color: 'var(--forest)' }}>
            Go to CampFire →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-3">
            <Flame className="w-10 h-10" style={{ color: 'var(--forest)' }} />
          </Link>
          <p className="text-stone-500 text-sm">You&apos;re invited to join</p>
          <h1 className="font-display text-3xl font-bold mt-1" style={{ color: 'var(--foreground)' }}>{trip.name}</h1>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 p-5 mb-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--forest)' }} />
            {trip.location_name}
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <Calendar className="w-4 h-4 shrink-0" style={{ color: 'var(--forest)' }} />
            {format(parseISO(trip.start_date), 'EEE d MMM')} – {format(parseISO(trip.end_date), 'EEE d MMM yyyy')}
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <Users className="w-4 h-4 shrink-0" style={{ color: 'var(--forest)' }} />
            {trip.memberCount} member{trip.memberCount !== 1 ? 's' : ''} already joined
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full text-white py-3 rounded-xl font-medium transition-opacity disabled:opacity-60 hover:opacity-90"
          style={{ background: 'var(--forest)' }}
        >
          {joining ? 'Joining…' : 'Join this trip 🏕️'}
        </button>
        <p className="text-center text-xs text-stone-400 mt-3">
          No account needed — you can add an email later to access from another device.
        </p>
      </div>
    </div>
  )
}
