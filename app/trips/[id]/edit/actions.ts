'use server'

import { createClient } from '@/lib/supabase/server'
import { regenerateTripPacking } from '@/lib/trip-packing'

export interface UpdateTripInput {
  id: string
  name: string
  locationName: string
  lat: number
  lng: number
  startDate: string
  endDate: string
  description: string
}

export interface UpdateTripResult {
  error?: string
  ok?: true
}

function bad(error: string): UpdateTripResult { return { error } }

function validIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
}

export async function updateTrip(input: UpdateTripInput): Promise<UpdateTripResult> {
  const name = input.name?.trim() ?? ''
  const locationName = input.locationName?.trim() ?? ''
  const description = input.description?.trim() ?? ''
  const { id, lat, lng, startDate, endDate } = input

  if (!name) return bad('Trip name is required')
  if (name.length > 80) return bad('Trip name must be 80 characters or fewer')
  if (!locationName) return bad('Location is required')
  if (typeof lat !== 'number' || typeof lng !== 'number') return bad('Invalid location coordinates')
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return bad('Invalid location coordinates')
  if (!validIsoDate(startDate) || !validIsoDate(endDate)) return bad('Invalid trip dates')
  if (endDate < startDate) return bad('End date must be on or after start date')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return bad('You must be signed in')

  const { error: updErr } = await supabase
    .from('trips')
    .update({
      name,
      location_name: locationName,
      lat,
      lng,
      start_date: startDate,
      end_date: endDate,
      description: description || null,
    })
    .eq('id', id)
    .eq('creator_id', user.id)
  if (updErr) return bad(updErr.message)

  await regenerateTripPacking(supabase, id, user.id)
  return { ok: true }
}

export async function deleteTrip(id: string): Promise<UpdateTripResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return bad('You must be signed in')

  const { error } = await supabase.from('trips').delete().eq('id', id).eq('creator_id', user.id)
  if (error) return bad(error.message)
  return { ok: true }
}
