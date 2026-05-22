import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrFetchForecast } from '@/lib/trip-packing'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: trip } = await supabase
    .from('trips')
    .select('lat, lng, start_date, end_date')
    .eq('id', id)
    .maybeSingle()
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const forecast = await getOrFetchForecast(
    supabase, id, trip.lat, trip.lng, trip.start_date, trip.end_date,
  )
  return NextResponse.json(forecast)
}
