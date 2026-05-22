import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { fetchWeather, type Forecast } from '@/lib/weather'
import { generatePackingList } from '@/lib/packing'
import { differenceInCalendarDays, parseISO } from 'date-fns'

type SB = SupabaseClient<Database>

const WEATHER_CACHE_MS = 6 * 60 * 60 * 1000

const FALLBACK_FORECAST: Forecast = {
  days: [],
  tempMaxOverall: 18,
  tempMinOverall: 10,
  maxPrecipProbability: 20,
  totalPrecipitation: 5,
  maxWindspeed: 20,
}

function tripNights(startDate: string, endDate: string): number {
  return Math.max(1, differenceInCalendarDays(parseISO(endDate), parseISO(startDate)))
}

export async function getOrFetchForecast(
  supabase: SB,
  tripId: string,
  lat: number,
  lng: number,
  startDate: string,
  endDate: string,
): Promise<Forecast> {
  const cutoff = new Date(Date.now() - WEATHER_CACHE_MS).toISOString()
  const { data: cache } = await supabase
    .from('weather_cache')
    .select('fetched_at, forecast_json')
    .eq('trip_id', tripId)
    .maybeSingle()

  if (cache && cache.fetched_at > cutoff) {
    return cache.forecast_json as unknown as Forecast
  }

  try {
    const forecast = await fetchWeather(lat, lng, startDate, endDate)
    await supabase.from('weather_cache').upsert(
      { trip_id: tripId, fetched_at: new Date().toISOString(), forecast_json: forecast as never },
      { onConflict: 'trip_id' },
    )
    return forecast
  } catch {
    return FALLBACK_FORECAST
  }
}

export interface RegenerateOk {
  ok: true
  itemCount: number
  memberCount: number
  nightCount: number
}

export interface RegenerateErr {
  error: string
  status: number
}

export async function regenerateTripPacking(
  supabase: SB,
  tripId: string,
  userId: string,
): Promise<RegenerateOk | RegenerateErr> {
  const { data: trip } = await supabase
    .from('trips')
    .select('lat, lng, start_date, end_date')
    .eq('id', tripId)
    .maybeSingle()
  if (!trip) return { error: 'Trip not found', status: 404 }

  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!member) return { error: 'Not a member', status: 403 }

  const { count: rawMemberCount } = await supabase
    .from('trip_members')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId)
  const memberCount = Math.max(1, rawMemberCount ?? 1)
  const nightCount = tripNights(trip.start_date, trip.end_date)

  const forecast = await getOrFetchForecast(
    supabase, tripId, trip.lat, trip.lng, trip.start_date, trip.end_date,
  )

  await supabase.from('packing_items').delete().eq('trip_id', tripId).eq('is_custom', false)

  const items = generatePackingList(forecast, memberCount, nightCount)
  const { error: insertErr } = await supabase.from('packing_items').insert(
    items.map(item => ({
      trip_id: tripId,
      category: item.category,
      name: item.name,
      quantity: item.quantity,
      is_custom: false,
      weather_highlight: item.weather_highlight,
      highlight_reason: item.highlight_reason,
      item_type: item.item_type,
      scaled_multiplier: item.scaled_multiplier,
    })),
  )
  if (insertErr) return { error: insertErr.message, status: 500 }

  return { ok: true, itemCount: items.length, memberCount, nightCount }
}

export function tripNightCount(startDate: string, endDate: string): number {
  return tripNights(startDate, endDate)
}
