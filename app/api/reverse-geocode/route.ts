import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const USER_AGENT = 'CampFire/0.1 (https://github.com/anthropics/claude-code)'

const cache = new Map<string, { ts: number; data: unknown }>()
const TTL = 24 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const lat = Number(searchParams.get('lat'))
  const lng = Number(searchParams.get('lng'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'Invalid coords' }, { status: 400 })
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'Invalid coords' }, { status: 400 })
  }

  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.ts < TTL) return NextResponse.json(hit.data)

  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' } }
  )
  if (!res.ok) return NextResponse.json({ error: 'Reverse geocode failed' }, { status: 502 })
  const data = await res.json()
  cache.set(key, { ts: Date.now(), data })
  return NextResponse.json(data)
}
