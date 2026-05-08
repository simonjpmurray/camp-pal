import { createClient, createAdminClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/query'
import { redirect } from 'next/navigation'
import JoinClient from './JoinClient'

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  // Use admin client to look up trip by invite code — bypasses RLS so
  // unauthenticated users can see the invite preview without a permissive policy
  const adminSupabase = await createAdminClient()
  const { data: trip } = await db(adminSupabase)
    .from('trips')
    .select('id, name, location_name, start_date, end_date, trip_members(user_id)')
    .eq('invite_code', code)
    .maybeSingle()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If already a member, redirect straight to trip
  if (user && trip) {
    const isMember = (trip.trip_members as Array<{ user_id: string }>).some(m => m.user_id === user.id)
    if (isMember) redirect(`/trips/${trip.id}`)
  }

  return (
    <JoinClient
      trip={trip ? {
        id: trip.id,
        name: trip.name,
        location_name: trip.location_name,
        start_date: trip.start_date,
        end_date: trip.end_date,
        memberCount: (trip.trip_members as Array<unknown>).length,
      } : null}
      code={code}
      isLoggedIn={!!user}
    />
  )
}
