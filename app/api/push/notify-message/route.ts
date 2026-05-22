import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInternalSecret } from '@/lib/internal-secret'

const MAX_PREVIEW = 140

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const tripId = body && typeof body.tripId === 'string' ? body.tripId : null
  const messageId = body && typeof body.messageId === 'string' ? body.messageId : null
  if (!tripId || !messageId) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const { data: message } = await supabase
    .from('messages')
    .select('content, user_id, trip_id')
    .eq('id', messageId)
    .maybeSingle()
  if (!message || message.trip_id !== tripId || message.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: otherMembers } = await supabase
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId)
    .neq('user_id', user.id)
  const otherIds = (otherMembers ?? []).map(m => m.user_id)
  if (!otherIds.length) return NextResponse.json({ ok: true })

  const [{ data: trip }, { data: profile }] = await Promise.all([
    supabase.from('trips').select('name').eq('id', tripId).maybeSingle(),
    supabase.from('users').select('name').eq('id', user.id).maybeSingle(),
  ])
  const tripName = trip?.name ?? 'your trip'
  const senderName = profile?.name?.trim() || (user.email?.split('@')[0] ?? 'Someone')
  const preview = message.content.length > MAX_PREVIEW
    ? message.content.slice(0, MAX_PREVIEW - 1) + '…'
    : message.content

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  await fetch(`${appUrl}/api/push/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getInternalSecret()}`,
    },
    body: JSON.stringify({
      tripId,
      userIds: otherIds,
      title: `${senderName} · ${tripName}`,
      body: preview,
      url: `/trips/${tripId}/chat`,
      tag: `chat-${tripId}`,
    }),
  })

  return NextResponse.json({ ok: true })
}
