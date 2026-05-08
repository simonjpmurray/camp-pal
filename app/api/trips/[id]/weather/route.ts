import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/query'
import { fetchWeather } from '@/lib/weather'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const q = db(supabase)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: trip } = await q.from('trips').select('lat, lng, start_date, end_date').eq('id', id).maybeSingle()
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  const { data: cache } = await q.from('weather_cache').select('fetched_at, forecast_json').eq('trip_id', id).maybeSingle()

  if (cache && cache.fetched_at > sixHoursAgo) {
    return NextResponse.json(cache.forecast_json)
  }

  const forecast = await fetchWeather(trip.lat, trip.lng, trip.start_date, trip.end_date)

  await q.from('weather_cache').upsert({
    trip_id: id,
    fetched_at: new Date().toISOString(),
    forecast_json: forecast,
  }, { onConflict: 'trip_id' })

  return NextResponse.json(forecast)
}
