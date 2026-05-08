import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/query'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tripId, joinerName } = await req.json()
  const q = db(supabase)

  // Get all OTHER members of this trip
  const { data: members } = await q
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId)
    .neq('user_id', user.id)

  if (!members?.length) return NextResponse.json({ ok: true })

  const userIds = members.map((m: { user_id: string }) => m.user_id)

  // Get trip name
  const { data: trip } = await q.from('trips').select('name').eq('id', tripId).maybeSingle()
  const tripName = trip?.name ?? 'your trip'

  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({
      tripId,
      userIds,
      title: `${joinerName} joined ${tripName}! 🏕️`,
      body: `Your crew is growing — ${joinerName} just joined the trip.`,
      tag: 'member-joined',
    }),
  })

  return NextResponse.json({ ok: true })
}
