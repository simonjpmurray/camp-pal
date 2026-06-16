import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import AppNav from '@/components/ui/AppNav'
import TripMap from '@/components/map/TripMap'
import WeatherWidget from '@/components/trips/WeatherWidget'
import InviteButton from '@/components/trips/InviteButton'
import MemberList from '@/components/trips/MemberList'
import { format, differenceInCalendarDays, parseISO, isFuture } from 'date-fns'
import { MapPin, Calendar, ArrowLeft, Pencil, Package, MessageCircle, ExternalLink } from 'lucide-react'
import { getAppUrl } from '@/lib/get-app-url'

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: trip } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .single()

  if (!trip) notFound()

  // Verify membership
  const { data: membership } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  const isCreator = membership.role === 'creator'

  const { data: members } = await supabase
    .from('trip_members')
    .select('role, joined_at, users(id, name, avatar_url, email)')
    .eq('trip_id', id)

  const { data: packingItems } = await supabase
    .from('packing_items')
    .select('id, weather_highlight')
    .eq('trip_id', id)

  const { data: claims } = await supabase
    .from('item_claims')
    .select('item_id')
    .eq('trip_id', id)

  const totalItems = packingItems?.length ?? 0
  const claimedItemIds = new Set(claims?.map(c => c.item_id))
  const coveredItems = packingItems?.filter(i => claimedItemIds.has(i.id)).length ?? 0
  const redItems = packingItems?.filter(i => i.weather_highlight === 'red').length ?? 0

  const startDate = parseISO(trip.start_date)
  const endDate = parseISO(trip.end_date)
  const daysUntil = differenceInCalendarDays(startDate, new Date())

  const appUrl = await getAppUrl()
  const inviteUrl = `${appUrl}/join/${trip.invite_code}`

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <AppNav />
      <main className="flex-1 mx-auto w-full px-4 sm:px-6 py-6 pb-24 md:pb-6 max-w-5xl">
        {/* Hero band — Pine + elevation rings */}
        <div className="relative overflow-hidden rounded-[4px] mb-6 p-6 sm:p-8" style={{ background: 'var(--pine)' }}>
          <svg className="absolute -right-16 -top-16 w-80 h-80 pointer-events-none" viewBox="0 0 400 400" fill="none" aria-hidden>
            {[40, 90, 140, 190].map(r => <circle key={r} cx="200" cy="200" r={r} stroke="#efe8d8" strokeOpacity="0.08" />)}
          </svg>
          <div className="relative">
            <div className="flex items-center justify-between gap-3 mb-4">
              <Link href="/dashboard" className="flex items-center gap-1.5 font-mono-data text-[11px] uppercase tracking-widest hover:opacity-80"
                style={{ color: 'rgba(240,234,217,0.6)' }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Trips
              </Link>
              {isCreator && (
                <Link href={`/trips/${id}/edit`}
                  className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-[3px] border hover:opacity-80 transition-opacity"
                  style={{ borderColor: 'rgba(240,234,217,0.25)', color: '#efe8d8' }}>
                  <Pencil className="w-3.5 h-3.5" />
                  Edit dossier
                </Link>
              )}
            </div>
            {daysUntil <= 0 && (
              <span className="stamp inline-block mb-3" style={{ background: 'var(--signal-red)', color: '#fff' }}>Active now</span>
            )}
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-[0.95]" style={{ color: '#efe8d8' }}>
              {trip.name}
            </h1>
            <div className="mt-3 font-mono-data text-[11px] uppercase tracking-widest" style={{ color: 'rgba(240,234,217,0.6)' }}>
              ⌖ {Math.abs(trip.lat).toFixed(2)}°{trip.lat >= 0 ? 'N' : 'S'} {Math.abs(trip.lng).toFixed(2)}°{trip.lng >= 0 ? 'E' : 'W'} · {format(startDate, 'MMM d').toUpperCase()} – {format(endDate, 'd').toUpperCase()} · {members?.length ?? 0} crew
            </div>
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-3 rounded-[4px] border bg-[var(--canvas-raised)] border-[color:var(--hairline)] mb-6">
          <div className="p-4 text-center border-r" style={{ borderColor: 'var(--hairline)' }}>
            <div className="text-4xl font-bold font-display" style={{ color: 'var(--ember)' }}>
              {daysUntil > 0 ? daysUntil : isFuture(startDate) ? '0' : '–'}
            </div>
            <div className="kicker mt-1">days away</div>
          </div>
          <div className="p-4 text-center border-r" style={{ borderColor: 'var(--hairline)' }}>
            <div className="text-4xl font-bold font-display" style={{ color: 'var(--ink)' }}>
              {coveredItems}<span style={{ color: 'var(--muted-text)' }}>/{totalItems}</span>
            </div>
            <div className="kicker mt-1">group kit</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-4xl font-bold font-display" style={{ color: 'var(--signal-red)' }}>
              {redItems}
            </div>
            <div className="kicker mt-1">essential</div>
          </div>
        </div>

        {/* Trip details card */}
        <div className="rounded-[4px] border bg-[var(--canvas-raised)] border-[color:var(--hairline)] p-5 mb-4">
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2 text-stone-600">
              <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--forest)' }} />
              <span>{trip.location_name}</span>
            </div>
            <div className="flex items-center gap-2 text-stone-600">
              <Calendar className="w-4 h-4 shrink-0" style={{ color: 'var(--forest)' }} />
              <span>{format(startDate, 'EEE d MMM')} – {format(endDate, 'EEE d MMM yyyy')}</span>
            </div>
            {trip.description && (
              <p className="text-stone-600 pt-2 border-t border-stone-100 text-sm leading-relaxed">
                {trip.description}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link href={`/trips/${id}/packing`}
            className="flex items-center gap-3 rounded-[4px] border bg-[var(--canvas-raised)] border-[color:var(--hairline)] px-4 py-4 hover:-translate-y-0.5 transition-transform">
            <Package className="w-5 h-5 shrink-0" style={{ color: 'var(--ember)' }} />
            <div className="min-w-0">
              <div className="font-display text-base font-semibold" style={{ color: 'var(--ink)' }}>Packing manifest</div>
              <div className="font-mono-data text-[10px] uppercase tracking-wider" style={{ color: redItems > 0 ? 'var(--signal-red)' : 'var(--muted-text)' }}>
                {redItems > 0 ? `${redItems} essential items →` : 'View manifest →'}
              </div>
            </div>
          </Link>
          <Link href={`/trips/${id}/chat`}
            className="flex items-center gap-3 rounded-[4px] border bg-[var(--canvas-raised)] border-[color:var(--hairline)] px-4 py-4 hover:-translate-y-0.5 transition-transform">
            <MessageCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--ember)' }} />
            <div className="min-w-0">
              <div className="font-display text-base font-semibold" style={{ color: 'var(--ink)' }}>Group chat</div>
              <div className="font-mono-data text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted-text)' }}>Talk it out →</div>
            </div>
          </Link>
        </div>

        {/* Get directions */}
        <div className="rounded-[4px] border bg-[var(--canvas-raised)] border-[color:var(--hairline)] p-4 mb-4 flex items-center justify-between">
          <div>
            <div className="font-display text-base font-semibold" style={{ color: 'var(--ink)' }}>Get directions</div>
            <div className="font-mono-data text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted-text)' }}>{trip.location_name}</div>
          </div>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${trip.lat},${trip.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-[3px] text-white hover:opacity-90"
            style={{ background: 'var(--ember)' }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Maps
          </a>
        </div>

        {/* Map */}
        <div className="rounded-[4px] border bg-[var(--canvas-raised)] border-[color:var(--hairline)] p-4 mb-4">
          <TripMap lat={trip.lat} lng={trip.lng} locationName={trip.location_name} />
        </div>

        {/* Weather */}
        <div className="rounded-[4px] border bg-[var(--canvas-raised)] border-[color:var(--hairline)] p-5 mb-4">
          <h2 className="kicker mb-3">Weather forecast</h2>
          <WeatherWidget tripId={id} />
        </div>

        {/* Members */}
        <div className="rounded-[4px] border bg-[var(--canvas-raised)] border-[color:var(--hairline)] p-5 mb-4">
          <h2 className="kicker mb-3">Crew ({members?.length ?? 0})</h2>
          <MemberList
            members={(members ?? []).filter(m => m.users != null) as Array<{ role: string; joined_at: string; users: { id: string; name: string; avatar_url: string | null; email: string } }>}
            currentUserId={user.id}
            tripId={id}
            isCreator={isCreator}
          />
        </div>

        {/* Invite — dashed ember card */}
        <div className="rounded-[4px] p-5" style={{ border: '1.5px dashed rgba(212,84,30,0.4)', background: 'var(--tint-essential)' }}>
          <h2 className="kicker mb-1" style={{ color: 'var(--ember)' }}>Invite your crew</h2>
          <p className="text-xs mb-3" style={{ color: 'var(--muted-text)' }}>Share this link to invite people to this trip</p>
          <InviteButton inviteUrl={inviteUrl} />
        </div>
      </main>
    </div>
  )
}
