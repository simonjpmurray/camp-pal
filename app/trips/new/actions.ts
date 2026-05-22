'use server'

import { createClient } from '@/lib/supabase/server'
import { regenerateTripPacking } from '@/lib/trip-packing'
import { nanoid } from 'nanoid'
import { redirect } from 'next/navigation'

export interface CreateTripInput {
  name: string
  locationName: string
  lat: number
  lng: number
  startDate: string
  endDate: string
  description: string
}

export interface CreateTripResult {
  error?: string
  tripId?: string
}

const NAME_MAX = 80
const DESC_MAX = 2000

function bad(msg: string): CreateTripResult { return { error: msg } }

function validIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
}

export async function createTrip(input: CreateTripInput): Promise<CreateTripResult> {
  const name = input.name?.trim() ?? ''
  const locationName = input.locationName?.trim() ?? ''
  const description = input.description?.trim() ?? ''
  const { lat, lng, startDate, endDate } = input

  if (!name) return bad('Trip name is required')
  if (name.length > NAME_MAX) return bad(`Trip name must be ${NAME_MAX} characters or fewer`)
  if (!locationName) return bad('Location is required')
  if (typeof lat !== 'number' || typeof lng !== 'number') return bad('Invalid location coordinates')
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return bad('Invalid location coordinates')
  if (!validIsoDate(startDate) || !validIsoDate(endDate)) return bad('Invalid trip dates')
  if (endDate < startDate) return bad('End date must be on or after start date')
  if (description.length > DESC_MAX) return bad('Description is too long')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return bad('You must be signed in')

  const inviteCode = nanoid(10)
  const { data: trip, error: tripErr } = await supabase
    .from('trips')
    .insert({
      name,
      location_name: locationName,
      lat,
      lng,
      start_date: startDate,
      end_date: endDate,
      description: description || null,
      invite_code: inviteCode,
      creator_id: user.id,
    })
    .select('id')
    .single()
  if (tripErr || !trip) return bad(tripErr?.message ?? 'Failed to create trip')

  const { error: memberErr } = await supabase.from('trip_members').insert({
    trip_id: trip.id,
    user_id: user.id,
    role: 'creator',
  })
  if (memberErr) {
    await supabase.from('trips').delete().eq('id', trip.id)
    return bad(memberErr.message)
  }

  const packing = await regenerateTripPacking(supabase, trip.id, user.id)
  if ('error' in packing) {
    // Trip exists and creator is a member — leave the trip and surface the warning.
    // Packing list can be regenerated later from the trip page.
    return { tripId: trip.id, error: `Trip created but packing list failed: ${packing.error}` }
  }

  return { tripId: trip.id }
}

export async function createTripAndRedirect(input: CreateTripInput): Promise<CreateTripResult> {
  const result = await createTrip(input)
  if (result.tripId && !result.error) {
    redirect(`/trips/${result.tripId}`)
  }
  return result
}
