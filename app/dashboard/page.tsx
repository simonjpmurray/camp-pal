import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppNav from '@/components/ui/AppNav'
import { format, differenceInCalendarDays, parseISO } from 'date-fns'
import { MapPin, Calendar, Users, Plus, Flame } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const userId = user.id

  const { data: memberships } = await supabase
    .from('trip_members')
    .select('trip_id, role')
    .eq('user_id', userId)

  const tripIds = memberships?.map(m => m.trip_id) ?? []

  let trips: Array<{
    id: string
    name: string
    location_name: string
    start_date: string
    end_date: string
    creator_id: string
    trip_members: Array<{ user_id: string }>
  }> = []

  if (tripIds.length > 0) {
    const { data } = await supabase
      .from('trips')
      .select('id, name, location_name, start_date, end_date, creator_id, trip_members(user_id)')
      .in('id', tripIds)
      .order('start_date', { ascending: true })
    trips = data ?? []
  }

  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')
  const upcoming = trips.filter(t => t.start_date > todayStr)
  const past = trips.filter(t => t.end_date < todayStr)
  const active = trips.filter(t => t.start_date <= todayStr && t.end_date >= todayStr)

  function TripCard({ trip }: { trip: typeof trips[0] }) {
    const start = parseISO(trip.start_date)
    const daysUntil = differenceInCalendarDays(start, now)
    const isCreator = trip.creator_id === userId
    const memberCount = trip.trip_members?.length ?? 0

    return (
      <Link href={`/trips/${trip.id}`} className="block bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-display font-semibold text-lg leading-tight" style={{ color: 'var(--foreground)' }}>
            {trip.name}
          </h3>
          {isCreator && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full ml-2 shrink-0"
              style={{ background: '#e8d5b0', color: '#6b4c2a' }}>
              Creator
            </span>
          )}
        </div>

        <div className="space-y-1.5 text-sm text-stone-500">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{trip.location_name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{format(parseISO(trip.start_date), 'MMM d')} – {format(parseISO(trip.end_date), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {daysUntil > 0 && (
          <div className="mt-3 text-xs font-medium px-2.5 py-1 rounded-full inline-block"
            style={{ background: '#fbe9d8', color: 'var(--forest)' }}>
            {daysUntil === 1 ? 'Tomorrow!' : `${daysUntil} days away`}
          </div>
        )}
        {daysUntil === 0 && (
          <div className="mt-3 text-xs font-medium px-2.5 py-1 rounded-full inline-block bg-amber-100 text-amber-700">
            Starting today! 🏕️
          </div>
        )}
      </Link>
    )
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <AppNav />
      <main className="flex-1 mx-auto w-full px-4 sm:px-6 py-6 pb-24 md:pb-6 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold" style={{ color: 'var(--foreground)' }}>Your Trips</h1>
            <p className="text-sm text-stone-500 mt-1">
              {trips.length === 0 ? 'No trips yet — create your first one!' : `${trips.length} trip${trips.length !== 1 ? 's' : ''} total`}
            </p>
          </div>
          <Link href="/trips/new"
            className="hidden sm:flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
            style={{ background: 'var(--forest)' }}>
            <Plus className="w-4 h-4" />
            New trip
          </Link>
        </div>

        {trips.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#fbe9d8' }}>
              <Flame className="w-8 h-8" style={{ color: 'var(--forest)' }} />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Plan your first adventure</h2>
            <p className="text-stone-500 text-sm mb-6 max-w-xs">
              Create a trip, invite your crew, and coordinate gear together.
            </p>
            <Link href="/trips/new"
              className="text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
              style={{ background: 'var(--forest)' }}>
              Create a trip
            </Link>
          </div>
        )}

        {active.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Active</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {active.map(t => <TripCard key={t.id} trip={t} />)}
            </div>
          </section>
        )}

        {upcoming.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Upcoming</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {upcoming.map(t => <TripCard key={t.id} trip={t} />)}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Past</h2>
            <div className="grid sm:grid-cols-2 gap-4 opacity-60">
              {past.map(t => <TripCard key={t.id} trip={t} />)}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
