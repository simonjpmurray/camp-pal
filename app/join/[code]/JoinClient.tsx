'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tent, MapPin, Calendar, Users, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

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
  code: string
  isLoggedIn: boolean
}

export default function JoinClient({ trip, code, isLoggedIn }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    setJoining(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirectTo=/join/${code}`)
      return
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

    // Notify other members (non-fatal)
    try {
      const joinerName = user.email?.split('@')[0] ?? 'Someone'
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
          <Tent className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--forest)' }} />
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
            {format(new Date(trip.start_date), 'EEE d MMM')} – {format(new Date(trip.end_date), 'EEE d MMM yyyy')}
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

        {isLoggedIn ? (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full text-white py-3 rounded-xl font-medium transition-opacity disabled:opacity-60 hover:opacity-90"
            style={{ background: 'var(--forest)' }}
          >
            {joining ? 'Joining…' : 'Join this trip 🏕️'}
          </button>
        ) : (
          <div className="space-y-2">
            <Link
              href={`/login?signup=true&redirectTo=/join/${code}`}
              className="block w-full text-center text-white py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
              style={{ background: 'var(--forest)' }}
            >
              Sign up to join
            </Link>
            <Link
              href={`/login?redirectTo=/join/${code}`}
              className="block w-full text-center border border-stone-200 text-stone-700 py-3 rounded-xl font-medium hover:bg-stone-50 transition-colors text-sm"
            >
              Already have an account? Sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
