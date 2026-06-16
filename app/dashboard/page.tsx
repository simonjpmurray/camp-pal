import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AppNav from '@/components/ui/AppNav'
import { format, differenceInCalendarDays, parseISO } from 'date-fns'
import { MapPin, Calendar, Users, Plus, Tent } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // No redirect when there's no session yet: a brand-new visitor may hit this
  // before <AnonymousAuth /> has signed them in client-side. We render the empty
  // state and <AnonymousAuth /> calls router.refresh() once the session exists,
  // re-running this with their (initially empty) trip list.
  const userId = user?.id ?? null

  const { data: memberships } = userId
    ? await supabase
        .from('trip_members')
        .select('trip_id, role')
        .eq('user_id', userId)
    : { data: null }

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
      <Link href={`/trips/${trip.id}`}
        className="block rounded-[4px] border p-5 transition-all hover:-translate-y-0.5"
        style={{ background: 'var(--canvas-raised)', borderColor: 'var(--hairline)' }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-display font-semibold text-xl leading-tight" style={{ color: 'var(--ink)' }}>
            {trip.name}
          </h3>
          {daysUntil > 0 ? (
            <span className="shrink-0 stamp text-center leading-tight" style={{ color: 'var(--ember)', border: '1.5px solid var(--ember)' }}>
              {daysUntil === 1 ? '1 day' : `${daysUntil} days`}
            </span>
          ) : daysUntil === 0 ? (
            <span className="shrink-0 stamp" style={{ background: 'var(--signal-red)', color: '#fff' }}>Today</span>
          ) : null}
        </div>

        <div className="space-y-1.5 font-mono-data text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted-text)' }}>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{trip.location_name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{format(parseISO(trip.start_date), 'MMM d')} – {format(parseISO(trip.end_date), 'MMM d')}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t font-mono-data text-[11px] uppercase tracking-wider"
          style={{ borderColor: 'var(--hairline)', color: 'var(--muted-text)' }}>
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span>{memberCount} crew</span>
          {isCreator && (
            <span className="ml-auto" style={{ color: 'var(--ochre)' }}>Creator</span>
          )}
        </div>
      </Link>
    )
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <AppNav />
      <main className="flex-1 mx-auto w-full px-4 sm:px-6 py-6 pb-24 md:pb-6 max-w-5xl">
        <div className="flex items-end justify-between gap-4 mb-2">
          <div>
            <div className="kicker">{trips.length === 0 ? 'No trips yet' : `${trips.length} trip${trips.length !== 1 ? 's' : ''} total`}</div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>Your trips</h1>
          </div>
          <Link href="/trips/new"
            className="hidden sm:flex items-center gap-1.5 text-white text-sm font-semibold px-4 py-2 rounded-[3px] hover:opacity-90 transition-opacity shrink-0"
            style={{ background: 'var(--ember)' }}>
            <Plus className="w-4 h-4" />
            New trip
          </Link>
        </div>
        <div className="h-[2px] mb-8" style={{ background: 'var(--ink)' }} />

        {trips.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-[4px] flex items-center justify-center mb-4 border"
              style={{ background: 'var(--tint-essential)', borderColor: 'var(--hairline)' }}>
              <Tent className="w-8 h-8" style={{ color: 'var(--ember)' }} />
            </div>
            <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--ink)' }}>Plan your first adventure</h2>
            <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--muted-text)' }}>
              Create a trip, invite your crew, and coordinate gear together.
            </p>
            <Link href="/trips/new"
              className="text-white text-sm font-semibold px-6 py-2.5 rounded-[3px] hover:opacity-90 transition-opacity"
              style={{ background: 'var(--ember)' }}>
              Create a trip
            </Link>
          </div>
        )}

        {active.length > 0 && (
          <section className="mb-8">
            <h2 className="kicker mb-3">Active now</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {active.map(t => <TripCard key={t.id} trip={t} />)}
            </div>
          </section>
        )}

        {upcoming.length > 0 && (
          <section className="mb-8">
            <h2 className="kicker mb-3">Upcoming</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {upcoming.map(t => <TripCard key={t.id} trip={t} />)}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="kicker mb-3">Past</h2>
            <div className="grid sm:grid-cols-2 gap-4 opacity-60">
              {past.map(t => <TripCard key={t.id} trip={t} />)}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
