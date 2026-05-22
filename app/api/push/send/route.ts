import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isInternalRequest } from '@/lib/internal-secret'
import webpush from 'web-push'

let vapidConfigured = false
function configureVapid() {
  if (vapidConfigured) return
  const email = process.env.VAPID_EMAIL
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!email || !pub || !priv) throw new Error('VAPID env vars not configured')
  webpush.setVapidDetails(email, pub, priv)
  vapidConfigured = true
}

interface PushPayload {
  tripId: string
  userIds: string[]
  title: string
  body: string
  url?: string
  tag?: string
}

export async function POST(req: NextRequest) {
  if (!isInternalRequest(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload: PushPayload = await req.json()
  const { tripId, userIds, title, body, url, tag } = payload

  if (!tripId || !Array.isArray(userIds) || !title || !body) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  if (!userIds.length) return NextResponse.json({ ok: true, sent: 0 })

  const adminSupabase = await createAdminClient()

  const { data: validMembers } = await adminSupabase
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId)
    .in('user_id', userIds)
  const validIds = (validMembers ?? []).map(m => m.user_id)
  if (!validIds.length) return NextResponse.json({ ok: true, sent: 0 })

  const { data: subs } = await adminSupabase
    .from('push_subscriptions')
    .select('subscription, user_id')
    .in('user_id', validIds)

  const pushPayload = JSON.stringify({ title, body, url: url || `/trips/${tripId}`, tag })

  let sent = 0
  const stale: string[] = []

  if (subs?.length) {
    configureVapid()
    await Promise.allSettled(
      subs.map(async row => {
        try {
          await webpush.sendNotification(
            row.subscription as unknown as webpush.PushSubscription,
            pushPayload,
          )
          sent++
        } catch (err: unknown) {
          if (err && typeof err === 'object' && 'statusCode' in err) {
            const code = (err as { statusCode?: number }).statusCode
            if (code === 410 || code === 404) stale.push(row.user_id)
          }
        }
      })
    )
  }

  if (stale.length) {
    await adminSupabase.from('push_subscriptions').delete().in('user_id', stale)
  }

  await adminSupabase.from('notifications').insert(
    validIds.map(uid => ({
      user_id: uid,
      trip_id: tripId,
      type: tag || 'general',
      message: body,
      read: false,
    }))
  )

  return NextResponse.json({ ok: true, sent })
}
