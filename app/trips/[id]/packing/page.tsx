import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppNav from '@/components/ui/AppNav'
import PackingListClient from '@/components/packing/PackingListClient'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function PackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, creator_id, start_date, end_date')
    .eq('id', id)
    .single()

  if (!trip) notFound()

  const nightCount = Math.max(
    1,
    Math.round(
      (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)
    )
  )

  const { data: membership } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  const { data: items } = await supabase
    .from('packing_items')
    .select('*')
    .eq('trip_id', id)
    .order('category')
    .order('name')

  const { data: claims } = await supabase
    .from('item_claims')
    .select('*, users(id, name, avatar_url)')
    .eq('trip_id', id)

  const { data: members } = await supabase
    .from('trip_members')
    .select('users(id, name, avatar_url)')
    .eq('trip_id', id)

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <AppNav />
      <main className="flex-1 px-4 sm:px-6 py-6 pb-24 md:pb-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/trips/${id}`} className="p-2 rounded-xl hover:bg-stone-100 transition-colors">
            <ArrowLeft className="w-4 h-4 text-stone-500" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Packing List</h1>
            <p className="text-sm text-stone-500">{trip.name}</p>
          </div>
        </div>

        <PackingListClient
          tripId={id}
          currentUserId={user.id}
          isCreator={trip.creator_id === user.id}
          initialItems={items ?? []}
          initialClaims={(claims ?? []) as Array<{ id: string; item_id: string; trip_id: string; user_id: string; quantity_claimed: number; confirmed: boolean; created_at: string; users: { id: string; name: string; avatar_url: string | null } | null }>}
          members={(members ?? []).map(m => m.users).filter(Boolean) as unknown as Array<{ id: string; name: string; avatar_url: string | null }>}
          nightCount={nightCount}
        />
      </main>
    </div>
  )
}
