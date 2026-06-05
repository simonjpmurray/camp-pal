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
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="p-2 rounded-xl hover:bg-stone-100 transition-colors">
            <ArrowLeft className="w-4 h-4 text-stone-500" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-bold truncate" style={{ color: 'var(--foreground)' }}>
              {trip.name}
            </h1>
          </div>
          {isCreator && (
            <Link href={`/trips/${id}/edit`}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors">
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Link>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-stone-100 p-4 text-center">
            <div className="text-2xl font-bold font-display" style={{ color: 'var(--forest)' }}>
              {daysUntil > 0 ? daysUntil : isFuture(startDate) ? '0' : '–'}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              {daysUntil > 0 ? 'days away' : 'days away'}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-stone-100 p-4 text-center">
            <div className="text-2xl font-bold font-display" style={{ color: 'var(--forest)' }}>
              {coveredItems}/{totalItems}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">items claimed</div>
          </div>
          <div className="bg-white rounded-2xl border border-stone-100 p-4 text-center">
            <div className="text-2xl font-bold font-display text-red-500">
              {redItems}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">essential</div>
          </div>
        </div>

        {/* Trip details card */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5 mb-4">
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
            className="flex items-center gap-2 bg-white border border-stone-100 rounded-2xl px-4 py-3.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors shadow-sm">
            <Package className="w-5 h-5" style={{ color: 'var(--forest)' }} />
            <div>
              <div>Packing list</div>
              {redItems > 0 && <div className="text-xs text-red-500 font-normal">{redItems} essential items</div>}
            </div>
          </Link>
          <Link href={`/trips/${id}/chat`}
            className="flex items-center gap-2 bg-white border border-stone-100 rounded-2xl px-4 py-3.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors shadow-sm">
            <MessageCircle className="w-5 h-5" style={{ color: 'var(--forest)' }} />
            <div>
              <div>Group chat</div>
              <div className="text-xs text-stone-400 font-normal">Talk it out</div>
            </div>
          </Link>
        </div>

        {/* Get directions */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 mb-4 flex items-center justify-between">
          <div className="text-sm">
            <div className="font-medium" style={{ color: 'var(--foreground)' }}>Get directions</div>
            <div className="text-stone-400 text-xs">{trip.location_name}</div>
          </div>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${trip.lat},${trip.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl"
            style={{ background: '#fbe9d8', color: 'var(--forest)' }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Maps
          </a>
        </div>

        {/* Map */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 mb-4">
          <TripMap lat={trip.lat} lng={trip.lng} locationName={trip.location_name} />
        </div>

        {/* Weather */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5 mb-4">
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--foreground)' }}>Weather forecast</h2>
          <WeatherWidget tripId={id} />
        </div>

        {/* Members */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5 mb-4">
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--foreground)' }}>
            Members ({members?.length ?? 0})
          </h2>
          <MemberList
            members={(members ?? []).filter(m => m.users != null) as Array<{ role: string; joined_at: string; users: { id: string; name: string; avatar_url: string | null; email: string } }>}
            currentUserId={user.id}
            tripId={id}
            isCreator={isCreator}
          />
        </div>

        {/* Invite */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <h2 className="font-semibold text-sm mb-1" style={{ color: 'var(--foreground)' }}>Invite your crew</h2>
          <p className="text-xs text-stone-500 mb-3">Share this link to invite people to this trip</p>
          <InviteButton inviteUrl={inviteUrl} />
        </div>
      </main>
    </div>
  )
}
