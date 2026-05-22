import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const USER_AGENT = 'CampFire/0.1 (https://github.com/anthropics/claude-code)'

const cache = new Map<string, { ts: number; data: unknown }>()
const TTL = 24 * 60 * 60 * 1000

function cleanup() {
  const cutoff = Date.now() - TTL
  for (const [key, val] of cache) {
    if (val.ts < cutoff) cache.delete(key)
  }
  if (cache.size > 500) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)
    for (const [key] of oldest.slice(0, cache.size - 500)) cache.delete(key)
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 3) return NextResponse.json([])
  if (q.length > 200) return NextResponse.json({ error: 'Query too long' }, { status: 400 })

  const cacheKey = `q:${q}`
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.ts < TTL) return NextResponse.json(hit.data)

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
    { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' } }
  )
  if (!res.ok) return NextResponse.json({ error: 'Geocode failed' }, { status: 502 })
  const data = await res.json()
  cache.set(cacheKey, { ts: Date.now(), data })
  cleanup()
  return NextResponse.json(data)
}
