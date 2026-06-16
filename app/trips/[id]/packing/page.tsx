import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppNav from '@/components/ui/AppNav'
import PackingListClient from '@/components/packing/PackingListClient'
import { tripNightCount } from '@/lib/trip-packing'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function PackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, creator_id, start_date, end_date')
    .eq('id', id)
    .single()

  if (!trip) notFound()

  const nightCount = tripNightCount(trip.start_date, trip.end_date)

  const { data: membership } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  const { data: items } = await supabase
    .from('packing_items')
    .select('*')
    .eq('trip_id', id)
    .order('category')
    .order('name')

  const { data: claims } = await supabase
    .from('item_claims')
    .select('*, users(id, name, avatar_url)')
    .eq('trip_id', id)

  const { data: members } = await supabase
    .from('trip_members')
    .select('users(id, name, avatar_url)')
    .eq('trip_id', id)

  const memberProfiles = (members ?? [])
    .map(m => m.users)
    .filter((u): u is NonNullable<typeof u> => u != null)

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <AppNav />
      <main className="flex-1 mx-auto w-full px-4 sm:px-6 py-6 pb-24 md:pb-6 max-w-5xl">
        <div className="flex items-center gap-3 mb-2">
          <Link href={`/trips/${id}`} className="p-2 rounded-[3px] hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--muted-text)' }} />
          </Link>
          <div>
            <div className="kicker">{trip.name}</div>
            <h1 className="font-display text-4xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>Packing manifest</h1>
          </div>
        </div>
        <div className="h-[2px] mb-6" style={{ background: 'var(--ink)' }} />

        <PackingListClient
          tripId={id}
          currentUserId={user.id}
          isCreator={trip.creator_id === user.id}
          initialItems={items ?? []}
          initialClaims={claims ?? []}
          members={memberProfiles}
          nightCount={nightCount}
        />
      </main>
    </div>
  )
}
