import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppNav from '@/components/ui/AppNav'
import ChatClient from '@/components/chat/ChatClient'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, creator_id')
    .eq('id', id)
    .single()

  if (!trip) notFound()

  const { data: membership } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  const { data: messages } = await supabase
    .from('messages')
    .select('*, users(id, name, avatar_url)')
    .eq('trip_id', id)
    .order('created_at', { ascending: true })
    .limit(100)

  const { data: userProfile } = await supabase
    .from('users')
    .select('name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <AppNav />
      <main className="flex-1 flex flex-col max-h-screen overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-stone-200 bg-white shrink-0">
          <Link href={`/trips/${id}`} className="p-2 rounded-xl hover:bg-stone-100 transition-colors">
            <ArrowLeft className="w-4 h-4 text-stone-500" />
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold" style={{ color: 'var(--foreground)' }}>Group Chat</h1>
            <p className="text-xs text-stone-500">{trip.name}</p>
          </div>
        </div>

        <ChatClient
          tripId={id}
          currentUserId={user.id}
          currentUser={{ name: userProfile?.name ?? '', avatar_url: userProfile?.avatar_url ?? null }}
          isCreator={trip.creator_id === user.id}
          initialMessages={(messages ?? []) as Array<{
            id: string
            trip_id: string
            user_id: string
            content: string
            pinned: boolean
            created_at: string
            users: { id: string; name: string; avatar_url: string | null } | null
          }>}
        />
      </main>
    </div>
  )
}
