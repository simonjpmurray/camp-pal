import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import JoinClient from './JoinClient'

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  const supabase = await createClient()

  // Security-definer RPC returns a narrow projection so unauthenticated visitors
  // can see the invite preview without granting blanket SELECT on `trips`.
  const { data: tripRows } = await supabase.rpc('get_trip_by_invite', { code })
  const trip = Array.isArray(tripRows) && tripRows[0] ? tripRows[0] : null

  const { data: { user } } = await supabase.auth.getUser()

  if (user && trip) {
    const { data: membership } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', trip.id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (membership) redirect(`/trips/${trip.id}`)
  }

  return (
    <JoinClient
      trip={trip ? {
        id: trip.id,
        name: trip.name,
        location_name: trip.location_name,
        start_date: trip.start_date,
        end_date: trip.end_date,
        memberCount: Number(trip.member_count ?? 0),
      } : null}
      code={code}
      isLoggedIn={!!user}
    />
  )
}
