'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import AppNav from '@/components/ui/AppNav'
import LocationPicker from '@/components/map/LocationPicker'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createTrip } from './actions'

interface Location {
  name: string
  lat: number
  lng: number
}

export default function NewTripPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [location, setLocation] = useState<Location | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!location) { setError('Please select a location'); return }
    if (!startDate || !endDate) { setError('Please set trip dates'); return }
    if (new Date(endDate) < new Date(startDate)) { setError('End date must be after start date'); return }

    setError('')
    startTransition(async () => {
      const result = await createTrip({
        name,
        locationName: location.name,
        lat: location.lat,
        lng: location.lng,
        startDate,
        endDate,
        description,
      })
      if (result.error && !result.tripId) {
        setError(result.error)
        return
      }
      if (result.tripId) router.push(`/trips/${result.tripId}`)
    })
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <AppNav />
      <main className="flex-1 mx-auto w-full px-4 sm:px-6 py-6 pb-24 md:pb-6 max-w-3xl">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 font-mono-data text-[11px] uppercase tracking-widest mb-6 hover:opacity-70 transition-opacity" style={{ color: 'var(--muted-text)' }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Link>

        <div className="kicker">New trip</div>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-2" style={{ color: 'var(--ink)' }}>Plan a new adventure</h1>
        <div className="h-[2px] mb-6" style={{ background: 'var(--ink)' }} />

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Trip name */}
          <div className="rounded-[4px] border bg-[var(--canvas-raised)] border-[color:var(--hairline)] p-5">
            <label className="block kicker mb-2">Trip name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              maxLength={80}
              placeholder="e.g. Lake District Long Weekend"
              className="w-full border rounded-[3px] bg-[var(--canvas-raised)] border-[color:var(--hairline-strong)] px-4 py-2.5 text-sm outline-none transition-shadow focus:shadow-[0_0_0_2px_#d4541e40]"
            />
          </div>

          {/* Location */}
          <div className="rounded-[4px] border bg-[var(--canvas-raised)] border-[color:var(--hairline)] p-5">
            <label className="block kicker mb-3">Location *</label>
            <LocationPicker value={location} onChange={setLocation} />
          </div>

          {/* Dates */}
          <div className="rounded-[4px] border bg-[var(--canvas-raised)] border-[color:var(--hairline)] p-5">
            <label className="block kicker mb-3">Dates *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Start</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  required
                  className="w-full border rounded-[3px] bg-[var(--canvas-raised)] border-[color:var(--hairline-strong)] px-3 py-2.5 text-base min-h-[44px] outline-none transition-shadow focus:shadow-[0_0_0_2px_#d4541e40]"
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
                  className="w-full border rounded-[3px] bg-[var(--canvas-raised)] border-[color:var(--hairline-strong)] px-3 py-2.5 text-base min-h-[44px] outline-none transition-shadow focus:shadow-[0_0_0_2px_#d4541e40]"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-[4px] border bg-[var(--canvas-raised)] border-[color:var(--hairline)] p-5">
            <label className="block kicker mb-2">Notes / description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Campsite details, booking links, what to expect..."
              rows={3}
              maxLength={2000}
              className="w-full border rounded-[3px] bg-[var(--canvas-raised)] border-[color:var(--hairline-strong)] px-4 py-2.5 text-sm outline-none transition-shadow resize-none focus:shadow-[0_0_0_2px_#d4541e40]"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 text-white py-3 rounded-[3px] font-semibold transition-opacity disabled:opacity-60 hover:opacity-90"
            style={{ background: 'var(--ember)' }}
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? 'Creating trip…' : 'Create trip & build manifest →'}
          </button>
        </form>
      </main>
    </div>
  )
}
