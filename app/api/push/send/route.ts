import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/query'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

interface PushPayload {
  tripId: string
  userIds: string[]
  title: string
  body: string
  url?: string
  tag?: string
}

export async function POST(req: NextRequest) {
  // Only callable server-to-server with service role key header
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    // Also allow authenticated users (for testing)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload: PushPayload = await req.json()
  const { tripId, userIds, title, body, url, tag } = payload

  if (!userIds?.length) return NextResponse.json({ ok: true, sent: 0 })

  const adminSupabase = await createAdminClient()
  const q = db(adminSupabase)

  const { data: subs } = await q
    .from('push_subscriptions')
    .select('subscription, user_id')
    .in('user_id', userIds)

  if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 })

  const pushPayload = JSON.stringify({ title, body, url: url || `/trips/${tripId}`, tag })

  let sent = 0
  const stale: string[] = []

  await Promise.allSettled(
    subs.map(async (row: { subscription: unknown; user_id: string }) => {
      try {
        await webpush.sendNotification(
          row.subscription as webpush.PushSubscription,
          pushPayload
        )
        sent++
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'statusCode' in err && (err.statusCode === 410 || err.statusCode === 404)) {
          stale.push(row.user_id)
        }
      }
    })
  )

  // Remove stale subscriptions
  if (stale.length) {
    await q.from('push_subscriptions').delete().in('user_id', stale)
  }

  // Store in-app notifications
  if (userIds.length) {
    await q.from('notifications').insert(
      userIds.map((uid: string) => ({
        user_id: uid,
        trip_id: tripId,
        type: tag || 'general',
        message: body,
        read: false,
      }))
    )
  }

  return NextResponse.json({ ok: true, sent })
}
