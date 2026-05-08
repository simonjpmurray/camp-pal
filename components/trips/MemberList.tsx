'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Crown, X } from 'lucide-react'

interface Member {
  role: string
  joined_at: string
  users: {
    id: string
    name: string
    avatar_url: string | null
    email: string
  }
}

interface Props {
  members: Member[]
  currentUserId: string
  tripId: string
  isCreator: boolean
}

function Avatar({ user, size = 'md' }: { user: { name: string; avatar_url: string | null }; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  if (user.avatar_url) {
    return <img src={user.avatar_url} alt={user.name} className={`${sz} rounded-full object-cover`} />
  }
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-semibold text-white`}
      style={{ background: 'var(--forest)' }}>
      {user.name.charAt(0).toUpperCase()}
    </div>
  )
}

export default function MemberList({ members, currentUserId, tripId, isCreator }: Props) {
  const [localMembers, setLocalMembers] = useState(members)
  const supabase = createClient()

  async function removeMember(userId: string) {
    if (!confirm('Remove this member from the trip?')) return
    await supabase
      .from('trip_members')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', userId)
    setLocalMembers(prev => prev.filter(m => m.users.id !== userId))
  }

  return (
    <div className="space-y-2.5">
      {localMembers.map(m => (
        <div key={m.users.id} className="flex items-center gap-3">
          <Avatar user={m.users} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-stone-800 truncate">{m.users.name}</span>
              {m.role === 'creator' && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
            </div>
            <span className="text-xs text-stone-400">{m.users.email}</span>
          </div>
          {isCreator && m.users.id !== currentUserId && (
            <button
              onClick={() => removeMember(m.users.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-stone-300 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

export { Avatar }
