'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppNav from '@/components/ui/AppNav'
import LocationPicker from '@/components/map/LocationPicker'
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface Location { name: string; lat: number; lng: number }

export default function EditTripPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [location, setLocation] = useState<Location | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: trip } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .eq('creator_id', user.id)
        .single()

      if (!trip) { router.push('/dashboard'); return }

      setName(trip.name)
      setLocation({ name: trip.location_name, lat: trip.lat, lng: trip.lng })
      setStartDate(trip.start_date)
      setEndDate(trip.end_date)
      setDescription(trip.description ?? '')
      setLoading(false)
    }
    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!location) { setError('Please select a location'); return }
    setSaving(true)
    setError('')

    const { error: err } = await supabase
      .from('trips')
      .update({
        name,
        location_name: location.name,
        lat: location.lat,
        lng: location.lng,
        start_date: startDate,
        end_date: endDate,
        description: description || null,
      })
      .eq('id', id)

    if (err) { setError(err.message); setSaving(false); return }

    // Regenerate packing list with updated location/dates
    await fetch(`/api/trips/${id}/generate-packing`, { method: 'POST' })

    router.push(`/trips/${id}`)
  }

  async function handleDelete() {
    if (!confirm('Delete this trip? This cannot be undone.')) return
    await supabase.from('trips').delete().eq('id', id)
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
        <AppNav />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <AppNav />
      <main className="flex-1 mx-auto w-full px-4 sm:px-6 py-6 pb-24 md:pb-6 max-w-3xl">
        <Link href={`/trips/${id}`} className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to trip
        </Link>

        <h1 className="font-display text-3xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>Edit Trip</h1>

        <form onSubmit={handleSave} className="space-y-6">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <label className="block text-sm font-semibold text-stone-700 mb-2">Trip name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none transition-shadow"
              onFocus={e => e.target.style.boxShadow = '0 0 0 2px #c0532a40'}
              onBlur={e => e.target.style.boxShadow = ''}
            />
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <label className="block text-sm font-semibold text-stone-700 mb-3">Location</label>
            <LocationPicker value={location} onChange={setLocation} />
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <label className="block text-sm font-semibold text-stone-700 mb-3">Dates</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Start</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none transition-shadow"
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px #c0532a40'}
                  onBlur={e => e.target.style.boxShadow = ''} />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">End</label>
                <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} required
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none transition-shadow"
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px #c0532a40'}
                  onBlur={e => e.target.style.boxShadow = ''} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <label className="block text-sm font-semibold text-stone-700 mb-2">Notes / description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Campsite details, booking links…"
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none transition-shadow resize-none"
              onFocus={e => e.target.style.boxShadow = '0 0 0 2px #c0532a40'}
              onBlur={e => e.target.style.boxShadow = ''} />
          </div>

          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 text-white py-3 rounded-xl font-medium transition-opacity disabled:opacity-60 hover:opacity-90"
            style={{ background: 'var(--forest)' }}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-stone-200">
          <h2 className="text-sm font-semibold text-stone-700 mb-2">Danger zone</h2>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 text-sm font-medium text-red-600 px-4 py-2 rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete this trip
          </button>
        </div>
      </main>
    </div>
  )
}
