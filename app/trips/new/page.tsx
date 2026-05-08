'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppNav from '@/components/ui/AppNav'
import LocationPicker from '@/components/map/LocationPicker'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { nanoid } from 'nanoid'

interface Location {
  name: string
  lat: number
  lng: number
}

export default function NewTripPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [location, setLocation] = useState<Location | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!location) { setError('Please select a location'); return }
    if (!startDate || !endDate) { setError('Please set trip dates'); return }
    if (new Date(endDate) < new Date(startDate)) { setError('End date must be after start date'); return }

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const inviteCode = nanoid(8)

    const { data: trip, error: tripErr } = await supabase
      .from('trips')
      .insert({
        name,
        location_name: location.name,
        lat: location.lat,
        lng: location.lng,
        start_date: startDate,
        end_date: endDate,
        description: description || null,
        invite_code: inviteCode,
        creator_id: user.id,
      })
      .select()
      .single()

    if (tripErr || !trip) {
      setError(tripErr?.message ?? 'Failed to create trip')
      setLoading(false)
      return
    }

    // Add creator as member
    await supabase.from('trip_members').insert({
      trip_id: trip.id,
      user_id: user.id,
      role: 'creator',
    })

    // Trigger packing list generation (server-side)
    try {
      await fetch(`/api/trips/${trip.id}/generate-packing`, { method: 'POST' })
    } catch {
      // Non-fatal — packing list can be generated later
    }

    router.push(`/trips/${trip.id}`)
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <AppNav />
      <main className="flex-1 px-4 sm:px-6 py-6 pb-24 md:pb-6 max-w-2xl">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <h1 className="font-display text-3xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>New Trip</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Trip name */}
          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <label className="block text-sm font-semibold text-stone-700 mb-2">Trip name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="e.g. Lake District Long Weekend"
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none transition-shadow"
              onFocus={e => e.target.style.boxShadow = '0 0 0 2px #2d5a2740'}
              onBlur={e => e.target.style.boxShadow = ''}
            />
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <label className="block text-sm font-semibold text-stone-700 mb-3">Location *</label>
            <LocationPicker value={location} onChange={setLocation} />
          </div>

          {/* Dates */}
          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <label className="block text-sm font-semibold text-stone-700 mb-3">Dates *</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Start</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  required
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none transition-shadow"
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px #2d5a2740'}
                  onBlur={e => e.target.style.boxShadow = ''}
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">End</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  required
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none transition-shadow"
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px #2d5a2740'}
                  onBlur={e => e.target.style.boxShadow = ''}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <label className="block text-sm font-semibold text-stone-700 mb-2">Notes / description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Campsite details, booking links, what to expect..."
              rows={3}
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none transition-shadow resize-none"
              onFocus={e => e.target.style.boxShadow = '0 0 0 2px #2d5a2740'}
              onBlur={e => e.target.style.boxShadow = ''}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-white py-3 rounded-xl font-medium transition-opacity disabled:opacity-60 hover:opacity-90"
            style={{ background: 'var(--forest)' }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Creating trip…' : 'Create trip & generate packing list'}
          </button>
        </form>
      </main>
    </div>
  )
}
