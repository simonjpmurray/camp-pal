import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/query'
import { fetchWeather } from '@/lib/weather'
import { generatePackingList } from '@/lib/packing'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const q = db(supabase)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: trip } = await q.from('trips').select('lat, lng, start_date, end_date').eq('id', id).maybeSingle()
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })

  const { data: member } = await q.from('trip_members').select('id').eq('trip_id', id).eq('user_id', user.id).maybeSingle()
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  const { data: cache } = await q.from('weather_cache').select('fetched_at, forecast_json').eq('trip_id', id).maybeSingle()

  let forecast: unknown
  if (cache && cache.fetched_at > sixHoursAgo) {
    forecast = cache.forecast_json
  } else {
    try {
      forecast = await fetchWeather(trip.lat, trip.lng, trip.start_date, trip.end_date)
      await q.from('weather_cache').upsert({ trip_id: id, fetched_at: new Date().toISOString(), forecast_json: forecast }, { onConflict: 'trip_id' })
    } catch {
      forecast = { days: [], tempMaxOverall: 18, tempMinOverall: 10, maxPrecipProbability: 20, totalPrecipitation: 5, maxWindspeed: 20 }
    }
  }

  await q.from('packing_items').delete().eq('trip_id', id).eq('is_custom', false)

  const items = generatePackingList(forecast as Parameters<typeof generatePackingList>[0])

  const { error: insertErr } = await q.from('packing_items').insert(
    items.map(item => ({
      trip_id: id,
      category: item.category,
      name: item.name,
      quantity: item.quantity,
      is_custom: false,
      weather_highlight: item.weather_highlight,
      highlight_reason: item.highlight_reason,
    }))
  )

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, itemCount: items.length })
}
